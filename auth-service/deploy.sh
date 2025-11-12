#!/bin/bash
set -e

echo "🚀 Deploying Auth Service..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# AGGRESSIVE CLEANUP: Remove container by name AND find/remove by ID
echo "🧹 Removing existing container..."
# Remove by name
docker stop notification-auth-service 2>/dev/null || true
docker rm -f notification-auth-service 2>/dev/null || true

# Remove by docker-compose
docker-compose down --remove-orphans 2>/dev/null || true
docker-compose rm -f 2>/dev/null || true

# Find and remove ANY container with this name (by ID)
ALL_CONTAINERS=$(docker ps -a --format "{{.ID}} {{.Names}}" 2>/dev/null)
if echo "$ALL_CONTAINERS" | grep -q "notification-auth-service"; then
  echo "Found container(s) with notification-auth-service in name:"
  echo "$ALL_CONTAINERS" | grep "notification-auth-service"
  echo "$ALL_CONTAINERS" | grep "notification-auth-service" | awk '{print $1}' | while read id; do
    echo "Removing container: $id"
    docker stop "$id" 2>/dev/null || true
    docker rm -f "$id" 2>/dev/null || true
  done
fi

# Build Docker image
echo "📦 Building Docker image..."
docker-compose build

# FINAL cleanup right before starting
echo "🧹 Final cleanup before starting..."
docker stop notification-auth-service 2>/dev/null || true
docker rm -f notification-auth-service 2>/dev/null || true
docker-compose rm -f 2>/dev/null || true

# One more check by ID
ALL_CONTAINERS=$(docker ps -a --format "{{.ID}} {{.Names}}" 2>/dev/null)
if echo "$ALL_CONTAINERS" | grep -q "notification-auth-service"; then
  echo "⚠️  WARNING: Container still exists before start!"
  echo "$ALL_CONTAINERS" | grep "notification-auth-service"
  echo "$ALL_CONTAINERS" | grep "notification-auth-service" | awk '{print $1}' | while read id; do
    echo "Force removing: $id"
    docker stop "$id" 2>/dev/null || true
    docker rm -f "$id" 2>/dev/null || true
  done
fi

# Start new container
echo "▶️  Starting new container..."
docker-compose up -d --force-recreate --remove-orphans

echo "✅ Deployment complete!"
