import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import xss from "xss-clean";
import cors from "cors";
import { z } from "zod";
import DOMPurify from 'isomorphic-dompurify';
import { escape } from 'html-escaper';

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
const DEFAULT_RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const DEFAULT_RATE_LIMIT_MAX = 100;

// Types
interface SanitizedValue {
  [key: string]: any;
}

/**
 * Sanitizes a value recursively
 */
function sanitizeValue(value: unknown): SanitizedValue {
  if (typeof value === 'string') {
    // First escape HTML special characters
    const escaped = escape(value.trim());
    // Then sanitize any remaining HTML/JS
    return { value: DOMPurify.sanitize(escaped, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [], // No HTML attributes allowed
    })};
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }

  if (typeof value === 'object' && value !== null) {
    const sanitized: SanitizedValue = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const sanitizedValue = sanitizeValue(val);
      if (typeof sanitizedValue === 'object' && 'value' in sanitizedValue) {
        sanitized[key] = sanitizedValue.value;
      } else {
        sanitized[key] = sanitizedValue;
      }
    }
    return sanitized;
  }

  return { value };
}

// Basic request validation schema
const requestSchema = z.object({
  body: z.record(z.unknown()).optional(),
  query: z.record(z.string()).optional(),
  params: z.record(z.string()).optional(),
});

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      requestSchema.parse(req);
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          status: "error",
          message: "Invalid request data",
          details: error.errors,
        });
      }
      next(error);
    }
  };
};

// Security headers middleware using helmet
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      imgSrc: ["'self'", "data:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: true,
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
});

// Rate limiting middleware
export const createRateLimiter = (
  windowMs: number = 15 * 60 * 1000,
  max: number = 100
) =>
  rateLimit({
    windowMs,
    max,
    message: {
      status: "error",
      message: "Too many requests, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

// CORS configuration
export const corsOptions = {
  origin: process.env.NODE_ENV === "production"
    ? process.env.FRONTEND_URL
    : ["http://localhost:5173", "http://127.0.0.1:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Session-Id"],
  exposedHeaders: ["X-Session-Id"],
  credentials: true,
  maxAge: 86400, // 24 hours
};

// XSS prevention middleware
export const xssMiddleware = xss();

// Input sanitization middleware
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  function sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // First escape HTML special characters
      const escaped = escape(value.trim());
      // Then sanitize any remaining HTML/JS
      return DOMPurify.sanitize(escaped, {
        ALLOWED_TAGS: [], // No HTML tags allowed
        ALLOWED_ATTR: [], // No HTML attributes allowed
      });
    }

    if (Array.isArray(value)) {
      return value.map(item => sanitizeValue(item));
    }

    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }

    return value;
  }

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
};

// JWT token validation (if needed)
export const validateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "No token provided",
    });
  }

  try {
    // Verify token here if implementing authentication
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Invalid token",
    });
  }
};

// File upload validation
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return res.status(400).json({
      status: "error",
      message: "No file uploaded",
    });
  }

  if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype as any)) {
    return res.status(400).json({
      status: "error",
      message: `Invalid file type. Only ${ALLOWED_MIME_TYPES.map(type => type.split('/')[1].toUpperCase()).join(', ')} are allowed.`,
    });
  }

  if (req.file.size > MAX_FILE_SIZE) {
    return res.status(400).json({
      status: "error",
      message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
    });
  }

  next();
};

/**
 * WebSocket message sanitizer
 * @template T The type of the WebSocket message
 * @param message The message to sanitize
 * @returns The sanitized message
 */
export function sanitizeWebSocketMessage<T extends Record<string, any>>(message: T): T {
  return sanitizeValue(message) as T;
}