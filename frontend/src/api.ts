import SessionManager from './utils/SessionManager';

export const uploadImage = async (file: File) => {
  const form = new FormData();
  form.append("image", file);

  const headers = SessionManager.getHeaders();
  delete headers['Content-Type']; // Let browser set correct content-type for FormData

  const res = await fetch("http://localhost:3000/upload", {
    method: "POST",
    headers,
    body: form
  });

  SessionManager.handleResponseHeaders(res.headers);

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.statusText}`);
  }

  const data = await res.json();
  return data.imageUrl;
};

export const connectWebSocket = (): WebSocket => {
  const sessionId = SessionManager.getSessionId();
  const wsUrl = new URL('ws://localhost:3000');
  
  if (sessionId) {
    wsUrl.searchParams.append('sessionId', sessionId);
  }

  const ws = new WebSocket(wsUrl.toString());

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'session' && data.sessionId) {
        SessionManager.setSessionId(data.sessionId);
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  };

  return ws;
};
