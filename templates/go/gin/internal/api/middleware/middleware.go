package middleware

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"gin-service/internal/config"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/requestid"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

// SetupCORS sets up CORS middleware
func SetupCORS(cfg *config.Config) gin.HandlerFunc {
	corsConfig := cors.Config{
		AllowOrigins:     cfg.CORS.AllowedOrigins,
		AllowMethods:     cfg.CORS.AllowedMethods,
		AllowHeaders:     cfg.CORS.AllowedHeaders,
		ExposeHeaders:    cfg.CORS.ExposedHeaders,
		AllowCredentials: cfg.CORS.AllowedCredentials,
		MaxAge:           time.Duration(cfg.CORS.MaxAge) * time.Second,
	}

	return cors.New(corsConfig)
}

// RequestLogger creates a structured logging middleware
func RequestLogger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Log request
		end := time.Now()
		latency := end.Sub(start)

		clientIP := c.ClientIP()
		method := c.Request.Method
		statusCode := c.Writer.Status()
		bodySize := c.Writer.Size()
		userAgent := c.Request.UserAgent()
		requestID := c.GetString("X-Request-ID")

		if raw != "" {
			path = path + "?" + raw
		}

		// Log level based on status code
		logLevel := zap.InfoLevel
		if statusCode >= 400 && statusCode < 500 {
			logLevel = zap.WarnLevel
		} else if statusCode >= 500 {
			logLevel = zap.ErrorLevel
		}

		logger.Log(logLevel, "HTTP Request",
			zap.String("request_id", requestID),
			zap.String("method", method),
			zap.String("path", path),
			zap.Int("status", statusCode),
			zap.Duration("latency", latency),
			zap.String("client_ip", clientIP),
			zap.Int("body_size", bodySize),
			zap.String("user_agent", userAgent),
		)
	}
}

// ErrorHandler handles panics and errors
func ErrorHandler(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				logger.Error("Panic recovered",
					zap.Any("error", err),
					zap.String("path", c.Request.URL.Path),
					zap.String("method", c.Request.Method),
				)

				c.JSON(http.StatusInternalServerError, gin.H{
					"error":   "internal_server_error",
					"message": "An internal server error occurred",
				})
				c.Abort()
			}
		}()

		c.Next()
	}
}

// RateLimiter implements a rate limiting middleware
type RateLimiter struct {
	limiters map[string]*rate.Limiter
	mu       sync.RWMutex
	rate     rate.Limit
	burst    int
	cleanup  time.Duration
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(rps int, burst int, cleanup time.Duration) *RateLimiter {
	rl := &RateLimiter{
		limiters: make(map[string]*rate.Limiter),
		rate:     rate.Limit(rps),
		burst:    burst,
		cleanup:  cleanup,
	}

	// Start cleanup routine
	go rl.cleanupRoutine()

	return rl
}

// getLimiter gets or creates a rate limiter for the given key
func (rl *RateLimiter) getLimiter(key string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	limiter, exists := rl.limiters[key]
	if !exists {
		limiter = rate.NewLimiter(rl.rate, rl.burst)
		rl.limiters[key] = limiter
	}

	return limiter
}

// cleanupRoutine periodically removes unused limiters
func (rl *RateLimiter) cleanupRoutine() {
	ticker := time.NewTicker(rl.cleanup)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		for key, limiter := range rl.limiters {
			// Remove limiters that haven't been used recently
			if limiter.TokensAt(time.Now()) == float64(rl.burst) {
				delete(rl.limiters, key)
			}
		}
		rl.mu.Unlock()
	}
}

// RateLimit creates a rate limiting middleware
func RateLimit(cfg *config.Config) gin.HandlerFunc {
	if !cfg.Rate.Enabled {
		return func(c *gin.Context) {
			c.Next()
		}
	}

	// Parse window duration
	window, err := time.ParseDuration(cfg.Rate.Window)
	if err != nil {
		window = time.Minute
	}

	limiter := NewRateLimiter(cfg.Rate.RPS, cfg.Rate.Burst, window)

	return func(c *gin.Context) {
		// Use client IP as the key
		key := c.ClientIP()

		// Check if request is allowed
		if !limiter.getLimiter(key).Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "rate_limit_exceeded",
				"message": "Rate limit exceeded. Please try again later.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// SecurityHeaders adds security headers to responses
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Add security headers
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Content-Security-Policy", "default-src 'self'")

		c.Next()
	}
}

// HealthCheck creates a simple health check endpoint
func HealthCheck() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"service":   "gin-service",
		})
	}
}

// NoCache adds no-cache headers
func NoCache() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")
		c.Next()
	}
}

// MaxSizeMiddleware limits request body size
func MaxSizeMiddleware(maxSize int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > maxSize {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"error":   "request_too_large",
				"message": fmt.Sprintf("Request body too large. Maximum size is %d bytes", maxSize),
			})
			c.Abort()
			return
		}

		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxSize)
		c.Next()
	}
}

// RequireContentType validates the Content-Type header
func RequireContentType(contentType string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
			ct := c.GetHeader("Content-Type")
			if ct != contentType {
				c.JSON(http.StatusUnsupportedMediaType, gin.H{
					"error":   "unsupported_media_type",
					"message": fmt.Sprintf("Content-Type must be %s", contentType),
				})
				c.Abort()
				return
			}
		}
		c.Next()
	}
}

// TimeoutMiddleware adds request timeout
func TimeoutMiddleware(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Create a context with timeout
		ctx, cancel := context.WithTimeout(c.Request.Context(), timeout)
		defer cancel()

		// Replace the request context
		c.Request = c.Request.WithContext(ctx)

		// Channel to signal when the request is done
		done := make(chan struct{})

		go func() {
			defer close(done)
			c.Next()
		}()

		select {
		case <-done:
			// Request completed normally
		case <-ctx.Done():
			// Request timed out
			c.JSON(http.StatusRequestTimeout, gin.H{
				"error":   "request_timeout",
				"message": "Request timed out",
			})
			c.Abort()
		}
	}
}