const WebSocket = require("ws");
const { v4: uuid } = require("uuid");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Configuration
const CONFIG = {
  numUsers: 100,
  messageInterval: 500, // ms between messages
  imageInterval: 5000, // ms between image uploads
  serverUrl: "ws://localhost:3000",
  httpUrl: "http://localhost:3000",
  testDuration: 5 * 60 * 1000, // 5 minutes
  rampUpTime: 60 * 1000, // 1 minute to add all users
};

// Metrics
const metrics = {
  connections: 0,
  messagesSent: 0,
  messagesReceived: 0,
  errors: 0,
  imageUploads: 0,
  imageUploadErrors: 0,
  matchesMade: 0,
  responseTimeTotal: 0,
  responseTimes: [], // Array to store response times for percentile calculation
};

// Sample test image
const testImagePath = path.join(__dirname, "test-image.jpg");

class User {
  constructor(id) {
    this.id = id;
    this.username = `SimUser-${id}`;
    this.sessionId = null;
    this.ws = null;
    this.connected = false;
    this.matchedWith = null;
    this.messageCount = 0;
    this.lastMessageTime = null;
  }

  connect() {
    return new Promise((resolve) => {
      this.ws = new WebSocket(CONFIG.serverUrl);

      this.ws.on("open", () => {
        this.connected = true;
        metrics.connections++;
        this.ws.send(JSON.stringify({ type: "register", username: this.username }));
        resolve();
      });

      this.ws.on("message", (data) => {
        const startTime = this.lastMessageTime;
        const msg = JSON.parse(data.toString());
        
        if (startTime) {
          const responseTime = Date.now() - startTime;
          metrics.responseTimeTotal += responseTime;
          metrics.responseTimes.push(responseTime);
        }

        metrics.messagesReceived++;

        if (msg.type === "match") {
          this.sessionId = msg.sessionId;
          this.matchedWith = msg.username;
          metrics.matchesMade++;
        }
      });

      this.ws.on("error", (err) => {
        metrics.errors++;
        console.error(`${this.username} error:`, err.message);
      });

      this.ws.on("close", () => {
        this.connected = false;
        metrics.connections--;
      });
    });
  }

  async sendMessage() {
    if (!this.connected || !this.sessionId) return;

    try {
      this.lastMessageTime = Date.now();
      this.ws.send(JSON.stringify({
        type: "message",
        text: `Test message ${++this.messageCount} from ${this.username}`,
        sender: this.username,
      }));
      metrics.messagesSent++;
    } catch (error) {
      metrics.errors++;
    }
  }

  async sendImage() {
    if (!this.connected || !this.sessionId) return;

    try {
      const formData = new FormData();
      formData.append("image", fs.createReadStream(testImagePath));
      formData.append("sessionId", this.sessionId);
      formData.append("sender", this.username);

      const startTime = Date.now();
      const response = await axios.post(`${CONFIG.httpUrl}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      const responseTime = Date.now() - startTime;
      metrics.responseTimeTotal += responseTime;
      metrics.responseTimes.push(responseTime);
      metrics.imageUploads++;

      if (response.data.imageUrl) {
        this.ws.send(JSON.stringify({
          type: "message",
          imageUrl: response.data.imageUrl,
          sender: this.username,
        }));
      }
    } catch (error) {
      metrics.imageUploadErrors++;
    }
  }
}

function printMetrics() {
  const avgResponseTime = metrics.responseTimeTotal / (metrics.messagesSent + metrics.imageUploads) || 0;
  const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;

  console.clear();
  console.log("\n=== Load Test Metrics ===");
  console.log(`Active Connections: ${metrics.connections}/${CONFIG.numUsers}`);
  console.log(`Messages Sent: ${metrics.messagesSent}`);
  console.log(`Messages Received: ${metrics.messagesReceived}`);
  console.log(`Image Uploads: ${metrics.imageUploads}`);
  console.log(`Matches Made: ${metrics.matchesMade}`);
  console.log(`Errors: ${metrics.errors}`);
  console.log(`Image Upload Errors: ${metrics.imageUploadErrors}`);
  console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`95th Percentile Response Time: ${p95}ms`);
  console.log(`99th Percentile Response Time: ${p99}ms`);
}

async function startLoadTest() {
  const users = [];
  const userInterval = CONFIG.rampUpTime / CONFIG.numUsers;

  console.log(`Starting load test with ${CONFIG.numUsers} users...`);
  console.log(`Ramping up over ${CONFIG.rampUpTime / 1000} seconds...`);

  // Create and connect users gradually
  for (let i = 0; i < CONFIG.numUsers; i++) {
    await new Promise(resolve => setTimeout(resolve, userInterval));
    const user = new User(i + 1);
    await user.connect();
    users.push(user);
  }

  // Start sending messages
  setInterval(() => {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    if (randomUser) randomUser.sendMessage();
  }, CONFIG.messageInterval);

  // Start sending images
  setInterval(() => {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    if (randomUser) randomUser.sendImage();
  }, CONFIG.imageInterval);

  // Print metrics every second
  const metricsInterval = setInterval(printMetrics, 1000);

  // End test after duration
  setTimeout(() => {
    clearInterval(metricsInterval);
    users.forEach(user => user.ws.close());
    printMetrics();
    console.log("\nLoad test completed!");
    process.exit(0);
  }, CONFIG.testDuration);
}

startLoadTest().catch(console.error);