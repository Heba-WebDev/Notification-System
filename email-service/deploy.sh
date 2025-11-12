#!/bin/bash
set -e

echo "🚀 Deploying Email Service..."

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

# Start new container with remove orphans flag
echo "▶️  Starting new container..."
docker-compose up -d --remove-orphans

echo "✅ Deployment complete!"

