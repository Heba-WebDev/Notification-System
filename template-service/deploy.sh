#!/bin/bash
set -e

echo "🚀 Deploying Template Service..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Build Docker image
echo "📦 Building Docker image..."
docker-compose build

# Force remove container by name and ID before stopping (handles leftover containers)
echo "🧹 Cleaning up any leftover containers..."
docker rm -f notification-template-service 2>/dev/null || true
docker ps -a --filter "name=^/notification-template-service$" -q | xargs -r docker rm -f 2>/dev/null || true

# Stop existing container and remove orphans
echo "🛑 Stopping existing container..."
docker-compose down --remove-orphans || true

# Final cleanup
docker rm -f notification-template-service 2>/dev/null || true

# Start new container with force recreate and remove orphans flag
echo "▶️  Starting new container..."
docker-compose up -d --force-recreate --remove-orphans

echo "✅ Deployment complete!"

