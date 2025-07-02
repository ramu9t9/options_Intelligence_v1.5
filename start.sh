#!/bin/bash

# Options Intelligence Platform - Quick Start Script
# This script helps developers quickly set up and run the containerized platform

set -e

echo "🚀 Options Intelligence Platform - Container Setup"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

# Check required ports
print_status "Checking port availability..."
declare -a PORTS=(3000 5000 5432 6379 9090)
declare -a SERVICES=("Frontend" "Backend" "PostgreSQL" "Redis" "Prometheus")

for i in "${!PORTS[@]}"; do
    port=${PORTS[$i]}
    service=${SERVICES[$i]}
    if ! check_port $port; then
        print_warning "Port $port (${service}) is already in use"
    else
        print_success "Port $port (${service}) is available"
    fi
done

# Create environment files if they don't exist
print_status "Setting up environment files..."

if [ ! -f backend/.env ]; then
    print_status "Creating backend/.env from template..."
    cat > backend/.env << EOF
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/options_intelligence
REDIS_URL=redis://redis:6379
PORT=5000

# API Keys - Add your credentials here
ANGEL_ONE_API_KEY=your_api_key_here
ANGEL_ONE_API_SECRET=your_api_secret_here
ANGEL_ONE_CLIENT_ID=your_client_id_here
ANGEL_ONE_PIN=your_pin_here
ANGEL_ONE_TOTP_SECRET=your_totp_secret_here

# Optional
SESSION_SECRET=dev_session_secret_change_in_production
OPENAI_API_KEY=your_openai_key_here
EOF
    print_success "Created backend/.env"
else
    print_success "backend/.env already exists"
fi

# Menu for user choice
echo ""
echo "Choose deployment mode:"
echo "1) Development mode (with hot reload)"
echo "2) Production mode (optimized containers)"
echo "3) Development mode (background)"
echo "4) Stop all services"
echo "5) View service logs"
echo "6) Clean up containers and volumes"

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        print_status "Starting development environment..."
        docker-compose up --build
        ;;
    2)
        print_status "Starting production environment..."
        docker-compose -f docker-compose.yml up -d --build
        print_success "Services started in background"
        print_status "Access points:"
        echo "  Frontend: http://localhost:80"
        echo "  Backend API: http://localhost:5000"
        echo "  Prometheus: http://localhost:9090"
        echo "  Grafana: http://localhost:3000 (admin/admin)"
        ;;
    3)
        print_status "Starting development environment in background..."
        docker-compose up -d --build
        print_success "Services started in background"
        print_status "Access points:"
        echo "  Frontend: http://localhost:3000"
        echo "  Backend API: http://localhost:5000"
        echo "  Database: localhost:5432"
        echo "  Redis: localhost:6379"
        ;;
    4)
        print_status "Stopping all services..."
        docker-compose down
        print_success "All services stopped"
        ;;
    5)
        print_status "Viewing service logs..."
        echo "Choose service:"
        echo "1) All services"
        echo "2) Frontend only"
        echo "3) Backend only" 
        echo "4) Database only"
        echo "5) Redis only"
        read -p "Enter choice (1-5): " log_choice
        
        case $log_choice in
            1) docker-compose logs -f ;;
            2) docker-compose logs -f frontend ;;
            3) docker-compose logs -f backend ;;
            4) docker-compose logs -f postgres ;;
            5) docker-compose logs -f redis ;;
            *) print_error "Invalid choice" ;;
        esac
        ;;
    6)
        print_warning "This will remove all containers and volumes. Are you sure? (y/N)"
        read -p "Confirm: " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            print_status "Cleaning up containers and volumes..."
            docker-compose down -v
            docker system prune -f
            print_success "Cleanup completed"
        else
            print_status "Cleanup cancelled"
        fi
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# Health check function
health_check() {
    print_status "Running health checks..."
    
    # Wait for services to start
    sleep 10
    
    # Check backend health
    if curl -f http://localhost:5000/api/health >/dev/null 2>&1; then
        print_success "Backend health check passed"
    else
        print_warning "Backend health check failed"
    fi
    
    # Check frontend (if running on port 3000)
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        print_success "Frontend health check passed"
    else
        print_warning "Frontend health check failed or running on different port"
    fi
}

# Run health check for development modes
if [[ $choice == "1" || $choice == "3" ]]; then
    health_check
fi

echo ""
print_success "Setup completed! Check the access points above to use the platform."
echo ""
print_status "Useful commands:"
echo "  docker-compose ps                 # View running services"
echo "  docker-compose logs -f backend    # View backend logs"
echo "  docker-compose down               # Stop all services"
echo "  ./start.sh                        # Run this script again"