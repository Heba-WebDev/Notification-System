#!/bin/bash

# Script to start monitoring stack
# Usage: ./start-monitoring.sh

set -e

echo "🚀 Starting Monitoring Stack..."
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Check if network exists
if ! docker network ls | grep -q "notification-network"; then
    echo "📡 Creating notification-network..."
    docker network create notification-network
else
    echo "✅ Network 'notification-network' already exists"
fi

# Start monitoring services
echo ""
echo "🔧 Starting monitoring services..."
docker-compose up -d loki promtail grafana

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check service status
echo ""
echo "📊 Service Status:"
echo "=================="
docker-compose ps loki promtail grafana

echo ""
echo "✅ Monitoring stack started!"
echo ""
echo "📝 Access Grafana at:"
echo "   Local: http://localhost:3001"
echo "   VPS:   http://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo "🔑 Default credentials:"
echo "   Username: admin"
echo "   Password: admin"
echo ""
echo "⚠️  Remember to change the default password!"
echo ""
echo "📚 View logs:"
echo "   docker logs notification-grafana"
echo "   docker logs notification-loki"
echo "   docker logs notification-promtail"

