package services

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"gin-service/internal/database"
	"gin-service/internal/models"

	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

// UserService handles user-related business logic
type UserService struct {
	db     *database.DB
	logger *zap.Logger
}

// NewUserService creates a new user service
func NewUserService(db *database.DB, logger *zap.Logger) *UserService {
	return &UserService{
		db:     db,
		logger: logger,
	}
}

// Create creates a new user
func (s *UserService) Create(req *models.CreateUserRequest) (*models.User, error) {
	// Check if username already exists
	existingUser, err := s.GetByUsername(req.Username)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to check existing username: %w", err)
	}
	if existingUser != nil {
		return nil, fmt.Errorf("username already exists")
	}

	// Check if email already exists
	existingUser, err = s.GetByEmail(req.Email)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to check existing email: %w", err)
	}
	if existingUser != nil {
		return nil, fmt.Errorf("email already exists")
	}

	// Create user
	user := &models.User{
		Username: req.Username,
		Email:    req.Email,
		FullName: req.FullName,
		IsActive: true,
		IsAdmin:  false,
	}

	// Hash password
	if err := user.SetPassword(req.Password); err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user.BeforeInsert()

	// Insert user
	query := `
		INSERT INTO users (username, email, password_hash, full_name, is_active, is_admin, created_at, updated_at)
		VALUES (:username, :email, :password_hash, :full_name, :is_active, :is_admin, :created_at, :updated_at)
		RETURNING id`

	rows, err := s.db.NamedQuery(query, user)
	if err != nil {
		s.logger.Error("Failed to create user", zap.Error(err))
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	defer rows.Close()

	if rows.Next() {
		if err := rows.Scan(&user.ID); err != nil {
			return nil, fmt.Errorf("failed to scan user ID: %w", err)
		}
	}

	s.logger.Info("User created", zap.Int("user_id", user.ID), zap.String("username", user.Username))
	return user, nil
}

// GetByID retrieves a user by ID
func (s *UserService) GetByID(id int) (*models.User, error) {
	var user models.User
	query := `SELECT * FROM users WHERE id = $1`
	
	err := s.db.Get(&user, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		s.logger.Error("Failed to get user by ID", zap.Error(err), zap.Int("user_id", id))
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

// GetByUsername retrieves a user by username
func (s *UserService) GetByUsername(username string) (*models.User, error) {
	var user models.User
	query := `SELECT * FROM users WHERE username = $1`
	
	err := s.db.Get(&user, query, username)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		s.logger.Error("Failed to get user by username", zap.Error(err), zap.String("username", username))
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

// GetByEmail retrieves a user by email
func (s *UserService) GetByEmail(email string) (*models.User, error) {
	var user models.User
	query := `SELECT * FROM users WHERE email = $1`
	
	err := s.db.Get(&user, query, email)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		s.logger.Error("Failed to get user by email", zap.Error(err), zap.String("email", email))
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

// List retrieves users with filtering and pagination
func (s *UserService) List(filter *models.UserFilter, pagination *database.Paginate) ([]*models.User, error) {
	pagination.CalculateOffset()

	// Build query with filters
	whereClause, args := s.buildWhereClause(filter)
	
	// Count total records
	countQuery := "SELECT COUNT(*) FROM users" + whereClause
	var total int
	if err := s.db.Get(&total, countQuery, args...); err != nil {
		s.logger.Error("Failed to count users", zap.Error(err))
		return nil, fmt.Errorf("failed to count users: %w", err)
	}
	pagination.SetTotal(total)

	// Get users
	query := fmt.Sprintf(`
		SELECT * FROM users %s 
		ORDER BY created_at DESC 
		LIMIT %d OFFSET %d`,
		whereClause, pagination.Limit, pagination.Offset)

	var users []*models.User
	if err := s.db.Select(&users, query, args...); err != nil {
		s.logger.Error("Failed to list users", zap.Error(err))
		return nil, fmt.Errorf("failed to list users: %w", err)
	}

	return users, nil
}

// Update updates a user
func (s *UserService) Update(id int, req *models.UpdateUserRequest) (*models.User, error) {
	// Get existing user
	user, err := s.GetByID(id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, fmt.Errorf("user not found")
	}

	// Check for conflicts
	if req.Username != nil && *req.Username != user.Username {
		existingUser, err := s.GetByUsername(*req.Username)
		if err != nil && err != sql.ErrNoRows {
			return nil, fmt.Errorf("failed to check existing username: %w", err)
		}
		if existingUser != nil {
			return nil, fmt.Errorf("username already exists")
		}
		user.Username = *req.Username
	}

	if req.Email != nil && *req.Email != user.Email {
		existingUser, err := s.GetByEmail(*req.Email)
		if err != nil && err != sql.ErrNoRows {
			return nil, fmt.Errorf("failed to check existing email: %w", err)
		}
		if existingUser != nil {
			return nil, fmt.Errorf("email already exists")
		}
		user.Email = *req.Email
	}

	// Update fields
	if req.FullName != nil {
		user.FullName = req.FullName
	}

	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}

	if req.Password != nil {
		if err := user.SetPassword(*req.Password); err != nil {
			return nil, fmt.Errorf("failed to hash password: %w", err)
		}
	}

	user.BeforeUpdate()

	// Update in database
	query := `
		UPDATE users 
		SET username = :username, email = :email, password_hash = :password_hash, 
			full_name = :full_name, is_active = :is_active, updated_at = :updated_at
		WHERE id = :id`

	if _, err := s.db.NamedExec(query, user); err != nil {
		s.logger.Error("Failed to update user", zap.Error(err), zap.Int("user_id", id))
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	s.logger.Info("User updated", zap.Int("user_id", user.ID), zap.String("username", user.Username))
	return user, nil
}

// Delete deletes a user
func (s *UserService) Delete(id int) error {
	query := `DELETE FROM users WHERE id = $1`
	
	result, err := s.db.Exec(query, id)
	if err != nil {
		s.logger.Error("Failed to delete user", zap.Error(err), zap.Int("user_id", id))
		return fmt.Errorf("failed to delete user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	s.logger.Info("User deleted", zap.Int("user_id", id))
	return nil
}

// Authenticate authenticates a user with username/email and password
func (s *UserService) Authenticate(username, password string) (*models.User, error) {
	var user *models.User
	var err error

	// Try to find by email first, then by username
	if strings.Contains(username, "@") {
		user, err = s.GetByEmail(username)
	} else {
		user, err = s.GetByUsername(username)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	if user == nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	if !user.IsActive {
		return nil, fmt.Errorf("user account is inactive")
	}

	// Check password
	if err := user.CheckPassword(password); err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	// Update last login
	if err := s.updateLastLogin(user.ID); err != nil {
		s.logger.Warn("Failed to update last login", zap.Error(err), zap.Int("user_id", user.ID))
	}

	s.logger.Info("User authenticated", zap.Int("user_id", user.ID), zap.String("username", user.Username))
	return user, nil
}

// updateLastLogin updates the user's last login timestamp
func (s *UserService) updateLastLogin(userID int) error {
	query := `UPDATE users SET last_login = $1 WHERE id = $2`
	_, err := s.db.Exec(query, time.Now(), userID)
	return err
}

// buildWhereClause builds the WHERE clause for user queries
func (s *UserService) buildWhereClause(filter *models.UserFilter) (string, []interface{}) {
	if filter == nil {
		return "", nil
	}

	var conditions []string
	var args []interface{}
	argCount := 0

	if filter.Username != nil {
		argCount++
		conditions = append(conditions, fmt.Sprintf("username ILIKE $%d", argCount))
		args = append(args, "%"+*filter.Username+"%")
	}

	if filter.Email != nil {
		argCount++
		conditions = append(conditions, fmt.Sprintf("email ILIKE $%d", argCount))
		args = append(args, "%"+*filter.Email+"%")
	}

	if filter.IsActive != nil {
		argCount++
		conditions = append(conditions, fmt.Sprintf("is_active = $%d", argCount))
		args = append(args, *filter.IsActive)
	}

	if filter.IsAdmin != nil {
		argCount++
		conditions = append(conditions, fmt.Sprintf("is_admin = $%d", argCount))
		args = append(args, *filter.IsAdmin)
	}

	if filter.Search != nil {
		argCount++
		searchCondition := fmt.Sprintf("(username ILIKE $%d OR email ILIKE $%d OR full_name ILIKE $%d)", argCount, argCount, argCount)
		conditions = append(conditions, searchCondition)
		args = append(args, "%"+*filter.Search+"%")
	}

	if len(conditions) == 0 {
		return "", nil
	}

	return " WHERE " + strings.Join(conditions, " AND "), args
}