import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '../hooks/useAuth';

// Component imports
import RouterManagement from '../components/RouterManagement';
import DeviceMonitoring from '../components/DeviceMonitoring';
import ResellerManagement from '../components/SettingsResellerManagement';

interface TabItem {
  id: string;
  label: string;
  icon: string;
  component: React.ComponentType<{onAlert: (message: string, type: 'success' | 'error') => void}>;
}

const SettingsPage: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('routers');
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const tabs: TabItem[] = [
    {
      id: 'routers',
      label: 'Router Management',
      icon: '🌐',
      component: RouterManagement
    },
    {
      id: 'devices',
      label: 'Network Devices',
      icon: '📱',
      component: DeviceMonitoring
    },
    {
      id: 'resellers',
      label: 'Reseller Management',
      icon: '👥',
      component: ResellerManagement
    }
  ];

  const showAlert = (message: string, type: 'success' | 'error') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please log in to access the settings.</p>
        </div>
      </div>
    );
  }

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || RouterManagement;

  return (
    <>
      <Head>
        <title>ISP Settings - Admin Dashboard</title>
        <meta name="description" content="Comprehensive ISP admin settings for router, device, and reseller management" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">ISP Admin Settings</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage routers, monitor devices, and configure resellers
                </p>
              </div>
              <div className="text-sm text-gray-500">
                Welcome, {user.email}
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                  `}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <ActiveComponent onAlert={showAlert} />
          </div>
        </main>

        {/* Alert Toast */}
        {alert && (
          <div className={`fixed top-4 right-4 p-4 rounded-md shadow-md z-50 ${
            alert.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <span>{alert.message}</span>
              <button
                onClick={() => setAlert(null)}
                className="ml-4 text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SettingsPage; 