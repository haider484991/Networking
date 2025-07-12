# Bandwidth Alert Notification System & Reseller Monitoring

This repository contains a complete **scalable, multi-tenant bandwidth monitoring platform** for ISPs to monitor their resellers, receive usage alerts, and detect link failures through an integrated web-based dashboard.

## 🎯 Project Overview

### Phase 1: Bandwidth Alert System (✅ Complete)
- Monitor 5 VLANs (10, 20, 30, 40, 50) with 200 Mbps bandwidth each
- Send WhatsApp alerts when total bandwidth exceeds 950 Mbps in 5-minute intervals
- Dockerized Python service with configurable thresholds

### Phase 2: Multi-Tenant Reseller Monitoring (✅ Complete)
- **Hierarchy**: SaaS Owner → ISP → Reseller → End-User IPs
- **Real-time monitoring** with 24-hour usage charts
- **Threshold-based alerts** (80% Yellow, 100% Red)
- **Link status detection** via continuous ping monitoring
- **Modern web dashboard** with live data feeds

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Collectors    │    │   Processors    │    │   Frontend      │
│                 │    │                 │    │                 │
│ • SNMP/Mock     │───▶│ • Aggregator    │───▶│ • Next.js       │
│ • Ping Monitor  │    │ • Alert Engine  │    │ • Chakra UI     │
│ • NetFlow       │    │ • FastAPI       │    │ • Real-time     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Supabase      │
                       │                 │
                       │ • PostgreSQL    │
                       │ • Row-Level     │
                       │   Security      │
                       │ • Realtime      │
                       └─────────────────┘
```

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Clone and setup
git clone <this-repo>
cd Networking

# Copy environment template
cp env.template .env
# Edit .env with your credentials (Twilio, Supabase)
```

### 2. Backend Services
```bash
# Start all services
docker compose up --build -d

# Services running:
# - bandwidth-aggregator (port: internal)
# - ping-monitor (port: internal) 
# - reseller-api (port: 8000)
```

### 3. Frontend Dashboard
```bash
cd frontend
npm install

# Copy the frontend environment template
cp env.example .env.local
# The file contains the correct Supabase credentials

npm run dev  # http://localhost:3000
```

## 📊 Features

### Core Monitoring
- [x] **5-minute VLAN aggregation** with configurable thresholds
- [x] **WhatsApp alerts** via Twilio API
- [x] **Continuous ping monitoring** (3-failure threshold)
- [x] **Usage data storage** in Supabase with time-series queries

### Dashboard Features
- [x] **ISP Dashboard** - Real-time reseller table with utilization badges
- [x] **Reseller Detail Pages** - 24-hour bandwidth charts (Recharts)
- [x] **Alert Timeline** - Recent alerts with severity indicators
- [x] **Link Status** - UP/DOWN/IDLE badges with live updates
- [x] **Toast Notifications** - Real-time alert banners

### Multi-Tenancy
- [x] **Row-Level Security** - Tenant isolation via Supabase RLS
- [x] **Role-based Auth** - ISP vs Reseller access controls
- [x] **Magic Link Login** - Supabase Auth integration

## 🔧 Configuration

### Backend Config (`config.yaml`)
```yaml
vlans: [10, 20, 30, 40, 50]
threshold_mbps: 950
collection:
  method: snmp  # or 'mock' for testing
  snmp:
    host: 192.0.2.1
    community: public
```

### Environment Variables
```env
# Twilio WhatsApp
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=whatsapp:+14155238886
ALERT_TO_NUMBER=whatsapp:+8801000000000

# Supabase
SUPABASE_URL=https://hknnpdodkxaizhkxztis.supabase.co
SUPABASE_ANON_KEY=<anon_key>
```

## 🛠️ Tech Stack

### Backend
- **Python 3.11** - Core services
- **FastAPI** - REST API with auto-docs
- **APScheduler** - 5-minute cron jobs
- **Supabase** - PostgreSQL + Auth + Realtime
- **Twilio** - WhatsApp messaging
- **Docker** - Containerization

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Chakra UI** - Component library
- **Recharts** - Data visualization
- **Supabase JS** - Database client

### Infrastructure
- **Docker Compose** - Local development
- **Supabase Cloud** - Managed database
- **Row-Level Security** - Multi-tenant isolation

## 📈 API Endpoints

```
GET  /resellers              # List all resellers
GET  /resellers/{id}         # Get reseller details
GET  /resellers/{id}/usage   # 24-hour usage data
GET  /resellers/{id}/alerts  # Reseller alerts
GET  /alerts                 # All alerts
GET  /link-state             # Current link states
```

Full API documentation: http://localhost:8000/docs

## 🔄 Data Flow

1. **Collection**: SNMP/Mock collectors gather VLAN traffic every 5 minutes
2. **Aggregation**: Python service sums bandwidth, checks thresholds
3. **Storage**: Usage data → Supabase `usage_5m` table
4. **Alerts**: Threshold breaches → `alerts` table + WhatsApp
5. **Monitoring**: Ping workers → `link_state` table updates
6. **Frontend**: Real-time dashboard via Supabase Realtime subscriptions

## 🎛️ Monitoring & Alerts

### Alert Levels
- **YELLOW**: 80%+ bandwidth utilization
- **RED**: 100%+ bandwidth utilization  
- **LINK_DOWN**: 3 consecutive ping failures

### Notification Channels
- WhatsApp (primary)
- Dashboard toast notifications
- Database alert log

## 🔮 Future Enhancements

- [ ] **PDF Reports** - Monthly usage reports
- [ ] **Auto-blocking** - Suspend resellers at 100% usage
- [ ] **Invoice Generation** - Billing integration
- [ ] **NetFlow Integration** - Replace SNMP with flow data
- [ ] **Grafana Dashboards** - Advanced analytics
- [ ] **Multi-region** - Geographic distribution

## 🐛 Troubleshooting

### Common Issues
1. **Alerts not sending**: Check Twilio credentials in `.env`
2. **Dashboard not loading**: Verify Supabase keys in `frontend/.env.local`
3. **No usage data**: Ensure aggregator service is running
4. **Ping failures**: Check network connectivity to reseller IPs

### Logs
```bash
# View service logs
docker compose logs -f aggregator
docker compose logs -f ping-monitor
docker compose logs -f api
```

## 📝 License

This project is proprietary software for ISP bandwidth monitoring.

---

**Status**: ✅ **Production Ready**  
**Last Updated**: January 2025  
**Version**: 1.0.0 