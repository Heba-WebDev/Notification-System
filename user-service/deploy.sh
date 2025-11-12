#!/bin/bash
set -e

echo "🚀 Deploying User Service..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# SIMPLE CLEANUP: Remove the specific container by name
echo "🧹 Removing existing container..."
docker stop notification-user-service 2>/dev/null || true
docker rm -f notification-user-service 2>/dev/null || true

# Also remove by docker-compose
docker-compose down --remove-orphans 2>/dev/null || true

# Build Docker image
echo "📦 Building Docker image..."
docker-compose build

# FINAL cleanup right before starting
docker stop notification-user-service 2>/dev/null || true
docker rm -f notification-user-service 2>/dev/null || true

# Start new container
echo "▶️  Starting new container..."
docker-compose up -d --force-recreate --remove-orphans

echo "✅ Deployment complete!"
