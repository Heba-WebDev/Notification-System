#!/bin/bash
set -e

echo "🚀 Deploying API Gateway..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# AGGRESSIVE CLEANUP: Remove container by multiple methods
echo "🧹 Cleaning up any existing containers..."
# Method 1: Remove by exact name (try multiple times to handle race conditions)
for i in 1 2 3; do
  docker rm -f notification-api-gateway 2>/dev/null || true
done
# Method 2: Find and remove ALL containers with matching name (handles any prefix/suffix)
for container_id in $(docker ps -a --filter "name=notification-api-gateway" --format "{{.ID}}" 2>/dev/null); do
  docker rm -f "$container_id" 2>/dev/null || true
done
# Method 3: Find and remove by service name pattern
for container_id in $(docker ps -a --filter "name=api-gateway" --format "{{.ID}}" 2>/dev/null); do
  docker rm -f "$container_id" 2>/dev/null || true
done
# Method 4: List all containers and remove if name matches (fallback)
for container_id in $(docker ps -aq 2>/dev/null); do
  container_name=$(docker inspect --format='{{.Name}}' "$container_id" 2>/dev/null || echo "")
  if [[ "$container_name" == *"notification-api-gateway"* ]] || [[ "$container_name" == *"/notification-api-gateway"* ]]; then
    docker rm -f "$container_id" 2>/dev/null || true
  fi
done

# Build Docker image
echo "📦 Building Docker image..."
docker-compose build

# Stop and remove everything (including volumes if needed)
echo "🛑 Stopping and removing containers..."
docker-compose down --remove-orphans || true

# FINAL AGGRESSIVE CLEANUP before starting
echo "🧹 Final cleanup pass..."
# Try removing by exact name multiple times
for i in 1 2 3; do
  docker rm -f notification-api-gateway 2>/dev/null || true
done
# Find and remove ALL containers with matching name
for container_id in $(docker ps -a --filter "name=notification-api-gateway" --format "{{.ID}}" 2>/dev/null); do
  docker rm -f "$container_id" 2>/dev/null || true
done
# Find and remove by service name pattern
for container_id in $(docker ps -a --filter "name=api-gateway" --format "{{.ID}}" 2>/dev/null); do
  docker rm -f "$container_id" 2>/dev/null || true
done
# Final fallback: check all containers by name
for container_id in $(docker ps -aq 2>/dev/null); do
  container_name=$(docker inspect --format='{{.Name}}' "$container_id" 2>/dev/null || echo "")
  if [[ "$container_name" == *"notification-api-gateway"* ]] || [[ "$container_name" == *"/notification-api-gateway"* ]]; then
    echo "Found matching container: $container_id ($container_name), removing..."
    docker rm -f "$container_id" 2>/dev/null || true
  fi
done

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
