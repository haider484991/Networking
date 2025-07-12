# 🚀 ISP Bandwidth Tracker - Deployment Guide

## Quick Demo (5 minutes)

### Option 1: Local Demo on Your Machine
Perfect for immediate client demonstration:

1. **Run the demo script:**
   ```bash
   # Windows
   deploy-local.bat
   
   # Linux/Mac
   chmod +x deploy-cloud.sh && ./deploy-cloud.sh
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - API: http://localhost:8000

### Option 2: Share via Ngrok (Instant Public Access)
Make your local demo accessible to remote clients:

1. **Install ngrok:** https://ngrok.com/download
2. **Start the local demo** (using deploy-local.bat)
3. **Create public tunnel:**
   ```bash
   ngrok http 3000
   ```
4. **Share the ngrok URL** with your client (e.g., https://abc123.ngrok.io)

## Professional Cloud Deployment

### Recommended Platforms

#### 🔵 **DigitalOcean Droplet** (Recommended)
- **Cost:** $5-10/month
- **Setup time:** 15 minutes
- **Perfect for:** Professional client demos

**Quick Setup:**
1. Create a DigitalOcean droplet (Ubuntu 22.04)
2. SSH into your server
3. Install Docker and Docker Compose
4. Clone your repository
5. Run: `./deploy-cloud.sh`

#### ☁️ **AWS EC2**
- **Cost:** $5-15/month
- **Setup time:** 20 minutes
- **Perfect for:** Enterprise clients

#### 🟢 **Vercel + Railway** (Frontend + Backend)
- **Cost:** Free tier available
- **Setup time:** 10 minutes
- **Perfect for:** Quick professional demos

### Step-by-Step Cloud Deployment

#### Prerequisites
```bash
# Create production environment file
cp env.template .env.production

# Edit with your production values
nano .env.production
```

#### Deploy to DigitalOcean

1. **Create Droplet:**
   - Ubuntu 22.04 LTS
   - 2GB RAM minimum
   - Enable monitoring

2. **Server Setup:**
   ```bash
   # SSH into your server
   ssh root@your-server-ip
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Deploy Application:**
   ```bash
   # Clone your repository
   git clone https://github.com/yourusername/networking.git
   cd networking
   
   # Set up environment
   cp env.template .env.production
   nano .env.production  # Add your production values
   
   # Deploy
   chmod +x deploy-cloud.sh
   ./deploy-cloud.sh
   ```

4. **Set up Domain (Optional):**
   ```bash
   # Point your domain to the server IP
   # Update nginx.conf with your domain name
   # Add SSL certificate
   ```

### Environment Variables

Create `.env.production` with these values:

```env
# Supabase Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://your-domain.com/api
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Monitoring Configuration
INFLUXDB_URL=http://influxdb:8086
INFLUXDB_TOKEN=your-influxdb-token
INFLUXDB_ORG=your-org
INFLUXDB_BUCKET=networking
```

## Client Demo Checklist

### Before the Demo
- [ ] Test all functionality locally
- [ ] Prepare sample data
- [ ] Check all charts are working
- [ ] Verify mobile responsiveness
- [ ] Test CRUD operations

### Demo Script
1. **Overview** (2 min)
   - Show dashboard with real-time charts
   - Highlight modern glass morphism design
   - Point out key metrics

2. **Real-time Monitoring** (3 min)
   - Show VLAN/Interface traffic chart
   - Demonstrate NTTN aggregated link monitoring
   - Show threshold alerts

3. **Management Features** (3 min)
   - Add a new reseller
   - Edit existing reseller
   - Show delete functionality
   - Navigate through leaderboard

4. **Technical Features** (2 min)
   - Show responsive design on mobile
   - Demonstrate API integration
   - Highlight data persistence

### Troubleshooting

#### Common Issues

**Charts not loading:**
```bash
# Check if Chart.js is installed
cd frontend && npm list chart.js

# Reinstall if needed
npm install chart.js react-chartjs-2
```

**API connection issues:**
```bash
# Check API health
curl http://localhost:8000/health

# Check logs
docker-compose logs api
```

**Database connection:**
```bash
# Verify Supabase configuration
# Check .env file has correct SUPABASE_URL and keys
```

## Monitoring and Maintenance

### View Application Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f api
```

### Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

### Backup Data
```bash
# Export Supabase data (use Supabase dashboard)
# Or backup your database regularly
```

## Cost Estimates

| Platform | Monthly Cost | Setup Time | Best For |
|----------|-------------|------------|----------|
| Local Demo | $0 | 5 min | Immediate demo |
| Ngrok | $0-8 | 2 min | Remote demo |
| DigitalOcean | $5-10 | 15 min | Professional demo |
| AWS EC2 | $5-15 | 20 min | Enterprise clients |
| Vercel + Railway | $0-10 | 10 min | Quick deployment |

## Support

For deployment issues:
1. Check logs: `docker-compose logs`
2. Verify environment variables
3. Ensure ports 3000 and 8000 are available
4. Check firewall settings for cloud deployments

---

**Ready to impress your client!** 🎉 