import { useEffect, useRef, useState, useCallback } from 'react';
import SessionManager from '../utils/SessionManager';

import { WebSocketMessage } from '../types/websocket';

interface WebSocketOptions {
  url: string;
  onMessage?: (data: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export const useWebSocket = ({
  url,
  onMessage,
  onConnect,
  onDisconnect,
  reconnectDelay = 5000,
  maxReconnectAttempts = 5,
}: WebSocketOptions) => {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<number | undefined>(undefined);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    // Add session ID to WebSocket URL if available
    const wsUrl = new URL(url);
    const sessionId = SessionManager.getSessionId();
    if (sessionId) {
      wsUrl.searchParams.append('sessionId', sessionId);
    }

    ws.current = new WebSocket(wsUrl.toString());

    ws.current.onopen = () => {
      console.log('✅ Connected to WebSocket');
      setIsConnected(true);
      reconnectAttempts.current = 0;
      onConnect?.();
    };

    ws.current.onclose = () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
      onDisconnect?.();

      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectTimeout.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, reconnectDelay);
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle session-related messages
        if (data.type === 'session' && data.sessionId) {
          SessionManager.setSessionId(data.sessionId);
        }
        
        onMessage?.(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }, [url, onMessage, onConnect, onDisconnect, reconnectDelay, maxReconnectAttempts]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      ws.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((data: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  return {
    isConnected,
    sendMessage,
  };
};