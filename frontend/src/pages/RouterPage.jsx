import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  Zap,
  Clock,
  DollarSign,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Settings2,
  FileQuestion,
  HelpCircle,
  BarChart2
} from 'lucide-react';
import { api } from '../api';
import DecisionTraceView from '../components/DecisionTraceView';

const SAMPLE_PROMPTS = [
  {
    label: 'Math / Logic Proof',
    category: 'Reasoning',
    prompt: 'Prove step by step why in any graph G with minimum degree d >= 2, there exists a cycle of length at least d + 1. Provide formal deduction.',
    sla: 'Quality First',
    priority: 'High'
  },
  {
    label: 'Async Python Cache',
    category: 'Coding',
    prompt: 'Write a thread-safe, asynchronous LRU cache class in Python using asyncio.Lock and a doubly-linked list. Include eviction callback support.',
    sla: 'Balanced',
    priority: 'High'
  },
  {
    label: 'Earnings Summary',
    category: 'Summarization',
    prompt: 'Summarize the following report in 3 concise executive bullet points: Cloud infrastructure revenue grew 24% YoY, while operating margin contracted 1.4% due to silicon capex.',
    sla: 'Cost Optimized',
    priority: 'Low'
  },
  {
    label: 'JSON Entity Extractor',
    category: 'Extraction',
    prompt: 'Extract all vendor names, invoice totals, and due dates from this receipt text into valid JSON format with strict schema.',
    sla: 'Cost Optimized',
    priority: 'Low'
  },
  {
    label: 'TCP Congestion QA',
    category: 'General QA',
    prompt: 'What are the core differences between TCP Reno loss-based congestion control and Google BBR model-based bottleneck bandwidth control?',
    sla: 'Low Latency',
    priority: 'Medium'
  }
];

const SLA_PRESETS = ['Balanced', 'Cost Optimized', 'Quality First', 'Low Latency', 'Custom'];
const STRATEGIES = [
  { id: 'Workload-Aware', label: 'Workload-Aware (Proposed)', tag: 'Recommended' },
  { id: 'Query-Aware', label: 'Query-Aware (Baseline)', tag: 'Ignores Load' },
  { id: 'Always-Small', label: 'Always-Small (Baseline)', tag: 'Low Cost' },
  { id: 'Always-Large', label: 'Always-Large (Baseline)', tag: 'High Quality' },
  { id: 'Random', label: 'Random (Baseline)', tag: 'Uniform' }
];

export default function RouterPage({ currentWorkload, onRefreshState }) {
  const [prompt, setPrompt] = useState(SAMPLE_PROMPTS[0].prompt);
  const [slaProfile, setSlaProfile] = useState('Balanced');
  const [priority, setPriority] = useState('Medium');
  const [strategy, setStrategy] = useState('Workload-Aware');
  const [maxLatencyMs, setMaxLatencyMs] = useState('');
  const [maxCost, setMaxCost] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTrace, setShowTrace] = useState(false);

  // Execution state
  const [executing, setExecuting] = useState(false);
  const [routingStep, setRoutingStep] = useState(0); // 1 to 5
  const [responsePacket, setResponsePacket] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const stepsList = [
    'Analyzing Request & Extracting Features',
    'Evaluating Candidate Models',
    'Checking Runtime Workload & Queues',
    'Applying Multi-Objective Utility Function',
    'Generating Response via Model Tier'
  ];

  const handleRouteAndRun = async () => {
    if (!prompt.trim()) return;

    setExecuting(true);
    setErrorMsg(null);
    setRoutingStep(1);

    // Step progression animation for research demonstration
    const stepTimer1 = setTimeout(() => setRoutingStep(2), 220);
    const stepTimer2 = setTimeout(() => setRoutingStep(3), 440);
    const stepTimer3 = setTimeout(() => setRoutingStep(4), 660);
    const stepTimer4 = setTimeout(() => setRoutingStep(5), 880);

    try {
      const payload = {
        prompt: prompt.trim(),
        sla_profile: slaProfile,
        priority: priority,
        max_latency_ms: maxLatencyMs ? parseFloat(maxLatencyMs) : null,
        max_cost: maxCost ? parseFloat(maxCost) : null,
        strategy: strategy
      };

      const result = await api.routeAndRun(payload);
      
      // Allow the short visual animation to conclude naturally
      setTimeout(() => {
        setResponsePacket(result);
        setExecuting(false);
        setRoutingStep(0);
        if (onRefreshState) onRefreshState();
      }, 1000);
    } catch (err) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(stepTimer4);
      setErrorMsg(err.message || 'Routing failed. Please check backend connection.');
      setExecuting(false);
      setRoutingStep(0);
    }
  };

  const handleCopy = () => {
    if (responsePacket?.response?.text) {
      navigator.clipboard.writeText(responsePacket.response.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectedModel = responsePacket?.routing?.selected_model;
  const candidates = responsePacket?.routing?.candidate_evaluations || [];
  const explanation = responsePacket?.routing?.explanation;
  const decisionTrace = responsePacket?.routing?.decision_trace;
  const features = responsePacket?.routing?.features;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Title & Context */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <span>Adaptive LLM Router</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-normal">
              Workload-Aware Orchestration
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatic multi-objective model selection combining query complexity with live cluster congestion.
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-[11px] text-slate-400 block font-mono">Cluster Environment</span>
          <span className="text-xs font-semibold text-indigo-300 font-mono">
            {currentWorkload} (Simulated)
          </span>
        </div>
      </div>

      {/* Prompt Composer Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        {/* Preset Sample Chips */}
        <div>
          <span className="text-xs text-slate-400 font-medium block mb-2">
            Load Research Test Query:
          </span>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PROMPTS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(sample.prompt);
                  setSlaProfile(sample.sla);
                  setPriority(sample.priority);
                }}
                className="px-2.5 py-1 rounded-md text-xs bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors flex items-center space-x-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                <span className="font-medium">{sample.label}</span>
                <span className="text-[10px] text-slate-400">({sample.category})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Text Input Area */}
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Enter research prompt, code snippet, or complex reasoning question..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-y font-sans leading-relaxed"
          />
          <div className="absolute right-3 bottom-3 text-[11px] text-slate-500 font-mono">
            ~{Math.max(1, Math.round(prompt.length / 4))} estimated tokens
          </div>
        </div>

        {/* Routing Parameter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* SLA Preset */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              SLA Preset Profile:
            </label>
            <select
              value={slaProfile}
              onChange={(e) => setSlaProfile(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              {SLA_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Request Priority */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Priority Tier:
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="Low">Low (Background / Batch)</option>
              <option value="Medium">Medium (Standard)</option>
              <option value="High">High (Interactive Production)</option>
              <option value="Critical">Critical (Zero-Tolerance SLA)</option>
            </select>
          </div>

          {/* Routing Strategy */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Routing Strategy:
            </label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full bg-slate-950 border border-indigo-500/40 text-indigo-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 font-medium"
            >
              {STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggle Advanced SLA Constraints */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-medium transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{showAdvanced ? 'Hide SLA Constraints' : 'Configure Custom Latency / Cost Constraints'}</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Max Acceptable Latency (ms):</label>
                <input
                  type="number"
                  placeholder="e.g. 2000 (leaves blank for auto)"
                  value={maxLatencyMs}
                  onChange={(e) => setMaxLatencyMs(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Max Budget Cap per Request ($):</label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="e.g. 0.0050"
                  value={maxCost}
                  onChange={(e) => setMaxCost(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            Autonomous decision engine active &bull; No manual model selection needed
          </span>
          <button
            onClick={handleRouteAndRun}
            disabled={executing || !prompt.trim()}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-950 flex items-center space-x-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {executing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Executing Pipeline...</span>
              </>
            ) : (
              <>
                <span>Route & Run</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-lg text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Routing Stepper Animation */}
      {executing && (
        <div className="bg-slate-900 border border-indigo-500/40 rounded-xl p-5 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold mb-1">
            <span>Adaptive Routing Pipeline</span>
            <span className="font-mono">Step {routingStep} / 5</span>
          </div>

          {/* Stepper Progress Bar */}
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-indigo-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${(routingStep / 5) * 100}%` }}
            ></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2 text-[11px]">
            {stepsList.map((stepText, idx) => {
              const num = idx + 1;
              const isPast = num < routingStep;
              const isCurrent = num === routingStep;
              return (
                <div
                  key={idx}
                  className={`p-2 rounded border transition-all ${
                    isCurrent
                      ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 font-semibold scale-102'
                      : isPast
                      ? 'bg-slate-950/80 border-slate-800 text-emerald-400'
                      : 'bg-slate-950/30 border-slate-900 text-slate-600'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    {isPast ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="w-3 h-3 rounded-full bg-slate-800 text-[9px] flex items-center justify-center font-mono">
                        {num}
                      </span>
                    )}
                    <span className="truncate">{stepText.split(' ')[0]}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight truncate">{stepText}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Response and Routing Explanation Container */}
      {responsePacket && !executing && (
        <div className="space-y-6 animate-fadeIn">
          {/* Section 7 & 8: Winner Banner & "Why this model?" Explanation */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Selected: {selectedModel} Model
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Execution Overhead: {responsePacket.routing.router_overhead_ms} ms
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400">SLA Evaluation:</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                    responsePacket.routing.decision_trace?.step6_sla_status === 'Pass'
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-950/60 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {responsePacket.routing.decision_trace?.step6_sla_status === 'Pass'
                    ? 'Satisfied'
                    : 'Violated'}
                </span>
              </div>
            </div>

            {/* Metric Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Query Complexity</span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {features?.complexity_score}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Predicted Quality</span>
                <span className="font-mono font-bold text-emerald-300 text-sm">
                  {responsePacket.response.estimated_quality}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Actual Latency</span>
                <span className="font-mono font-bold text-slate-100 text-sm">
                  {responsePacket.response.actual_latency_s} s
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Estimated Cost</span>
                <span className="font-mono font-bold text-cyan-300 text-sm">
                  ${responsePacket.response.estimated_cost.toFixed(5)}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Cluster Workload</span>
                <span className="font-mono font-bold text-indigo-300 text-sm">
                  {currentWorkload}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Utility Score</span>
                <span className="font-mono font-bold text-indigo-400 text-sm">
                  {responsePacket.routing.router_score}
                </span>
              </div>
            </div>

            {/* Explanation Narrative */}
            <div className="p-3.5 bg-slate-950/80 rounded-lg border border-slate-800/80">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300 mb-1">
                <FileQuestion className="w-3.5 h-3.5 text-indigo-400" />
                <span>Deterministic Routing Explanation (Section 7)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {explanation}
              </p>
            </div>

            {/* Candidate Model Comparison Table (Section 8) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Candidate Evaluation Matrix (All Models Scored)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Objective Function: Argmax Score(model)
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Model Tier</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Quality</th>
                      <th className="py-2.5 px-3">Cost</th>
                      <th className="py-2.5 px-3">Latency</th>
                      <th className="py-2.5 px-3">Cluster Load</th>
                      <th className="py-2.5 px-3">SLA</th>
                      <th className="py-2.5 px-3 text-right">Router Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {candidates.map((cand) => {
                      const isWinner = cand.tier === selectedModel;
                      return (
                        <tr
                          key={cand.tier}
                          className={`transition-colors ${
                            isWinner
                              ? 'bg-indigo-950/40 text-indigo-200 font-semibold'
                              : 'hover:bg-slate-950/40 text-slate-300'
                          }`}
                        >
                          <td className="py-2 px-3 font-sans flex items-center space-x-1.5">
                            <span>{cand.tier} Model</span>
                            {isWinner && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-indigo-500/30 text-indigo-300 rounded uppercase font-mono">
                                Selected
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                cand.is_available
                                  ? 'bg-emerald-950 text-emerald-400'
                                  : 'bg-rose-950 text-rose-400'
                              }`}
                            >
                              {cand.is_available ? 'Online' : 'Offline'}
                            </span>
                          </td>
                          <td className="py-2 px-3">{cand.predicted_quality}</td>
                          <td className="py-2 px-3">${cand.estimated_cost.toFixed(5)}</td>
                          <td className="py-2 px-3">{cand.predicted_latency_s}s</td>
                          <td className="py-2 px-3">
                            {cand.current_load_pct}%{' '}
                            <span className="text-slate-400 font-normal">
                              (q:{cand.queue_length})
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={
                                cand.sla_status === 'Pass' ? 'text-emerald-400' : 'text-rose-400'
                              }
                            >
                              {cand.sla_status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-100">
                            {cand.router_score}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Toggle Full Visual Decision Trace */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowTrace(!showTrace)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1 transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{showTrace ? 'Hide Complete Routing Trace' : 'View Complete Decision Trace Graph (Section 17)'}</span>
                {showTrace ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showTrace && (
                <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <DecisionTraceView trace={decisionTrace} />
                </div>
              )}
            </div>
          </div>

          {/* Response Text Display Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-200">Model Inference Output</span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-slate-400 font-mono">
                  {responsePacket.response.completion_tokens} completion tokens
                </span>
              </div>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs flex items-center space-x-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap overflow-x-auto">
              {responsePacket.response.text}
            </div>

            <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
              <span>{responsePacket.simulation_disclaimer}</span>
              <span className="font-mono">Request ID: {responsePacket.request_id}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
