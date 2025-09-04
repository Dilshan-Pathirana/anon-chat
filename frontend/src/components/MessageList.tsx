import React, { useRef, useEffect } from "react";

// Message type
export interface Message {
  id: string;
  sender: string;
  timestamp: string;
  text?: string;
  imageUrl?: string;
}

// Props
interface Props {
  messages: Message[];
  currentUser: string;
}

const MessageList: React.FC<Props> = ({ messages, currentUser }) => {
  const endRef = useRef<HTMLDivElement | null>(null);

  // Scroll to latest message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.map((msg) => {
        const isMe = msg.sender === currentUser;
        return (
          <div
            key={msg.id}
            className={`flex items-end ${isMe ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs p-2 rounded break-words ${
                isMe ? "bg-blue-500 text-white" : "bg-gray-200 text-black"
              }`}
            >
              <p className="text-xs font-semibold">{msg.sender}</p>
              {msg.text && <p>{msg.text}</p>}
              {msg.imageUrl && (
                <img
                  src={
                    msg.imageUrl.startsWith("http")
                      ? msg.imageUrl
                      : `http://localhost:3000${msg.imageUrl}`
                  }
                  alt="uploaded"
                  className="mt-1 rounded max-w-full"
                />
              )}
              <p className="text-[10px] text-gray-500 mt-1">{msg.timestamp}</p>
            </div>
          </div>
        );
      })}
      <div ref={endRef}></div>
    </div>
  );
};

export default MessageList;
