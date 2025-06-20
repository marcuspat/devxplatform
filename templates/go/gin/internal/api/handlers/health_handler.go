package handlers

import (
	"net/http"
	"time"

	"gin-service/internal/database"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// HealthHandler handles health check requests
type HealthHandler struct {
	db     *database.DB
	logger *zap.Logger
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(db *database.DB, logger *zap.Logger) *HealthHandler {
	return &HealthHandler{
		db:     db,
		logger: logger,
	}
}

// HealthResponse represents a health check response
type HealthResponse struct {
	Status    string            `json:"status"`
	Timestamp string            `json:"timestamp"`
	Service   string            `json:"service"`
	Version   string            `json:"version"`
	Checks    map[string]string `json:"checks,omitempty"`
}

// BasicHealth godoc
// @Summary Basic health check
// @Description Get basic health status
// @Tags health
// @Produce json
// @Success 200 {object} HealthResponse
// @Router /health [get]
func (h *HealthHandler) BasicHealth(c *gin.Context) {
	c.JSON(http.StatusOK, HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Service:   "gin-service",
		Version:   "1.0.0",
	})
}

// DetailedHealth godoc
// @Summary Detailed health check
// @Description Get detailed health status with dependency checks
// @Tags health
// @Produce json
// @Success 200 {object} HealthResponse
// @Failure 503 {object} HealthResponse
// @Router /health/detailed [get]
func (h *HealthHandler) DetailedHealth(c *gin.Context) {
	checks := make(map[string]string)
	overallStatus := "healthy"

	// Check database connection
	if err := h.db.Health(); err != nil {
		checks["database"] = "unhealthy: " + err.Error()
		overallStatus = "unhealthy"
		h.logger.Warn("Database health check failed", zap.Error(err))
	} else {
		checks["database"] = "healthy"
	}

	// You can add more health checks here
	// For example: Redis, external APIs, etc.

	statusCode := http.StatusOK
	if overallStatus == "unhealthy" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, HealthResponse{
		Status:    overallStatus,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Service:   "gin-service",
		Version:   "1.0.0",
		Checks:    checks,
	})
}

// Readiness godoc
// @Summary Readiness check
// @Description Check if the service is ready to serve traffic
// @Tags health
// @Produce json
// @Success 200 {object} HealthResponse
// @Failure 503 {object} HealthResponse
// @Router /ready [get]
func (h *HealthHandler) Readiness(c *gin.Context) {
	// Check critical dependencies
	if err := h.db.Health(); err != nil {
		h.logger.Warn("Readiness check failed - database unhealthy", zap.Error(err))
		c.JSON(http.StatusServiceUnavailable, HealthResponse{
			Status:    "not ready",
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			Service:   "gin-service",
			Version:   "1.0.0",
		})
		return
	}

	c.JSON(http.StatusOK, HealthResponse{
		Status:    "ready",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Service:   "gin-service",
		Version:   "1.0.0",
	})
}

// Liveness godoc
// @Summary Liveness check
// @Description Check if the service is alive
// @Tags health
// @Produce json
// @Success 200 {object} HealthResponse
// @Router /live [get]
func (h *HealthHandler) Liveness(c *gin.Context) {
	c.JSON(http.StatusOK, HealthResponse{
		Status:    "alive",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Service:   "gin-service",
		Version:   "1.0.0",
	})
}