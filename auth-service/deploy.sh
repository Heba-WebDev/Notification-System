#!/bin/bash
set -e

echo "🚀 Deploying Auth Service..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Build Docker image
echo "📦 Building Docker image..."
docker-compose build

# Stop existing container and remove orphans
echo "🛑 Stopping existing container..."
docker-compose down --remove-orphans || true

# Force remove container by name and by ID if it still exists (handles leftover containers)
echo "🧹 Cleaning up any leftover containers..."
docker rm -f notification-auth-service 2>/dev/null || true
# Also try to find and remove by container name pattern
docker ps -a --filter "name=notification-auth-service" -q | xargs -r docker rm -f 2>/dev/null || true

# Start new container with remove orphans flag
echo "▶️  Starting new container..."
docker-compose up -d --remove-orphans

echo "✅ Deployment complete!"

