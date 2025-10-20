import React, { useState, useRef } from "react";
import { v4 as uuid } from "uuid";
import Header from "./Header";
import MessageInput from "./MessageInput";
import MessageList, { Message } from "./MessageList";
import { ToastContainer } from "./Toast";
import { useWebSocket } from "../hooks/useWebSocket";
import Spinner from "./Spinner";
import SessionManager from "../utils/SessionManager";

interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

import { WebSocketMessage } from "../types/websocket";

const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const username = useRef<string>(`User-${Math.floor(Math.random() * 1000)}`);
  const chatSessionId = useRef<string | null>(null); // Renamed for clarity
  const typingTimeoutRef = useRef<number | undefined>(undefined);

  const showToast = (message: string, type: ToastMessage["type"]) => {
    const id = uuid();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  const handleMessage = (data: WebSocketMessage) => {
    if (data.type === "match" && data.sessionId && data.username) {
      chatSessionId.current = data.sessionId;
      showToast(`Matched with ${data.username}! 🎉`, "success");
      setMessages([]);
      setIsLoading(false);
    }

    if (data.type === "skipped") {
      showToast("Partner skipped. Searching for new match... ⚡", "info");
      setMessages([]);
      setIsLoading(true);
    }

    if (data.type === "message" && data.sender) {
      const newMessage: Message = {
        id: uuid(),
        sender: data.sender,
        timestamp: data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
        text: data.text,
        imageUrl: data.imageUrl,
      };
      setMessages((prev) => [...prev, newMessage]);
    }

    if (data.type === "typing") {
      setPartnerTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = window.setTimeout(() => {
        setPartnerTyping(false);
      }, 1000);
    }
  };

  const { sendMessage: wsSend } = useWebSocket({
    url: "ws://localhost:3000",
    onMessage: handleMessage,
    onConnect: () => {
      wsSend({ type: "register", username: username.current });
      showToast("Connected to chat server ✅", "success");
    },
    onDisconnect: () => {
      showToast("Disconnected from server. Reconnecting... ❌", "error");
      setIsLoading(true);
    },
  });

  const handleSendMessage = async (text?: string, file?: File) => {
    let imageUrl: string | undefined;

    if (file) {
      try {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("sessionId", chatSessionId.current || "");
        formData.append("sender", username.current);

        const res = await fetch("http://localhost:3000/upload", {
          method: "POST",
          body: formData,
          headers: {
            ...SessionManager.getHeaders() // Add session headers for authentication
          }
        });

        SessionManager.handleResponseHeaders(res.headers); // Handle any new session ID

        if (!res.ok) {
          showToast("Failed to upload image ❌", "error");
          return;
        }

        const data = await res.json();
        imageUrl = data.imageUrl;
      } catch {
        showToast("Failed to upload image ❌", "error");
        return;
      }
    }

    wsSend({
      type: "message",
      text,
      imageUrl,
      sender: username.current,
    });

    const newMessage: Message = {
      id: uuid(),
      sender: username.current,
      text,
      imageUrl,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleTyping = () => {
    wsSend({ type: "typing" });
  };

  return (
    <div className="w-full max-w-4xl h-[80vh] flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
      <Header
        onSkip={() => {
          wsSend({ type: "next" });
          showToast("Skipped the current chat partner ⏭️", "info");
          setMessages([]);
        }}
        isConnected={!isLoading}
      />
      
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Spinner size="lg" />
              <p className="mt-4 text-gray-600">Looking for a chat partner...</p>
            </div>
          </div>
        ) : (
          <MessageList
            messages={messages}
            currentUser={username.current}
          />
        )}
        {partnerTyping && (
          <div className="absolute bottom-0 left-0 p-2 text-sm text-gray-500">
            Partner is typing...
          </div>
        )}
      </div>

      <MessageInput
        onSend={handleSendMessage}
        onTyping={handleTyping}
        disabled={isLoading}
      />

      <ToastContainer
        messages={toasts}
        onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );

};

export default ChatWindow;
