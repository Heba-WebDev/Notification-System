#!/bin/bash
set -e

echo "🚀 Deploying Auth Service..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# SIMPLE SOLUTION: Remove ALL containers with this name pattern (handles any prefix/suffix)
echo "🧹 Cleaning up any existing containers..."
docker ps -a --filter "name=notification-auth-service" --format "{{.ID}}" | xargs -r docker rm -f 2>/dev/null || true

# Build Docker image
echo "📦 Building Docker image..."
docker-compose build

# Stop and remove everything (including volumes if needed)
echo "🛑 Stopping and removing containers..."
docker-compose down --remove-orphans || true

# Final cleanup - remove by any possible name pattern
docker ps -a --filter "name=notification-auth-service" --format "{{.ID}}" | xargs -r docker rm -f 2>/dev/null || true

# Start new container
echo "▶️  Starting new container..."
docker-compose up -d --remove-orphans

echo "✅ Deployment complete!"
