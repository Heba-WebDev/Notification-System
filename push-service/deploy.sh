#!/bin/bash
set -e

echo "🚀 Deploying Push Service..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# NUCLEAR OPTION: Find and remove ANY container with "notification-push-service" in the name
echo "🧹 Cleaning up any existing containers..."
# List ALL containers and check their names directly (handle leading slash)
docker ps -a --format "{{.ID}} {{.Names}}" | grep -iE "(notification-push-service|/notification-push-service)" | awk '{print $1}' | while read container_id; do
  if [ -n "$container_id" ]; then
    echo "Found and removing container: $container_id"
    docker stop "$container_id" 2>/dev/null || true
    docker rm -f "$container_id" 2>/dev/null || true
  fi
done
# Also try exact name
docker stop notification-push-service 2>/dev/null || true
docker rm -f notification-push-service 2>/dev/null || true
# Try removing by the exact ID format Docker might use
docker ps -a --format "{{.ID}} {{.Names}}" | awk '$2 ~ /notification-push-service/ {print $1}' | while read container_id; do
  if [ -n "$container_id" ]; then
    echo "Removing container by awk match: $container_id"
    docker stop "$container_id" 2>/dev/null || true
    docker rm -f "$container_id" 2>/dev/null || true
  fi
done

# Build Docker image
echo "📦 Building Docker image..."
docker-compose build

# Stop and remove everything using docker-compose
echo "🛑 Stopping and removing containers..."
docker-compose down --remove-orphans || true

# FINAL NUCLEAR CLEANUP: Check ALL containers one more time
echo "🧹 Final cleanup pass..."
# Use multiple methods to catch all variations
docker ps -a --format "{{.ID}} {{.Names}}" | grep -iE "(notification-push-service|/notification-push-service)" | awk '{print $1}' | while read container_id; do
  if [ -n "$container_id" ]; then
    echo "Final cleanup: Removing container $container_id"
    docker stop "$container_id" 2>/dev/null || true
    docker rm -f "$container_id" 2>/dev/null || true
  fi
done
# Also use awk for more reliable matching
docker ps -a --format "{{.ID}} {{.Names}}" | awk '$2 ~ /notification-push-service/ {print $1}' | while read container_id; do
  if [ -n "$container_id" ]; then
    echo "Final cleanup awk: Removing container $container_id"
    docker stop "$container_id" 2>/dev/null || true
    docker rm -f "$container_id" 2>/dev/null || true
  fi
done
# Try exact name
docker stop notification-push-service 2>/dev/null || true
docker rm -f notification-push-service 2>/dev/null || true
# Last resort: remove by the specific container ID if we can find it
CONFLICT_ID=$(docker ps -a --format "{{.ID}} {{.Names}}" | awk '$2 ~ /notification-push-service/ {print $1}' | head -1)
if [ -n "$CONFLICT_ID" ]; then
  echo "Force removing conflict container: $CONFLICT_ID"
  docker stop "$CONFLICT_ID" 2>/dev/null || true
  docker rm -f "$CONFLICT_ID" 2>/dev/null || true
fi

# ABSOLUTE FINAL CHECK: Remove container RIGHT before starting (catches any created between cleanup and now)
echo "🔍 Absolute final check before starting..."
ALL_CONTAINERS=$(docker ps -a --format "{{.ID}} {{.Names}}" 2>/dev/null)
if echo "$ALL_CONTAINERS" | grep -qi "notification-push-service"; then
  echo "⚠️  Found container right before start, removing..."
  echo "$ALL_CONTAINERS" | grep -i "notification-push-service" | awk '{print $1}' | while read id; do
    echo "Force removing: $id"
    docker stop "$id" 2>/dev/null || true
    docker rm -f "$id" 2>/dev/null || true
  done
  # Also try by exact name one more time
  docker stop notification-push-service 2>/dev/null || true
  docker rm -f notification-push-service 2>/dev/null || true
fi

# Start new container with force recreate
echo "▶️  Starting new container..."
docker-compose up -d --force-recreate --remove-orphans

echo "✅ Deployment complete!"
