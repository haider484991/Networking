-- Database Migration for Router API and NTTN Link Features
-- Execute this in your Supabase SQL Editor

-- ============================================================================
-- 1. Router Configuration Tables
-- ============================================================================

-- Table to store router configurations
CREATE TABLE IF NOT EXISTS router_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    port INTEGER DEFAULT 8728,
    use_ssl BOOLEAN DEFAULT false,
    device_type TEXT DEFAULT 'mikrotik', -- mikrotik, cisco, juniper
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table to map resellers to router targets
CREATE TABLE IF NOT EXISTS reseller_router_mapping (
    id SERIAL PRIMARY KEY,
    reseller_id TEXT NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    router_id TEXT NOT NULL REFERENCES router_configs(id) ON DELETE CASCADE,
    target_ip TEXT NOT NULL,
    queue_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(reseller_id, router_id)
);

-- Table to log router actions for audit trail
CREATE TABLE IF NOT EXISTS router_actions (
    id SERIAL PRIMARY KEY,
    router_ip TEXT NOT NULL,
    action TEXT NOT NULL,
    reseller_id TEXT REFERENCES resellers(id),
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table to log bandwidth update results
CREATE TABLE IF NOT EXISTS bandwidth_update_log (
    id SERIAL PRIMARY KEY,
    reseller_id TEXT NOT NULL REFERENCES resellers(id),
    new_limit_mbps INTEGER NOT NULL,
    success_count INTEGER NOT NULL,
    total_count INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- 2. NTTN Link Monitoring Tables
-- ============================================================================

-- Table to store NTTN Link configurations
CREATE TABLE IF NOT EXISTS nttn_links (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    device_type TEXT NOT NULL, -- mikrotik, cisco, juniper
    device_ip TEXT NOT NULL,
    total_capacity_mbps INTEGER NOT NULL DEFAULT 1000, -- 5 VLANs * 200 Mbps each
    threshold_mbps INTEGER NOT NULL DEFAULT 950, -- Alert threshold
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table to store VLAN configurations for NTTN Links
CREATE TABLE IF NOT EXISTS nttn_vlans (
    id SERIAL PRIMARY KEY,
    nttn_link_id TEXT NOT NULL REFERENCES nttn_links(id) ON DELETE CASCADE,
    vlan_id INTEGER NOT NULL,
    vlan_name TEXT,
    capacity_mbps INTEGER NOT NULL DEFAULT 200,
    interface_name TEXT, -- e.g., "vlan10", "GigabitEthernet0/0/0.10"
    snmp_oid TEXT, -- Custom SNMP OID if needed
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table to store NTTN aggregated bandwidth data
CREATE TABLE IF NOT EXISTS nttn_usage (
    id SERIAL PRIMARY KEY,
    nttn_link_id TEXT NOT NULL REFERENCES nttn_links(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    total_mbps FLOAT NOT NULL,
    vlan_breakdown JSONB, -- Store per-VLAN breakdown as JSON
    utilization_percent FLOAT GENERATED ALWAYS AS (total_mbps / 1000 * 100) STORED,
    alert_triggered BOOLEAN DEFAULT false
);

-- Table to store NTTN alerts
CREATE TABLE IF NOT EXISTS nttn_alerts (
    id SERIAL PRIMARY KEY,
    nttn_link_id TEXT NOT NULL REFERENCES nttn_links(id),
    alert_level TEXT NOT NULL, -- WARNING (90%), CRITICAL (100%)
    message TEXT NOT NULL,
    total_mbps FLOAT NOT NULL,
    threshold_mbps FLOAT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    whatsapp_sent BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 3. Insert Sample Data
-- ============================================================================

-- Insert your MikroTik router configuration
INSERT INTO router_configs (id, name, host, username, password, device_type) 
VALUES ('mikrotik_main', 'Main MikroTik Router', '103.106.119.201', 'admin', 'your_password', 'mikrotik')
ON CONFLICT (id) DO UPDATE SET
    host = EXCLUDED.host,
    updated_at = now();

-- Insert sample reseller-router mappings
INSERT INTO reseller_router_mapping (reseller_id, router_id, target_ip, queue_name)
VALUES 
    ('r1', 'mikrotik_main', '192.168.1.100', 'reseller_r1'),
    ('r2', 'mikrotik_main', '192.168.1.101', 'reseller_r2'),
    ('r3', 'mikrotik_main', '192.168.1.102', 'reseller_r3'),
    ('r4', 'mikrotik_main', '192.168.1.103', 'reseller_r4')
ON CONFLICT (reseller_id, router_id) DO UPDATE SET
    target_ip = EXCLUDED.target_ip,
    queue_name = EXCLUDED.queue_name;

-- Insert NTTN Link configuration
INSERT INTO nttn_links (id, name, description, device_type, device_ip, total_capacity_mbps, threshold_mbps)
VALUES ('nttn_main', 'NTTN Main Link', 'Primary NTTN uplink with 5 VLANs', 'mikrotik', '103.106.119.201', 1000, 950)
ON CONFLICT (id) DO UPDATE SET
    device_ip = EXCLUDED.device_ip,
    total_capacity_mbps = EXCLUDED.total_capacity_mbps,
    threshold_mbps = EXCLUDED.threshold_mbps,
    updated_at = now();

-- Insert VLAN configurations for NTTN monitoring
INSERT INTO nttn_vlans (nttn_link_id, vlan_id, vlan_name, capacity_mbps, interface_name)
VALUES 
    ('nttn_main', 10, 'VLAN 10', 200, 'vlan10'),
    ('nttn_main', 20, 'VLAN 20', 200, 'vlan20'),
    ('nttn_main', 30, 'VLAN 30', 200, 'vlan30'),
    ('nttn_main', 40, 'VLAN 40', 200, 'vlan40'),
    ('nttn_main', 50, 'VLAN 50', 200, 'vlan50')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. Create Indexes for Performance
-- ============================================================================

-- Indexes for router tables
CREATE INDEX IF NOT EXISTS idx_router_actions_timestamp ON router_actions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_router_actions_reseller ON router_actions(reseller_id);
CREATE INDEX IF NOT EXISTS idx_bandwidth_update_log_timestamp ON bandwidth_update_log(timestamp DESC);

-- Indexes for NTTN tables
CREATE INDEX IF NOT EXISTS idx_nttn_usage_timestamp ON nttn_usage(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_nttn_usage_link ON nttn_usage(nttn_link_id);
CREATE INDEX IF NOT EXISTS idx_nttn_alerts_timestamp ON nttn_alerts(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_nttn_alerts_link ON nttn_alerts(nttn_link_id);

-- ============================================================================
-- 5. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE router_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_router_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE router_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bandwidth_update_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE nttn_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE nttn_vlans ENABLE ROW LEVEL SECURITY;
ALTER TABLE nttn_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE nttn_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (for API)
CREATE POLICY "Allow anonymous read access to router_configs" ON router_configs FOR SELECT USING (true);
CREATE POLICY "Allow anonymous access to reseller_router_mapping" ON reseller_router_mapping FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to router_actions" ON router_actions FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to bandwidth_update_log" ON bandwidth_update_log FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to nttn_links" ON nttn_links FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to nttn_vlans" ON nttn_vlans FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to nttn_usage" ON nttn_usage FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to nttn_alerts" ON nttn_alerts FOR ALL USING (true);

-- ============================================================================
-- 6. Functions and Triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_router_configs_updated_at BEFORE UPDATE ON router_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nttn_links_updated_at BEFORE UPDATE ON nttn_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify tables were created
SELECT 
    table_name, 
    (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t 
WHERE table_schema = 'public' 
    AND table_name IN (
        'router_configs', 
        'reseller_router_mapping', 
        'router_actions', 
        'bandwidth_update_log',
        'nttn_links',
        'nttn_vlans', 
        'nttn_usage',
        'nttn_alerts'
    )
ORDER BY table_name; 