import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Play,
  Layers,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Clock,
  DollarSign,
  ShieldAlert,
  Zap,
  ArrowRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { api } from '../api';

const STRATEGIES = ['Workload-Aware', 'Query-Aware', 'Always-Small', 'Always-Large', 'Random'];
const WORKLOADS = ['High Load', 'Medium Load', 'Low Load', 'Bursty Load'];

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [strategy, setStrategy] = useState('Workload-Aware');
  const [workload, setWorkload] = useState('High Load');
  const [requestCount, setRequestCount] = useState(50);
  const [customName, setCustomName] = useState('');
  const [runningBench, setRunningBench] = useState(false);
  const [benchMessage, setBenchMessage] = useState('');

  const fetchExperiments = async () => {
    try {
      const res = await api.getExperiments();
      setExperiments(res);
    } catch (err) {
      console.error('Failed to load experiments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, []);

  const handleRunSingle = async () => {
    setRunningBench(true);
    setBenchMessage(`Executing synthetic batch of ${requestCount} requests under ${workload}...`);
    try {
      await api.runExperiment({
        name: customName || `Exp-${strategy}-${workload.split(' ')[0]}`,
        strategy,
        workload,
        request_count: parseInt(requestCount, 10),
      });
      await fetchExperiments();
      setBenchMessage('');
    } catch (err) {
      setBenchMessage(`Error: ${err.message}`);
    } finally {
      setRunningBench(false);
    }
  };

  const handleRunAllBaselines = async () => {
    setRunningBench(true);
    setBenchMessage(`Running comparative benchmark across all 5 routing strategies on ${workload}...`);
    try {
      await api.runBaselinesBenchmark({
        workload,
        request_count: parseInt(requestCount, 10),
      });
      await fetchExperiments();
      setBenchMessage('');
    } catch (err) {
      setBenchMessage(`Error: ${err.message}`);
    } finally {
      setRunningBench(false);
    }
  };

  // Prepare chart comparison data from recent experiments
  const chartData = experiments.slice(0, 5).map((exp) => ({
    name: exp.strategy.replace('Always-', 'All-'),
    quality: exp.mean_quality,
    latency: exp.mean_latency_s,
    sla_violation: exp.sla_violation_rate,
    cost: exp.total_cost * 100, // scaled for display
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <span>Experiment Mode</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-normal">
              Empirical Evaluation
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Execute controlled synthetic workloads and benchmark Workload-Aware routing against all research baselines.
          </p>
        </div>
      </div>

      {/* Experiment Configuration Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <h3 className="text-xs font-semibold text-slate-200 flex items-center space-x-2">
          <FlaskConical className="w-4 h-4 text-indigo-400" />
          <span>Configure Benchmark Run</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {/* Strategy */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Routing Strategy:</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500"
            >
              {STRATEGIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Workload Profile */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Workload Profile:</label>
            <select
              value={workload}
              onChange={(e) => setWorkload(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500"
            >
              {WORKLOADS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          {/* Request Count */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Request Count:</label>
            <select
              value={requestCount}
              onChange={(e) => setRequestCount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value={50}>50 Requests</option>
              <option value={100}>100 Requests</option>
              <option value={300}>300 Requests</option>
              <option value={500}>500 Requests</option>
            </select>
          </div>

          {/* Optional Label */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Experiment Label (Optional):</label>
            <input
              type="text"
              placeholder="e.g. Trial-A-Bursty"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
          <div className="text-[11px] text-slate-400">
            {benchMessage ? (
              <span className="text-amber-300 font-medium flex items-center space-x-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>{benchMessage}</span>
              </span>
            ) : (
              <span>Benchmarking executes deterministic multi-task synthetic prompts through model adapters.</span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRunAllBaselines}
              disabled={runningBench}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              Run All 5 Baselines Comparison
            </button>
            <button
              onClick={handleRunSingle}
              disabled={runningBench}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-950 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {runningBench ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Benchmarking...</span>
                </>
              ) : (
                <>
                  <span>Run Experiment</span>
                  <Play className="w-3 h-3 fill-white" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Comparative Visual Bar Chart */}
      {experiments.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>Baseline Strategy Comparison (Recent Benchmark Runs)</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Mean Quality vs SLA Violation Rate (%)
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="quality" name="Mean Quality (0-1)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sla_violation" name="SLA Violation Rate (%)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Stored Experiments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-200">
            Stored Experiment Runs & Baseline Results
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">
            {experiments.length} Runs Recorded
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Experiment</th>
                <th className="py-2.5 px-3">Strategy</th>
                <th className="py-2.5 px-3">Workload</th>
                <th className="py-2.5 px-3">Requests</th>
                <th className="py-2.5 px-3">Mean Quality</th>
                <th className="py-2.5 px-3">Mean Latency</th>
                <th className="py-2.5 px-3">P95 Latency</th>
                <th className="py-2.5 px-3">Total Cost</th>
                <th className="py-2.5 px-3">SLA Violations</th>
                <th className="py-2.5 px-3">Throughput</th>
                <th className="py-2.5 px-3 text-right">Overhead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {experiments.map((exp) => {
                const isWorkloadAware = exp.strategy === 'Workload-Aware';
                return (
                  <tr
                    key={exp.id}
                    className={`transition-colors ${
                      isWorkloadAware ? 'bg-indigo-950/20 text-indigo-200' : 'hover:bg-slate-950/40 text-slate-300'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-sans font-medium">{exp.name}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          isWorkloadAware
                            ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {exp.strategy}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{exp.workload}</td>
                    <td className="py-2.5 px-3">{exp.request_count}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-300">{exp.mean_quality}</td>
                    <td className="py-2.5 px-3">{exp.mean_latency_s}s</td>
                    <td className="py-2.5 px-3">{exp.p95_latency_s}s</td>
                    <td className="py-2.5 px-3">${exp.total_cost.toFixed(4)}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`font-semibold ${
                          exp.sla_violation_rate < 10.0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {exp.sla_violation_rate}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{exp.throughput_rps} rps</td>
                    <td className="py-2.5 px-3 text-right">{exp.router_overhead_ms} ms</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
