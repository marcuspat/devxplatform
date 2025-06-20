import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Logger } from '../../observability/logging/logger';

export interface JWTConfig {
  secret: string;
  issuer?: string;
  audience?: string;
  expiresIn?: string | number;
  refreshExpiresIn?: string | number;
  algorithms?: jwt.Algorithm[];
}

export interface JWTPayload {
  userId: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: any;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

class JWTService {
  private config: JWTConfig;
  private logger?: Logger;

  constructor(config: JWTConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger;
  }

  // Generate access token
  generateAccessToken(payload: JWTPayload): string {
    const tokenPayload = {
      ...payload,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
    };

    const options: jwt.SignOptions = {
      expiresIn: this.config.expiresIn || '15m',
      issuer: this.config.issuer,
      audience: this.config.audience,
      algorithm: this.config.algorithms?.[0] || 'HS256'
    };

    return jwt.sign(tokenPayload, this.config.secret, options);
  }

  // Generate refresh token
  generateRefreshToken(userId: string): string {
    const payload = {
      userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
    };

    const options: jwt.SignOptions = {
      expiresIn: this.config.refreshExpiresIn || '7d',
      issuer: this.config.issuer,
      algorithm: this.config.algorithms?.[0] || 'HS256'
    };

    return jwt.sign(payload, this.config.secret, options);
  }

  // Generate token pair
  generateTokenPair(payload: JWTPayload): TokenPair {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload.userId);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: typeof this.config.expiresIn === 'string' 
        ? this.parseExpiresIn(this.config.expiresIn) 
        : (this.config.expiresIn as number) || 900 // 15 minutes default
    };
  }

  // Verify token
  verifyToken(token: string, type: 'access' | 'refresh' = 'access'): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.config.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: this.config.algorithms || ['HS256']
      }) as any;

      if (decoded.type !== type) {
        throw new Error(`Invalid token type. Expected ${type}, got ${decoded.type}`);
      }

      return decoded;
    } catch (error) {
      this.logger?.error('Token verification failed', error as Error);
      throw error;
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string, getUserPayload: (userId: string) => Promise<JWTPayload>): Promise<TokenPair> {
    const decoded = this.verifyToken(refreshToken, 'refresh');
    const userPayload = await getUserPayload(decoded.userId);
    return this.generateTokenPair(userPayload);
  }

  // Parse expires in string to seconds
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }
}

// Express middleware for JWT authentication
export function jwtAuthMiddleware(
  jwtService: JWTService,
  options?: {
    excludePaths?: string[];
    optional?: boolean;
    extractToken?: (req: Request) => string | undefined;
  }
) {
  const excludePaths = options?.excludePaths || [];
  const optional = options?.optional || false;
  const extractToken = options?.extractToken || defaultTokenExtractor;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    try {
      const token = extractToken(req);
      
      if (!token) {
        if (optional) {
          return next();
        }
        return res.status(401).json({ error: 'No token provided' });
      }

      const payload = jwtService.verifyToken(token);
      
      // Attach user info to request
      (req as any).user = {
        userId: payload.userId,
        email: payload.email,
        roles: payload.roles || [],
        permissions: payload.permissions || []
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Token expired' });
      } else if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      return res.status(500).json({ error: 'Authentication error' });
    }
  };
}

// Default token extractor from Authorization header
function defaultTokenExtractor(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

// Role-based access control middleware
export function requireRole(roles: string | string[]) {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];

  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasRole = requiredRoles.some(role => user.roles?.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Permission-based access control middleware
export function requirePermission(permissions: string | string[]) {
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasPermission = requiredPermissions.some(permission => 
      user.permissions?.includes(permission)
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Factory function
export function createJWTService(config: JWTConfig, logger?: Logger): JWTService {
  return new JWTService(config, logger);
}