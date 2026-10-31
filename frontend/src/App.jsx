import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import ExtensionModal from './components/ExtensionModal';

import RouterPage from './pages/RouterPage';
import LiveMonitorPage from './pages/LiveMonitorPage';
import ExperimentsPage from './pages/ExperimentsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ModelsPage from './pages/ModelsPage';
import RoutingPolicyPage from './pages/RoutingPolicyPage';
import RequestLogsPage from './pages/RequestLogsPage';
import AboutResearchPage from './pages/AboutResearchPage';

import { api } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('router');
  const [currentWorkload, setCurrentWorkload] = useState('Medium Load');
  const [clusterStats, setClusterStats] = useState(null);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);

  // Fetch current cluster state & workload on mount
  const refreshSystemState = async () => {
    try {
      const state = await api.getSystemState();
      setCurrentWorkload(state.mode || 'Medium Load');
      setClusterStats(state);
    } catch (err) {
      console.warn('System state fetch failed (backend might still be starting):', err);
    }
  };

  useEffect(() => {
    refreshSystemState();
  }, []);

  const handleWorkloadChange = async (newMode) => {
    setCurrentWorkload(newMode);
    try {
      await api.setWorkloadMode(newMode);
      await refreshSystemState();
    } catch (err) {
      console.error('Failed to update workload mode:', err);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Fixed Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenExtensionModal={() => setIsExtensionModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          currentWorkload={currentWorkload}
          onWorkloadChange={handleWorkloadChange}
          clusterStats={clusterStats}
          onOpenResearch={() => setActiveTab('about')}
        />

        <main className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'router' && (
            <RouterPage
              currentWorkload={currentWorkload}
              onRefreshState={refreshSystemState}
            />
          )}
          {activeTab === 'monitor' && <LiveMonitorPage />}
          {activeTab === 'experiments' && <ExperimentsPage />}
          {activeTab === 'analytics' && <AnalyticsPage />}
          {activeTab === 'models' && <ModelsPage />}
          {activeTab === 'policy' && <RoutingPolicyPage />}
          {activeTab === 'logs' && <RequestLogsPage />}
          {activeTab === 'about' && (
            <AboutResearchPage
              onOpenExtensionModal={() => setIsExtensionModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Browser Extension Readiness Modal */}
      <ExtensionModal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
      />
    </div>
  );
}
