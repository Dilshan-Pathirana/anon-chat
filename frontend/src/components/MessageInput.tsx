import React, { useState, useRef, useCallback } from "react";
import Spinner from "./Spinner";

interface Props {
  onSend: (text?: string, file?: File) => Promise<void>;
  onTyping?: () => void;
  disabled?: boolean;
}

const MessageInput: React.FC<Props> = ({
  onSend,
  onTyping,
  disabled = false,
}) => {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null); // ✅ fixed initialization

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !fileInputRef.current?.files?.length) return;

    const file = fileInputRef.current?.files?.[0];
    try {
      setIsUploading(true);
      await onSend(message.trim() || undefined, file);
      setMessage("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleTyping = useCallback(() => {
    onTyping?.();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      // Typing stopped after 1 second
    }, 1000);
  }, [onTyping]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert("File size must be less than 5MB");
      e.target.value = "";
      return;
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      alert("Only JPEG, PNG and GIF files are allowed");
      e.target.value = "";
      return;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white border-t">
      <div className="flex items-center space-x-2">
        {/* File Upload Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
          disabled={disabled || isUploading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          disabled={disabled || isUploading}
          aria-label="Attach file"
        >
          📎
        </button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={disabled || isUploading}
          />
          {isUploading && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
              <Spinner size="sm" />
              <span className="text-xs text-gray-500 ml-2">
                {uploadProgress}%
              </span>
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          type="submit"
          className={`p-2 rounded-full ${
            disabled || (!message.trim() && !fileInputRef.current?.files?.length)
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          } text-white transition-colors`}
          disabled={
            disabled ||
            isUploading ||
            (!message.trim() && !fileInputRef.current?.files?.length)
          }
          aria-label="Send message"
        >
          {isUploading ? <Spinner size="sm" color="border-white" /> : "➤"}
        </button>
      </div>
    </form>
  );
};

export default MessageInput;
