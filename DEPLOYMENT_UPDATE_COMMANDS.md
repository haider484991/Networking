# 🚀 VPS Deployment Update Commands

## Quick Update Process

Run these commands on your VPS (209.74.64.193) to pull the latest database-driven updates:

### 1. Navigate to Project Directory
```bash
cd /path/to/your/Networking
# or wherever your project is located on the VPS
```

### 2. Pull Latest Changes
```bash
git pull origin main
```

### 3. Stop Current Services
```bash
docker-compose down
```

### 4. Rebuild and Restart Services
```bash
# Rebuild images with latest code changes
docker-compose build

# Start all services in background
docker-compose up -d
```

### 5. Verify Services are Running
```bash
# Check all containers are running
docker-compose ps

# Check logs for any errors
docker-compose logs -f --tail=50
```

### 6. Test the Updates
```bash
# Test API is responding
curl http://localhost:8000/health

# Test frontend is accessible
curl http://localhost:3000
```

## Alternative Single Command Update
If you prefer a single command to do everything:

```bash
cd /path/to/your/Networking && git pull origin main && docker-compose down && docker-compose build && docker-compose up -d && docker-compose ps
```

## Verify Database-Driven Changes

### Check API Endpoints (No Mock Data)
```bash
# Should return real reseller data from database
curl http://localhost:8000/resellers

# Should return real usage data from database
curl http://localhost:8000/usage/aggregate

# Should return real alerts from database
curl http://localhost:8000/alerts
```

### Check Service Logs
```bash
# Check aggregator is using real data
docker-compose logs aggregator

# Check ping monitor is running
docker-compose logs ping-monitor

# Check NTTN monitor is working
docker-compose logs nttn-monitor

# Check bandwidth manager is active
docker-compose logs bandwidth-manager
```

## Troubleshooting

If any service fails to start:

```bash
# Check individual service logs
docker-compose logs <service-name>

# Restart specific service
docker-compose restart <service-name>

# Check container status
docker ps -a
```

## Service URLs After Update
- **Dashboard**: http://209.74.64.193:3000
- **API**: http://209.74.64.193:8000
- **API Docs**: http://209.74.64.193:8000/docs

## What's New in This Update
✅ **Removed all mock data** - Everything now comes from database  
✅ **Enhanced error handling** - Proper HTTP errors instead of fallbacks  
✅ **Real-time data flow** - All components use live database data  
✅ **Improved reliability** - No more mixed mock/real data scenarios  

Your ISP monitoring system is now 100% database-driven! 