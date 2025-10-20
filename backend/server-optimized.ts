import 'dotenv/config';
import express from "express";
import http from "http";
import type { WebSocket } from "ws";
import { WebSocketServer } from "ws";
import mongoose from "mongoose";
import multer from "multer";
import cors from "cors";
import { v4 as uuid } from "uuid";
import path from "path";
import helmet from "helmet";
import { config } from "./config/env";
import logger from "./config/logger";
import { errorHandler } from "./middleware/errorHandler";
import {
  apiLimiter,
  uploadLimiter,
  validateFileUpload,
} from "./middleware/rateLimiter";
import Message from "./models/Message";
import { User, WebSocketMessage } from "./types/websocket"; // ✅ keep your own app types
import ConnectionPool from "./lib/ConnectionPool";
import MessageQueue from "./lib/MessageQueue";
import FileUploadManager from "./lib/FileUploadManager";

// -----------------------------
// 1. Initialization
// -----------------------------
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const connectionPool = new ConnectionPool();
const messageQueue = new MessageQueue();
const uploadDir = path.resolve("uploads");
const cacheDir = path.resolve("uploads/cache");

const fileUploadManager = new FileUploadManager(
  uploadDir,
  cacheDir,
  config.MAX_FILE_SIZE
);

// -----------------------------
// 2. Express setup
// -----------------------------
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : "http://localhost:5173",
  })
);
app.use(express.json());
app.use(apiLimiter);

// Static files
app.use(
  "/uploads",
  express.static(uploadDir, {
    maxAge: "1d",
    etag: true,
  })
);

// Multer file upload configuration
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => cb(null, `${uuid()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: config.MAX_FILE_SIZE },
});

// -----------------------------
// 3. WebSocket state
// -----------------------------
const waitingQueue: User[] = [];
const activeChats: Record<string, { user1: User; user2: User }> = {};

// -----------------------------
// 4. WebSocket functions
// -----------------------------
function tryMatch() {
  while (waitingQueue.length >= 2) {
    const user1 = waitingQueue.shift()!;
    const user2 = waitingQueue.shift()!;
    const sessionId = uuid();

    user1.sessionId = sessionId;
    user2.sessionId = sessionId;
    activeChats[sessionId] = { user1, user2 };

    const matchPayload = { type: "match" as const, sessionId };

    messageQueue.enqueue(sessionId, {
      target: user1,
      message: JSON.stringify({
        ...matchPayload,
        username: user2.username,
      }),
    });

    messageQueue.enqueue(sessionId, {
      target: user2,
      message: JSON.stringify({
        ...matchPayload,
        username: user1.username,
      }),
    });

    logger.info(`Matched users ${user1.id} and ${user2.id} in session ${sessionId}`);
  }
}

function endSession(user: User) {
  const sessionId = user.sessionId;
  if (!sessionId || !activeChats[sessionId]) return;

  const chat = activeChats[sessionId];
  const otherUser = chat.user1.id === user.id ? chat.user2 : chat.user1;

  delete activeChats[sessionId];
  messageQueue.clear(sessionId);

  user.sessionId = undefined;
  otherUser.sessionId = undefined;

  if (otherUser.ws.readyState === 1) { // WebSocket.OPEN
    messageQueue.enqueue(sessionId, {
      target: otherUser,
      message: JSON.stringify({ type: "skipped" }),
    });
  }

  waitingQueue.push(user, otherUser);
  logger.info(`Session ${sessionId} ended — users returned to queue`);
  tryMatch();
}

// -----------------------------
// 5. Routes
// -----------------------------
app.post(
  "/upload",
  uploadLimiter,
  upload.single("image"),
  validateFileUpload,
  async (req, res) => {
    const { sessionId, sender } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const processed = await fileUploadManager.processUpload({
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });

      const msg = await Message.create({
        sessionId,
        sender,
        imageUrl: processed.url,
      });

      logger.info(`File uploaded and processed: ${req.file.filename}`);
      res.json({ imageUrl: msg.imageUrl });
    } catch (err) {
      logger.error("File upload failed:", err);
      res.status(500).json({ error: "Failed to process image" });
    }
  }
);

// -----------------------------
// 6. WebSocket setup
// -----------------------------
messageQueue.start(async (sessionId: string, { target, message }: { target: User; message: string }) => {
  if (target.ws.readyState === 1) { // WebSocket.OPEN
    const canSend = await connectionPool.canSendMessage(target.id);
    if (canSend) {
      target.ws.send(message);
    } else {
      logger.warn(`Rate limit exceeded for user ${target.id}`);
    }
  }
});

wss.on("connection", (ws: WebSocket) => {
  const user: User = {
    id: uuid(),
    username: "Anonymous",
    ws: ws,
    lastActivity: new Date(),
  };

  if (!connectionPool.addConnection(user.id, ws)) {
    logger.warn("Connection limit reached, rejecting connection");
    ws.close();
    return;
  }

  logger.info(`New connection: ${user.id}`);

  ws.on("message", async (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString()) as WebSocketMessage;
      user.lastActivity = new Date();

      if (!(await connectionPool.canSendMessage(user.id))) {
        logger.warn(`Rate limit exceeded for user ${user.id}`);
        return;
      }

      switch (msg.type) {
        case "register":
          user.username = msg.username;
          waitingQueue.push(user);
          logger.info(`User ${user.id} registered as ${user.username}`);
          tryMatch();
          break;

        case "next":
          endSession(user);
          break;

        case "message":
          if (!user.sessionId) return;
          const chat = activeChats[user.sessionId];
          if (!chat) return;

          const otherUser = chat.user1.id === user.id ? chat.user2 : chat.user1;

          if (msg.imageUrl) {
            await Message.create({
              sessionId: user.sessionId,
              sender: user.username,
              imageUrl: msg.imageUrl,
            });
          }

          messageQueue.enqueue(user.sessionId, {
            target: otherUser,
            message: JSON.stringify({
              type: "message",
              sender: user.username,
              text: msg.text,
              imageUrl: msg.imageUrl,
              timestamp: new Date().toISOString(),
            }),
          });
          break;
      }
    } catch (err) {
      logger.error("WebSocket message error:", err);
    }
  });

  ws.on("close", () => {
    connectionPool.removeConnection(user.id);
    const idx = waitingQueue.findIndex((u) => u.id === user.id);
    if (idx !== -1) waitingQueue.splice(idx, 1);

    if (user.sessionId && activeChats[user.sessionId]) {
      endSession(user);
    }

    logger.info(`Connection closed: ${user.id}`);
  });
});

// -----------------------------
// 7. Cleanup tasks
// -----------------------------
setInterval(async () => {
  try {
    await fileUploadManager.cleanup();
  } catch (err) {
    logger.error("File cleanup failed:", err);
  }
}, 24 * 60 * 60 * 1000);

// -----------------------------
// 8. MongoDB connection
// -----------------------------
mongoose
  .connect(config.MONGO_URI)
  .then(() => logger.info("✅ Connected to MongoDB"))
  .catch((err) => {
    logger.error("MongoDB connection error:", err);
    process.exit(1);
  });

// -----------------------------
// 9. Error handling
// -----------------------------
app.use(errorHandler);

// -----------------------------
// 10. Start server
// -----------------------------
server.listen(config.PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${config.PORT}`);
});
