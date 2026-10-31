import React, { useState } from 'react';
import { X, Puzzle, ArrowRight, CheckCircle2, Copy, ExternalLink, Zap } from 'lucide-react';
import { api } from '../api';

export default function ExtensionModal({ isOpen, onClose }) {
  const [testPrompt, setTestPrompt] = useState('Draft an email proposing a joint AI research grant proposal.');
  const [routingResult, setRoutingResult] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleTestRoute = async () => {
    setLoading(true);
    try {
      const res = await api.routeOnly({
        prompt: testPrompt,
        sla_profile: 'Balanced',
        priority: 'Medium',
        strategy: 'Workload-Aware'
      });
      setRoutingResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Puzzle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Browser Extension Architecture & Roadmap
              </h2>
              <p className="text-[11px] text-slate-400">
                Common Multi-Provider LLM Gateway Interface for Chromium & Firefox
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs text-slate-300">
          {/* Architecture Concept */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="font-semibold text-slate-200 text-xs flex items-center space-x-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Decoupled API Contract</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              The routing engine is architected as a RESTful daemon service (<code className="text-indigo-300 font-mono">/api/route</code> and <code className="text-indigo-300 font-mono">/api/inference</code>).
              A browser extension injects a lightweight content script or popup window that routes prompts through this local or enterprise gateway, automatically selecting the optimal LLM provider transparently.
            </p>
          </div>

          {/* Interactive Extension Simulator Mockup */}
          <div className="border border-cyan-500/30 rounded-lg p-4 bg-slate-950">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="font-mono text-[11px] font-bold text-slate-200">
                  Extension Popup Simulator (Manifest V3)
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">localhost:8000/api</span>
            </div>

            <div className="space-y-2.5">
              <label className="text-[11px] text-slate-400 font-medium">Prompt in Browser:</label>
              <textarea
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleTestRoute}
                disabled={loading}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-xs transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Routing via Extension API...</span>
                ) : (
                  <>
                    <span>Test Extension Routing Call</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {routingResult && (
                <div className="mt-3 p-3 bg-slate-900 border border-cyan-500/40 rounded text-[11px] space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Target Dispatched:</span>
                    <span className="font-bold text-cyan-300 font-mono">
                      {routingResult.selected_model_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Router Decision Overhead:</span>
                    <span className="font-mono text-slate-200">{routingResult.router_overhead_ms} ms</span>
                  </div>
                  <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1.5 mt-1.5">
                    {routingResult.explanation}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Roadmap details */}
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="p-3 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="font-bold text-slate-300 block mb-1">Phase 1 (Current Prototype)</span>
              <p className="text-slate-400">
                FastAPI routing engine, simulated multi-tier adapters, telemetry database, and research dashboard.
              </p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="font-bold text-slate-300 block mb-1">Phase 2 (Extension Integration)</span>
              <p className="text-slate-400">
                Manifest V3 background worker, omnibox shortcut, enterprise token management, and auto-fallback.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
