import React from 'react';
import {
  ArrowDown,
  Cpu,
  Server,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

export default function DecisionTraceView({ trace }) {
  if (!trace || !trace.step1_request) {
    return (
      <div className="p-4 text-center text-xs text-slate-500">
        No decision trace available for this record.
      </div>
    );
  }

  const s1 = trace.step1_request || {};
  const s2 = trace.step2_features || {};
  const s3 = trace.step3_infrastructure || {};
  const s4 = trace.step4_evaluation || [];
  const s5 = trace.step5_selection || {};
  const s6 = trace.step6_sla_status || 'Pass';

  return (
    <div className="space-y-3 py-2 text-xs">
      {/* Step 1: Request Ingest */}
      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-mono">1</span>
            <span>Request Ingested</span>
          </span>
          <span className="font-mono text-[11px] text-slate-500">{s1.prompt_tokens} Tokens</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[11px]">
          <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
            <span className="text-slate-500 block">SLA Preset</span>
            <span className="font-medium text-slate-200">{s1.sla_profile}</span>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
            <span className="text-slate-500 block">Priority</span>
            <span className="font-medium text-slate-200">{s1.priority}</span>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
            <span className="text-slate-500 block">Max Latency</span>
            <span className="font-medium text-slate-200">{s1.max_latency_ms ? `${s1.max_latency_ms} ms` : 'Auto'}</span>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
            <span className="text-slate-500 block">Cost Cap</span>
            <span className="font-medium text-slate-200">{s1.max_cost ? `$${s1.max_cost}` : 'Unbounded'}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-center text-slate-600">
        <ArrowDown className="w-4 h-4" />
      </div>

      {/* Step 2: Feature Extraction */}
      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-mono">2</span>
            <span>Feature Extraction Engine</span>
          </span>
          <span className="text-[11px] font-mono text-cyan-400">Heuristic Classifier</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
          <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
            <span className="text-slate-500 block">Task Category</span>
            <span className="font-semibold text-indigo-300">{s2.category}</span>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
            <span className="text-slate-500 block">Complexity Score</span>
            <span className="font-mono font-bold text-amber-300">{s2.complexity} / 1.00</span>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
            <span className="text-slate-500 block">Quality Target</span>
            <span className="font-mono font-medium text-emerald-300">{s2.quality_requirement}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-center text-slate-600">
        <ArrowDown className="w-4 h-4" />
      </div>

      {/* Step 3: Infrastructure Snapshot */}
      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-mono">3</span>
            <span>Cluster Telemetry Snapshot</span>
          </span>
          <span className="text-[11px] font-mono text-amber-400">{s3.workload_mode}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
          {s3.cluster_load &&
            Object.entries(s3.cluster_load).map(([tier, loadStr]) => (
              <div key={tier} className="bg-slate-950 p-2 rounded border border-slate-800/80">
                <span className="text-slate-400 font-medium block">{tier} Tier</span>
                <span className="font-mono text-slate-200">{loadStr}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="flex justify-center text-slate-600">
        <ArrowDown className="w-4 h-4" />
      </div>

      {/* Step 4: Candidate Scoring */}
      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-mono">4</span>
            <span>Multi-Objective Candidate Evaluation</span>
          </span>
          <span className="text-[10px] text-slate-500">Argmax Utility</span>
        </div>
        <div className="space-y-1.5">
          {s4.map((cand) => {
            const isWinner = cand.tier === s5.selected_model;
            return (
              <div
                key={cand.tier}
                className={`p-2 rounded flex items-center justify-between text-[11px] border ${
                  isWinner
                    ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className={`font-semibold ${isWinner ? 'text-indigo-300' : 'text-slate-300'}`}>
                    {cand.tier} Model
                  </span>
                  {isWinner && (
                    <span className="text-[9px] px-1 py-0.2 bg-indigo-500/30 text-indigo-300 rounded uppercase font-mono">
                      Winner
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3 font-mono text-[10px]">
                  <span>Q: {cand.quality}</span>
                  <span>Lat: {cand.latency}</span>
                  <span>Cost: {cand.cost}</span>
                  <span>Load: {cand.load}</span>
                  <span className={cand.sla === 'Pass' ? 'text-emerald-400' : 'text-rose-400'}>
                    SLA: {cand.sla}
                  </span>
                  <span className="font-bold text-slate-100 bg-slate-800 px-1.5 py-0.5 rounded">
                    Score: {cand.score}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center text-slate-600">
        <ArrowDown className="w-4 h-4" />
      </div>

      {/* Step 5 & 6: Outcome */}
      <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="font-semibold text-emerald-200 text-xs">
              Selected Model: <span className="font-bold underline">{s5.selected_model}</span>
            </div>
            <div className="text-[11px] text-emerald-300/80">
              Strategy: {s5.strategy} &middot; Overhead: {s5.overhead_ms} ms
            </div>
          </div>
        </div>
        <div className="px-2.5 py-1 rounded bg-emerald-900/60 border border-emerald-500/50 text-emerald-200 font-mono text-[11px] font-bold">
          SLA {s6 === 'Pass' ? 'Satisfied' : 'Violated'}
        </div>
      </div>
    </div>
  );
}
