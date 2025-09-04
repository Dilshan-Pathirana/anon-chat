const WebSocket = require("ws");
const { v4: uuid } = require("uuid");

const NUM_USERS = 10; 
const SERVER_URL = "ws://localhost:3000"; // ✅ FIXED to match backend

const users = [];

for (let i = 0; i < NUM_USERS; i++) {
  const username = `SimUser-${i + 1}`;
  const ws = new WebSocket(SERVER_URL);

  ws.on("open", () => {
    console.log(`${username} connected`);
  });

  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    console.log(`${username} received:`, msg);
  });

  ws.on("error", (err) => {
    console.error(`${username} error:`, err.message);
  });

  users.push({ username, ws });
}

// Send random messages every few seconds
setInterval(() => {
  users.forEach((user) => {
    if (user.ws.readyState === WebSocket.OPEN) {
      const text = `Hello from ${user.username} - ${uuid().slice(0, 5)}`;
      user.ws.send(JSON.stringify({ type: "message", body: { username: user.username, text } }));
    }
  });
}, 2000);

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === "match") {
    alert(`✅ Matched with user (${msg.username || "Anonymous"})`);
    setSessionId(msg.sessionId);
  } else if (msg.type === "skipped") {
    alert("⏭️ You skipped this user");
  } else if (msg.type === "message") {
    setMessages((prev) => [...prev, msg]);
  }
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === "match") {
    alert(`✅ Matched with user (${msg.username || "Anonymous"})`);
    setSessionId(msg.sessionId);
  } else if (msg.type === "skipped") {
    alert("⏭️ You skipped this user");
  } else if (msg.type === "message") {
    setMessages((prev) => [...prev, msg]);
  }
};