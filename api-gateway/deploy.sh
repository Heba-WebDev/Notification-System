#!/bin/bash
set -e

echo "🚀 Deploying API Gateway..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# SIMPLE CLEANUP: Remove the specific container by name
echo "🧹 Removing existing container..."
docker stop notification-api-gateway 2>/dev/null || true
docker rm -f notification-api-gateway 2>/dev/null || true

# Also remove by docker-compose
docker-compose down --remove-orphans 2>/dev/null || true

# Build Docker image
echo "📦 Building Docker image..."
docker-compose build

# FINAL cleanup right before starting
docker stop notification-api-gateway 2>/dev/null || true
docker rm -f notification-api-gateway 2>/dev/null || true

# Start new container
echo "▶️  Starting new container..."
docker-compose up -d --force-recreate --remove-orphans

# Wait for health check
echo "⏳ Waiting for service to be healthy..."
sleep 10

# Check health
if curl -f http://localhost:${API_GATEWAY_PORT:-3000}/api/v1/health > /dev/null 2>&1; then
  echo "✅ API Gateway is healthy!"
else
  echo "❌ API Gateway health check failed!"
  docker-compose logs
  exit 1
fi

echo "✅ Deployment complete!"
