import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Logger } from '../../observability/logging/logger';

export interface APIKeyConfig {
  headerName?: string;
  queryParam?: string;
  prefix?: string;
  hashAlgorithm?: string;
}

export interface APIKeyInfo {
  id: string;
  name: string;
  key: string;
  hashedKey?: string;
  scopes: string[];
  rateLimit?: number;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface APIKeyValidator {
  validate(key: string): Promise<APIKeyInfo | null>;
}

class APIKeyService {
  private config: APIKeyConfig;
  private logger?: Logger;
  private validator: APIKeyValidator;

  constructor(validator: APIKeyValidator, config?: APIKeyConfig, logger?: Logger) {
    this.validator = validator;
    this.config = {
      headerName: config?.headerName || 'x-api-key',
      queryParam: config?.queryParam || 'api_key',
      prefix: config?.prefix || 'sk_',
      hashAlgorithm: config?.hashAlgorithm || 'sha256'
    };
    this.logger = logger;
  }

  // Generate a new API key
  generateKey(length: number = 32): string {
    const randomBytes = crypto.randomBytes(length);
    const key = randomBytes.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    return this.config.prefix + key.substring(0, length);
  }

  // Hash API key for storage
  hashKey(key: string): string {
    return crypto
      .createHash(this.config.hashAlgorithm!)
      .update(key)
      .digest('hex');
  }

  // Extract API key from request
  extractKey(req: Request): string | undefined {
    // Check header first
    const headerKey = req.headers[this.config.headerName!] as string;
    if (headerKey) return headerKey;

    // Check query parameter
    if (this.config.queryParam && req.query[this.config.queryParam]) {
      return req.query[this.config.queryParam] as string;
    }

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('ApiKey ')) {
      return authHeader.substring(7);
    }

    return undefined;
  }

  // Validate API key
  async validateKey(key: string): Promise<APIKeyInfo | null> {
    try {
      const keyInfo = await this.validator.validate(key);
      
      if (!keyInfo) {
        this.logger?.warn('Invalid API key attempted', { keyPrefix: key.substring(0, 10) });
        return null;
      }

      // Check expiration
      if (keyInfo.expiresAt && keyInfo.expiresAt < new Date()) {
        this.logger?.warn('Expired API key used', { keyId: keyInfo.id });
        return null;
      }

      return keyInfo;
    } catch (error) {
      this.logger?.error('API key validation error', error as Error);
      return null;
    }
  }
}

// In-memory API key validator for development/testing
export class InMemoryAPIKeyValidator implements APIKeyValidator {
  private keys: Map<string, APIKeyInfo> = new Map();

  constructor(keys?: APIKeyInfo[]) {
    if (keys) {
      keys.forEach(key => this.addKey(key));
    }
  }

  addKey(keyInfo: APIKeyInfo): void {
    this.keys.set(keyInfo.key, keyInfo);
    if (keyInfo.hashedKey) {
      this.keys.set(keyInfo.hashedKey, keyInfo);
    }
  }

  async validate(key: string): Promise<APIKeyInfo | null> {
    return this.keys.get(key) || null;
  }
}

// Database-backed API key validator
export class DatabaseAPIKeyValidator implements APIKeyValidator {
  private dbQuery: (hashedKey: string) => Promise<APIKeyInfo | null>;
  private hashAlgorithm: string;

  constructor(
    dbQuery: (hashedKey: string) => Promise<APIKeyInfo | null>,
    hashAlgorithm: string = 'sha256'
  ) {
    this.dbQuery = dbQuery;
    this.hashAlgorithm = hashAlgorithm;
  }

  async validate(key: string): Promise<APIKeyInfo | null> {
    const hashedKey = crypto
      .createHash(this.hashAlgorithm)
      .update(key)
      .digest('hex');
    
    return this.dbQuery(hashedKey);
  }
}

// Express middleware for API key authentication
export function apiKeyAuthMiddleware(
  apiKeyService: APIKeyService,
  options?: {
    excludePaths?: string[];
    optional?: boolean;
    requiredScopes?: string[];
  }
) {
  const excludePaths = options?.excludePaths || [];
  const optional = options?.optional || false;
  const requiredScopes = options?.requiredScopes || [];

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    try {
      const key = apiKeyService.extractKey(req);
      
      if (!key) {
        if (optional) {
          return next();
        }
        return res.status(401).json({ error: 'No API key provided' });
      }

      const keyInfo = await apiKeyService.validateKey(key);
      
      if (!keyInfo) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      // Check required scopes
      if (requiredScopes.length > 0) {
        const hasRequiredScope = requiredScopes.some(scope => 
          keyInfo.scopes.includes(scope)
        );
        
        if (!hasRequiredScope) {
          return res.status(403).json({ error: 'Insufficient API key permissions' });
        }
      }

      // Attach API key info to request
      (req as any).apiKey = {
        id: keyInfo.id,
        name: keyInfo.name,
        scopes: keyInfo.scopes,
        rateLimit: keyInfo.rateLimit,
        metadata: keyInfo.metadata
      };

      next();
    } catch (error) {
      return res.status(500).json({ error: 'API key authentication error' });
    }
  };
}

// Scope-based access control middleware
export function requireAPIScope(scopes: string | string[]) {
  const requiredScopes = Array.isArray(scopes) ? scopes : [scopes];

  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = (req as any).apiKey;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key authentication required' });
    }

    const hasScope = requiredScopes.some(scope => apiKey.scopes?.includes(scope));
    
    if (!hasScope) {
      return res.status(403).json({ 
        error: 'API key missing required scope',
        requiredScopes,
        availableScopes: apiKey.scopes
      });
    }

    next();
  };
}

// Factory function
export function createAPIKeyService(
  validator: APIKeyValidator,
  config?: APIKeyConfig,
  logger?: Logger
): APIKeyService {
  return new APIKeyService(validator, config, logger);
}