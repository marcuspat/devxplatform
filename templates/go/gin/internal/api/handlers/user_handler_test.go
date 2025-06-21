package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"gin-service/internal/api/middleware"
	"gin-service/internal/database"
	"gin-service/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// MockUserService is a mock implementation of UserService
type MockUserService struct {
	mock.Mock
}

func (m *MockUserService) Create(req *models.CreateUserRequest) (*models.User, error) {
	args := m.Called(req)
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserService) GetByID(id int) (*models.User, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserService) GetByUsername(username string) (*models.User, error) {
	args := m.Called(username)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserService) GetByEmail(email string) (*models.User, error) {
	args := m.Called(email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserService) Update(id int, req *models.UpdateUserRequest) (*models.User, error) {
	args := m.Called(id, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserService) Delete(id int) error {
	args := m.Called(id)
	return args.Error(0)
}

func (m *MockUserService) Authenticate(username, password string) (*models.User, error) {
	args := m.Called(username, password)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserService) List(filter *models.UserFilter, pagination *database.Paginate) ([]*models.User, error) {
	args := m.Called(filter, pagination)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.User), args.Error(1)
}

// MockJWTService is a mock implementation of JWTService
type MockJWTService struct {
	mock.Mock
}

func (m *MockJWTService) GenerateToken(user *models.User) (string, error) {
	args := m.Called(user)
	return args.String(0), args.Error(1)
}

func (m *MockJWTService) ValidateToken(tokenString string) (*middleware.Claims, error) {
	args := m.Called(tokenString)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*middleware.Claims), args.Error(1)
}

func setupUserHandler() (*UserHandler, *MockUserService, *MockJWTService) {
	mockUserService := &MockUserService{}
	mockJWTService := &MockJWTService{}
	logger := zap.NewNop()
	handler := NewUserHandler(mockUserService, mockJWTService, logger)
	return handler, mockUserService, mockJWTService
}

func TestUserHandler_Register_Success(t *testing.T) {
	handler, mockUserService, _ := setupUserHandler()

	// Mock user creation
	createReq := &models.CreateUserRequest{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
	}

	fullName := "Test User"
	mockUser := &models.User{
		ID:       1,
		Username: "testuser",
		Email:    "test@example.com",
		FullName: &fullName,
		IsActive: true,
		IsAdmin:  false,
	}

	mockUserService.On("Create", mock.AnythingOfType("*models.CreateUserRequest")).Return(mockUser, nil)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/auth/register", handler.Register)

	// Create request body
	reqBody, _ := json.Marshal(createReq)
	req, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert response
	assert.Equal(t, http.StatusCreated, w.Code)

	var response models.UserResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, mockUser.ID, response.ID)
	assert.Equal(t, mockUser.Username, response.Username)
	assert.Equal(t, mockUser.Email, response.Email)

	mockUserService.AssertExpectations(t)
}

func TestUserHandler_Register_ConflictError(t *testing.T) {
	handler, mockUserService, _ := setupUserHandler()

	createReq := &models.CreateUserRequest{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
	}

	mockUserService.On("Create", mock.AnythingOfType("*models.CreateUserRequest")).Return((*models.User)(nil), errors.New("username already exists"))

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/auth/register", handler.Register)

	reqBody, _ := json.Marshal(createReq)
	req, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert response
	assert.Equal(t, http.StatusConflict, w.Code)

	var response ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "registration_failed", response.Error)

	mockUserService.AssertExpectations(t)
}

func TestUserHandler_Login_Success(t *testing.T) {
	handler, mockUserService, mockJWTService := setupUserHandler()

	loginReq := models.LoginRequest{
		Username: "testuser",
		Password: "password123",
	}

	fullName := "Test User"
	mockUser := &models.User{
		ID:       1,
		Username: "testuser",
		Email:    "test@example.com",
		FullName: &fullName,
		IsActive: true,
		IsAdmin:  false,
	}

	mockUserService.On("Authenticate", "testuser", "password123").Return(mockUser, nil)
	mockJWTService.On("GenerateToken", mockUser).Return("mock-jwt-token", nil)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/auth/login", handler.Login)

	reqBody, _ := json.Marshal(loginReq)
	req, _ := http.NewRequest("POST", "/auth/login", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert response
	assert.Equal(t, http.StatusOK, w.Code)

	var response models.LoginResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "mock-jwt-token", response.Token)
	assert.Equal(t, mockUser.ID, response.User.ID)
	assert.Equal(t, mockUser.Username, response.User.Username)

	mockUserService.AssertExpectations(t)
	mockJWTService.AssertExpectations(t)
}

func TestUserHandler_Login_InvalidCredentials(t *testing.T) {
	handler, mockUserService, _ := setupUserHandler()

	loginReq := models.LoginRequest{
		Username: "testuser",
		Password: "wrongpassword",
	}

	mockUserService.On("Authenticate", "testuser", "wrongpassword").Return((*models.User)(nil), errors.New("invalid credentials"))

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/auth/login", handler.Login)

	reqBody, _ := json.Marshal(loginReq)
	req, _ := http.NewRequest("POST", "/auth/login", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert response
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "authentication_failed", response.Error)

	mockUserService.AssertExpectations(t)
}

func TestUserHandler_GetProfile_Success(t *testing.T) {
	handler, mockUserService, _ := setupUserHandler()

	fullName := "Test User"
	mockUser := &models.User{
		ID:       1,
		Username: "testuser",
		Email:    "test@example.com",
		FullName: &fullName,
		IsActive: true,
		IsAdmin:  false,
	}

	mockUserService.On("GetByID", 1).Return(mockUser, nil)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/users/profile", func(c *gin.Context) {
		// Simulate authenticated user context
		c.Set("user_id", 1)
		handler.GetProfile(c)
	})

	req, _ := http.NewRequest("GET", "/users/profile", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert response
	assert.Equal(t, http.StatusOK, w.Code)

	var response models.UserResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, mockUser.ID, response.ID)
	assert.Equal(t, mockUser.Username, response.Username)
	assert.Equal(t, mockUser.Email, response.Email)

	mockUserService.AssertExpectations(t)
}

func TestUserHandler_GetProfile_Unauthorized(t *testing.T) {
	handler, _, _ := setupUserHandler()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/users/profile", handler.GetProfile)

	req, _ := http.NewRequest("GET", "/users/profile", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert response
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "unauthorized", response.Error)
}

func TestUserHandler_UpdateProfile_Success(t *testing.T) {
	handler, mockUserService, _ := setupUserHandler()

	newFullName := "Updated User"
	updateReq := models.UpdateUserRequest{
		FullName: &newFullName,
	}

	updatedUser := &models.User{
		ID:       1,
		Username: "testuser",
		Email:    "test@example.com",
		FullName: &newFullName,
		IsActive: true,
		IsAdmin:  false,
	}

	mockUserService.On("Update", 1, mock.AnythingOfType("*models.UpdateUserRequest")).Return(updatedUser, nil)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.PUT("/users/profile", func(c *gin.Context) {
		// Simulate authenticated user context
		c.Set("user_id", 1)
		handler.UpdateProfile(c)
	})

	reqBody, _ := json.Marshal(updateReq)
	req, _ := http.NewRequest("PUT", "/users/profile", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert response
	assert.Equal(t, http.StatusOK, w.Code)

	var response models.UserResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, updatedUser.ID, response.ID)
	assert.Equal(t, *updatedUser.FullName, *response.FullName)

	mockUserService.AssertExpectations(t)
}