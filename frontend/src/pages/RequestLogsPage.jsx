import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../api';
import DecisionTraceView from '../components/DecisionTraceView';

export default function RequestLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [modelFilter, setModelFilter] = useState('All');
  const [slaFilter, setSlaFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [strategyFilter, setStrategyFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected detail modal
  const [selectedReqId, setSelectedReqId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getRequests({
        model: modelFilter !== 'All' ? modelFilter : undefined,
        sla: slaFilter !== 'All' ? slaFilter : undefined,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        strategy: strategyFilter !== 'All' ? strategyFilter : undefined,
        limit: 100,
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [modelFilter, slaFilter, categoryFilter, strategyFilter]);

  const handleOpenDetail = async (id) => {
    setSelectedReqId(id);
    setLoadingDetail(true);
    try {
      const detail = await api.getRequestDetail(id);
      setDetailData(detail);
    } catch (err) {
      console.error('Failed to load request detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedReqId(null);
    setDetailData(null);
  };

  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = [
      'request_id',
      'timestamp',
      'task_category',
      'complexity',
      'selected_model',
      'routing_strategy',
      'predicted_quality',
      'estimated_cost',
      'latency_s',
      'sla_satisfied',
      'router_overhead_ms',
    ];
    const rows = logs.map((l) => [
      l.request_id,
      l.timestamp,
      l.task_category,
      l.complexity,
      l.selected_model,
      l.routing_strategy,
      l.predicted_quality,
      l.estimated_cost,
      l.latency_s,
      l.sla_satisfied ? 'Satisfied' : 'Violated',
      l.router_overhead_ms,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `adaptive_router_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Client-side text search
  const filteredLogs = logs.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.request_id.toLowerCase().includes(q) ||
      l.prompt.toLowerCase().includes(q) ||
      l.task_category.toLowerCase().includes(q) ||
      l.selected_model.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <span>Request Telemetry Logs</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-normal">
              Audit & Trace Repository
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full telemetry audit trail of all routed inferences, candidate comparisons, and step-by-step decision paths.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Export CSV Telemetry</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search prompt or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Model Filter */}
          <div>
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Models</option>
              <option value="Small">Small Model</option>
              <option value="Medium">Medium Model</option>
              <option value="Large">Large Model</option>
            </select>
          </div>

          {/* SLA Filter */}
          <div>
            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All SLA Outcomes</option>
              <option value="Satisfied">SLA Satisfied</option>
              <option value="Violated">SLA Violated</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Categories</option>
              <option value="Reasoning">Reasoning</option>
              <option value="Coding">Coding</option>
              <option value="Summarization">Summarization</option>
              <option value="Extraction">Extraction</option>
              <option value="Classification">Classification</option>
              <option value="Analysis">Analysis</option>
              <option value="General QA">General QA</option>
            </select>
          </div>

          {/* Strategy Filter */}
          <div>
            <select
              value={strategyFilter}
              onChange={(e) => setStrategyFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Strategies</option>
              <option value="Workload-Aware">Workload-Aware</option>
              <option value="Query-Aware">Query-Aware</option>
              <option value="Always-Small">Always-Small</option>
              <option value="Always-Large">Always-Large</option>
              <option value="Random">Random</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Displaying {filteredLogs.length} Telemetry Records</span>
          <span className="font-mono">Click any row to view complete routing trace</span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Req ID</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Prompt Preview</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Complexity</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Strategy</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3">Cost</th>
                <th className="py-2.5 px-3">SLA Status</th>
                <th className="py-2.5 px-3 text-right">Overhead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLogs.map((log) => {
                return (
                  <tr
                    key={log.request_id}
                    onClick={() => handleOpenDetail(log.request_id)}
                    className="hover:bg-slate-950/70 text-slate-300 cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3 text-indigo-400 font-bold">{log.request_id.slice(0, 10)}</td>
                    <td className="py-2 px-3 text-slate-500 text-[10px]">
                      {log.timestamp ? log.timestamp.split('T')[1]?.slice(0, 8) : '--'}
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-200 max-w-xs truncate" title={log.prompt}>
                      {log.prompt_preview}
                    </td>
                    <td className="py-2 px-3 font-sans">{log.task_category}</td>
                    <td className="py-2 px-3 font-bold text-amber-300">{log.complexity}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.selected_model === 'Small'
                            ? 'bg-emerald-950 text-emerald-300'
                            : log.selected_model === 'Medium'
                            ? 'bg-indigo-950 text-indigo-300'
                            : 'bg-amber-950 text-amber-300'
                        }`}
                      >
                        {log.selected_model}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[10px] text-slate-400">{log.routing_strategy}</td>
                    <td className="py-2 px-3">{log.latency_s}s</td>
                    <td className="py-2 px-3">${log.estimated_cost.toFixed(5)}</td>
                    <td className="py-2 px-3">
                      <span
                        className={log.sla_satisfied ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}
                      >
                        {log.sla_satisfied ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">{log.router_overhead_ms} ms</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal / Drawer with Visual Routing Trace */}
      {selectedReqId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  Routing Trace &middot; {selectedReqId}
                </h3>
              </div>
              <button
                onClick={handleCloseDetail}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-300">
              {loadingDetail ? (
                <div className="py-12 text-center text-slate-400">Loading full decision trace...</div>
              ) : detailData ? (
                <>
                  {/* Prompt Text */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium">Input Prompt:</span>
                    <div className="p-3 bg-slate-950 rounded border border-slate-800 text-slate-200 font-sans leading-relaxed">
                      {detailData.request?.prompt}
                    </div>
                  </div>

                  {/* Visual Decision Path */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Decision Path Pipeline (Section 17):
                    </span>
                    <DecisionTraceView trace={detailData.decision?.decision_trace} />
                  </div>

                  {/* Candidate Evaluations Table */}
                  {detailData.candidates && detailData.candidates.length > 0 && (
                    <div className="space-y-1 pt-2">
                      <span className="text-[11px] text-slate-400 font-medium">
                        Model Evaluation Scores for this Request:
                      </span>
                      <div className="overflow-x-auto border border-slate-800 rounded">
                        <table className="w-full text-[11px] text-left">
                          <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                            <tr>
                              <th className="p-2">Model</th>
                              <th className="p-2">Quality</th>
                              <th className="p-2">Latency</th>
                              <th className="p-2">Cost</th>
                              <th className="p-2">Load</th>
                              <th className="p-2">SLA</th>
                              <th className="p-2 text-right">Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono">
                            {detailData.candidates.map((c) => (
                              <tr
                                key={c.model}
                                className={
                                  c.model === detailData.decision?.selected_model
                                    ? 'bg-indigo-950/40 text-indigo-200 font-bold'
                                    : 'text-slate-300'
                                }
                              >
                                <td className="p-2">{c.model}</td>
                                <td className="p-2">{c.predicted_quality}</td>
                                <td className="p-2">{c.predicted_latency_s}s</td>
                                <td className="p-2">${c.estimated_cost.toFixed(5)}</td>
                                <td className="p-2">{c.current_load_pct}%</td>
                                <td className="p-2">{c.sla_status}</td>
                                <td className="p-2 text-right">{c.router_score}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Response Text */}
                  {detailData.result && (
                    <div className="space-y-1 pt-2">
                      <span className="text-[11px] text-slate-400 font-medium">
                        Model Response Output:
                      </span>
                      <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {detailData.result.response_text}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-rose-400 py-6">Failed to retrieve record details.</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={handleCloseDetail}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
