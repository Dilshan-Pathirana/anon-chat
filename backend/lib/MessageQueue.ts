class MessageQueue {
  private queue: Map<string, any[]>;
  private readonly maxQueueSize: number;
  private readonly processInterval: number;
  private intervalId: NodeJS.Timeout | null;

  constructor(maxQueueSize = 100, processInterval = 100) {
    this.queue = new Map();
    this.maxQueueSize = maxQueueSize;
    this.processInterval = processInterval;
    this.intervalId = null;
  }

  public enqueue(sessionId: string, message: any): boolean {
    if (!this.queue.has(sessionId)) {
      this.queue.set(sessionId, []);
    }

    const sessionQueue = this.queue.get(sessionId)!;
    if (sessionQueue.length >= this.maxQueueSize) {
      return false;
    }

    sessionQueue.push(message);
    return true;
  }

  public dequeue(sessionId: string): any | undefined {
    const sessionQueue = this.queue.get(sessionId);
    if (!sessionQueue || sessionQueue.length === 0) {
      return undefined;
    }

    return sessionQueue.shift();
  }

  public start(processCallback: (sessionId: string, message: any) => void): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.queue.forEach((messages, sessionId) => {
        if (messages.length > 0) {
          const message = this.dequeue(sessionId);
          if (message) {
            processCallback(sessionId, message);
          }
        }
      });
    }, this.processInterval);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public clear(sessionId: string): void {
    this.queue.delete(sessionId);
  }

  public clearAll(): void {
    this.queue.clear();
  }

  public getQueueSize(sessionId: string): number {
    const sessionQueue = this.queue.get(sessionId);
    return sessionQueue ? sessionQueue.length : 0;
  }

  public getTotalQueueSize(): number {
    let total = 0;
    this.queue.forEach((messages) => {
      total += messages.length;
    });
    return total;
  }
}

export default MessageQueue;