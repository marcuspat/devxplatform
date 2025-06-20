package models

import (
	"database/sql/driver"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// User represents a user in the system
type User struct {
	ID        int       `json:"id" db:"id"`
	Username  string    `json:"username" db:"username" binding:"required,min=3,max=50"`
	Email     string    `json:"email" db:"email" binding:"required,email"`
	Password  string    `json:"-" db:"password_hash"`
	FullName  *string   `json:"full_name,omitempty" db:"full_name"`
	IsActive  bool      `json:"is_active" db:"is_active"`
	IsAdmin   bool      `json:"is_admin" db:"is_admin"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
	LastLogin *time.Time `json:"last_login,omitempty" db:"last_login"`
}

// CreateUserRequest represents the request payload for creating a user
type CreateUserRequest struct {
	Username string  `json:"username" binding:"required,min=3,max=50"`
	Email    string  `json:"email" binding:"required,email"`
	Password string  `json:"password" binding:"required,min=8"`
	FullName *string `json:"full_name,omitempty"`
}

// UpdateUserRequest represents the request payload for updating a user
type UpdateUserRequest struct {
	Username *string `json:"username,omitempty" binding:"omitempty,min=3,max=50"`
	Email    *string `json:"email,omitempty" binding:"omitempty,email"`
	Password *string `json:"password,omitempty" binding:"omitempty,min=8"`
	FullName *string `json:"full_name,omitempty"`
	IsActive *bool   `json:"is_active,omitempty"`
}

// LoginRequest represents the request payload for user login
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents the response payload for user login
type LoginResponse struct {
	User  *User  `json:"user"`
	Token string `json:"token"`
}

// UserResponse represents a user response without sensitive data
type UserResponse struct {
	ID        int        `json:"id"`
	Username  string     `json:"username"`
	Email     string     `json:"email"`
	FullName  *string    `json:"full_name,omitempty"`
	IsActive  bool       `json:"is_active"`
	IsAdmin   bool       `json:"is_admin"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	LastLogin *time.Time `json:"last_login,omitempty"`
}

// ToResponse converts a User to UserResponse
func (u *User) ToResponse() *UserResponse {
	return &UserResponse{
		ID:        u.ID,
		Username:  u.Username,
		Email:     u.Email,
		FullName:  u.FullName,
		IsActive:  u.IsActive,
		IsAdmin:   u.IsAdmin,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
		LastLogin: u.LastLogin,
	}
}

// SetPassword hashes and sets the user's password
func (u *User) SetPassword(password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}
	u.Password = string(hashedPassword)
	return nil
}

// CheckPassword checks if the provided password matches the user's password
func (u *User) CheckPassword(password string) error {
	return bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
}

// BeforeInsert sets default values before inserting
func (u *User) BeforeInsert() {
	now := time.Now()
	u.CreatedAt = now
	u.UpdatedAt = now
	if !u.IsActive {
		u.IsActive = true
	}
}

// BeforeUpdate sets updated_at before updating
func (u *User) BeforeUpdate() {
	u.UpdatedAt = time.Now()
}

// TableName returns the table name for the User model
func (u *User) TableName() string {
	return "users"
}

// Status represents user status
type Status string

const (
	StatusActive   Status = "active"
	StatusInactive Status = "inactive"
	StatusSuspended Status = "suspended"
)

// Scan implements the sql.Scanner interface
func (s *Status) Scan(value interface{}) error {
	if value == nil {
		*s = StatusActive
		return nil
	}
	if str, ok := value.(string); ok {
		*s = Status(str)
		return nil
	}
	return fmt.Errorf("cannot scan %T into Status", value)
}

// Value implements the driver.Valuer interface
func (s Status) Value() (driver.Value, error) {
	return string(s), nil
}

// IsValid checks if the status is valid
func (s Status) IsValid() bool {
	switch s {
	case StatusActive, StatusInactive, StatusSuspended:
		return true
	default:
		return false
	}
}

// UserFilter represents filters for user queries
type UserFilter struct {
	Username *string `json:"username,omitempty" form:"username"`
	Email    *string `json:"email,omitempty" form:"email"`
	IsActive *bool   `json:"is_active,omitempty" form:"is_active"`
	IsAdmin  *bool   `json:"is_admin,omitempty" form:"is_admin"`
	Search   *string `json:"search,omitempty" form:"search"`
}