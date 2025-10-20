import { randomBytes } from "crypto";
import { Request } from "express";
import { RateLimiter } from "limiter";

interface SessionData {
  id: string;
  ipHash: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
}

class SessionManager {
  private sessions: Map<string, SessionData>;
  private ipLimiter: Map<string, RateLimiter>;
  private readonly maxSessionsPerIp: number;
  private readonly sessionTimeout: number;

  constructor(maxSessionsPerIp = 5, sessionTimeout = 24 * 60 * 60 * 1000) {
    this.sessions = new Map();
    this.ipLimiter = new Map();
    this.maxSessionsPerIp = maxSessionsPerIp;
    this.sessionTimeout = sessionTimeout;
  }

  private hashIp(ip: string): string {
    // Simple hash for demo purposes - in production use a proper hashing algorithm
    return Buffer.from(ip).toString("base64");
  }

  private createSessionId(): string {
    return randomBytes(32).toString("hex");
  }

  private getClientInfo(req: Request): { ipHash: string; userAgent: string } {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";
    return {
      ipHash: this.hashIp(ip),
      userAgent,
    };
  }

  public createSession(req: Request): string | null {
    const { ipHash, userAgent } = this.getClientInfo(req);

    // Check rate limit for IP
    let limiter = this.ipLimiter.get(ipHash);
    if (!limiter) {
      limiter = new RateLimiter({
        tokensPerInterval: this.maxSessionsPerIp,
        interval: "hour",
      });
      this.ipLimiter.set(ipHash, limiter);
    }

    if (!limiter.tryRemoveTokens(1)) {
      return null;
    }

    // Count existing sessions for this IP
    let ipSessionCount = 0;
    for (const session of this.sessions.values()) {
      if (session.ipHash === ipHash) {
        ipSessionCount++;
      }
    }

    if (ipSessionCount >= this.maxSessionsPerIp) {
      return null;
    }

    const sessionId = this.createSessionId();
    this.sessions.set(sessionId, {
      id: sessionId,
      ipHash,
      userAgent,
      createdAt: new Date(),
      lastActivity: new Date(),
    });

    return sessionId;
  }

  public validateSession(sessionId: string, req: Request): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const { ipHash, userAgent } = this.getClientInfo(req);
    
    // Validate IP and user agent
    if (session.ipHash !== ipHash || session.userAgent !== userAgent) {
      this.sessions.delete(sessionId);
      return false;
    }

    // Check session age
    const now = new Date();
    if (now.getTime() - session.lastActivity.getTime() > this.sessionTimeout) {
      this.sessions.delete(sessionId);
      return false;
    }

    // Update last activity
    session.lastActivity = now;
    return true;
  }

  public destroySession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  public cleanupSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > this.sessionTimeout) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

// Run cleanup every hour
setInterval(() => {
  sessionManager.cleanupSessions();
}, 60 * 60 * 1000);

export default sessionManager;