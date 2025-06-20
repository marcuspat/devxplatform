package database

import (
	"database/sql"
	"fmt"
	"time"

	"gin-service/internal/config"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"go.uber.org/zap"
)

// DB wraps sqlx.DB with additional functionality
type DB struct {
	*sqlx.DB
}

// Initialize creates a new database connection
func Initialize(cfg *config.Config) (*DB, error) {
	db, err := sqlx.Open("postgres", cfg.Database.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(cfg.Database.MaxOpenConns)
	db.SetMaxIdleConns(cfg.Database.MaxIdleConns)
	db.SetConnMaxLifetime(time.Duration(cfg.Database.ConnMaxLifetime) * time.Second)

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &DB{db}, nil
}

// Close closes the database connection
func (db *DB) Close() error {
	return db.DB.Close()
}

// Health checks the database connection health
func (db *DB) Health() error {
	return db.Ping()
}

// RunMigrations runs database migrations
func RunMigrations(databaseURL string) error {
	zap.L().Info("Running database migrations")

	// Open database connection for migrations
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return fmt.Errorf("failed to open database for migrations: %w", err)
	}
	defer db.Close()

	// Create postgres driver instance
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("failed to create postgres driver: %w", err)
	}

	// Create migrate instance
	m, err := migrate.NewWithDatabaseInstance(
		"file://migrations",
		"postgres",
		driver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}

	// Run migrations
	if err := m.Up(); err != nil {
		if err == migrate.ErrNoChange {
			zap.L().Info("No migrations to run")
			return nil
		}
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	zap.L().Info("Migrations completed successfully")
	return nil
}

// Transaction executes a function within a database transaction
func (db *DB) Transaction(fn func(*sqlx.Tx) error) error {
	tx, err := db.Beginx()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	defer func() {
		if p := recover(); p != nil {
			tx.Rollback()
			panic(p)
		} else if err != nil {
			tx.Rollback()
		} else {
			err = tx.Commit()
		}
	}()

	err = fn(tx)
	return err
}

// Paginate represents pagination parameters
type Paginate struct {
	Page    int `json:"page" form:"page" binding:"min=1"`
	Limit   int `json:"limit" form:"limit" binding:"min=1,max=100"`
	Offset  int `json:"-"`
	Total   int `json:"total"`
	Pages   int `json:"pages"`
	HasNext bool `json:"has_next"`
	HasPrev bool `json:"has_prev"`
}

// CalculateOffset calculates the offset for pagination
func (p *Paginate) CalculateOffset() {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.Limit < 1 {
		p.Limit = 10
	}
	if p.Limit > 100 {
		p.Limit = 100
	}
	p.Offset = (p.Page - 1) * p.Limit
}

// SetTotal sets the total count and calculates pagination metadata
func (p *Paginate) SetTotal(total int) {
	p.Total = total
	if p.Limit > 0 {
		p.Pages = (total + p.Limit - 1) / p.Limit
	}
	p.HasNext = p.Page < p.Pages
	p.HasPrev = p.Page > 1
}

// PaginatedResponse represents a paginated API response
type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Pagination *Paginate   `json:"pagination"`
}