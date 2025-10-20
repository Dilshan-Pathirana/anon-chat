import { z } from "zod";

// User validation schema
export const UserSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(50, "Username is too long")
    .regex(/^[a-zA-Z0-9\s-]+$/, "Username can only contain letters, numbers, spaces, and hyphens"),
  sessionId: z.string().uuid().optional(),
});

// Message validation schema
export const MessageSchema = z.object({
  sessionId: z.string().uuid(),
  sender: z.string().min(1).max(50),
  text: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional(),
  timestamp: z.date(),
}).refine(
  (data) => data.text || data.imageUrl,
  "Message must contain either text or an image"
);

// File upload validation schema
export const FileUploadSchema = z.object({
  filename: z.string(),
  mimetype: z.enum(["image/jpeg", "image/png", "image/gif"]),
  size: z.number().max(5 * 1024 * 1024), // 5MB
});

// WebSocket message validation schemas
export const RegisterMessageSchema = z.object({
  type: z.literal("register"),
  username: z.string().min(1).max(50),
});

export const ChatMessageSchema = z.object({
  type: z.literal("message"),
  text: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional(),
  sender: z.string().min(1).max(50),
}).refine(
  (data) => data.text || data.imageUrl,
  "Message must contain either text or an image"
);

export const NextMessageSchema = z.object({
  type: z.literal("next"),
});

export type User = z.infer<typeof UserSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type FileUpload = z.infer<typeof FileUploadSchema>;
export type WebSocketMessage = 
  | z.infer<typeof RegisterMessageSchema>
  | z.infer<typeof ChatMessageSchema>
  | z.infer<typeof NextMessageSchema>;