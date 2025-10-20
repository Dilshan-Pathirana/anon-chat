import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { WebSocket as WS } from "ws";
declare global {
  interface WebSocket extends WS {}
}
import mongoose from "mongoose";
import multer from "multer";
import cors from "cors";
import { v4 as uuid } from "uuid";
import path from "path";
import helmet from "helmet";
import { config } from "./config/env";
import logger from "./config/logger";
import { errorHandler } from "./middleware/errorHandler";
import { apiLimiter, uploadLimiter, validateFileUpload } from "./middleware/rateLimiter";
import Message from "./models/Message";
import { User, WebSocketMessage, RegisterMessageSchema, ChatMessageSchema, NextMessageSchema } from "./types/websocket";

// -----------------------------
// 1. Express setup
// -----------------------------
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:5173'
}));
app.use(express.json());
app.use(apiLimiter);

// Static files
const uploadDir = path.resolve("uploads");
app.use("/uploads", express.static(uploadDir));

// File upload configuration
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => cb(null, `${uuid()}-${file.originalname}`),
});

const upload = multer({ 
  storage,
  limits: { fileSize: config.MAX_FILE_SIZE }
});

// Upload route with validation and rate limiting
app.post(
  "/upload",
  uploadLimiter,
  upload.single("image"),
  validateFileUpload,
  async (req, res) => {
    const { sessionId, sender } = req.body;

    try {
      const msg = await Message.create({
        sessionId,
        sender,
        imageUrl: `/uploads/${req.file!.filename}`,
      });

      logger.info(`File uploaded successfully: ${req.file!.filename}`);
      res.json({ imageUrl: msg.imageUrl });
    } catch (err) {
      logger.error("File upload failed:", err);
      res.status(500).json({ error: "Failed to save image" });
    }
  }
);

// -----------------------------
// 2. WebSocket setup
// -----------------------------
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const waitingQueue: User[] = [];
const activeChats: Record<string, { user1: User; user2: User }> = {};

// Heartbeat to detect stale connections
function heartbeat(user: User) {
  user.lastActivity = new Date();
}

function cleanInactiveConnections() {
  const now = new Date();
  const timeout = config.INACTIVE_TIMEOUT;

  waitingQueue.forEach((user, index) => {
    if (now.getTime() - user.lastActivity.getTime() > timeout) {
      user.ws.close();
      waitingQueue.splice(index, 1);
      logger.info(`Removed inactive user ${user.id} from waiting queue`);
    }
  });

  Object.entries(activeChats).forEach(([sessionId, chat]) => {
    const { user1, user2 } = chat;
    if (now.getTime() - user1.lastActivity.getTime() > timeout ||
        now.getTime() - user2.lastActivity.getTime() > timeout) {
      user1.ws.close();
      user2.ws.close();
      delete activeChats[sessionId];
      logger.info(`Ended inactive chat session ${sessionId}`);
    }
  });
}

setInterval(cleanInactiveConnections, 60000); // Check every minute

function tryMatch() {
  while (waitingQueue.length >= 2) {
    const user1 = waitingQueue.shift()!;
    const user2 = waitingQueue.shift()!;
    const sessionId = uuid();

    user1.sessionId = sessionId;
    user2.sessionId = sessionId;
    activeChats[sessionId] = { user1, user2 };

    const matchMessage = {
      type: "match" as const,
      sessionId,
    };
    user1.ws.send(JSON.stringify({ ...matchMessage, username: user2.username }));
    user2.ws.send(JSON.stringify({ ...matchMessage, username: user1.username }));
    
    logger.info(`Matched users ${user1.id} and ${user2.id} in session ${sessionId}`);
  }
}

function endSession(user: User) {
  const sessionId = user.sessionId;
  if (!sessionId || !activeChats[sessionId]) return;

  const chat = activeChats[sessionId];
  const otherUser = chat.user1.id === user.id ? chat.user2 : chat.user1;

  delete activeChats[sessionId];
  user.sessionId = undefined;
  otherUser.sessionId = undefined;

  otherUser.ws.send(JSON.stringify({ type: "skipped" as const }));

  waitingQueue.push(user, otherUser);
  logger.info(`Session ${sessionId} ended, users returned to queue`);
  tryMatch();
}

wss.on("connection", (ws: WebSocket) => {
  const user: User = { 
    id: uuid(), 
    username: "Anonymous", 
    ws,
    lastActivity: new Date()
  };

  logger.info(`New connection: ${user.id}`);

  ws.on("pong", () => heartbeat(user));

  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as WebSocketMessage;
      heartbeat(user);

      if (RegisterMessageSchema.safeParse(msg).success) {
        user.username = (msg as { username: string }).username;
        waitingQueue.push(user);
        logger.info(`User ${user.id} registered as ${user.username}`);
        tryMatch();
      }

      if (NextMessageSchema.safeParse(msg).success) {
        endSession(user);
      }

      const chatResult = ChatMessageSchema.safeParse(msg);
      if (chatResult.success) {
        const sessionId = user.sessionId;
        if (!sessionId || !activeChats[sessionId]) return;

        const chat = activeChats[sessionId];
        const otherUser = chat.user1.id === user.id ? chat.user2 : chat.user1;
        const chatMsg = chatResult.data;

        if (chatMsg.imageUrl) {
          await Message.create({
            sessionId,
            sender: user.username,
            imageUrl: chatMsg.imageUrl,
          });
        }

        const payload = {
          type: "message" as const,
          sender: user.username,
          text: chatMsg.text,
          imageUrl: chatMsg.imageUrl,
          timestamp: new Date().toISOString(),
        };

        otherUser.ws.send(JSON.stringify(payload));
      }
    } catch (err) {
      logger.error("WebSocket message error:", err);
    }
  });

  ws.on("close", () => {
    const idx = waitingQueue.findIndex((u) => u.id === user.id);
    if (idx !== -1) waitingQueue.splice(idx, 1);

    if (user.sessionId && activeChats[user.sessionId]) {
      endSession(user);
    }

    logger.info(`Connection closed: ${user.id}`);
  });
});

// -----------------------------
// 3. MongoDB connection
// -----------------------------
async function connectDB() {
  try {
    await mongoose.connect(config.MONGO_URI);
    logger.info("✅ Connected to MongoDB");
  } catch (err) {
    logger.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

connectDB();

// -----------------------------
// 4. Error handling
// -----------------------------
app.use(errorHandler);

// -----------------------------
// 5. Start server
// -----------------------------
server.listen(config.PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${config.PORT}`);
});