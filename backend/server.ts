// server.ts
import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response } from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import mongoose, { Schema, Document, model } from "mongoose";
import multer from "multer";
import cors from "cors";
import { v4 as uuid } from "uuid";
import path from "path";



// -----------------------------
// 1. MongoDB setup
// -----------------------------

mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// -----------------------------
// 2. Mongoose Message model
// -----------------------------
interface IMessage extends Document {
  sessionId: string;
  sender: string;
  text?: string;
  imageUrl?: string;
  timestamp: Date;
}

const messageSchema = new Schema<IMessage>({
  sessionId: { type: String, required: true },
  sender: { type: String, required: true },
  text: { type: String },
  imageUrl: { type: String },
  timestamp: { type: Date, default: Date.now },
});

const Message = model<IMessage>("Message", messageSchema);

// -----------------------------
// 3. Express setup
// -----------------------------
const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// multer for image uploads
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) => cb(null, `${uuid()}-${file.originalname}`),
});
const upload = multer({ storage });

// Upload route
app.post("/upload", upload.single("image"), async (req: Request, res: Response) => {
  const { sessionId, sender } = req.body;

  if (!req.file || !sessionId || !sender) {
    return res.status(400).json({ error: "Missing required data" });
  }

  try {
    const msg = await Message.create({
      sessionId,
      sender,
      imageUrl: `/uploads/${req.file.filename}`,
    });

    res.json({ imageUrl: msg.imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save image" });
  }
});

// -----------------------------
// 4. WebSocket setup
// -----------------------------
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

interface User {
  id: string;
  username: string;
  ws: WebSocket;
  sessionId?: string;
}

const waitingQueue: User[] = [];
const activeChats: Record<string, { user1: User; user2: User }> = {};

function tryMatch() {
  while (waitingQueue.length >= 2) {
    const user1 = waitingQueue.shift()!;
    const user2 = waitingQueue.shift()!;
    const sessionId = uuid();

    user1.sessionId = sessionId;
    user2.sessionId = sessionId;
    activeChats[sessionId] = { user1, user2 };

    user1.ws.send(JSON.stringify({ type: "match", sessionId, username: user2.username }));
    user2.ws.send(JSON.stringify({ type: "match", sessionId, username: user1.username }));
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

  otherUser.ws.send(JSON.stringify({ type: "skipped" }));

  waitingQueue.push(user, otherUser);
  tryMatch();
}

wss.on("connection", (ws: WebSocket) => {
  const user: User = { id: uuid(), username: "Anonymous", ws };

  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "register") {
        user.username = msg.username;
        waitingQueue.push(user);
        tryMatch();
      }

      if (msg.type === "next") {
        endSession(user);
      }

if (msg.type === "message") {
  const sessionId = user.sessionId;
  if (!sessionId || !activeChats[sessionId]) return;

  const chat = activeChats[sessionId];
  const otherUser = chat.user1.id === user.id ? chat.user2 : chat.user1;

  // Only save image messages
  if (msg.imageUrl) {
    await Message.create({
      sessionId,
      sender: user.username,
      imageUrl: msg.imageUrl,
    });
  }

  const payload = {
    type: "message",
    sender: user.username,
    text: msg.text, // still send text to partner
    imageUrl: msg.imageUrl,
    timestamp: new Date().toLocaleTimeString(),
  };

  otherUser.ws.send(JSON.stringify(payload));
}

    } catch (err) {
      console.error(err);
    }
  });

  ws.on("close", () => {
    const idx = waitingQueue.findIndex((u) => u.id === user.id);
    if (idx !== -1) waitingQueue.splice(idx, 1);

    if (user.sessionId && activeChats[user.sessionId]) {
      endSession(user);
    }
  });
});

// -----------------------------
// 5. Start server
// -----------------------------
server.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));
