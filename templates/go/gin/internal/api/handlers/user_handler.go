package handlers

import (
	"net/http"
	"strconv"

	"gin-service/internal/api/middleware"
	"gin-service/internal/database"
	"gin-service/internal/models"
	"gin-service/internal/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// UserHandler handles user-related HTTP requests
type UserHandler struct {
	userService *services.UserService
	jwtService  *middleware.JWTService
	logger      *zap.Logger
}

// NewUserHandler creates a new user handler
func NewUserHandler(userService *services.UserService, jwtService *middleware.JWTService, logger *zap.Logger) *UserHandler {
	return &UserHandler{
		userService: userService,
		jwtService:  jwtService,
		logger:      logger,
	}
}

// Register godoc
// @Summary Register a new user
// @Description Register a new user account
// @Tags auth
// @Accept json
// @Produce json
// @Param user body models.CreateUserRequest true "User registration data"
// @Success 201 {object} models.UserResponse
// @Failure 400 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /auth/register [post]
func (h *UserHandler) Register(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("Invalid registration request", zap.Error(err))
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	user, err := h.userService.Create(&req)
	if err != nil {
		h.logger.Error("Failed to create user", zap.Error(err))
		status := http.StatusInternalServerError
		if err.Error() == "username already exists" || err.Error() == "email already exists" {
			status = http.StatusConflict
		}
		c.JSON(status, ErrorResponse{
			Error:   "registration_failed",
			Message: err.Error(),
		})
		return
	}

	h.logger.Info("User registered successfully", zap.Int("user_id", user.ID))
	c.JSON(http.StatusCreated, user.ToResponse())
}

// Login godoc
// @Summary Login user
// @Description Authenticate user and return JWT token
// @Tags auth
// @Accept json
// @Produce json
// @Param credentials body models.LoginRequest true "Login credentials"
// @Success 200 {object} models.LoginResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /auth/login [post]
func (h *UserHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("Invalid login request", zap.Error(err))
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	user, err := h.userService.Authenticate(req.Username, req.Password)
	if err != nil {
		h.logger.Warn("Authentication failed", zap.Error(err), zap.String("username", req.Username))
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "authentication_failed",
			Message: "Invalid credentials",
		})
		return
	}

	token, err := h.jwtService.GenerateToken(user)
	if err != nil {
		h.logger.Error("Failed to generate token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "token_generation_failed",
			Message: "Failed to generate authentication token",
		})
		return
	}

	h.logger.Info("User logged in successfully", zap.Int("user_id", user.ID))
	c.JSON(http.StatusOK, models.LoginResponse{
		User:  user.ToResponse(),
		Token: token,
	})
}

// GetProfile godoc
// @Summary Get current user profile
// @Description Get the profile of the currently authenticated user
// @Tags users
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.UserResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /users/profile [get]
func (h *UserHandler) GetProfile(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	user, err := h.userService.GetByID(userID)
	if err != nil {
		h.logger.Error("Failed to get user profile", zap.Error(err), zap.Int("user_id", userID))
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve user profile",
		})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, ErrorResponse{
			Error:   "user_not_found",
			Message: "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, user.ToResponse())
}

// UpdateProfile godoc
// @Summary Update current user profile
// @Description Update the profile of the currently authenticated user
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param user body models.UpdateUserRequest true "User update data"
// @Success 200 {object} models.UserResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /users/profile [put]
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("Invalid update request", zap.Error(err))
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	user, err := h.userService.Update(userID, &req)
	if err != nil {
		h.logger.Error("Failed to update user", zap.Error(err), zap.Int("user_id", userID))
		status := http.StatusInternalServerError
		if err.Error() == "username already exists" || err.Error() == "email already exists" {
			status = http.StatusConflict
		}
		c.JSON(status, ErrorResponse{
			Error:   "update_failed",
			Message: err.Error(),
		})
		return
	}

	h.logger.Info("User profile updated", zap.Int("user_id", userID))
	c.JSON(http.StatusOK, user.ToResponse())
}

// ListUsers godoc
// @Summary List users
// @Description Get a paginated list of users (admin only)
// @Tags users
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Param username query string false "Filter by username"
// @Param email query string false "Filter by email"
// @Param is_active query bool false "Filter by active status"
// @Param is_admin query bool false "Filter by admin status"
// @Param search query string false "Search in username, email, and full name"
// @Success 200 {object} database.PaginatedResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /users [get]
func (h *UserHandler) ListUsers(c *gin.Context) {
	// Parse pagination parameters
	pagination := &database.Paginate{
		Page:  1,
		Limit: 10,
	}

	if page, err := strconv.Atoi(c.DefaultQuery("page", "1")); err == nil && page > 0 {
		pagination.Page = page
	}

	if limit, err := strconv.Atoi(c.DefaultQuery("limit", "10")); err == nil && limit > 0 {
		pagination.Limit = limit
	}

	// Parse filter parameters
	filter := &models.UserFilter{}

	if username := c.Query("username"); username != "" {
		filter.Username = &username
	}

	if email := c.Query("email"); email != "" {
		filter.Email = &email
	}

	if isActiveStr := c.Query("is_active"); isActiveStr != "" {
		if isActive, err := strconv.ParseBool(isActiveStr); err == nil {
			filter.IsActive = &isActive
		}
	}

	if isAdminStr := c.Query("is_admin"); isAdminStr != "" {
		if isAdmin, err := strconv.ParseBool(isAdminStr); err == nil {
			filter.IsAdmin = &isAdmin
		}
	}

	if search := c.Query("search"); search != "" {
		filter.Search = &search
	}

	users, err := h.userService.List(filter, pagination)
	if err != nil {
		h.logger.Error("Failed to list users", zap.Error(err))
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve users",
		})
		return
	}

	// Convert to response format
	userResponses := make([]*models.UserResponse, len(users))
	for i, user := range users {
		userResponses[i] = user.ToResponse()
	}

	c.JSON(http.StatusOK, database.PaginatedResponse{
		Data:       userResponses,
		Pagination: pagination,
	})
}

// GetUser godoc
// @Summary Get user by ID
// @Description Get a user by their ID (admin only)
// @Tags users
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Success 200 {object} models.UserResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /users/{id} [get]
func (h *UserHandler) GetUser(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_user_id",
			Message: "Invalid user ID format",
		})
		return
	}

	user, err := h.userService.GetByID(userID)
	if err != nil {
		h.logger.Error("Failed to get user", zap.Error(err), zap.Int("user_id", userID))
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve user",
		})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, ErrorResponse{
			Error:   "user_not_found",
			Message: "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, user.ToResponse())
}

// UpdateUser godoc
// @Summary Update user by ID
// @Description Update a user by their ID (admin only)
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Param user body models.UpdateUserRequest true "User update data"
// @Success 200 {object} models.UserResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /users/{id} [put]
func (h *UserHandler) UpdateUser(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_user_id",
			Message: "Invalid user ID format",
		})
		return
	}

	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("Invalid update request", zap.Error(err))
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	user, err := h.userService.Update(userID, &req)
	if err != nil {
		h.logger.Error("Failed to update user", zap.Error(err), zap.Int("user_id", userID))
		status := http.StatusInternalServerError
		if err.Error() == "user not found" {
			status = http.StatusNotFound
		} else if err.Error() == "username already exists" || err.Error() == "email already exists" {
			status = http.StatusConflict
		}
		c.JSON(status, ErrorResponse{
			Error:   "update_failed",
			Message: err.Error(),
		})
		return
	}

	h.logger.Info("User updated by admin", zap.Int("user_id", userID))
	c.JSON(http.StatusOK, user.ToResponse())
}

// DeleteUser godoc
// @Summary Delete user by ID
// @Description Delete a user by their ID (admin only)
// @Tags users
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Success 204 "No Content"
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /users/{id} [delete]
func (h *UserHandler) DeleteUser(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_user_id",
			Message: "Invalid user ID format",
		})
		return
	}

	// Prevent self-deletion
	currentUserID, _ := middleware.GetUserID(c)
	if currentUserID == userID {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "self_deletion_not_allowed",
			Message: "Cannot delete your own account",
		})
		return
	}

	err = h.userService.Delete(userID)
	if err != nil {
		h.logger.Error("Failed to delete user", zap.Error(err), zap.Int("user_id", userID))
		status := http.StatusInternalServerError
		if err.Error() == "user not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, ErrorResponse{
			Error:   "deletion_failed",
			Message: err.Error(),
		})
		return
	}

	h.logger.Info("User deleted by admin", zap.Int("user_id", userID))
	c.Status(http.StatusNoContent)
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}