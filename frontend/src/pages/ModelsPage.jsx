import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Power,
  Layers,
  Zap,
  Clock,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Key,
  ExternalLink,
  Sliders
} from 'lucide-react';
import { api } from '../api';

export default function ModelsPage() {
  const [modelsData, setModelsData] = useState([]);
  const [workloadMode, setWorkloadMode] = useState('');
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Provider configuration state
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: '',
    ollama_endpoint: 'http://localhost:11434',
  });
  const [configSaved, setConfigSaved] = useState(false);

  const fetchModels = async () => {
    try {
      const res = await api.getModels();
      setModelsData(res.models || []);
      setWorkloadMode(res.workload_mode || 'Medium Load');
    } catch (err) {
      console.error('Failed to fetch models:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleToggleOnline = async (tier, currentOnline) => {
    setToggleLoading(tier);
    try {
      await api.toggleModel(tier, !currentOnline);
      await fetchModels();
    } catch (err) {
      console.error('Failed to toggle model:', err);
    } finally {
      setToggleLoading(null);
    }
  };

  const handleSaveKeys = (e) => {
    e.preventDefault();
    setConfigSaved(true);
    setTimeout(() => {
      setConfigSaved(false);
      setShowConfigModal(false);
    }, 1200);
  };

  if (loading && !modelsData.length) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400">Loading Model Specifications & Telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <span>Model Tier Management</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-normal">
              Adapter Architecture
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure candidate LLM tiers, test model availability resilience, and review telemetry.
          </p>
        </div>

        <button
          onClick={() => setShowConfigModal(true)}
          className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-2 transition-colors"
        >
          <Key className="w-3.5 h-3.5 text-cyan-400" />
          <span>Real Provider API Setup</span>
        </button>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {modelsData.map((m) => {
          const isToggling = toggleLoading === m.tier;
          const isOnline = m.is_online;

          return (
            <div
              key={m.tier}
              className={`bg-slate-900 border rounded-xl p-5 shadow-lg space-y-4 transition-all ${
                isOnline
                  ? 'border-slate-800 hover:border-slate-700'
                  : 'border-rose-900/60 bg-slate-950/80 opacity-80'
              }`}
            >
              {/* Top Bar: Title & Toggle */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-100 text-sm">{m.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                    Family: {m.family}
                  </span>
                </div>

                {/* Online / Offline Toggle Switch */}
                <button
                  onClick={() => handleToggleOnline(m.tier, isOnline)}
                  disabled={isToggling}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                    isOnline
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-500/40'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-500/40 hover:bg-emerald-950/60 hover:text-emerald-300'
                  }`}
                  title="Click to toggle availability in router"
                >
                  <Power className="w-3 h-3" />
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                </button>
              </div>

              {/* Status & Utilization */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Cluster Utilization:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {m.current_utilization_pct}%
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      m.current_utilization_pct > 80
                        ? 'bg-rose-500'
                        : m.current_utilization_pct > 50
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${m.current_utilization_pct}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Queue Depth: {m.current_queue}</span>
                  <span>{m.status_label}</span>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/80">
                <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">Base Latency</span>
                  <span className="font-mono font-medium text-slate-200">{m.base_latency_s}s</span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">Context Window</span>
                  <span className="font-mono font-medium text-slate-200">
                    {(m.context_window / 1024).toFixed(0)}k tokens
                  </span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">Cost / 1k In</span>
                  <span className="font-mono font-medium text-cyan-300">
                    ${m.cost_per_1k_input.toFixed(5)}
                  </span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">Cost / 1k Out</span>
                  <span className="font-mono font-medium text-cyan-300">
                    ${m.cost_per_1k_output.toFixed(5)}
                  </span>
                </div>
              </div>

              {/* Quality Profile Bars */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400 font-medium block">
                  Task Category Quality Profile:
                </span>
                <div className="space-y-1">
                  {['Reasoning', 'Coding', 'Summarization'].map((cat) => {
                    const q = m.quality_profile[cat] || 0.7;
                    return (
                      <div key={cat} className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">{cat}</span>
                        <div className="flex items-center space-x-1.5">
                          <div className="w-20 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${q * 100}%` }}
                            ></div>
                          </div>
                          <span className="font-mono text-slate-300 font-semibold">{q}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notice */}
              <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800 font-mono flex items-center justify-between">
                <span>Prototype Simulation</span>
                <span>Max Conc: {m.concurrency_limit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real Provider Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  External LLM Provider Integration
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              In this research prototype, inference is simulated by default. To hook real provider endpoints,
              supply API keys via environment variables or input them below for memory persistence.
            </p>

            <form onSubmit={handleSaveKeys} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-mono">OPENAI_API_KEY:</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={apiKeys.openai}
                  onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-mono">ANTHROPIC_API_KEY:</label>
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  value={apiKeys.anthropic}
                  onChange={(e) => setApiKeys({ ...apiKeys, anthropic: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-mono">GOOGLE_API_KEY:</label>
                <input
                  type="password"
                  placeholder="AIza..."
                  value={apiKeys.google}
                  onChange={(e) => setApiKeys({ ...apiKeys, google: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-mono">OLLAMA_HOST_ENDPOINT:</label>
                <input
                  type="text"
                  placeholder="http://localhost:11434"
                  value={apiKeys.ollama_endpoint}
                  onChange={(e) => setApiKeys({ ...apiKeys, ollama_endpoint: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center space-x-1"
                >
                  {configSaved ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save Provider Configuration</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
