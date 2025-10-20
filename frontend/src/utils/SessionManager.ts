// Manages session ID storage and retrieval
class SessionManager {
  private static readonly SESSION_KEY = 'chat_session_id';

  // Get stored session ID if any
  public static getSessionId(): string | null {
    return localStorage.getItem(this.SESSION_KEY);
  }

  // Store new session ID
  public static setSessionId(sessionId: string): void {
    localStorage.setItem(this.SESSION_KEY, sessionId);
  }

  // Clear session ID
  public static clearSessionId(): void {
    localStorage.removeItem(this.SESSION_KEY);
  }

  // Add session ID to headers for API requests
  public static getHeaders(): Record<string, string> {
    const sessionId = this.getSessionId();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }
    
    return headers;
  }

  // Handle session ID from response headers
  public static handleResponseHeaders(headers: Headers): void {
    const newSessionId = headers.get('x-session-id');
    if (newSessionId) {
      this.setSessionId(newSessionId);
    }
  }
}

export default SessionManager;