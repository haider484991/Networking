import React, { useState, useEffect } from 'react';

interface Router {
  id: string;
  name: string;
  host: string;
  username: string;
  password: string;
  port: number;
  use_ssl: boolean;
  device_type: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface RouterFormData {
  id: string;
  name: string;
  host: string;
  username: string;
  password: string;
  port: number;
  use_ssl: boolean;
  device_type: string;
  enabled: boolean;
}

interface RouterManagementProps {
  onAlert: (message: string, type: 'success' | 'error') => void;
}

const RouterManagement: React.FC<RouterManagementProps> = ({ onAlert }) => {
  const [routers, setRouters] = useState<Router[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRouter, setEditingRouter] = useState<Router | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [formData, setFormData] = useState<RouterFormData>({
    id: '',
    name: '',
    host: '',
    username: '',
    password: '',
    port: 8728,
    use_ssl: false,
    device_type: 'mikrotik',
    enabled: true
  });

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchRouters();
  }, []);

  const fetchRouters = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/routers`);
      const data = await response.json();
      setRouters(data.routers || []);
    } catch (error) {
      console.error('Error fetching routers:', error);
      onAlert('Failed to fetch routers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingRouter 
        ? `${API_BASE}/api/routers/${editingRouter.id}`
        : `${API_BASE}/api/routers`;
      
      const method = editingRouter ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        onAlert(
          editingRouter ? 'Router updated successfully' : 'Router created successfully',
          'success'
        );
        setShowAddModal(false);
        setEditingRouter(null);
        resetForm();
        fetchRouters();
      } else {
        onAlert(result.detail || 'Operation failed', 'error');
      }
    } catch (error) {
      console.error('Error saving router:', error);
      onAlert('Failed to save router', 'error');
    }
  };

  const handleDelete = async (routerId: string) => {
    if (!confirm('Are you sure you want to delete this router?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/routers/${routerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onAlert('Router deleted successfully', 'success');
        fetchRouters();
      } else {
        const result = await response.json();
        onAlert(result.detail || 'Failed to delete router', 'error');
      }
    } catch (error) {
      console.error('Error deleting router:', error);
      onAlert('Failed to delete router', 'error');
    }
  };

  const testConnection = async (routerId: string) => {
    setTestingConnection(routerId);
    try {
      const response = await fetch(`${API_BASE}/api/routers/${routerId}/test-connection`);
      const result = await response.json();
      
      if (result.success) {
        onAlert('Connection successful!', 'success');
      } else {
        onAlert(`Connection failed: ${result.message}`, 'error');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      onAlert('Failed to test connection', 'error');
    } finally {
      setTestingConnection(null);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      host: '',
      username: '',
      password: '',
      port: 8728,
      use_ssl: false,
      device_type: 'mikrotik',
      enabled: true
    });
  };

  const openEditModal = (router: Router) => {
    setEditingRouter(router);
    setFormData({
      id: router.id,
      name: router.name,
      host: router.host,
      username: router.username,
      password: router.password,
      port: router.port,
      use_ssl: router.use_ssl,
      device_type: router.device_type,
      enabled: router.enabled
    });
    setShowAddModal(true);
  };

  const openAddModal = () => {
    setEditingRouter(null);
    resetForm();
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading routers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Router Management</h2>
          <p className="text-gray-600">Configure and manage MikroTik router connections</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <span>+</span>
          <span>Add Router</span>
        </button>
      </div>

      {/* Routers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Router Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Connection
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {routers.map((router) => (
              <tr key={router.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{router.name}</div>
                    <div className="text-sm text-gray-500">ID: {router.id}</div>
                    <div className="text-sm text-gray-500">{router.device_type}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm text-gray-900">{router.host}:{router.port}</div>
                    <div className="text-sm text-gray-500">
                      {router.use_ssl ? '🔒 SSL' : '🔓 No SSL'} | User: {router.username}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    router.enabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {router.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => testConnection(router.id)}
                    disabled={testingConnection === router.id}
                    className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                  >
                    {testingConnection === router.id ? '⏳' : '🔌'} Test
                  </button>
                  <button
                    onClick={() => openEditModal(router)}
                    className="text-yellow-600 hover:text-yellow-900"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(router.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {routers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No routers configured. Add your first router to get started.
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingRouter ? 'Edit Router' : 'Add New Router'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Router ID
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({...formData, id: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                  disabled={!!editingRouter}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Host/IP Address
                </label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => setFormData({...formData, host: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Device Type
                  </label>
                  <select
                    value={formData.device_type}
                    onChange={(e) => setFormData({...formData, device_type: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="mikrotik">MikroTik</option>
                    <option value="cisco">Cisco</option>
                    <option value="juniper">Juniper</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.use_ssl}
                    onChange={(e) => setFormData({...formData, use_ssl: e.target.checked})}
                    className="mr-2"
                  />
                  Use SSL
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
                    className="mr-2"
                  />
                  Enabled
                </label>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingRouter(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingRouter ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouterManagement; 