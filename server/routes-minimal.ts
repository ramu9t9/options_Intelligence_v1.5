import express, { type Express } from "express";
import { createServer } from "http";

export function registerRoutes(app: Express) {
  // Basic health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Basic auth endpoints (stubbed for now)
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (username && password) {
      res.json({ 
        token: "mock-token", 
        user: { id: 1, username, email: `${username}@example.com` }
      });
    } else {
      res.status(400).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/auth/register", (req, res) => {
    const { username, password, email } = req.body;
    if (username && password && email) {
      res.json({ 
        token: "mock-token", 
        user: { id: 1, username, email }
      });
    } else {
      res.status(400).json({ error: "Missing required fields" });
    }
  });

  app.get("/api/auth/verify", (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      res.json({ 
        user: { id: 1, username: "testuser", email: "test@example.com" }
      });
    } else {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // Basic market data endpoints
  app.get("/api/instruments", (req, res) => {
    res.json([
      { id: 1, symbol: "NIFTY", name: "NIFTY 50" },
      { id: 2, symbol: "BANKNIFTY", name: "BANK NIFTY" },
      { id: 3, symbol: "FINNIFTY", name: "FIN NIFTY" }
    ]);
  });

  app.get("/api/option-chain/:symbol", (req, res) => {
    const { symbol } = req.params;
    res.json({
      symbol,
      ltp: 22150,
      change: 125.50,
      changePercent: 0.57,
      volume: 1000000,
      optionChain: [
        {
          strike: 22000,
          callOI: 1000000,
          callOIChange: 50000,
          callLTP: 180.50,
          callLTPChange: 5.25,
          callVolume: 25000,
          putOI: 800000,
          putOIChange: -20000,
          putLTP: 28.75,
          putLTPChange: -2.15,
          putVolume: 15000
        },
        {
          strike: 22100,
          callOI: 950000,
          callOIChange: 45000,
          callLTP: 125.25,
          callLTPChange: 3.75,
          callVolume: 22000,
          putOI: 850000,
          putOIChange: -15000,
          putLTP: 48.50,
          putLTPChange: -1.85,
          putVolume: 18000
        },
        {
          strike: 22200,
          callOI: 1200000,
          callOIChange: 75000,
          callLTP: 85.75,
          callLTPChange: 2.25,
          callVolume: 30000,
          putOI: 900000,
          putOIChange: -25000,
          putLTP: 78.25,
          putLTPChange: -3.50,
          putVolume: 20000
        }
      ]
    });
  });

  const server = createServer(app);
  return server;
}