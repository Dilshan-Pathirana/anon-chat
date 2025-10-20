import type { WebSocket as WSType } from 'ws';

export interface CustomWebSocket extends WSType {
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  close(): void;
  addEventListener(event: string, listener: (event: any) => void): void;
  removeEventListener(event: string, listener: (event: any) => void): void;
}

export type { CustomWebSocket as WebSocket };