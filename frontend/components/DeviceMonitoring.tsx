import React, { useState, useEffect } from 'react';

interface NetworkDevice {
  type: 'queue' | 'dhcp_lease' | 'interface';
  name: string;
  router_id: string;
  router_name: string;
  router_host: string;
  // Queue specific fields
  target?: string;
  max_limit?: string;
  burst_limit?: string;
  disabled?: boolean;
  bytes?: string;
  packets?: string;
  // DHCP lease specific fields
  ip_address?: string;
  mac_address?: string;
  server?: string;
  expires_after?: string;
  last_seen?: string;
  // Interface specific fields
  type_detail?: string;
  running?: boolean;
  rx_bytes?: string;
  tx_bytes?: string;
  id: string;
}

interface RouterStatus {
  router_id: string;
  name: string;
  host: string;
  status: 'online' | 'offline';
  device_count: number;
  error?: string;
}

interface NetworkSummary {
  total_routers: number;
  online_routers: number;
  total_devices: number;
}

interface DeviceMonitoringProps {
  onAlert: (message: string, type: 'success' | 'error') => void;
}

const DeviceMonitoring: React.FC<DeviceMonitoringProps> = ({ onAlert }) => {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [routerStatuses, setRouterStatuses] = useState<RouterStatus[]>([]);
  const [summary, setSummary] = useState<NetworkSummary>({ total_routers: 0, online_routers: 0, total_devices: 0 });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedRouter, setSelectedRouter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchNetworkDevices();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchNetworkDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNetworkDevices = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE}/api/network-devices`);
      const data = await response.json();
      
      setDevices(data.devices || []);
      setRouterStatuses(data.router_statuses || []);
      setSummary(data.summary || { total_routers: 0, online_routers: 0, total_devices: 0 });
    } catch (error) {
      console.error('Error fetching network devices:', error);
      onAlert('Failed to fetch network devices', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getFilteredDevices = () => {
    let filtered = devices;

    // Filter by device type
    if (activeFilter !== 'all') {
      filtered = filtered.filter(device => device.type === activeFilter);
    }

    // Filter by router
    if (selectedRouter !== 'all') {
      filtered = filtered.filter(device => device.router_id === selectedRouter);
    }

    return filtered;
  };

  const getDeviceTypeIcon = (type: string) => {
    switch (type) {
      case 'queue':
        return '🚦';
      case 'dhcp_lease':
        return '📱';
      case 'interface':
        return '🔌';
      default:
        return '❓';
    }
  };

  const getDeviceTypeLabel = (type: string) => {
    switch (type) {
      case 'queue':
        return 'Bandwidth Queue';
      case 'dhcp_lease':
        return 'DHCP Device';
      case 'interface':
        return 'Network Interface';
      default:
        return 'Unknown';
    }
  };

  const formatBytes = (bytes: string) => {
    if (!bytes || bytes === '0/0') return 'No data';
    
    const parts = bytes.split('/');
    if (parts.length !== 2) return bytes;
    
    const formatSize = (size: string) => {
      const num = parseInt(size);
      if (num < 1024) return `${num} B`;
      if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
      if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
      return `${(num / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    };
    
    return `↓${formatSize(parts[0])} ↑${formatSize(parts[1])}`;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Discovering network devices...</p>
      </div>
    );
  }

  const filteredDevices = getFilteredDevices();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Network Device Discovery</h2>
          <p className="text-gray-600">Monitor all devices connected to your routers</p>
        </div>
        <button
          onClick={fetchNetworkDevices}
          disabled={refreshing}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:bg-gray-400"
        >
          <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-2xl">🌐</div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Routers</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total_routers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-2xl">✅</div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Online Routers</p>
              <p className="text-2xl font-bold text-green-600">{summary.online_routers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-2xl">❌</div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Offline Routers</p>
              <p className="text-2xl font-bold text-red-600">{summary.total_routers - summary.online_routers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-2xl">📱</div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Devices</p>
              <p className="text-2xl font-bold text-blue-600">{summary.total_devices}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Router Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Router Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {routerStatuses.map((router) => (
            <div
              key={router.router_id}
              className={`p-4 rounded-lg border ${
                router.status === 'online' ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{router.name}</h4>
                  <p className="text-sm text-gray-600">{router.host}</p>
                  <p className="text-sm text-gray-600">{router.device_count} devices</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  router.status === 'online' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {router.status}
                </span>
              </div>
              {router.error && (
                <p className="text-xs text-red-600 mt-2">{router.error}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Device Type</label>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Types</option>
              <option value="queue">Bandwidth Queues</option>
              <option value="dhcp_lease">DHCP Devices</option>
              <option value="interface">Interfaces</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Router</label>
            <select
              value={selectedRouter}
              onChange={(e) => setSelectedRouter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Routers</option>
              {routerStatuses.map((router) => (
                <option key={router.router_id} value={router.router_id}>
                  {router.name} ({router.host})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setActiveFilter('all');
                setSelectedRouter('all');
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">
            Network Devices ({filteredDevices.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Router
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDevices.map((device, index) => (
                <tr key={`${device.router_id}-${device.id}-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{getDeviceTypeIcon(device.type)}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{device.name}</div>
                        <div className="text-sm text-gray-500">{getDeviceTypeLabel(device.type)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{device.router_name}</div>
                      <div className="text-sm text-gray-500">{device.router_host}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      {device.type === 'queue' && (
                        <>
                          <div><strong>Target:</strong> {device.target}</div>
                          <div><strong>Limit:</strong> {device.max_limit}</div>
                          <div><strong>Traffic:</strong> {formatBytes(device.bytes || '0/0')}</div>
                        </>
                      )}
                      {device.type === 'dhcp_lease' && (
                        <>
                          <div><strong>IP:</strong> {device.ip_address}</div>
                          <div><strong>MAC:</strong> {device.mac_address}</div>
                          <div><strong>Last Seen:</strong> {device.last_seen}</div>
                        </>
                      )}
                      {device.type === 'interface' && (
                        <>
                          <div><strong>Type:</strong> {device.type_detail}</div>
                          <div><strong>Traffic:</strong> RX: {device.rx_bytes}, TX: {device.tx_bytes}</div>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {device.type === 'queue' && (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        device.disabled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {device.disabled ? 'Disabled' : 'Active'}
                      </span>
                    )}
                    {device.type === 'interface' && (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        device.running ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {device.running ? 'Running' : 'Down'}
                      </span>
                    )}
                    {device.type === 'dhcp_lease' && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredDevices.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {devices.length === 0 
                ? 'No devices discovered. Check router connections.'
                : 'No devices match the current filters.'
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceMonitoring; 