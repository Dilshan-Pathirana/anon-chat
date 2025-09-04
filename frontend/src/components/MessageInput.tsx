import React, { useState } from "react";

interface Props {
  onSend: (text?: string, file?: File) => void;
}

const MessageInput: React.FC<Props> = ({ onSend }) => {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleSend = () => {
    if (text || file) {
      onSend(text, file || undefined);
      setText("");
      setFile(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className="flex gap-2 p-2 border-t">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type a message..."
        className="flex-1 border rounded px-2 py-1"
      />
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button
        onClick={handleSend}
        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
      >
        Send
      </button>
    </div>
  );
};

export default MessageInput;
