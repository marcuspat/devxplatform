package api

import (
	"time"

	"gin-service/internal/api/handlers"
	"gin-service/internal/api/middleware"
	"gin-service/internal/config"
	"gin-service/internal/database"
	"gin-service/internal/services"

	"github.com/gin-contrib/requestid"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"go.uber.org/zap"
)

// NewRouter creates and configures the main router
func NewRouter(cfg *config.Config, db *database.DB, logger *zap.Logger) *gin.Engine {
	// Set Gin mode based on environment
	if cfg.Service.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create router
	router := gin.New()

	// Initialize JWT service
	jwtService := middleware.NewJWTService(cfg, logger)

	// Initialize services
	userService := services.NewUserService(db, logger)

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler(db, logger)
	userHandler := handlers.NewUserHandler(userService, jwtService, logger)

	// Global middleware
	router.Use(middleware.ErrorHandler(logger))
	router.Use(requestid.New())
	router.Use(middleware.RequestLogger(logger))
	router.Use(middleware.SecurityHeaders())
	router.Use(middleware.SetupCORS(cfg))
	router.Use(middleware.RateLimit(cfg))
	router.Use(middleware.MaxSizeMiddleware(10 * 1024 * 1024)) // 10MB max request size
	router.Use(middleware.TimeoutMiddleware(30 * time.Second)) // 30 second timeout

	// Health check endpoints (no auth required)
	router.GET("/health", healthHandler.BasicHealth)
	router.GET("/health/detailed", healthHandler.DetailedHealth)
	router.GET("/ready", healthHandler.Readiness)
	router.GET("/live", healthHandler.Liveness)

	// Metrics endpoint for Prometheus
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Swagger documentation (only in non-production)
	if cfg.Service.Environment != "production" {
		router.GET("/docs/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Authentication routes (no auth required)
		auth := v1.Group("/auth")
		{
			auth.POST("/register", userHandler.Register)
			auth.POST("/login", userHandler.Login)
		}

		// User routes
		users := v1.Group("/users")
		{
			// Protected routes (require authentication)
			users.Use(middleware.AuthMiddleware(jwtService))

			// User profile routes (accessible by authenticated users)
			users.GET("/profile", userHandler.GetProfile)
			users.PUT("/profile", userHandler.UpdateProfile)

			// Admin-only routes
			adminUsers := users.Group("")
			adminUsers.Use(middleware.AdminMiddleware())
			{
				adminUsers.GET("", userHandler.ListUsers)
				adminUsers.GET("/:id", userHandler.GetUser)
				adminUsers.PUT("/:id", userHandler.UpdateUser)
				adminUsers.DELETE("/:id", userHandler.DeleteUser)
			}
		}

		// Example of a protected route group
		protected := v1.Group("/protected")
		protected.Use(middleware.AuthMiddleware(jwtService))
		{
			protected.GET("/example", func(c *gin.Context) {
				userID, _ := middleware.GetUserID(c)
				username, _ := middleware.GetUsername(c)

				c.JSON(200, gin.H{
					"message":  "This is a protected endpoint",
					"user_id":  userID,
					"username": username,
				})
			})
		}

		// Example of an optional auth route
		v1.GET("/public", middleware.OptionalAuthMiddleware(jwtService), func(c *gin.Context) {
			response := gin.H{"message": "This is a public endpoint"}

			if userID, exists := middleware.GetUserID(c); exists {
				response["authenticated_user_id"] = userID
			}

			c.JSON(200, response)
		})
	}

	// 404 handler
	router.NoRoute(func(c *gin.Context) {
		c.JSON(404, gin.H{
			"error":   "not_found",
			"message": "The requested resource was not found",
		})
	})

	return router
}

// SetupRoutes is an alternative function for setting up routes if you prefer
// to separate route definition from router creation
func SetupRoutes(router *gin.Engine, cfg *config.Config, db *database.DB, logger *zap.Logger) {
	// This function can be used if you want to define routes separately
	// For now, we'll keep everything in NewRouter for simplicity
}
