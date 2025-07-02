import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction, Express } from 'express';

export interface SecurityConfig {
  corsOrigins: string[];
  rateLimitWindow: number;
  maxRequestsPerWindow: number;
  enableHelmet: boolean;
  enableXssProtection: boolean;
  enableSqlInjectionProtection: boolean;
}

export class SecurityManager {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  // CORS Configuration
  getCorsOptions() {
    return cors({
      origin: true, // Allow all origins in development
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400 // 24 hours
    });
  }

  // Basic rate limiting
  createBasicRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // High limit to avoid blocking
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Too many requests. Please try again later.',
        retryAfter: 15
      }
    });
  }

  // Helmet security configuration
  getHelmetOptions() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "ws:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }

  // Input validation and sanitization
  validateInput() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Basic input validation
      if (req.body) {
        for (const key in req.body) {
          if (typeof req.body[key] === 'string') {
            // Remove potential XSS patterns
            req.body[key] = req.body[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            req.body[key] = req.body[key].replace(/javascript:/gi, '');
            req.body[key] = req.body[key].replace(/on\w+\s*=/gi, '');
          }
        }
      }
      next();
    };
  }

  // Request size limiting
  createRequestSizeLimit() {
    return (req: Request, res: Response, next: NextFunction) => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      let size = 0;
      
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > maxSize) {
          res.status(413).json({ error: 'Request entity too large' });
          return;
        }
      });
      
      next();
    };
  }

  // Error handling middleware
  errorHandler() {
    return (err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('Security Error:', err);
      
      if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS policy violation' });
      }
      
      if (err.status === 429) {
        return res.status(429).json({ 
          error: 'Too many requests',
          retryAfter: err.retryAfter 
        });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    };
  }
}

// Default security configuration
const defaultConfig: SecurityConfig = {
  corsOrigins: ['http://localhost:3000', 'http://localhost:5000', 'https://*.replit.app', 'https://*.replit.dev'],
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  maxRequestsPerWindow: 1000,
  enableHelmet: true,
  enableXssProtection: true,
  enableSqlInjectionProtection: true
};

const securityManager = new SecurityManager(defaultConfig);

export function setupSecurity(app: Express) {
  // CORS
  app.use(securityManager.getCorsOptions());
  
  // Helmet security headers
  app.use(securityManager.getHelmetOptions());
  
  // Rate limiting
  app.use(securityManager.createBasicRateLimit());
  
  // Input validation
  app.use(securityManager.validateInput());
  
  // Request size limiting
  app.use(securityManager.createRequestSizeLimit());
  
  // Error handling
  app.use(securityManager.errorHandler());
}

export { securityManager };