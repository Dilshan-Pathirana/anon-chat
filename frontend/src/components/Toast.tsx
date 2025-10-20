import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[type];

  return (
    <div
      className={`fixed top-4 right-4 p-4 rounded-lg text-white shadow-lg transition-opacity duration-300 ${bgColor}`}
      role="alert"
    >
      <div className="flex items-center">
        <span className="mr-2">
          {type === 'success' && '✅'}
          {type === 'error' && '❌'}
          {type === 'info' && 'ℹ️'}
        </span>
        {message}
        <button
          onClick={onClose}
          className="ml-4 hover:opacity-75"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
};

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContainerProps {
  messages: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ messages, onRemove }) => {
  return (
    <div className="fixed top-0 right-0 z-50">
      {messages.map((msg) => (
        <Toast
          key={msg.id}
          message={msg.message}
          type={msg.type}
          onClose={() => onRemove(msg.id)}
        />
      ))}
    </div>
  );
};

export default Toast;