import { z } from 'zod';
import { WebSocket as WS } from 'ws';

// Message type definitions
export interface RegisterMessage {
  type: 'register';
  username: string;
}

export interface ChatMessage {
  type: 'message';
  text?: string;
  imageUrl?: string;
  sender: string;
}

export interface NextMessage {
  type: 'next';
}

export type WebSocketMessage = RegisterMessage | ChatMessage | NextMessage;

// Zod schemas for validation
export const RegisterMessageSchema = z.object({
  type: z.literal('register'),
  username: z.string().min(1).max(50),
}) satisfies z.ZodType<RegisterMessage>;

export const ChatMessageSchema = z.object({
  type: z.literal('message'),
  text: z.string().optional(),
  imageUrl: z.string().url().optional(),
  sender: z.string(),
}) satisfies z.ZodType<ChatMessage>;

export const NextMessageSchema = z.object({
  type: z.literal('next'),
}) satisfies z.ZodType<NextMessage>;

export interface User {
  id: string;
  username: string;
  ws: any; // Using any for WebSocket to avoid type conflicts
  sessionId?: string;
  lastActivity: Date;
}