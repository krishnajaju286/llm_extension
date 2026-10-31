import React from 'react';
import {
  Activity,
  Server,
  Zap,
  Layers,
  ChevronDown,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

const WORKLOAD_MODES = [
  { id: 'Low Load', label: 'Low Load', desc: 'Minimal queues, all tiers free' },
  { id: 'Medium Load', label: 'Medium Load', desc: 'Standard production traffic' },
  { id: 'High Load', label: 'High Load', desc: 'Large tier congested (>85%)' },
  { id: 'Bursty Load', label: 'Bursty Load', desc: 'Periodic traffic surges' }
];

export default function Navbar({
  currentWorkload,
  onWorkloadChange,
  clusterStats,
  onOpenResearch
}) {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur border-b border-slate-800">
      {/* Simulation Mode Mandatory Research Banner */}
      <div className="bg-amber-950/40 border-b border-amber-900/30 px-4 py-1 text-center text-xs text-amber-300/90 flex items-center justify-center space-x-2">
        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
          Simulation Mode
        </span>
        <span className="text-amber-200/80">
          Model performance and infrastructure telemetry are currently simulated for prototype testing. Real LLM provider integration is planned for subsequent evaluation.
        </span>
      </div>

      {/* Main Bar */}
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Left: Research Title & Status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-200">System Ready</span>
          </div>
          <div className="h-4 w-px bg-slate-800"></div>
          <p className="text-xs text-slate-400 hidden lg:block font-mono">
            Early-Stage Research Prototype &middot; Workload-Aware LLM Router
          </p>
        </div>

        {/* Right Controls: Cluster Telemetry & Interactive Workload Simulator */}
        <div className="flex items-center space-x-4">
          {/* Real-time Cluster RPS */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Cluster RPS:</span>
            <span className="font-mono font-bold text-slate-100">
              {clusterStats?.total_cluster_rps || clusterStats?.total_rps || '68.5'}
            </span>
          </div>

          {/* Interactive Workload Switcher */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 flex items-center space-x-1">
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Simulated Workload:</span>
            </span>
            <div className="relative">
              <select
                value={currentWorkload}
                onChange={(e) => onWorkloadChange(e.target.value)}
                className="bg-slate-950 border border-indigo-500/40 hover:border-indigo-400 text-indigo-200 text-xs font-medium rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none transition-colors"
              >
                {WORKLOAD_MODES.map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-indigo-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Research Help Button */}
          <button
            onClick={onOpenResearch}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
            title="View Research Formulation"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
