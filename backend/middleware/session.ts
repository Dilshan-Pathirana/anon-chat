import { Request, Response, NextFunction } from "express";
import sessionManager from "../lib/SessionManager";

export const sessionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  let sessionId = req.headers["x-session-id"] as string;

  if (!sessionId) {
    // Create new session
    const newSessionId = sessionManager.createSession(req);
    if (!newSessionId) {
      return res.status(429).json({ 
        error: "Too many sessions from this IP address" 
      });
    }
    sessionId = newSessionId;
    res.setHeader("x-session-id", sessionId);
  } else {
    // Validate existing session
    if (!sessionManager.validateSession(sessionId, req)) {
      // Session invalid or expired, create new one
      const newSessionId = sessionManager.createSession(req);
      if (!newSessionId) {
        return res.status(429).json({ 
          error: "Too many sessions from this IP address" 
        });
      }
      sessionId = newSessionId;
      res.setHeader("x-session-id", sessionId);
    }
  }

  // Add session ID to request for use in route handlers
  (req as any).sessionId = sessionId;
  next();
};

// WebSocket session validation middleware
export const wsSessionMiddleware = (socket: any, next: (err?: Error) => void) => {
  const sessionId = socket.handshake.headers["x-session-id"];
  
  if (!sessionId || !sessionManager.validateSession(sessionId, socket.request)) {
    return next(new Error("Invalid or expired session"));
  }

  socket.sessionId = sessionId;
  next();
};