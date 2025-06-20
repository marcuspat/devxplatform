#!/bin/bash

# DevX Platform Docker Startup Script
# This script sets up and starts the DevX Platform using Docker Compose

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_COMPOSE_FILE="infrastructure/docker/docker-compose.yml"
PROJECT_NAME="devxplatform"
PORTAL_URL="http://localhost:3000"
API_URL="http://localhost:3001"
PGADMIN_URL="http://localhost:5050"

# Functions
print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}    DevX Platform - Docker Environment Setup    ${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

check_command() {
    if command -v $1 &> /dev/null; then
        print_status "$1 is installed"
        return 0
    else
        print_error "$1 is not installed"
        return 1
    fi
}

check_docker_daemon() {
    if docker info &> /dev/null; then
        print_status "Docker daemon is running"
        return 0
    else
        print_error "Docker daemon is not running"
        return 1
    fi
}

install_dependencies() {
    local os_type=$(uname -s)
    
    case "$os_type" in
        Darwin*)
            print_info "Detected macOS"
            if ! check_command brew; then
                print_error "Homebrew is not installed. Please install it from https://brew.sh"
                exit 1
            fi
            
            if ! check_command docker; then
                print_warning "Installing Docker Desktop for Mac..."
                brew install --cask docker
                print_info "Please start Docker Desktop from Applications"
                open -a Docker
                print_info "Waiting for Docker to start (this may take a minute)..."
                sleep 30
            fi
            
            if ! check_command docker-compose; then
                print_warning "Installing docker-compose..."
                brew install docker-compose
            fi
            ;;
            
        Linux*)
            print_info "Detected Linux"
            if ! check_command docker; then
                print_warning "Installing Docker..."
                curl -fsSL https://get.docker.com -o get-docker.sh
                sudo sh get-docker.sh
                sudo usermod -aG docker $USER
                rm get-docker.sh
                print_warning "Please log out and back in for docker group changes to take effect"
            fi
            
            if ! check_command docker-compose; then
                print_warning "Installing docker-compose..."
                sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
                sudo chmod +x /usr/local/bin/docker-compose
            fi
            ;;
            
        MINGW*|MSYS*|CYGWIN*)
            print_info "Detected Windows (WSL recommended)"
            print_error "Please install Docker Desktop for Windows and ensure WSL2 integration is enabled"
            print_info "Visit: https://docs.docker.com/desktop/windows/install/"
            exit 1
            ;;
            
        *)
            print_error "Unsupported operating system: $os_type"
            exit 1
            ;;
    esac
}

create_directories() {
    print_info "Creating necessary directories..."
    mkdir -p api/{src,tests,config}
    mkdir -p portal/{pages,components,styles,public}
    print_status "Directories created"
}

create_minimal_api() {
    if [ ! -f "api/package.json" ]; then
        print_info "Creating minimal API structure..."
        cat > api/package.json << 'EOF'
{
  "name": "devx-api",
  "version": "1.0.0",
  "description": "DevX Platform API",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.3.1",
    "pg": "^8.11.3",
    "redis": "^4.6.10",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF
        
        cat > api/src/index.js << 'EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'DevX Platform API', version: '1.0.0' });
});

// API routes
app.get('/api/templates', (req, res) => {
  res.json({
    templates: [
      { id: 1, name: 'REST API Template', technology: 'Node.js' },
      { id: 2, name: 'FastAPI Template', technology: 'Python' },
      { id: 3, name: 'Spring Boot Template', technology: 'Java' }
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
EOF
        print_status "Minimal API created"
    fi
}

create_minimal_portal() {
    if [ ! -f "portal/package.json" ]; then
        print_info "Creating minimal Portal structure..."
        cat > portal/package.json << 'EOF'
{
  "name": "devx-portal",
  "version": "1.0.0",
  "description": "DevX Platform Portal",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "13.5.6",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
EOF
        
        mkdir -p portal/pages
        cat > portal/pages/index.js << 'EOF'
import { useEffect, useState } from 'react';

export default function Home() {
  const [templates, setTemplates] = useState([]);
  
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/templates`)
      .then(res => res.json())
      .then(data => setTemplates(data.templates))
      .catch(err => console.error('Failed to fetch templates:', err));
  }, []);
  
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>DevX Platform</h1>
      <p>Welcome to the Developer Experience Platform</p>
      
      <h2>Available Templates</h2>
      <ul>
        {templates.map(template => (
          <li key={template.id}>
            <strong>{template.name}</strong> - {template.technology}
          </li>
        ))}
      </ul>
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f0f0f0' }}>
        <p>🚀 Platform is running successfully!</p>
        <p>API: <a href="http://localhost:3001">http://localhost:3001</a></p>
        <p>Portal: <a href="http://localhost:3000">http://localhost:3000</a></p>
      </div>
    </div>
  );
}
EOF
        
        cat > portal/pages/_app.js << 'EOF'
export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
EOF
        
        cat > portal/pages/api/health.js << 'EOF'
export default function handler(req, res) {
  res.status(200).json({ status: 'healthy', service: 'portal' });
}
EOF
        
        print_status "Minimal Portal created"
    fi
}

wait_for_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    print_info "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null; then
            print_status "$service_name is ready"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo ""
    print_error "$service_name failed to start (timeout)"
    return 1
}

show_logs() {
    print_info "Showing last 20 lines of logs (Ctrl+C to continue)..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" -p "$PROJECT_NAME" logs --tail=20 || true
}

cleanup() {
    print_warning "Shutting down services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" -p "$PROJECT_NAME" down
    print_status "Services stopped"
}

open_browser() {
    local url=$1
    local os_type=$(uname -s)
    
    case "$os_type" in
        Darwin*)
            open "$url"
            ;;
        Linux*)
            if command -v xdg-open &> /dev/null; then
                xdg-open "$url"
            elif command -v gnome-open &> /dev/null; then
                gnome-open "$url"
            else
                print_info "Please open $url in your browser"
            fi
            ;;
        *)
            print_info "Please open $url in your browser"
            ;;
    esac
}

show_status() {
    print_header
    echo -e "${GREEN}DevX Platform is running!${NC}"
    echo ""
    echo "Services:"
    echo "  • Portal UI:    $PORTAL_URL"
    echo "  • API Backend:  $API_URL"
    echo "  • Database:     PostgreSQL on port 5432"
    echo "  • Cache:        Redis on port 6379"
    echo "  • PgAdmin:      $PGADMIN_URL (admin@devxplatform.local / admin_password)"
    echo ""
    echo "Useful commands:"
    echo "  • View logs:        docker-compose -f $DOCKER_COMPOSE_FILE logs -f [service]"
    echo "  • Stop services:    docker-compose -f $DOCKER_COMPOSE_FILE down"
    echo "  • Restart service:  docker-compose -f $DOCKER_COMPOSE_FILE restart [service]"
    echo "  • Shell access:     docker-compose -f $DOCKER_COMPOSE_FILE exec [service] sh"
    echo ""
    echo "Press Ctrl+C to stop all services"
}

# Main execution
main() {
    print_header
    
    # Check prerequisites
    print_info "Checking prerequisites..."
    
    if ! check_command docker || ! check_command docker-compose; then
        print_warning "Missing dependencies detected"
        install_dependencies
    fi
    
    if ! check_docker_daemon; then
        print_error "Docker daemon is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Create necessary directories and files
    create_directories
    create_minimal_api
    create_minimal_portal
    
    # Set up trap for cleanup
    trap cleanup EXIT INT TERM
    
    # Build and start services
    print_info "Building Docker images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" -p "$PROJECT_NAME" build
    
    print_info "Starting services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" -p "$PROJECT_NAME" up -d
    
    # Wait for services to be ready
    wait_for_service "PostgreSQL" "http://localhost:5432" || true
    wait_for_service "Redis" "http://localhost:6379" || true
    wait_for_service "API" "$API_URL/health"
    wait_for_service "Portal" "$PORTAL_URL"
    
    # Open browser
    print_info "Opening browser..."
    sleep 2
    open_browser "$PORTAL_URL"
    
    # Show status
    show_status
    
    # Keep script running
    while true; do
        sleep 1
    done
}

# Run main function
main "$@"