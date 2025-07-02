import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 12;

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
    subscriptionTier?: string;
    rateLimit?: number;
  };
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(user: { id: number; username: string; email: string; role: string }): string {
    return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  static async register(userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    // Check if user already exists
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const existingEmail = await storage.getUserByEmail(userData.email);
    if (existingEmail) {
      throw new Error('Email already registered');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(userData.password);

    // Create user
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword,
    });

    // Generate token
    const token = this.generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    return { user: { ...user, password: undefined }, token };
  }

  static async login(username: string, password: string) {
    // Find user
    const user = await storage.getUserByUsername(username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isValidPassword = await this.comparePassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await storage.updateUserLastLogin(user.id);

    // Generate token
    const token = this.generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    return { user: { ...user, password: undefined }, token };
  }
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7);
    const decoded = AuthService.verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get fresh user data
    const user = await storage.getUser(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Role-based access control middleware
export const checkRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
}

// Subscription tier access control
export const checkSubscriptionTier = (requiredTiers: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Get user's current subscription tier from database
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(401).json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const userTier = user.subscriptionTier || 'FREE';
      
      if (!requiredTiers.includes(userTier)) {
        return res.status(403).json({ 
          error: `Subscription upgrade required. Required tiers: ${requiredTiers.join(', ')}. Your tier: ${userTier}`,
          code: 'SUBSCRIPTION_UPGRADE_REQUIRED',
          requiredTiers,
          userTier,
          upgradeUrl: '/subscribe'
        });
      }

      // Add subscription info to request for further processing
      req.user.subscriptionTier = userTier;
      next();

    } catch (error) {
      console.error('Subscription check error:', error);
      return res.status(500).json({ 
        error: 'Failed to verify subscription',
        code: 'SUBSCRIPTION_CHECK_FAILED'
      });
    }
  };
}

// Combined role and subscription check
export const checkAccess = (allowedRoles: string[], requiredTiers: string[] = []) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // First check authentication
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check role permissions
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    // If subscription tiers are specified, check them
    if (requiredTiers.length > 0) {
      try {
        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(401).json({ 
            error: 'User not found',
            code: 'USER_NOT_FOUND'
          });
        }

        const userTier = user.subscriptionTier || 'FREE';
        
        if (!requiredTiers.includes(userTier)) {
          return res.status(403).json({ 
            error: `Subscription upgrade required. Required tiers: ${requiredTiers.join(', ')}. Your tier: ${userTier}`,
            code: 'SUBSCRIPTION_UPGRADE_REQUIRED',
            requiredTiers,
            userTier,
            upgradeUrl: '/subscribe'
          });
        }

        req.user.subscriptionTier = userTier;
      } catch (error) {
        console.error('Access check error:', error);
        return res.status(500).json({ 
          error: 'Failed to verify access permissions',
          code: 'ACCESS_CHECK_FAILED'
        });
      }
    }

    next();
  };
}

// Feature flag middleware based on subscription tier
export const checkFeatureAccess = (feature: string) => {
  const featureMap: Record<string, string[]> = {
    'strategy_builder': ['PRO', 'VIP', 'INSTITUTIONAL'],
    'unlimited_alerts': ['VIP', 'INSTITUTIONAL'],
    'advanced_analytics': ['VIP', 'INSTITUTIONAL'],
    'api_access': ['INSTITUTIONAL'],
    'priority_support': ['VIP', 'INSTITUTIONAL'],
    'custom_indicators': ['VIP', 'INSTITUTIONAL'],
    'portfolio_tracking': ['PRO', 'VIP', 'INSTITUTIONAL'],
    'real_time_data': ['PRO', 'VIP', 'INSTITUTIONAL']
  };

  const requiredTiers = featureMap[feature] || [];
  
  return checkSubscriptionTier(requiredTiers);
}

// Rate limiting based on subscription tier
export const checkRateLimit = (feature: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(401).json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const userTier = user.subscriptionTier || 'FREE';
      
      // Define rate limits per tier
      const rateLimits: Record<string, Record<string, number>> = {
        'strategy_execution': {
          'FREE': 10,
          'PRO': 100,
          'VIP': 500,
          'INSTITUTIONAL': -1 // unlimited
        },
        'api_calls': {
          'FREE': 100,
          'PRO': 1000,
          'VIP': 5000,
          'INSTITUTIONAL': -1 // unlimited
        }
      };

      const limit = rateLimits[feature]?.[userTier] || 0;
      
      if (limit === 0) {
        return res.status(403).json({ 
          error: `Feature not available for ${userTier} tier`,
          code: 'FEATURE_NOT_AVAILABLE',
          userTier,
          upgradeUrl: '/subscribe'
        });
      }

      // Add rate limit info to request
      req.user.rateLimit = limit;
      next();

    } catch (error) {
      console.error('Rate limit check error:', error);
      return res.status(500).json({ 
        error: 'Failed to check rate limits',
        code: 'RATE_LIMIT_CHECK_FAILED'
      });
    }
  };
};

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return { valid: errors.length === 0, errors };
};