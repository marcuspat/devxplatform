// File: middleware.ts (Next.js middleware)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtAuthMiddleware } from '../security/auth/jwt';

// This runs on Edge Runtime
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add correlation ID
  const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();
  response.headers.set('x-correlation-id', correlationId);

  return response;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};

// File: lib/observability.ts
import {
  createLogger,
  createMetricsService,
  Logger,
  getCorrelationId
} from '../../index';

// Singleton instances
let logger: Logger;
let metricsService: any;

export function getLogger(): Logger {
  if (!logger) {
    logger = createLogger('nextjs-webapp');
  }
  return logger;
}

export function getMetricsService() {
  if (!metricsService) {
    metricsService = createMetricsService({
      serviceName: 'nextjs-webapp',
      customMetrics: [
        {
          name: 'page_views_total',
          type: 'counter',
          help: 'Total number of page views',
          labelNames: ['page', 'method']
        },
        {
          name: 'api_route_duration',
          type: 'histogram',
          help: 'API route duration in seconds',
          labelNames: ['route', 'method'],
          buckets: [0.1, 0.5, 1, 2, 5]
        }
      ]
    });
  }
  return metricsService;
}

// File: lib/auth.ts
import { createJWTService, JWTPayload } from '../../index';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const jwtService = createJWTService({
  secret: process.env.JWT_SECRET!,
  expiresIn: '15m',
  refreshExpiresIn: '7d',
  issuer: 'nextjs-webapp'
});

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token');
  
  if (!token) return null;
  
  try {
    return jwtService.verifyToken(token.value);
  } catch {
    return null;
  }
}

export async function setSession(payload: JWTPayload) {
  const tokens = jwtService.generateTokenPair(payload);
  const cookieStore = cookies();
  
  cookieStore.set('auth-token', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15 // 15 minutes
  });
  
  cookieStore.set('refresh-token', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
  
  return tokens;
}

export function requireAuth(handler: Function) {
  return async (req: NextRequest, ...args: any[]) => {
    const token = req.cookies.get('auth-token');
    
    if (!token) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    try {
      const payload = jwtService.verifyToken(token.value);
      (req as any).user = payload;
      return handler(req, ...args);
    } catch {
      return new Response('Unauthorized', { status: 401 });
    }
  };
}

// File: app/api/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMetricsService } from '../../../lib/observability';

export async function GET(req: NextRequest) {
  const metricsService = getMetricsService();
  const metrics = await metricsService.getMetrics();
  
  return new NextResponse(metrics, {
    headers: {
      'Content-Type': metricsService.getContentType()
    }
  });
}

// File: app/api/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { setSession } from '../../../lib/auth';
import { getLogger } from '../../../lib/observability';
import { preventXSS } from '../../../index';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(req: NextRequest) {
  const logger = getLogger();
  const correlationId = req.headers.get('x-correlation-id');
  
  try {
    const body = await req.json();
    
    // Validate input
    const { email, password } = loginSchema.parse(body);
    
    // Simulate authentication
    const user = {
      userId: '123',
      email,
      roles: ['user'],
      permissions: ['read']
    };
    
    // Set session
    const tokens = await setSession(user);
    
    logger.info('User logged in', {
      userId: user.userId,
      correlationId
    });
    
    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        roles: user.roles
      }
    });
  } catch (error) {
    logger.error('Login failed', error as Error, { correlationId });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}

// File: app/api/user/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { getLogger, getMetricsService } from '../../../../lib/observability';

export const GET = requireAuth(async (req: NextRequest) => {
  const logger = getLogger();
  const metricsService = getMetricsService();
  const user = (req as any).user;
  const correlationId = req.headers.get('x-correlation-id');
  
  // Track API usage
  metricsService.incrementCounter('api_route_duration', {
    route: '/api/user/profile',
    method: 'GET'
  });
  
  logger.info('Profile accessed', {
    userId: user.userId,
    correlationId
  });
  
  return NextResponse.json({
    userId: user.userId,
    email: user.email,
    roles: user.roles,
    permissions: user.permissions
  });
});

// File: app/api/protected-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { getLogger } from '../../../../lib/observability';
import Redis from 'ioredis';
import { rateLimiter, RedisRateLimitStore } from '../../../index';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

const rateLimitStore = new RedisRateLimitStore(redis, 60000);

export const GET = requireAuth(async (req: NextRequest) => {
  const logger = getLogger();
  const user = (req as any).user;
  
  // Apply rate limiting
  const rateLimitMiddleware = rateLimiter(rateLimitStore, {
    windowMs: 60000,
    max: 10,
    keyGenerator: () => `ratelimit:user:${user.userId}`
  });
  
  // Simulate rate limit check
  const rateLimitResult = await new Promise((resolve) => {
    const mockRes = {
      setHeader: () => {},
      status: (code: number) => ({
        json: (data: any) => resolve({ limited: true, status: code, data })
      })
    };
    
    rateLimitMiddleware(
      req as any,
      mockRes as any,
      () => resolve({ limited: false })
    );
  });
  
  if ((rateLimitResult as any).limited) {
    return NextResponse.json(
      (rateLimitResult as any).data,
      { status: (rateLimitResult as any).status }
    );
  }
  
  logger.info('Protected data accessed', {
    userId: user.userId,
    correlationId: req.headers.get('x-correlation-id')
  });
  
  return NextResponse.json({
    data: 'This is protected data',
    timestamp: new Date().toISOString()
  });
});

// File: components/ClientObservability.tsx
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function ClientObservability() {
  const pathname = usePathname();
  
  useEffect(() => {
    // Track page views
    fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: pathname,
        timestamp: new Date().toISOString()
      })
    }).catch(console.error);
  }, [pathname]);
  
  useEffect(() => {
    // Track errors
    const handleError = (event: ErrorEvent) => {
      fetch('/api/analytics/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: event.message,
          source: event.filename,
          line: event.lineno,
          column: event.colno,
          stack: event.error?.stack
        })
      }).catch(console.error);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  return null;
}

// File: app/layout.tsx
import { ClientObservability } from '../components/ClientObservability';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientObservability />
        {children}
      </body>
    </html>
  );
}