#!/bin/bash
set -e

echo "🚀 Deploying Auth Service..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# AGGRESSIVE CLEANUP: Remove containers by various possible names
echo "🧹 Removing existing containers..."

# First, stop and remove the problematic "auth-service-auth-service" container
echo "🔍 Looking for auth-service-auth-service container..."
docker stop auth-service-auth-service 2>/dev/null || true
docker rm -f auth-service-auth-service 2>/dev/null || true

# Also check for variants with numbers (auth-service-auth-service-1, etc.)
for container in $(docker ps -a --filter "name=auth-service-auth-service" --format "{{.Names}}" 2>/dev/null); do
  echo "Removing container: $container"
  docker stop "$container" 2>/dev/null || true
  docker rm -f "$container" 2>/dev/null || true
done

# Remove the correct container name
docker stop notification-auth-service 2>/dev/null || true
docker rm -f notification-auth-service 2>/dev/null || true

# Remove by docker-compose (this handles project-prefixed containers)
docker-compose down --remove-orphans 2>/dev/null || true
docker-compose rm -f 2>/dev/null || true

# Find and remove ANY container with auth-service in name (by ID)
ALL_CONTAINERS=$(docker ps -a --format "{{.ID}} {{.Names}}" 2>/dev/null)
if echo "$ALL_CONTAINERS" | grep -q "auth-service"; then
  echo "Found container(s) with auth-service in name:"
  echo "$ALL_CONTAINERS" | grep "auth-service"
  echo "$ALL_CONTAINERS" | grep "auth-service" | awk '{print $1}' | while read id; do
    echo "Removing container ID: $id"
    docker stop "$id" 2>/dev/null || true
    docker rm -f "$id" 2>/dev/null || true
  done
fi

# Build Docker image
echo "📦 Building Docker image..."
docker-compose build

# FINAL cleanup right before starting
echo "🧹 Final cleanup before starting..."
# Remove problematic container again
docker stop auth-service-auth-service 2>/dev/null || true
docker rm -f auth-service-auth-service 2>/dev/null || true
# Remove correct container
docker stop notification-auth-service 2>/dev/null || true
docker rm -f notification-auth-service 2>/dev/null || true
docker-compose rm -f 2>/dev/null || true

# Final check for any remaining auth-service containers
ALL_CONTAINERS=$(docker ps -a --format "{{.ID}} {{.Names}}" 2>/dev/null)
if echo "$ALL_CONTAINERS" | grep -qE "(auth-service-auth-service|notification-auth-service)"; then
  echo "⚠️  WARNING: Container still exists before start!"
  echo "$ALL_CONTAINERS" | grep -E "(auth-service-auth-service|notification-auth-service)"
  echo "$ALL_CONTAINERS" | grep -E "(auth-service-auth-service|notification-auth-service)" | awk '{print $1}' | while read id; do
    echo "Force removing: $id"
    docker stop "$id" 2>/dev/null || true
    docker rm -f "$id" 2>/dev/null || true
  done
fi

# Start new container
echo "▶️  Starting new container..."
docker-compose up -d --force-recreate --remove-orphans

echo "✅ Deployment complete!"
