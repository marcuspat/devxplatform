import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if the portal can connect to the API backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    let apiStatus = 'unknown';
    let apiResponseTime = 0;
    
    try {
      const startTime = Date.now();
      const response = await fetch(`${apiUrl}/health`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      apiResponseTime = Date.now() - startTime;
      apiStatus = response.ok ? 'healthy' : 'unhealthy';
    } catch (error) {
      apiStatus = 'unreachable';
      console.warn('API health check failed:', error);
    }
    
    const healthData = {
      status: 'healthy',
      service: 'devx-portal',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        api: {
          status: apiStatus,
          url: apiUrl,
          responseTime: apiResponseTime
        }
      }
    };
    
    // Return 503 if critical dependencies are down
    const status = apiStatus === 'healthy' ? 200 : 503;
    
    return NextResponse.json(healthData, { status });
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'devx-portal',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}

// Support HEAD requests for simple health checks
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}