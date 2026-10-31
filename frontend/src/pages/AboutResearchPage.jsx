import React from 'react';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  HelpCircle,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Puzzle,
  ExternalLink
} from 'lucide-react';

export default function AboutResearchPage({ onOpenExtensionModal }) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 text-slate-300">
      {/* Title & Stage Notice */}
      <div className="space-y-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
          <GraduationCap className="w-4 h-4" />
          <span>University Research Project Prototype</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-tight leading-snug">
          A Workload-Aware Adaptive Routing Framework for Cost-, Latency-, Quality-, and SLA-Optimized Enterprise LLM Inference
        </h2>
        <div className="p-3 bg-amber-950/40 border border-amber-900/50 rounded-lg text-xs text-amber-200/90 leading-relaxed">
          <span className="font-bold text-amber-200">Current Stage Disclosure:</span> The application is currently an
          <strong className="underline decoration-amber-400 ml-1">early-stage research prototype undergoing initial testing</strong>.
          Model performance and cluster infrastructure telemetry are currently simulated to evaluate architectural feasibility.
          Do not claim production readiness or conclusive empirical validation.
        </div>
      </div>

      {/* Research Problem & Question */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2">
          <div className="font-semibold text-slate-100 text-sm flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>1. Research Problem</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Enterprises operate heterogeneous pools of Large Language Models spanning varied sizes, hosted endpoints,
            and specialized capabilities. Manually choosing a model for every prompt is suboptimal: simple tasks waste
            costly frontier models, while heavy queries routed to congested nodes trigger unacceptable latency and SLA violations.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2">
          <div className="font-semibold text-slate-100 text-sm flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>2. Research Question & Hypothesis</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong>Can combining query characteristics with runtime infrastructure state improve LLM routing?</strong>
            <br />
            We hypothesize that a multi-objective utility framework simultaneously evaluating query complexity,
            quality demands, cluster queue depth, and strict SLA latency boundaries yields superior Pareto efficiency over static routing baselines.
          </p>
        </div>
      </div>

      {/* Mathematical Utility Formulation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
        <div className="flex items-center space-x-2 text-slate-100 font-semibold text-sm">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>3. Multi-Objective Routing Formulation</span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          For every candidate model <code className="text-indigo-300 font-mono">m &isin; &#123;Small, Medium, Large&#125;</code>, the router computes an aggregated utility score:
        </p>

        <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-center font-mono text-xs text-indigo-300 shadow-inner">
          Score(m) = w_quality &times; Q(m) - w_cost &times; C_norm(m) - w_latency &times; L_norm(m) - w_workload &times; P_workload(m) - w_sla &times; P_sla(m)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
          <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
            <span className="font-semibold text-slate-300 block mb-1">Query-Level Features</span>
            <ul className="list-disc list-inside text-slate-400 space-y-0.5 text-[11px]">
              <li>Estimated token count (prompt + completion)</li>
              <li>Task category classification (Reasoning, Coding, etc.)</li>
              <li>Syntactic & semantic complexity score (0.0 to 1.0)</li>
              <li>User priority & quality target threshold</li>
            </ul>
          </div>

          <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
            <span className="font-semibold text-slate-300 block mb-1">Cluster Runtime Telemetry</span>
            <ul className="list-disc list-inside text-slate-400 space-y-0.5 text-[11px]">
              <li>Model availability status (online / offline)</li>
              <li>Active compute utilization percentage</li>
              <li>Queue length and queue-delay inflation factor</li>
              <li>Predicted tail latency and budget cap limits</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Current Capabilities vs Future Work */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Capabilities */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="font-semibold text-emerald-300 text-sm flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Current Prototype Capabilities</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300">
            <li className="flex items-start space-x-2">
              <span className="text-emerald-400 font-bold">&bull;</span>
              <span><strong>Adapter Architecture</strong>: Modular Small, Medium, Large tiers with extensible provider hooks.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-emerald-400 font-bold">&bull;</span>
              <span><strong>Heuristic Feature Extractor</strong>: Deterministic complexity & category detection.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-emerald-400 font-bold">&bull;</span>
              <span><strong>Workload Simulation Engine</strong>: Low, Medium, High, and Bursty load profiles with realistic queue inflation.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-emerald-400 font-bold">&bull;</span>
              <span><strong>Deterministic Explanations</strong>: Mathematical justification of selected vs penalized models.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-emerald-400 font-bold">&bull;</span>
              <span><strong>Empirical Baselines</strong>: Always-Small, Always-Large, Random, and Query-Aware benchmark runners.</span>
            </li>
          </ul>
        </div>

        {/* Future Work */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="font-semibold text-cyan-300 text-sm flex items-center space-x-2">
            <ArrowRight className="w-4 h-4 text-cyan-400" />
            <span>Planned Future Work</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300">
            <li className="flex items-start space-x-2">
              <span className="text-cyan-400 font-bold">&bull;</span>
              <span><strong>Real Provider Integration</strong>: Live API connectors to OpenAI, Anthropic, Google Gemini, and local Ollama.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-cyan-400 font-bold">&bull;</span>
              <span><strong>Learned Classifier</strong>: Fine-tuned encoder for multi-label complexity classification.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-cyan-400 font-bold">&bull;</span>
              <span><strong>Kubernetes / vLLM Exporter</strong>: Direct Prometheus metric ingestion from GPU inference servers.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-cyan-400 font-bold">&bull;</span>
              <span><strong>Browser Extension & Gateway</strong>: Chrome/Firefox extension and standalone enterprise proxy.</span>
            </li>
          </ul>

          <div className="pt-2">
            <button
              onClick={onOpenExtensionModal}
              className="w-full py-2 bg-slate-950 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-xs rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              <Puzzle className="w-3.5 h-3.5" />
              <span>Inspect Browser Extension Architecture Preview</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
