import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  sender: { type: String, required: true },
  text: { type: String },
  imageUrl: { type: String },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("Message", messageSchema);
