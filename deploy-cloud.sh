#!/bin/bash

echo "🚀 Deploying ISP Bandwidth Tracker to Production"
echo "================================================"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please create .env.production with your production environment variables."
    exit 1
fi

# Build and deploy
echo "📦 Building production images..."
docker-compose -f docker-compose.prod.yml build

echo "🔄 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

echo "🚀 Starting production services..."
docker-compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting for services to start..."
sleep 30

# Health checks
echo "🏥 Performing health checks..."

# Check API health
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ API is healthy"
else
    echo "❌ API health check failed"
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend health check failed"
fi

echo ""
echo "🎉 Deployment Complete!"
echo "================================="
echo "🌐 Application URL: http://your-domain.com"
echo "📊 API Docs: http://your-domain.com/api/docs"
echo ""
echo "📝 To view logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "🛑 To stop:"
echo "   docker-compose -f docker-compose.prod.yml down" 