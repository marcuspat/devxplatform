package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// MockDB is a mock implementation of database.DBInterface for testing
type MockDB struct {
	mock.Mock
}

func (m *MockDB) Get(dest interface{}, query string, args ...interface{}) error {
	mockArgs := m.Called(dest, query, args)
	return mockArgs.Error(0)
}

func (m *MockDB) Select(dest interface{}, query string, args ...interface{}) error {
	mockArgs := m.Called(dest, query, args)
	return mockArgs.Error(0)
}

func (m *MockDB) NamedQuery(query string, arg interface{}) (*sqlx.Rows, error) {
	mockArgs := m.Called(query, arg)
	if mockArgs.Get(0) == nil {
		return nil, mockArgs.Error(1)
	}
	return mockArgs.Get(0).(*sqlx.Rows), mockArgs.Error(1)
}

func (m *MockDB) NamedExec(query string, arg interface{}) (sql.Result, error) {
	mockArgs := m.Called(query, arg)
	if mockArgs.Get(0) == nil {
		return nil, mockArgs.Error(1)
	}
	return mockArgs.Get(0).(sql.Result), mockArgs.Error(1)
}

func (m *MockDB) Exec(query string, args ...interface{}) (sql.Result, error) {
	mockArgs := m.Called(query, args)
	if mockArgs.Get(0) == nil {
		return nil, mockArgs.Error(1)
	}
	return mockArgs.Get(0).(sql.Result), mockArgs.Error(1)
}

func (m *MockDB) Query(query string, args ...interface{}) (*sql.Rows, error) {
	mockArgs := m.Called(query, args)
	if mockArgs.Get(0) == nil {
		return nil, mockArgs.Error(1)
	}
	return mockArgs.Get(0).(*sql.Rows), mockArgs.Error(1)
}

func (m *MockDB) QueryRow(query string, args ...interface{}) *sql.Row {
	return nil
}

func (m *MockDB) Queryx(query string, args ...interface{}) (*sqlx.Rows, error) {
	mockArgs := m.Called(query, args)
	if mockArgs.Get(0) == nil {
		return nil, mockArgs.Error(1)
	}
	return mockArgs.Get(0).(*sqlx.Rows), mockArgs.Error(1)
}

func (m *MockDB) QueryRowx(query string, args ...interface{}) *sqlx.Row {
	return nil
}

func (m *MockDB) Beginx() (*sqlx.Tx, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*sqlx.Tx), args.Error(1)
}

func (m *MockDB) Health() error {
	args := m.Called()
	return args.Error(0)
}

func (m *MockDB) Close() error {
	args := m.Called()
	return args.Error(0)
}

func (m *MockDB) Ping() error {
	args := m.Called()
	return args.Error(0)
}

func (m *MockDB) Transaction(fn func(*sqlx.Tx) error) error {
	args := m.Called(fn)
	return args.Error(0)
}

func setupHealthHandler() (*HealthHandler, *MockDB) {
	mockDB := &MockDB{}
	logger := zap.NewNop()
	handler := NewHealthHandler(mockDB, logger)
	return handler, mockDB
}

func TestHealthHandler_BasicHealth(t *testing.T) {
	handler, _ := setupHealthHandler()

	// Create a gin context with a test request
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/health", handler.BasicHealth)

	// Create a test request
	req, _ := http.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert response
	assert.Equal(t, http.StatusOK, w.Code)

	var response HealthResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "healthy", response.Status)
	assert.Equal(t, "gin-service", response.Service)
	assert.Equal(t, "1.0.0", response.Version)
	assert.NotEmpty(t, response.Timestamp)
}

func TestHealthHandler_DetailedHealth_Healthy(t *testing.T) {
	handler, mockDB := setupHealthHandler()

	// Mock database health check to return no error
	mockDB.On("Health").Return(nil)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/health/detailed", handler.DetailedHealth)

	req, _ := http.NewRequest("GET", "/health/detailed", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert response
	assert.Equal(t, http.StatusOK, w.Code)

	var response HealthResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "healthy", response.Status)
	assert.Equal(t, "gin-service", response.Service)
	assert.Equal(t, "1.0.0", response.Version)
	assert.NotEmpty(t, response.Timestamp)
	assert.Equal(t, "healthy", response.Checks["database"])

	mockDB.AssertExpectations(t)
}

func TestHealthHandler_DetailedHealth_Unhealthy(t *testing.T) {
	handler, mockDB := setupHealthHandler()

	// Mock database health check to return an error
	mockDB.On("Health").Return(assert.AnError)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/health/detailed", handler.DetailedHealth)

	req, _ := http.NewRequest("GET", "/health/detailed", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert response
	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	var response HealthResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "unhealthy", response.Status)
	assert.Equal(t, "gin-service", response.Service)
	assert.Equal(t, "1.0.0", response.Version)
	assert.NotEmpty(t, response.Timestamp)
	assert.Contains(t, response.Checks["database"], "unhealthy")

	mockDB.AssertExpectations(t)
}

func TestHealthHandler_Readiness_Ready(t *testing.T) {
	handler, mockDB := setupHealthHandler()

	// Mock database health check to return no error
	mockDB.On("Health").Return(nil)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/ready", handler.Readiness)

	req, _ := http.NewRequest("GET", "/ready", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert response
	assert.Equal(t, http.StatusOK, w.Code)

	var response HealthResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "ready", response.Status)
	assert.Equal(t, "gin-service", response.Service)
	assert.Equal(t, "1.0.0", response.Version)
	assert.NotEmpty(t, response.Timestamp)

	mockDB.AssertExpectations(t)
}

func TestHealthHandler_Readiness_NotReady(t *testing.T) {
	handler, mockDB := setupHealthHandler()

	// Mock database health check to return an error
	mockDB.On("Health").Return(assert.AnError)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/ready", handler.Readiness)

	req, _ := http.NewRequest("GET", "/ready", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert response
	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	var response HealthResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "not ready", response.Status)
	assert.Equal(t, "gin-service", response.Service)
	assert.Equal(t, "1.0.0", response.Version)
	assert.NotEmpty(t, response.Timestamp)

	mockDB.AssertExpectations(t)
}

func TestHealthHandler_Liveness(t *testing.T) {
	handler, _ := setupHealthHandler()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/live", handler.Liveness)

	req, _ := http.NewRequest("GET", "/live", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert response
	assert.Equal(t, http.StatusOK, w.Code)

	var response HealthResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "alive", response.Status)
	assert.Equal(t, "gin-service", response.Service)
	assert.Equal(t, "1.0.0", response.Version)
	assert.NotEmpty(t, response.Timestamp)
}