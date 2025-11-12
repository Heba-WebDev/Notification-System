#!/bin/bash
set -e

echo "🚀 Deploying Auth Service..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# SIMPLE CLEANUP: Stop and remove ALL containers
echo "🧹 Stopping and removing all containers..."
docker ps -a -q | while read container_id; do
  if [ -n "$container_id" ]; then
    docker stop "$container_id" 2>/dev/null || true
    docker rm -f "$container_id" 2>/dev/null || true
  fi
done

# Build Docker image
echo "📦 Building Docker image..."
docker-compose build

# Start new container
echo "▶️  Starting new container..."
docker-compose up -d --force-recreate --remove-orphans

echo "✅ Deployment complete!"
