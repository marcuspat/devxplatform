import { Request, Response, NextFunction } from 'express';

export interface SecurityHeadersOptions {
  contentSecurityPolicy?: boolean | ContentSecurityPolicyOptions;
  crossOriginEmbedderPolicy?: boolean;
  crossOriginOpenerPolicy?: boolean | { policy: string };
  crossOriginResourcePolicy?: boolean | { policy: string };
  dnsPrefetchControl?: boolean | { allow: boolean };
  frameguard?: boolean | { action: string };
  hidePoweredBy?: boolean;
  hsts?: boolean | HSTSOptions;
  ieNoOpen?: boolean;
  noSniff?: boolean;
  originAgentCluster?: boolean;
  permittedCrossDomainPolicies?: boolean | { permittedPolicies: string };
  referrerPolicy?: boolean | { policy: string | string[] };
  xssFilter?: boolean;
}

export interface ContentSecurityPolicyOptions {
  directives?: Record<string, string[]>;
  reportOnly?: boolean;
}

export interface HSTSOptions {
  maxAge?: number;
  includeSubDomains?: boolean;
  preload?: boolean;
}

// Default CSP directives
const defaultCSPDirectives = {
  'default-src': ["'self'"],
  'base-uri': ["'self'"],
  'block-all-mixed-content': [],
  'font-src': ["'self'", 'https:', 'data:'],
  'frame-ancestors': ["'self'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'object-src': ["'none'"],
  'script-src': ["'self'"],
  'script-src-attr': ["'none'"],
  'style-src': ["'self'", 'https:', "'unsafe-inline'"],
  'upgrade-insecure-requests': []
};

// Security headers middleware
export function securityHeaders(options: SecurityHeadersOptions = {}) {
  const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

  // Content Security Policy
  if (options.contentSecurityPolicy !== false) {
    const cspOptions = options.contentSecurityPolicy === true 
      ? { directives: defaultCSPDirectives } 
      : options.contentSecurityPolicy as ContentSecurityPolicyOptions;
    
    middlewares.push(contentSecurityPolicy(cspOptions));
  }

  // Cross-Origin-Embedder-Policy
  if (options.crossOriginEmbedderPolicy !== false) {
    middlewares.push((req, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      next();
    });
  }

  // Cross-Origin-Opener-Policy
  if (options.crossOriginOpenerPolicy !== false) {
    const policy = typeof options.crossOriginOpenerPolicy === 'object' 
      ? options.crossOriginOpenerPolicy.policy 
      : 'same-origin';
    
    middlewares.push((req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', policy);
      next();
    });
  }

  // Cross-Origin-Resource-Policy
  if (options.crossOriginResourcePolicy !== false) {
    const policy = typeof options.crossOriginResourcePolicy === 'object' 
      ? options.crossOriginResourcePolicy.policy 
      : 'same-origin';
    
    middlewares.push((req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', policy);
      next();
    });
  }

  // X-DNS-Prefetch-Control
  if (options.dnsPrefetchControl !== false) {
    const allow = typeof options.dnsPrefetchControl === 'object' 
      ? options.dnsPrefetchControl.allow 
      : false;
    
    middlewares.push((req, res, next) => {
      res.setHeader('X-DNS-Prefetch-Control', allow ? 'on' : 'off');
      next();
    });
  }

  // X-Frame-Options
  if (options.frameguard !== false) {
    const action = typeof options.frameguard === 'object' 
      ? options.frameguard.action 
      : 'SAMEORIGIN';
    
    middlewares.push((req, res, next) => {
      res.setHeader('X-Frame-Options', action.toUpperCase());
      next();
    });
  }

  // X-Powered-By
  if (options.hidePoweredBy !== false) {
    middlewares.push((req, res, next) => {
      res.removeHeader('X-Powered-By');
      next();
    });
  }

  // Strict-Transport-Security
  if (options.hsts !== false) {
    const hstsOptions = options.hsts === true ? {} : options.hsts as HSTSOptions;
    middlewares.push(hsts(hstsOptions));
  }

  // X-Download-Options
  if (options.ieNoOpen !== false) {
    middlewares.push((req, res, next) => {
      res.setHeader('X-Download-Options', 'noopen');
      next();
    });
  }

  // X-Content-Type-Options
  if (options.noSniff !== false) {
    middlewares.push((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
    });
  }

  // Origin-Agent-Cluster
  if (options.originAgentCluster !== false) {
    middlewares.push((req, res, next) => {
      res.setHeader('Origin-Agent-Cluster', '?1');
      next();
    });
  }

  // X-Permitted-Cross-Domain-Policies
  if (options.permittedCrossDomainPolicies !== false) {
    const policy = typeof options.permittedCrossDomainPolicies === 'object' 
      ? options.permittedCrossDomainPolicies.permittedPolicies 
      : 'none';
    
    middlewares.push((req, res, next) => {
      res.setHeader('X-Permitted-Cross-Domain-Policies', policy);
      next();
    });
  }

  // Referrer-Policy
  if (options.referrerPolicy !== false) {
    const policy = typeof options.referrerPolicy === 'object' 
      ? options.referrerPolicy.policy 
      : 'no-referrer';
    
    middlewares.push((req, res, next) => {
      const policyValue = Array.isArray(policy) ? policy.join(',') : policy;
      res.setHeader('Referrer-Policy', policyValue);
      next();
    });
  }

  // X-XSS-Protection
  if (options.xssFilter !== false) {
    middlewares.push((req, res, next) => {
      res.setHeader('X-XSS-Protection', '0'); // Disabled as per modern best practices
      next();
    });
  }

  // Return combined middleware
  return (req: Request, res: Response, next: NextFunction) => {
    let index = 0;
    
    function nextMiddleware() {
      if (index >= middlewares.length) {
        return next();
      }
      
      const middleware = middlewares[index++];
      middleware(req, res, nextMiddleware);
    }
    
    nextMiddleware();
  };
}

// Content Security Policy middleware
function contentSecurityPolicy(options: ContentSecurityPolicyOptions) {
  const directives = options.directives || defaultCSPDirectives;
  const reportOnly = options.reportOnly || false;

  return (req: Request, res: Response, next: NextFunction) => {
    const policy = Object.entries(directives)
      .map(([directive, values]) => {
        if (values.length === 0) {
          return directive;
        }
        return `${directive} ${values.join(' ')}`;
      })
      .join('; ');

    const headerName = reportOnly 
      ? 'Content-Security-Policy-Report-Only' 
      : 'Content-Security-Policy';

    res.setHeader(headerName, policy);
    next();
  };
}

// HSTS middleware
function hsts(options: HSTSOptions) {
  const maxAge = options.maxAge || 15552000; // 180 days
  const includeSubDomains = options.includeSubDomains !== false;
  const preload = options.preload || false;

  return (req: Request, res: Response, next: NextFunction) => {
    let header = `max-age=${maxAge}`;
    
    if (includeSubDomains) {
      header += '; includeSubDomains';
    }
    
    if (preload) {
      header += '; preload';
    }

    res.setHeader('Strict-Transport-Security', header);
    next();
  };
}

// Default secure headers for production
export function defaultSecurityHeaders() {
  return securityHeaders({
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  });
}

// API-specific security headers
export function apiSecurityHeaders() {
  return securityHeaders({
    contentSecurityPolicy: false, // Not needed for APIs
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: true,
    frameguard: { action: 'DENY' },
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: false
  });
}