import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Zap,
  Save,
  HelpCircle
} from 'lucide-react';
import { api } from '../api';

const PRESETS = [
  { id: 'Balanced', label: 'Balanced (Default)', desc: 'Well-rounded multi-objective optimization' },
  { id: 'Quality First', label: 'Quality First', desc: 'Heavy weight on reasoning depth & semantic precision' },
  { id: 'Cost Saver', label: 'Cost Saver', desc: 'Aggressive token budget conservation' },
  { id: 'Low Latency', label: 'Low Latency', desc: 'Prioritizes shortest response turnaround' },
  { id: 'SLA Critical', label: 'SLA Critical', desc: 'Maximum penalty against any constraint breach' },
];

export default function RoutingPolicyPage() {
  const [weights, setWeights] = useState({
    w_quality: 0.40,
    w_cost: 0.20,
    w_latency: 0.15,
    w_workload: 0.10,
    w_sla: 0.15,
  });
  const [activePreset, setActivePreset] = useState('Balanced');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // Sample prompt live evaluation preview
  const [simPreview, setSimPreview] = useState(null);

  const fetchPolicy = async () => {
    try {
      const res = await api.getPolicy();
      setWeights(res.weights);
      setActivePreset(res.active_preset);
    } catch (err) {
      console.error('Failed to load policy:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  // Compute live simulated scores for a sample reasoning query
  useEffect(() => {
    const total =
      weights.w_quality + weights.w_cost + weights.w_latency + weights.w_workload + weights.w_sla;
    const norm = {
      q: weights.w_quality / (total || 1),
      c: weights.w_cost / (total || 1),
      lat: weights.w_latency / (total || 1),
      w: weights.w_workload / (total || 1),
      sla: weights.w_sla / (total || 1),
    };

    // Candidate base parameters for sample reasoning prompt (complexity: 0.75, high load)
    const smallScore = norm.q * 0.58 - norm.c * 0.05 - norm.lat * 0.12 - norm.w * 0.38 - norm.sla * 0.40;
    const medScore = norm.q * 0.84 - norm.c * 0.18 - norm.lat * 0.28 - norm.w * 0.48 - norm.sla * 0.05;
    const largeScore = norm.q * 0.96 - norm.c * 0.65 - norm.lat * 0.85 - norm.w * 0.92 - norm.sla * 0.60;

    let winner = 'Medium';
    if (smallScore > medScore && smallScore > largeScore) winner = 'Small';
    if (largeScore > medScore && largeScore > smallScore) winner = 'Large';

    setSimPreview({
      Small: smallScore.toFixed(3),
      Medium: medScore.toFixed(3),
      Large: largeScore.toFixed(3),
      winner,
    });
  }, [weights]);

  const handleSliderChange = (key, val) => {
    setActivePreset('Custom');
    const floatVal = parseFloat(val);
    setWeights((prev) => ({
      ...prev,
      [key]: floatVal,
    }));
  };

  const handleApplyPreset = (presetName) => {
    setActivePreset(presetName);
    const presetMap = {
      Balanced: { w_quality: 0.40, w_cost: 0.20, w_latency: 0.15, w_workload: 0.10, w_sla: 0.15 },
      'Quality First': { w_quality: 0.60, w_cost: 0.10, w_latency: 0.10, w_workload: 0.05, w_sla: 0.15 },
      'Cost Saver': { w_quality: 0.20, w_cost: 0.45, w_latency: 0.15, w_workload: 0.10, w_sla: 0.10 },
      'Low Latency': { w_quality: 0.20, w_cost: 0.10, w_latency: 0.45, w_workload: 0.15, w_sla: 0.10 },
      'SLA Critical': { w_quality: 0.20, w_cost: 0.05, w_latency: 0.20, w_workload: 0.15, w_sla: 0.40 },
    };
    if (presetMap[presetName]) {
      setWeights(presetMap[presetName]);
    }
  };

  const handleSavePolicy = async () => {
    try {
      await api.updatePolicy({
        preset: activePreset === 'Custom' ? null : activePreset,
        weights: activePreset === 'Custom' ? weights : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save policy:', err);
    }
  };

  const currentTotal = Math.round(
    (weights.w_quality + weights.w_cost + weights.w_latency + weights.w_workload + weights.w_sla) *
      100
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <span>Routing Policy Configuration</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-normal">
              Utility Objective Formulation
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Calibrate multi-objective weight coefficients and inspect dynamic score implications.
          </p>
        </div>

        <button
          onClick={handleSavePolicy}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center space-x-2 shadow-md shadow-indigo-950 cursor-pointer"
        >
          {saved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Policy Applied!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save & Activate Policy</span>
            </>
          )}
        </button>
      </div>

      {/* Preset Chips */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
        <span className="text-xs text-slate-300 font-semibold block">
          Select Standard Policy Preset:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          {PRESETS.map((p) => {
            const isSelected = activePreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleApplyPreset(p.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-indigo-950/60 border-indigo-500/60 text-indigo-200'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="font-semibold text-xs text-slate-200 flex items-center justify-between mb-1">
                  <span>{p.label}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-400"></span>}
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">{p.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Sliders Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
              <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
              <span>Objective Weight Coefficients</span>
            </h3>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                currentTotal === 100
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-950 text-amber-400 border border-amber-500/30'
              }`}
            >
              Total: {currentTotal}% {currentTotal === 100 ? '(Normalized)' : '(Will Auto-Normalize)'}
            </span>
          </div>

          {/* Quality Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Quality Weight (w_quality)</span>
              <span className="font-mono font-bold text-emerald-400">
                {(weights.w_quality * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.w_quality}
              onChange={(e) => handleSliderChange('w_quality', e.target.value)}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">
              Rewards higher predicted response quality on complex queries.
            </p>
          </div>

          {/* Cost Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Cost Weight (w_cost)</span>
              <span className="font-mono font-bold text-cyan-400">
                {(weights.w_cost * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.w_cost}
              onChange={(e) => handleSliderChange('w_cost', e.target.value)}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">
              Penalizes expensive frontier model token usage.
            </p>
          </div>

          {/* Latency Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Latency Weight (w_latency)</span>
              <span className="font-mono font-bold text-indigo-400">
                {(weights.w_latency * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.w_latency}
              onChange={(e) => handleSliderChange('w_latency', e.target.value)}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">
              Penalizes longer expected response turnaround times.
            </p>
          </div>

          {/* Workload Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Workload Congestion (w_workload)</span>
              <span className="font-mono font-bold text-amber-400">
                {(weights.w_workload * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.w_workload}
              onChange={(e) => handleSliderChange('w_workload', e.target.value)}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">
              Penalizes tiers with high utilization (&gt;80%) or long queue depths.
            </p>
          </div>

          {/* SLA Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">SLA Compliance Guarantee (w_sla)</span>
              <span className="font-mono font-bold text-rose-400">
                {(weights.w_sla * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.w_sla}
              onChange={(e) => handleSliderChange('w_sla', e.target.value)}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">
              Imposes heavy penalty on candidate models that violate target latency or budget caps.
            </p>
          </div>
        </div>

        {/* Live Policy Impact Simulator Sandbox */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Live Sandbox: Score Impact for Sample Query</span>
              </h3>
              <span className="text-[10px] text-indigo-400 font-mono">Dynamic Preview</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              As you drag the sliders on the left, watch how the multi-objective utility scores update in real time
              for a sample high-complexity reasoning prompt under high cluster contention:
            </p>

            <div className="space-y-2 pt-2">
              {['Small', 'Medium', 'Large'].map((tier) => {
                const score = simPreview ? simPreview[tier] : 0;
                const isWinner = simPreview?.winner === tier;

                return (
                  <div
                    key={tier}
                    className={`p-3 rounded-lg border flex items-center justify-between text-xs transition-all ${
                      isWinner
                        ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-slate-200 block">{tier} Model</span>
                      <span className="text-[10px] text-slate-500">
                        {tier === 'Large' ? 'Frontier Quality / High Load' : tier === 'Medium' ? 'Balanced Latency & Quality' : 'Low Cost / Low Overhead'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 font-mono">
                      <span className="text-xs font-bold text-slate-100">Score: {score}</span>
                      {isWinner && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 font-bold uppercase">
                          Winner
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 font-mono">
            Utility Equation: Score = w_q &times; Q - w_c &times; C - w_lat &times; Lat - w_work &times; P_load - w_sla &times; P_sla
          </div>
        </div>
      </div>
    </div>
  );
}
