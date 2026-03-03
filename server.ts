import express from "express";
import { createServer as createViteServer } from "vite";
import { IntelligentChatServer } from "./server/tcp_server.js";
import path from "path";
import net from "node:net";
import { Server as SocketServer } from "socket.io";
import { createServer as createHttpServer } from "node:http";

console.log("Starting Intelligent Gateway Server...");

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  const io = new SocketServer(httpServer);

  app.use(express.json());
  const PORT = 3000;
  const TCP_PORT = 0; // Use random available port for internal TCP server

  app.get("/test", (req, res) => res.send("OK"));

  app.all("/api/*", (req, res, next) => {
    console.log(`API Request: ${req.method} ${req.url}`);
    next();
  });

  // Initialize the Intelligent TCP Server
  let chatServer: IntelligentChatServer | null = null;
  try {
    chatServer = new IntelligentChatServer(TCP_PORT);
    console.log(`[TCP] Chat Server initialized on port ${TCP_PORT}`);

    // Listen for status updates and broadcast via Socket.io
    chatServer.on('statusUpdate', (status) => {
      io.emit('metrics', { ...status, tcpPort: chatServer?.getPort() });
    });
  } catch (err) {
    console.error("CRITICAL: Failed to initialize IntelligentChatServer:", err);
  }

  const apiRouter = express.Router();

  apiRouter.get("/health", (req, res) => {
    console.log("GET /api/health hit");
    res.json({ status: "ok", timestamp: new Date().toISOString(), tcpInitialized: !!chatServer });
  });

  apiRouter.get("/status", (req, res) => {
    console.log("GET /api/status hit");
    if (!chatServer) {
      return res.status(503).json({ error: "TCP Server not initialized" });
    }
    try {
      const status = chatServer.getStatus();
      res.json({ ...status, tcpPort: chatServer.getPort() });
    } catch (err) {
      console.error("Error in /api/status:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  apiRouter.post("/simulate/load", (req, res) => {
    if (!chatServer) return res.status(503).json({ error: "TCP Server not initialized" });
    
    const port = chatServer.getPort();
    console.log(`[SIMULATION] Starting mock connections to port ${port}`);
    
    // Create 3 mock connections
    for (let i = 0; i < 3; i++) {
      const client = net.createConnection({ port }, () => {
        console.log(`[SIMULATION] Mock client ${i} connected`);
        
        // Send periodic data
        const interval = setInterval(() => {
          if (client.destroyed) {
            clearInterval(interval);
            return;
          }
          client.write(`MOCK_DATA_${i}_${Date.now()}`);
        }, 1000 + Math.random() * 2000);

        // Disconnect after 30 seconds
        setTimeout(() => client.end(), 30000);
      });

      client.on('error', (err) => console.error(`[SIMULATION] Mock client ${i} error:`, err.message));
    }

    res.json({ message: "Simulation started (3 mock clients connected)" });
  });

  app.use("/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Using Vite middleware (Development)");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Using static file serving (Production)");
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[HTTP] Dashboard running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
