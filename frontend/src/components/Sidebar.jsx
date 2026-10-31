import React from 'react';
import {
  MessageSquareCode,
  Activity,
  FlaskConical,
  BarChart3,
  Cpu,
  SlidersHorizontal,
  FileText,
  GraduationCap,
  Sparkles,
  Puzzle,
  ExternalLink
} from 'lucide-react';

const navItems = [
  { id: 'router', label: 'Router', icon: MessageSquareCode, badge: 'Core' },
  { id: 'monitor', label: 'Live Monitor', icon: Activity, badge: 'Live' },
  { id: 'experiments', label: 'Experiments', icon: FlaskConical, badge: 'Bench' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'models', label: 'Models', icon: Cpu },
  { id: 'policy', label: 'Routing Policy', icon: SlidersHorizontal },
  { id: 'logs', label: 'Request Logs', icon: FileText },
  { id: 'about', label: 'About Research', icon: GraduationCap },
];

export default function Sidebar({ activeTab, onSelectTab, onOpenExtensionModal }) {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between select-none shrink-0 min-h-screen">
      {/* Brand & Research Header */}
      <div>
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100 tracking-tight leading-none">
                Adaptive LLM Router
              </h1>
              <p className="text-[11px] text-slate-400 mt-1 font-mono tracking-wide uppercase">
                Research Prototype v0.1
              </p>
            </div>
          </div>
          <div className="mt-3.5 px-2.5 py-1.5 rounded bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
            University Research Project &middot; Workload-Aware Inference
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm shadow-indigo-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
                      isActive
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Extension Readiness & Prototype Info */}
      <div className="p-4 border-t border-slate-800/80 space-y-3">
        <button
          onClick={onOpenExtensionModal}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/80 hover:bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 transition-colors group"
        >
          <div className="flex items-center space-x-2">
            <Puzzle className="w-4 h-4 text-cyan-400" />
            <span className="font-medium">Extension Mode</span>
          </div>
          <span className="text-[10px] text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
            Preview
          </span>
        </button>

        <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/40 text-[11px] text-amber-300/80 leading-snug">
          <span className="font-semibold text-amber-200">Prototype Notice:</span> Simulated layer active. Real API integration planned for next phase.
        </div>
      </div>
    </aside>
  );
}
