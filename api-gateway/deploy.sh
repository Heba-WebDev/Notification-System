#!/bin/bash
set -e

echo "🚀 Deploying API Gateway..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# NUCLEAR OPTION: Find and remove ANY container with "notification-api-gateway" in the name
echo "🧹 Cleaning up any existing containers..."
# List ALL containers and check their names directly
docker ps -a --format "{{.ID}} {{.Names}}" | grep -i "notification-api-gateway" | awk '{print $1}' | while read container_id; do
  if [ -n "$container_id" ]; then
    echo "Found and removing container: $container_id"
    docker stop "$container_id" 2>/dev/null || true
    docker rm -f "$container_id" 2>/dev/null || true
  fi
done
# Also try exact name
docker stop notification-api-gateway 2>/dev/null || true
docker rm -f notification-api-gateway 2>/dev/null || true

# Build Docker image
echo "📦 Building Docker image..."
docker-compose build

# Stop and remove everything using docker-compose
echo "🛑 Stopping and removing containers..."
docker-compose down --remove-orphans || true

# FINAL NUCLEAR CLEANUP: Check ALL containers one more time
echo "🧹 Final cleanup pass..."
docker ps -a --format "{{.ID}} {{.Names}}" | grep -i "notification-api-gateway" | awk '{print $1}' | while read container_id; do
  if [ -n "$container_id" ]; then
    echo "Final cleanup: Removing container $container_id"
    docker stop "$container_id" 2>/dev/null || true
    docker rm -f "$container_id" 2>/dev/null || true
  fi
done
docker stop notification-api-gateway 2>/dev/null || true
docker rm -f notification-api-gateway 2>/dev/null || true

# Start new container
echo "▶️  Starting new container..."
docker-compose up -d --remove-orphans

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
