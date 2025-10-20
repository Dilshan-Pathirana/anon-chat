import { RateLimiter } from "limiter";
import type { WebSocket as WS } from "ws"; // ✅ explicit correct type

class ConnectionPool {
  private pool: Map<string, WS>;
  private readonly rateLimiters: Map<string, RateLimiter>;
  private readonly maxConnections: number;
  private readonly messageRateLimit: number;
  private readonly messageBurst: number;

  constructor(maxConnections = 1000, messageRateLimit = 10, messageBurst = 20) {
    this.pool = new Map();
    this.rateLimiters = new Map();
    this.maxConnections = maxConnections;
    this.messageRateLimit = messageRateLimit;
    this.messageBurst = messageBurst;
  }

  public addConnection(id: string, ws: WS): boolean {
    if (this.pool.size >= this.maxConnections) {
      return false;
    }

    this.pool.set(id, ws);
    this.rateLimiters.set(
      id,
      new RateLimiter({
        tokensPerInterval: this.messageRateLimit,
        interval: "second",
        fireImmediately: true,
      })
    );

    return true;
  }

  public removeConnection(id: string): void {
    this.pool.delete(id);
    this.rateLimiters.delete(id);
  }

  public async canSendMessage(id: string): Promise<boolean> {
    const limiter = this.rateLimiters.get(id);
    if (!limiter) return false;
    return limiter.tryRemoveTokens(1);
  }

  public getConnection(id: string): WS | undefined {
    return this.pool.get(id);
  }

  public getActiveConnections(): number {
    return this.pool.size;
  }

  public getConnectionIds(): string[] {
    return Array.from(this.pool.keys());
  }
}

export default ConnectionPool;
