# Quick Deployment Guide - ISP Reseller Monitoring System

## 🚀 **IMMEDIATE DEPLOYMENT STEPS**

### **1. Database Setup (5 minutes)**
```sql
-- Execute in Supabase SQL Editor
-- Copy and paste the entire content of db_migration_router_nttn.sql
-- This creates all required tables and sample data
```

### **2. Environment Configuration**
Update your `.env` file:
```env
# Existing variables (keep these)
SUPABASE_URL=https://hknnpdodkxaizhkxztis.supabase.co
SUPABASE_ANON_KEY=your_anon_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_FROM_NUMBER=whatsapp:+14155238886
ALERT_TO_NUMBER=whatsapp:+8801000000000

# Add router credentials
MIKROTIK_USERNAME=admin
MIKROTIK_PASSWORD=your_mikrotik_password
CISCO_USERNAME=admin
CISCO_PASSWORD=your_cisco_password
JUNIPER_USERNAME=admin
JUNIPER_PASSWORD=your_juniper_password
```

### **3. Start Backend Services**
```bash
# Install new dependencies
pip install -r requirements.txt

# Start all services
docker compose up --build -d

# Or run individually
python -m src.aggregator &
python -m src.ping_monitor &
python -m src.nttn_monitor &
python -m src.bandwidth_manager &
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### **4. Start Frontend**
```bash
cd frontend
npm install
npm run dev
# Access at http://localhost:3000
```

## 🎯 **IMMEDIATE TESTING**

### **Test NTTN Link Creation**
1. Go to Dashboard → NTTN Links tab
2. Click "Add NTTN Link"
3. Fill in:
   - Name: "Main NTTN Link"
   - Device Type: MikroTik
   - Device IP: 103.106.119.201
   - Capacity: 1000 Mbps
   - Threshold: 950 Mbps
4. Click "Add Link" - VLANs 10,20,30,40,50 auto-created

### **Test Reseller Management**
1. Go to Dashboard → Manage Resellers tab
2. Click "Add Reseller"
3. Fill in details and router mapping
4. System automatically configures router bandwidth limits

### **Test Alert System**
```bash
# Trigger manual NTTN monitoring
curl -X POST http://localhost:8000/nttn/trigger-monitoring

# Check alerts
curl http://localhost:8000/nttn/alerts
```

## 📱 **ACCESS POINTS**

- **ISP Dashboard**: http://localhost:3000/dashboard
- **Reseller Portal**: http://localhost:3000/reseller-login
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 🔧 **CONFIGURATION UPDATES**

### **Router Credentials in Database**
```sql
-- Update MikroTik router config
UPDATE router_configs 
SET username = 'admin', password = 'your_password'
WHERE id = 'mikrotik_main';

-- Add Cisco router
INSERT INTO router_configs (id, name, host, username, password, device_type, port)
VALUES ('cisco_main', 'Main Cisco Router', '192.168.1.1', 'admin', 'cisco_pass', 'cisco', 443);

-- Add Juniper router  
INSERT INTO router_configs (id, name, host, username, password, device_type, port)
VALUES ('juniper_main', 'Main Juniper Router', '192.168.1.2', 'admin', 'juniper_pass', 'juniper', 830);
```

## 🎉 **YOU'RE READY!**

Your system is now fully operational with:
- ✅ NTTN Link monitoring (5 VLANs, 950 Mbps threshold)
- ✅ WhatsApp alerts via Twilio
- ✅ Real-time reseller monitoring
- ✅ Automatic router bandwidth management
- ✅ Modern web dashboard
- ✅ PDF report generation

**Next Steps**: Add your real resellers and configure actual router IPs!