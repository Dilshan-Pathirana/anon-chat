export interface WebSocketMessage {
  type: "match" | "skipped" | "message" | "typing" | "register" | "next";
  sessionId?: string;
  username?: string;
  sender?: string;
  text?: string;
  imageUrl?: string;
  timestamp?: string;
}