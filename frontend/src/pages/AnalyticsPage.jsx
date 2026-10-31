import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  ScatterChart as ScatterIcon,
  PieChart as PieIcon,
  ShieldCheck,
  Cpu,
  Layers
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { api } from '../api';

const MODEL_COLORS = {
  Small: '#10b981',
  Medium: '#6366f1',
  Large: '#f59e0b',
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getAnalytics();
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400">Loading Research Analytics & Visualizations...</p>
        </div>
      </div>
    );
  }

  const { cost_vs_quality, strategy_comparison, tier_breakdown, category_distribution } = analytics;

  // Split scatter points by model tier for color coded groups
  const scatterByTier = {
    Small: cost_vs_quality.filter((p) => p.model === 'Small'),
    Medium: cost_vs_quality.filter((p) => p.model === 'Medium'),
    Large: cost_vs_quality.filter((p) => p.model === 'Large'),
  };

  const categoryBarData = Object.entries(category_distribution || {}).map(([cat, count]) => ({
    category: cat,
    requests: count,
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <span>Research Analytics</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-normal">
              Pareto Frontier & Trade-offs
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Observability and empirical analysis of cost, latency, quality, and SLA violation trade-offs.
          </p>
        </div>
      </div>

      {/* Row 1: Cost vs Quality Scatter & Latency vs Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Cost vs Quality Scatter Plot */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center space-x-2">
              <ScatterIcon className="w-4 h-4 text-emerald-400" />
              <span>Cost vs. Quality Trade-off Scatter</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Normalized Points</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  type="number"
                  dataKey="cost"
                  name="Cost ($)"
                  stroke="#64748b"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `$${v.toFixed(3)}`}
                />
                <YAxis
                  type="number"
                  dataKey="quality"
                  name="Quality Score"
                  domain={[0.4, 1.0]}
                  stroke="#64748b"
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="p-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200">
                        <div className="font-bold text-indigo-300">{d.model} Model</div>
                        <div className="text-[10px] text-slate-400">{d.category}</div>
                        <div className="font-mono mt-1">
                          Cost: ${d.cost} | Quality: {d.quality}
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter name="Small Model" data={scatterByTier.Small} fill={MODEL_COLORS.Small} />
                <Scatter name="Medium Model" data={scatterByTier.Medium} fill={MODEL_COLORS.Medium} />
                <Scatter name="Large Model" data={scatterByTier.Large} fill={MODEL_COLORS.Large} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center space-x-4 text-xs pt-1">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300">Small Tier (Low Cost / Mid Quality)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
              <span className="text-slate-300">Medium Tier (Optimal Knee)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="text-slate-300">Large Tier (Frontier Quality)</span>
            </div>
          </div>
        </div>

        {/* SLA Violation Rate Across Routing Strategies */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <span>SLA Violation Rate by Routing Strategy (%)</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Lower is better</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={strategy_comparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="strategy" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', fontSize: '11px' }}
                />
                <Bar dataKey="sla_violation_rate" name="Violation Rate (%)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            Workload-Aware routing drastically curbs SLA violations by detecting impending queue congestion
            before assigning heavy requests to the Large model tier.
          </p>
        </div>
      </div>

      {/* Row 2: Strategy Comparative Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
        <h3 className="text-xs font-semibold text-slate-200">
          Strategy Baseline Comparison Matrix
        </h3>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Strategy</th>
                <th className="py-2.5 px-3">Requests Sampled</th>
                <th className="py-2.5 px-3">Mean Quality (0-1)</th>
                <th className="py-2.5 px-3">Mean Latency</th>
                <th className="py-2.5 px-3">Mean Cost</th>
                <th className="py-2.5 px-3">SLA Violation Rate</th>
                <th className="py-2.5 px-3 text-right">Router Overhead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {strategy_comparison.map((row) => {
                const isProposed = row.strategy === 'Workload-Aware';
                return (
                  <tr
                    key={row.strategy}
                    className={isProposed ? 'bg-indigo-950/20 text-indigo-200' : 'text-slate-300'}
                  >
                    <td className="py-2 px-3 font-sans font-medium flex items-center space-x-1.5">
                      <span>{row.strategy}</span>
                      {isProposed && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded font-mono uppercase">
                          Proposed
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">{row.count}</td>
                    <td className="py-2 px-3 text-emerald-300 font-bold">{row.mean_quality}</td>
                    <td className="py-2 px-3">{row.mean_latency}s</td>
                    <td className="py-2 px-3">${row.mean_cost.toFixed(5)}</td>
                    <td className="py-2 px-3">
                      <span className={row.sla_violation_rate < 10.0 ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                        {row.sla_violation_rate}%
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">{row.router_overhead_ms} ms</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 3: Task Category Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
        <h3 className="text-xs font-semibold text-slate-200">
          Request Ingest Distribution by Task Category
        </h3>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="category" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', fontSize: '11px' }}
              />
              <Bar dataKey="requests" name="Request Count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
