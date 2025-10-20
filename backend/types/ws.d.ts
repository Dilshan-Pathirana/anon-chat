declare module 'ws' {
  export class WebSocket {
    readyState: number;
    send(data: string | Buffer): void;
    close(): void;
    on(event: string, handler: (...args: any[]) => void): void;
    dispatchEvent(event: Event): boolean;
  }

  export class WebSocketServer {
    constructor(options: { server: any });
    on(event: string, handler: (...args: any[]) => void): void;
  }

  export const OPEN: number;
  export const CLOSED: number;
}