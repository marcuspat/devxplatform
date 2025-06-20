# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod
BINARY_NAME=gin-service
BINARY_UNIX=$(BINARY_NAME)_unix

# Docker parameters
DOCKER_IMAGE=gin-service
DOCKER_TAG=latest

# Migration parameters
DB_URL ?= postgres://user:password@localhost:5432/gin_service?sslmode=disable

.PHONY: all build clean test deps run docker-build docker-run help

## help: Show this help message
help:
	@echo "Available commands:"
	@sed -n 's/^##//p' ${MAKEFILE_LIST} | column -t -s ':' | sed -e 's/^/ /'

## all: Build the application
all: clean deps build

## build: Build the application binary
build:
	$(GOBUILD) -o $(BINARY_NAME) -v ./cmd/main.go

## build-linux: Build the application binary for Linux
build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GOBUILD) -o $(BINARY_UNIX) -v ./cmd/main.go

## clean: Clean build files
clean:
	$(GOCLEAN)
	rm -f $(BINARY_NAME)
	rm -f $(BINARY_UNIX)

## deps: Download and verify dependencies
deps:
	$(GOMOD) download
	$(GOMOD) verify

## deps-update: Update dependencies
deps-update:
	$(GOGET) -u ./...
	$(GOMOD) tidy

## test: Run tests
test:
	$(GOTEST) -v ./...

## test-coverage: Run tests with coverage
test-coverage:
	$(GOTEST) -v -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out -o coverage.html

## test-race: Run tests with race detection
test-race:
	$(GOTEST) -race -v ./...

## run: Run the application
run:
	$(GOBUILD) -o $(BINARY_NAME) -v ./cmd/main.go
	./$(BINARY_NAME)

## dev: Run the application in development mode with hot reload
dev:
	air

## lint: Run linter
lint:
	golangci-lint run

## fmt: Format Go code
fmt:
	$(GOCMD) fmt ./...

## vet: Run go vet
vet:
	$(GOCMD) vet ./...

## swagger: Generate Swagger documentation
swagger:
	swag init -g cmd/main.go -o docs

## migrate-up: Run database migrations up
migrate-up:
	migrate -path migrations -database "$(DB_URL)" up

## migrate-down: Run database migrations down
migrate-down:
	migrate -path migrations -database "$(DB_URL)" down

## migrate-force: Force migration version
migrate-force:
	migrate -path migrations -database "$(DB_URL)" force $(VERSION)

## migrate-version: Show current migration version
migrate-version:
	migrate -path migrations -database "$(DB_URL)" version

## migrate-create: Create a new migration file
migrate-create:
	migrate create -ext sql -dir migrations -seq $(NAME)

## docker-build: Build Docker image
docker-build:
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .

## docker-run: Run Docker container
docker-run:
	docker run -p 8080:8080 $(DOCKER_IMAGE):$(DOCKER_TAG)

## docker-compose-up: Start services with docker-compose
docker-compose-up:
	docker-compose up -d

## docker-compose-down: Stop services with docker-compose
docker-compose-down:
	docker-compose down

## docker-compose-logs: Show docker-compose logs
docker-compose-logs:
	docker-compose logs -f

## security: Run security scan
security:
	gosec ./...

## benchmark: Run benchmarks
benchmark:
	$(GOTEST) -bench=. -benchmem ./...

## install-tools: Install development tools
install-tools:
	go install github.com/cosmtrek/air@latest
	go install github.com/swaggo/swag/cmd/swag@latest
	go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest

## setup: Initial project setup
setup: install-tools deps
	cp config.yaml.example config.yaml
	@echo "Project setup complete!"
	@echo "1. Update config.yaml with your settings"
	@echo "2. Run 'make migrate-up' to set up the database"
	@echo "3. Run 'make run' to start the application"