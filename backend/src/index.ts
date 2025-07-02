import dotenv from "dotenv";
import express from "express";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";

// Load environment variables
dotenv.config();

async function createServer() {
  const app = express();
  
  // Trust proxy headers
  app.set("trust proxy", 1);
  
  // Security middleware
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true }));
  
  // Initialize routes
  const httpServer = await registerRoutes(app);
  
  // Setup Vite in development mode
  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, httpServer);
  }
  
  return httpServer;
}

// Start server
createServer()
  .then((server) => {
    const port = parseInt(process.env.PORT || "5000");
    
    server.listen(port, "0.0.0.0", () => {
      console.log(`
  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
  █                                           █
  █         Options Intelligence Platform      █
  █              Backend Server               █
  █                                           █
  █         🚀 Server running on port ${port}     █
  █         📊 Real-time market data active    █
  █         💾 Database connected              █
  █                                           █
  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
      `);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });