import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from './subscriptionService';
import { AuthRequest } from './auth';

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
      origin: (origin, callback) => {
        if (!origin || this.config.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400 // 24 hours
    });
  }

  // Simplified rate limiting
  createBasicRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // High limit to avoid blocking
      standardHeaders: true,
      legacyHeaders: false,
            legacyHeaders: false
          });
          
          return limiter(req, res, next);
        }

        // Check subscription-based limits
        const rateLimitCheck = await subscriptionService.checkApiRateLimit(req.user.id);
        
        if (!rateLimitCheck.allowed) {
          return res.status(429).json({
            error: 'API rate limit exceeded',
            limit: rateLimitCheck.limit,
            current: rateLimitCheck.current,
            resetTime: rateLimitCheck.resetTime
          });
        }

        // Increment API call counter
        await subscriptionService.incrementApiCall(req.user.id);
        
        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        next();
      }
    };
  }

  // Input validation and sanitization
  validateAndSanitizeInput() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // SQL Injection Protection
        if (this.config.enableSqlInjectionProtection) {
          const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)|(\-\-)|(\;)|(\||(\*|\%))/gi;
          
          const checkForSqlInjection = (obj: any, path = ''): boolean => {
            if (typeof obj === 'string') {
              if (sqlInjectionPattern.test(obj)) {
                console.warn(`Potential SQL injection attempt detected at ${path}: ${obj}`);
                return true;
              }
            } else if (typeof obj === 'object' && obj !== null) {
              for (const [key, value] of Object.entries(obj)) {
                if (checkForSqlInjection(value, `${path}.${key}`)) {
                  return true;
                }
              }
            }
            return false;
          };

          if (checkForSqlInjection(req.body) || checkForSqlInjection(req.query)) {
            return res.status(400).json({
              error: 'Invalid input detected',
              message: 'Request contains potentially harmful content'
            });
          }
        }

        // XSS Protection
        if (this.config.enableXssProtection) {
          const xssPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
          
          const sanitizeString = (str: string): string => {
            return str
              .replace(/[<>]/g, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+=/gi, '');
          };

          const sanitizeObject = (obj: any): any => {
            if (typeof obj === 'string') {
              if (xssPattern.test(obj)) {
                console.warn('XSS attempt detected and sanitized');
              }
              return sanitizeString(obj);
            } else if (typeof obj === 'object' && obj !== null) {
              const sanitized: any = Array.isArray(obj) ? [] : {};
              for (const [key, value] of Object.entries(obj)) {
                sanitized[key] = sanitizeObject(value);
              }
              return sanitized;
            }
            return obj;
          };

          req.body = sanitizeObject(req.body);
          req.query = sanitizeObject(req.query);
        }

        next();
      } catch (error) {
        console.error('Input validation error:', error);
        res.status(500).json({
          error: 'Internal server error during input validation'
        });
      }
    };
  }

  // Audit logging for sensitive operations
  auditLogger() {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // Log sensitive operations
      const sensitiveRoutes = [
        '/api/auth',
        '/api/subscription',
        '/api/admin',
        '/api/service-providers'
      ];

      const isSensitive = sensitiveRoutes.some(route => req.path.startsWith(route));
      
      if (isSensitive) {
        const originalSend = res.send;
        
        res.send = function(data) {
          const duration = Date.now() - startTime;
          
          console.log({
            timestamp: new Date().toISOString(),
            userId: req.user?.id || 'anonymous',
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            statusCode: res.statusCode,
            duration,
            sensitive: true
          });
          
          return originalSend.call(this, data);
        };
      }
      
      next();
    };
  }

  // API key validation for webhook endpoints
  validateApiKey(validApiKeys: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const apiKey = req.header('X-API-Key') || req.query.apiKey;
      
      if (!apiKey || !validApiKeys.includes(apiKey as string)) {
        return res.status(401).json({
          error: 'Invalid or missing API key'
        });
      }
      
      next();
    };
  }

  // Content Security Policy
  getContentSecurityPolicy() {
    return {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        connectSrc: ["'self'", 'ws:', 'wss:', 'https://apiconnect.angelone.in'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    };
  }

  // Request size limiting
  createRequestSizeLimit() {
    return (req: Request, res: Response, next: NextFunction) => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (req.headers['content-length']) {
        const contentLength = parseInt(req.headers['content-length']);
        if (contentLength > maxSize) {
          return res.status(413).json({
            error: 'Request too large',
            maxSize: '10MB'
          });
        }
      }
      
      next();
    };
  }

  // IP whitelist/blacklist
  createIpFilter(whitelist: string[] = [], blacklist: string[] = []) {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIp = req.ip || req.connection.remoteAddress || '';
      
      // Check blacklist first
      if (blacklist.length > 0 && blacklist.includes(clientIp)) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Your IP address is not allowed'
        });
      }
      
      // Check whitelist if configured
      if (whitelist.length > 0 && !whitelist.includes(clientIp)) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Your IP address is not whitelisted'
        });
      }
      
      next();
    };
  }

  // Session security
  getSessionConfig() {
    return {
      secret: process.env.SESSION_SECRET || 'dev-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict' as const
      },
      name: 'sessionId'
    };
  }

  // Error handling middleware
  errorHandler() {
    return (error: any, req: Request, res: Response, next: NextFunction) => {
      // Log error details
      console.error({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
      });

      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation failed',
          details: isDevelopment ? error.details : undefined
        });
      }
      
      if (error.name === 'UnauthorizedError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token'
        });
      }
      
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'File too large',
          message: 'Maximum file size exceeded'
        });
      }

      // Generic error response
      res.status(500).json({
        error: 'Internal server error',
        message: isDevelopment ? error.message : 'Something went wrong',
        stack: isDevelopment ? error.stack : undefined
      });
    };
  }
}

// Create security manager with production-ready defaults
export const securityManager = new SecurityManager({
  corsOrigins: [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://*.replit.dev',
    'https://*.replit.app'
  ],
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  maxRequestsPerWindow: 1000,
  enableHelmet: true,
  enableXssProtection: true,
  enableSqlInjectionProtection: true
});

// Security middleware setup function
export function setupSecurity(app: any) {
  // Trust proxy (important for Replit)
  app.set('trust proxy', 1);

  // CORS
  app.use(securityManager.getCorsOptions());

  // Request size limiting
  app.use(securityManager.createRequestSizeLimit());

  // Input validation and sanitization
  app.use(securityManager.validateAndSanitizeInput());

  // Audit logging
  app.use(securityManager.auditLogger());

  // Rate limiting (applied to API routes only, not static files)
  app.use('/api', securityManager.createSubscriptionBasedRateLimit());

  // Error handling (should be last)
  app.use(securityManager.errorHandler());
}