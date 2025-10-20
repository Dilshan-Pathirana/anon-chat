import DOMPurify from "isomorphic-dompurify";
import { escape } from "html-escaper";

interface SanitizationOptions {
  allowImages?: boolean;
  maxLength?: number;
  trimWhitespace?: boolean;
}

const defaultOptions: SanitizationOptions = {
  allowImages: true,
  maxLength: 1000,
  trimWhitespace: true,
};

export function sanitizeMessage(
  message: string,
  options: SanitizationOptions = {}
): string {
  const finalOptions = { ...defaultOptions, ...options };
  
  if (!message) return "";

  // Trim whitespace if enabled
  let sanitized = finalOptions.trimWhitespace ? message.trim() : message;

  // Truncate if exceeds max length
  if (finalOptions.maxLength && sanitized.length > finalOptions.maxLength) {
    sanitized = sanitized.slice(0, finalOptions.maxLength);
  }

  // Basic HTML escape
  sanitized = escape(sanitized);

  // DOMPurify for additional security
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: finalOptions.allowImages ? ["img"] : [],
    ALLOWED_ATTR: finalOptions.allowImages ? ["src", "alt"] : [],
  });

  return sanitized;
}

export function sanitizeUsername(username: string): string {
  if (!username) return "Anonymous";

  // Remove any non-alphanumeric characters except spaces and hyphens
  let sanitized = username.replace(/[^a-zA-Z0-9\s-]/g, "");

  // Trim whitespace and limit length
  sanitized = sanitized.trim().slice(0, 50);

  // Ensure at least one character
  return sanitized || "Anonymous";
}

export function validateImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow URLs from our own domain
    return parsed.hostname === "localhost" || parsed.hostname === process.env.DOMAIN;
  } catch {
    return false;
  }
}

interface WebSocketMessage {
  type: string;
  text?: string;
  username?: string;
  imageUrl?: string;
  [key: string]: any;
}

export function sanitizeWebSocketMessage(message: WebSocketMessage): WebSocketMessage {
  const sanitized: WebSocketMessage = {
    type: message.type, // type is required and shouldn't be sanitized
  };

  if (message.text !== undefined) {
    sanitized.text = sanitizeMessage(message.text, {
      allowImages: false,
      maxLength: 1000,
      trimWhitespace: true,
    });
  }

  if (message.username !== undefined) {
    sanitized.username = sanitizeUsername(message.username);
  }

  if (message.imageUrl !== undefined) {
    sanitized.imageUrl = validateImageUrl(message.imageUrl) ? message.imageUrl : "";
  }

  // Handle any additional fields
  for (const [key, value] of Object.entries(message)) {
    if (!["type", "text", "username", "imageUrl"].includes(key)) {
      if (typeof value === "string") {
        sanitized[key] = sanitizeMessage(value, {
          allowImages: false,
          maxLength: 1000,
          trimWhitespace: true,
        });
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}