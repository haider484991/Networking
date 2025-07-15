import React, { useState, useEffect } from 'react';

interface Reseller {
  id: string;
  name: string;
  plan_mbps: number;
  created_at: string;
  updated_at: string;
}

interface Router {
  id: string;
  name: string;
  host: string;
  enabled: boolean;
}

interface RouterMapping {
  id: number;
  reseller_id: string;
  router_id: string;
  target_ip: string;
  queue_name: string;
  created_at: string;
  resellers?: Reseller;
  router_configs?: Router;
}

interface ResellerFormData {
  id: string;
  name: string;
  plan_mbps: number;
}

interface MappingFormData {
  reseller_id: string;
  router_id: string;
  target_ip: string;
  queue_name: string;
}

interface ResellerManagementProps {
  onAlert: (message: string, type: 'success' | 'error') => void;
}

const ResellerManagement: React.FC<ResellerManagementProps> = ({ onAlert }) => {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [routers, setRouters] = useState<Router[]>([]);
  const [mappings, setMappings] = useState<RouterMapping[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showResellerModal, setShowResellerModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [editingReseller, setEditingReseller] = useState<Reseller | null>(null);
  
  const [resellerForm, setResellerForm] = useState<ResellerFormData>({
    id: '',
    name: '',
    plan_mbps: 100
  });
  
  const [mappingForm, setMappingForm] = useState<MappingFormData>({
    reseller_id: '',
    router_id: '',
    target_ip: '',
    queue_name: ''
  });

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resellersRes, routersRes, mappingsRes] = await Promise.all([
        fetch(`${API_BASE}/resellers`),
        fetch(`${API_BASE}/api/routers`),
        fetch(`${API_BASE}/api/router-mappings`)
      ]);

      const resellersData = await resellersRes.json();
      const routersData = await routersRes.json();
      const mappingsData = await mappingsRes.json();

      setResellers(resellersData.resellers || []);
      setRouters(routersData.routers || []);
      setMappings(mappingsData.mappings || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      onAlert('Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResellerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingReseller 
        ? `${API_BASE}/resellers/${editingReseller.id}`
        : `${API_BASE}/resellers`;
      
      const method = editingReseller ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resellerForm)
      });

      const result = await response.json();

      if (response.ok) {
        onAlert(
          editingReseller ? 'Reseller updated successfully' : 'Reseller created successfully',
          'success'
        );
        setShowResellerModal(false);
        setEditingReseller(null);
        resetResellerForm();
        fetchData();
      } else {
        onAlert(result.detail || 'Operation failed', 'error');
      }
    } catch (error) {
      console.error('Error saving reseller:', error);
      onAlert('Failed to save reseller', 'error');
    }
  };

  const handleMappingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_BASE}/api/router-mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappingForm)
      });

      const result = await response.json();

      if (response.ok) {
        onAlert('Router mapping created successfully', 'success');
        setShowMappingModal(false);
        resetMappingForm();
        fetchData();
      } else {
        onAlert(result.detail || 'Failed to create mapping', 'error');
      }
    } catch (error) {
      console.error('Error creating mapping:', error);
      onAlert('Failed to create mapping', 'error');
    }
  };

  const handleDeleteReseller = async (resellerId: string) => {
    if (!confirm('Are you sure you want to delete this reseller? This will also remove all router mappings.')) return;

    try {
      const response = await fetch(`${API_BASE}/resellers/${resellerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onAlert('Reseller deleted successfully', 'success');
        fetchData();
      } else {
        const result = await response.json();
        onAlert(result.detail || 'Failed to delete reseller', 'error');
      }
    } catch (error) {
      console.error('Error deleting reseller:', error);
      onAlert('Failed to delete reseller', 'error');
    }
  };

  const handleDeleteMapping = async (mappingId: number) => {
    if (!confirm('Are you sure you want to delete this router mapping?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/router-mappings/${mappingId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onAlert('Router mapping deleted successfully', 'success');
        fetchData();
      } else {
        const result = await response.json();
        onAlert(result.detail || 'Failed to delete mapping', 'error');
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      onAlert('Failed to delete mapping', 'error');
    }
  };

  const resetResellerForm = () => {
    setResellerForm({
      id: '',
      name: '',
      plan_mbps: 100
    });
  };

  const resetMappingForm = () => {
    setMappingForm({
      reseller_id: '',
      router_id: '',
      target_ip: '',
      queue_name: ''
    });
  };

  const openResellerModal = (reseller?: Reseller) => {
    if (reseller) {
      setEditingReseller(reseller);
      setResellerForm({
        id: reseller.id,
        name: reseller.name,
        plan_mbps: reseller.plan_mbps
      });
    } else {
      setEditingReseller(null);
      resetResellerForm();
    }
    setShowResellerModal(true);
  };

  const openMappingModal = (resellerId?: string) => {
    resetMappingForm();
    if (resellerId) {
      setMappingForm(prev => ({ ...prev, reseller_id: resellerId }));
    }
    setShowMappingModal(true);
  };

  const getResellerMappings = (resellerId: string) => {
    return mappings.filter(mapping => mapping.reseller_id === resellerId);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading resellers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reseller Management</h2>
          <p className="text-gray-600">Manage resellers and their router assignments</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => openMappingModal()}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <span>🔗</span>
            <span>Add Mapping</span>
          </button>
          <button
            onClick={() => openResellerModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>+</span>
            <span>Add Reseller</span>
          </button>
        </div>
      </div>

      {/* Resellers and Mappings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resellers */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Resellers ({resellers.length})</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {resellers.map((reseller) => {
              const resellerMappings = getResellerMappings(reseller.id);
              return (
                <div key={reseller.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">{reseller.name}</h4>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {reseller.plan_mbps} Mbps
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">ID: {reseller.id}</p>
                      <p className="text-sm text-gray-500">
                        {resellerMappings.length} router{resellerMappings.length !== 1 ? 's' : ''} assigned
                      </p>
                      {resellerMappings.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {resellerMappings.map((mapping) => (
                            <div key={mapping.id} className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              {mapping.router_configs?.name} → {mapping.target_ip}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openMappingModal(reseller.id)}
                        className="text-green-600 hover:text-green-900 text-sm"
                        title="Add Router Mapping"
                      >
                        🔗
                      </button>
                      <button
                        onClick={() => openResellerModal(reseller)}
                        className="text-yellow-600 hover:text-yellow-900 text-sm"
                        title="Edit Reseller"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteReseller(reseller.id)}
                        className="text-red-600 hover:text-red-900 text-sm"
                        title="Delete Reseller"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {resellers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No resellers found. Add your first reseller to get started.
              </div>
            )}
          </div>
        </div>

        {/* Router Mappings */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Router Mappings ({mappings.length})</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {mappings.map((mapping) => (
              <div key={mapping.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">
                        {mapping.resellers?.name || mapping.reseller_id}
                      </h4>
                      <span className="text-gray-400">→</span>
                      <span className="text-sm text-gray-600">
                        {mapping.router_configs?.name || mapping.router_id}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">IP: {mapping.target_ip}</p>
                    <p className="text-sm text-gray-500">Queue: {mapping.queue_name}</p>
                    <p className="text-xs text-gray-400">
                      Router: {mapping.router_configs?.host}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteMapping(mapping.id)}
                    className="text-red-600 hover:text-red-900 text-sm"
                    title="Delete Mapping"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
            {mappings.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No router mappings found. Create mappings to assign resellers to routers.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-2xl">👥</div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Resellers</p>
              <p className="text-2xl font-bold text-gray-900">{resellers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-2xl">🔗</div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Router Mappings</p>
              <p className="text-2xl font-bold text-blue-600">{mappings.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-2xl">📊</div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bandwidth</p>
              <p className="text-2xl font-bold text-green-600">
                {resellers.reduce((sum, r) => sum + r.plan_mbps, 0)} Mbps
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Reseller Modal */}
      {showResellerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingReseller ? 'Edit Reseller' : 'Add New Reseller'}
            </h3>
            
            <form onSubmit={handleResellerSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reseller ID
                </label>
                <input
                  type="text"
                  value={resellerForm.id}
                  onChange={(e) => setResellerForm({...resellerForm, id: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                  disabled={!!editingReseller}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={resellerForm.name}
                  onChange={(e) => setResellerForm({...resellerForm, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bandwidth Plan (Mbps)
                </label>
                <input
                  type="number"
                  min="1"
                  value={resellerForm.plan_mbps}
                  onChange={(e) => setResellerForm({...resellerForm, plan_mbps: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowResellerModal(false);
                    setEditingReseller(null);
                    resetResellerForm();
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingReseller ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Router Mapping Modal */}
      {showMappingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Router Mapping</h3>
            
            <form onSubmit={handleMappingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reseller
                </label>
                <select
                  value={mappingForm.reseller_id}
                  onChange={(e) => setMappingForm({...mappingForm, reseller_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select Reseller</option>
                  {resellers.map((reseller) => (
                    <option key={reseller.id} value={reseller.id}>
                      {reseller.name} ({reseller.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Router
                </label>
                <select
                  value={mappingForm.router_id}
                  onChange={(e) => setMappingForm({...mappingForm, router_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select Router</option>
                  {routers.filter(r => r.enabled).map((router) => (
                    <option key={router.id} value={router.id}>
                      {router.name} ({router.host})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target IP Address
                </label>
                <input
                  type="text"
                  value={mappingForm.target_ip}
                  onChange={(e) => setMappingForm({...mappingForm, target_ip: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="192.168.1.100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Queue Name (Optional)
                </label>
                <input
                  type="text"
                  value={mappingForm.queue_name}
                  onChange={(e) => setMappingForm({...mappingForm, queue_name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Auto-generated if empty"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowMappingModal(false);
                    resetMappingForm();
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Create Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResellerManagement; 