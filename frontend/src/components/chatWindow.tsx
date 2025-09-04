import React, { useState, useEffect, useRef } from "react";
import { v4 as uuid } from "uuid";
import Header from "./Header";
import MessageInput from "./MessageInput";
import ActionBar from "./ActionBar";
import MessageList, { Message } from "./MessageList";

const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const username = useRef<string>(`User-${Math.floor(Math.random() * 1000)}`);
  const sessionId = useRef<string | null>(null);

  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:3000");

    ws.current.onopen = () => {
      console.log("✅ Connected to WebSocket");
      ws.current?.send(
        JSON.stringify({ type: "register", username: username.current })
      );
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "match") {
        sessionId.current = data.sessionId;
        alert(`🎉 Matched with ${data.username}`);
        setMessages([]);
      }

      if (data.type === "skipped") {
        alert("⚡ Partner skipped. Searching for new match...");
        setMessages([]);
      }

      if (data.type === "message") {
        setMessages((prev) => [
          ...prev,
          {
            id: uuid(),
            sender: data.sender,
            timestamp: new Date(data.timestamp).toLocaleTimeString(),
            text: data.text,
            imageUrl: data.imageUrl,
          },
        ]);
      }
    };

    return () => ws.current?.close();
  }, []);

  const sendMessage = async (text?: string, file?: File) => {
    let imageUrl: string | undefined;

    if (file) {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("sessionId", sessionId.current || "");
      formData.append("sender", username.current);

      const res = await fetch("http://localhost:3000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      imageUrl = data.imageUrl;
    }

    const payload = {
      type: "message",
      text,
      imageUrl,
      sender: username.current,
    };

    ws.current?.send(JSON.stringify(payload));

    setMessages((prev) => [
      ...prev,
      {
        id: uuid(),
        sender: username.current,
        text,
        imageUrl,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const handleSkip = () => {
    ws.current?.send(JSON.stringify({ type: "next" }));
    alert("⏭️ You skipped the user");
    setMessages([]);
  };

  return (
    <div className="w-full max-w-2xl bg-gradient-to-br from-indigo-100 to-white rounded-lg shadow-lg flex flex-col h-[80vh] overflow-hidden">
      <Header context="Anonymous Chat" instructions="Start chatting!" />
      <MessageList messages={messages} currentUser={username.current} />
      <MessageInput onSend={sendMessage} />
      <ActionBar onSkip={handleSkip} onEsc={() => {}} />
    </div>
  );
};

export default ChatWindow;
