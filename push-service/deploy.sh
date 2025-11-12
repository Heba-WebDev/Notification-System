#!/bin/bash
set -e

echo "🚀 Deploying Push Service..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Build Docker image
echo "📦 Building Docker image..."
docker-compose build

# Force remove container by name and ID before stopping (handles leftover containers)
echo "🧹 Cleaning up any leftover containers..."
# Remove by exact name
docker rm -f notification-push-service 2>/dev/null || true
# Remove by name pattern (handles docker-compose prefixed names)
docker ps -a --filter "name=notification-push-service" -q | xargs -r docker rm -f 2>/dev/null || true
# Remove any container with push-service in the name
docker ps -a --filter "name=push-service" -q | xargs -r docker rm -f 2>/dev/null || true

# Stop existing container and remove orphans
# Use explicit project name to match the up command
echo "🛑 Stopping existing container..."
COMPOSE_PROJECT_NAME=notification docker-compose down --remove-orphans || true

# Final cleanup - remove by all possible name patterns
docker rm -f notification-push-service 2>/dev/null || true
docker ps -a --filter "name=notification-push-service" -q | xargs -r docker rm -f 2>/dev/null || true
docker ps -a --filter "name=push-service" -q | xargs -r docker rm -f 2>/dev/null || true

# Start new container with force recreate and remove orphans flag
# Use explicit project name to prevent docker-compose from adding prefixes
echo "▶️  Starting new container..."
COMPOSE_PROJECT_NAME=notification docker-compose up -d --force-recreate --remove-orphans

echo "✅ Deployment complete!"

