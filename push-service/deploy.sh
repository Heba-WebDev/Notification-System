#!/bin/bash
set -e

echo "🚀 Deploying Push Service..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# NUCLEAR OPTION: Find and remove ANY container with "notification-push-service" in the name
echo "🧹 Cleaning up any existing containers..."
# List ALL containers and check their names directly
docker ps -a --format "{{.ID}} {{.Names}}" | grep -i "notification-push-service" | awk '{print $1}' | while read container_id; do
  if [ -n "$container_id" ]; then
    echo "Found and removing container: $container_id"
    docker stop "$container_id" 2>/dev/null || true
    docker rm -f "$container_id" 2>/dev/null || true
  fi
done
# Also try exact name
docker stop notification-push-service 2>/dev/null || true
docker rm -f notification-push-service 2>/dev/null || true

# Build Docker image
echo "📦 Building Docker image..."
docker-compose build

# Stop and remove everything using docker-compose
echo "🛑 Stopping and removing containers..."
docker-compose down --remove-orphans || true

# FINAL NUCLEAR CLEANUP: Check ALL containers one more time
echo "🧹 Final cleanup pass..."
docker ps -a --format "{{.ID}} {{.Names}}" | grep -i "notification-push-service" | awk '{print $1}' | while read container_id; do
  if [ -n "$container_id" ]; then
    echo "Final cleanup: Removing container $container_id"
    docker stop "$container_id" 2>/dev/null || true
    docker rm -f "$container_id" 2>/dev/null || true
  fi
done
docker stop notification-push-service 2>/dev/null || true
docker rm -f notification-push-service 2>/dev/null || true

# Start new container
echo "▶️  Starting new container..."
docker-compose up -d --remove-orphans

echo "✅ Deployment complete!"
