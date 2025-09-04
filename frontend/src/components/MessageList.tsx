import React, { useRef, useEffect } from "react";

export interface Message {
  id: string;
  sender: string;
  timestamp: string;
  text?: string;
  imageUrl?: string;
}

interface Props {
  messages: Message[];
  currentUser: string;
}

const MessageList: React.FC<Props> = ({ messages, currentUser }) => {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
      {messages.map((msg) => {
        const isMe = msg.sender === currentUser;
        return (
          <div
            key={msg.id}
            className={`flex items-end ${
              isMe ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs rounded-xl px-4 py-2 break-words shadow-sm ${
                isMe
                  ? "bg-indigo-600 text-white rounded-br-none"
                  : "bg-white text-gray-900 rounded-bl-none"
              }`}
            >
              <p className="text-[11px] font-semibold opacity-70 mb-0.5">
                {msg.sender}
              </p>
              {msg.text && <p className="leading-relaxed">{msg.text}</p>}
              {msg.imageUrl && (
                <img
                  src={
                    msg.imageUrl.startsWith("http")
                      ? msg.imageUrl
                      : `http://localhost:3000${msg.imageUrl}`
                  }
                  alt="uploaded"
                  className="mt-2 rounded-lg max-w-full shadow-md"
                />
              )}
              <p className="text-[9px] text-gray-400 mt-1 text-right select-none">
                {msg.timestamp}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={endRef}></div>
    </div>
  );
};

export default MessageList;
