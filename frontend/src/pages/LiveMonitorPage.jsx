import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  Clock,
  DollarSign,
  ShieldCheck,
  Cpu,
  RefreshCw,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import { api } from '../api';

const COLORS = {
  Small: '#10b981', // emerald
  Medium: '#6366f1', // indigo
  Large: '#f59e0b', // amber
};

export default function LiveMonitorPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await api.getLiveMonitor();
      setData(res);
    } catch (err) {
      console.error('Failed to fetch monitor metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 3500);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400">Loading Live Cluster Observability Telemetry...</p>
        </div>
      </div>
    );
  }

  const modelDistData = Object.entries(data?.model_distribution || {}).map(([name, value]) => ({
    name: `${name} Model`,
    tier: name,
    value,
  }));

  const workloadModels = data?.current_workload?.models || {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <span>Live Monitor</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time inference telemetry, percentile latencies, cluster utilization, and SLA compliance.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition-colors ${
              autoRefresh
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
            <span>Auto-Refresh (3s)</span>
          </button>
          <button
            onClick={fetchMetrics}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs transition-colors"
            title="Refresh metrics now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Requests Processed */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Requests</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </span>
          <div className="text-xl font-bold font-mono text-slate-100">
            {data?.total_requests || 0}
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">Total Recorded</span>
        </div>

        {/* Avg Latency */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Avg Latency</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </span>
          <div className="text-xl font-bold font-mono text-slate-100">
            {data?.avg_latency_s?.toFixed(2)}s
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">Arithmetic Mean</span>
        </div>

        {/* P95 Latency */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>P95 Latency</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          </span>
          <div className="text-xl font-bold font-mono text-amber-300">
            {data?.p95_latency_s?.toFixed(2)}s
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">Tail Performance</span>
        </div>

        {/* Total Cost */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Estimated Cost</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </span>
          <div className="text-xl font-bold font-mono text-emerald-300">
            ${data?.total_cost_usd?.toFixed(4)}
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">Cumulative Spend</span>
        </div>

        {/* SLA Compliance */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>SLA Adherence</span>
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          </span>
          <div className="text-xl font-bold font-mono text-indigo-300">
            {data?.sla_compliance_pct}%
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">Target Satisfied</span>
        </div>

        {/* Router Overhead */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Router Overhead</span>
            <Zap className="w-3.5 h-3.5 text-violet-400" />
          </span>
          <div className="text-xl font-bold font-mono text-slate-100">
            {data?.avg_router_overhead_ms?.toFixed(2)} ms
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">Engine Execution</span>
        </div>
      </div>

      {/* Row 2: Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Requests Over Time (Latency & Cost) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200">
              Inference Requests Over Time (Recent 25 Requests)
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Latency (s) vs Cost ($ x 100)
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.requests_over_time || []}>
                <defs>
                  <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', fontSize: '11px' }}
                />
                <Area
                  type="monotone"
                  dataKey="latency_s"
                  name="Latency (s)"
                  stroke="#6366f1"
                  fill="url(#latencyGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Selection Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <h3 className="text-xs font-semibold text-slate-200">Model Selection Distribution</h3>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={modelDistData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {modelDistData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.tier] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            {modelDistData.map((entry) => (
              <div key={entry.tier} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[entry.tier] }}
                  ></span>
                  <span className="text-slate-300">{entry.name}</span>
                </div>
                <span className="font-mono font-semibold text-slate-200">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Current Model Utilization Gauges & SLA Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Model Utilization Gauges */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200">
              Live Cluster Utilization by Model Tier
            </h3>
            <span className="text-[10px] text-amber-400 font-mono">
              Mode: {data?.current_workload?.mode || 'Medium Load'}
            </span>
          </div>

          <div className="space-y-4">
            {['Small', 'Medium', 'Large'].map((tier) => {
              const info = workloadModels[tier] || {
                utilization_pct: 0,
                queue_length: 0,
                status_label: 'Offline',
                is_online: true
              };
              const util = info.utilization_pct || 0;
              const color = COLORS[tier];

              return (
                <div key={tier} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{tier} Model Tier</span>
                    <div className="flex items-center space-x-2 font-mono">
                      <span className="text-slate-400">Queue: {info.queue_length}</span>
                      <span className="font-bold text-slate-100">{util}%</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${util}%`,
                        backgroundColor: color,
                      }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{info.status_label}</span>
                    <span className="font-mono">{info.throughput_rps} RPS</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SLA Compliance Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h3 className="text-xs font-semibold text-slate-200">
            SLA Compliance Summary
          </h3>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
              <span className="text-xs text-emerald-300 font-medium">SLA Satisfied</span>
              <div className="text-2xl font-bold font-mono text-emerald-200">
                {data?.sla_compliance_pct}%
              </div>
              <p className="text-[10px] text-emerald-400/80 leading-tight">
                Requests meeting both latency and quality thresholds
              </p>
            </div>

            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-1">
              <span className="text-xs text-rose-300 font-medium">SLA Violated</span>
              <div className="text-2xl font-bold font-mono text-rose-200">
                {(100.0 - (data?.sla_compliance_pct || 94.0)).toFixed(1)}%
              </div>
              <p className="text-[10px] text-rose-400/80 leading-tight">
                Requests exceeding budget or latency target
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-300">Router Efficiency Note:</span> The
            Workload-Aware policy dynamically penalizes models whose active queue risks violating the SLA threshold,
            preventing queue pileups on the Large tier during traffic spikes.
          </div>
        </div>
      </div>
    </div>
  );
}
