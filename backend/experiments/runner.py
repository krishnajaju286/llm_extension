"""
Adaptive LLM Router - Experiment Runner
Executes synthetic research benchmarks comparing routing strategies (Always-Small, Always-Large,
Random, Query-Aware, Workload-Aware) across variable workload conditions (Low, Medium, High, Bursty).
"""
import uuid
import time
import math
import random
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from backend.router.router import AdaptiveRouter
from backend.models.adapters import registry
from backend.models.simulator import simulator
from backend.database.db import get_connection, save_experiment

# Rich pool of representative research prompts spanning diverse categories and complexities
SYNTHETIC_PROMPT_POOL = [
    # Reasoning (High complexity)
    ("Prove that in any graph G with minimum degree d >= 2, there exists a cycle of length at least d + 1. Step by step formal deduction.", "Reasoning", "Critical", "Quality First"),
    ("Analyze the game-theoretic Nash equilibrium of a multi-agent auction with asymmetric information and reserve prices.", "Reasoning", "High", "Quality First"),
    ("A farmer needs to cross a river with a fox, a goose, and a bag of grain with strict capacity limits. Formulate the state transition graph and verify shortest invariant path.", "Reasoning", "Medium", "Balanced"),
    ("Calculate the relativistic time dilation and invariant spacetime interval for a particle accelerated at 0.85c for 3 subjective hours.", "Reasoning", "High", "Balanced"),
    
    # Coding (High / Mid complexity)
    ("Write a thread-safe LRU cache in Python with O(1) get and put operations, using a doubly linked list and mutex lock. Handle edge cases with eviction callbacks.", "Coding", "High", "Balanced"),
    ("Implement an asynchronous WebSocket handler in FastAPI with heartbeat ping/pong and backpressure rate limiting.", "Coding", "Medium", "Low Latency"),
    ("Refactor this SQL query to eliminate Cartesian product and optimize index usage on partitioned timestamp tables: SELECT * FROM events e JOIN users u ON e.uid = u.id WHERE e.created_at > '2026-01-01'", "Coding", "Medium", "Balanced"),
    ("Write a bash script to monitor memory usage of all docker containers and emit an alert if swap exceeds 500MB.", "Coding", "Low", "Cost Optimized"),
    
    # Summarization (Low / Mid complexity)
    ("Summarize the following earnings report paragraph: Cloud revenue increased 24% year-over-year driven by infrastructure scaling, while operating margin contracted 1.2% due to capital expenditure on next-gen silicon hardware.", "Summarization", "Low", "Cost Optimized"),
    ("Condense the main findings of this research paper on attention mechanisms in 3 concise bullet points for an executive briefing.", "Summarization", "Medium", "Balanced"),
    ("Provide a one-sentence TL;DR of the RFC 7231 specification on HTTP/1.1 Semantics and Content.", "Summarization", "Low", "Low Latency"),

    # Extraction / Classification (Low complexity)
    ("Extract all email addresses, phone numbers, and company names from this vendor invoice text and return clean JSON format.", "Extraction", "Low", "Cost Optimized"),
    ("Classify the following customer ticket into category: Billing, Technical Support, Account Access, or Feedback. Text: 'My payment went through twice for the monthly subscription.'", "Classification", "Low", "Cost Optimized"),
    ("Parse the structured key-value pairs from this raw syslog entry: 'Mar 15 14:22:01 srv-01 kernel: [ 452.12] out of memory: kill process 8421'", "Extraction", "Low", "Low Latency"),

    # Analysis (Mid / High complexity)
    ("Perform an architectural comparison between Apache Kafka and RabbitMQ regarding message ordering guarantees, partition rebalancing overhead, and disaster recovery replication.", "Analysis", "High", "Balanced"),
    ("Critique the failure modes of raft consensus under network partitions and Byzantine node state corruption.", "Analysis", "High", "Quality First"),
    ("Benchmark the trade-offs of microservices vs modular monolith for a seed-stage startup with 4 engineers.", "Analysis", "Medium", "Cost Optimized"),

    # General QA & Creative
    ("What is the difference between TCP Reno and TCP BBR congestion control algorithms?", "General QA", "Medium", "Balanced"),
    ("What are the primary neurotransmitters involved in the sleep-wake cycle?", "General QA", "Low", "Low Latency"),
    ("Write a dialogue between a 19th-century mechanical engineer and a modern AI researcher discussing automated weaving looms.", "Creative Writing", "Medium", "Balanced")
]

class ExperimentRunner:
    @classmethod
    def run_experiment(
        cls,
        name: str,
        strategy: str,
        workload: str,
        request_count: int = 50,
        custom_weights: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Executes a controlled benchmark simulation across request_count synthetic queries.
        Collects micro-telemetry, percentiles, quality distributions, and SLA violation rates.
        """
        exp_id = str(uuid.uuid4())[:8]
        timestamp = datetime.now(timezone.utc).isoformat()

        # Set cluster simulator workload mode
        prev_mode = simulator.current_mode
        simulator.set_mode(workload)

        latencies = []
        qualities = []
        costs = []
        sla_violations = 0
        overheads = []
        tier_counts = {"Small": 0, "Medium": 0, "Large": 0, "None": 0}

        start_bench_time = time.perf_counter()

        # Run synthetic requests
        for i in range(request_count):
            prompt_item = SYNTHETIC_PROMPT_POOL[i % len(SYNTHETIC_PROMPT_POOL)]
            prompt_text, category, priority, sla_preset = prompt_item

            # Routing execution
            route_res = AdaptiveRouter.route(
                prompt=prompt_text,
                sla_profile=sla_preset,
                priority=priority,
                strategy=strategy,
                custom_weights=custom_weights
            )

            tier = route_res.selected_tier
            tier_counts[tier] = tier_counts.get(tier, 0) + 1
            overheads.append(route_res.router_overhead_ms)

            # Generate response from adapter
            adapter = registry.get_adapter(tier)
            if adapter and adapter.is_online:
                m_resp = adapter.generate(
                    prompt=prompt_text,
                    task_category=category,
                    complexity=route_res.features.complexity_score,
                    simulation_delay=False
                )
                actual_lat = m_resp.actual_latency_s
                qual = m_resp.estimated_quality
                cost = m_resp.estimated_cost
            else:
                actual_lat = 0.5
                qual = 0.0
                cost = 0.0

            latencies.append(actual_lat)
            qualities.append(qual)
            costs.append(cost)

            # Check SLA compliance
            sla_pass = route_res.decision_trace.get("step6_sla_status") == "Pass"
            if not sla_pass:
                sla_violations += 1

        total_duration = time.perf_counter() - start_bench_time
        throughput_rps = round(request_count / max(0.01, total_duration), 2)

        latencies.sort()
        p50 = latencies[int(len(latencies) * 0.50)] if latencies else 0.0
        p95 = latencies[min(len(latencies) - 1, int(len(latencies) * 0.95))] if latencies else 0.0
        mean_lat = sum(latencies) / len(latencies) if latencies else 0.0
        mean_qual = sum(qualities) / len(qualities) if qualities else 0.0
        total_cost = sum(costs)
        sla_violation_rate = (sla_violations / float(request_count)) * 100.0
        mean_overhead = sum(overheads) / len(overheads) if overheads else 0.0

        # Restore original workload mode
        simulator.set_mode(prev_mode)

        exp_data = {
            "id": exp_id,
            "timestamp": timestamp,
            "name": name or f"Bench-{strategy}-{workload[:4]}",
            "strategy": strategy,
            "workload": workload,
            "request_count": request_count,
            "mean_quality": round(mean_qual, 3),
            "total_cost": round(total_cost, 5),
            "mean_latency_s": round(mean_lat, 3),
            "p50_latency_s": round(p50, 3),
            "p95_latency_s": round(p95, 3),
            "sla_violation_rate": round(sla_violation_rate, 1),
            "throughput_rps": throughput_rps,
            "router_overhead_ms": round(mean_overhead, 2),
            "details": {
                "tier_selection_distribution": tier_counts,
                "duration_seconds": round(total_duration, 2),
                "is_simulated": True
            }
        }

        # Persist experiment
        save_experiment(exp_data)
        return exp_data

    @classmethod
    def run_all_baselines(cls, workload: str = "High Load", request_count: int = 50) -> List[Dict[str, Any]]:
        """Executes all 5 baseline strategies on the same workload for side-by-side comparative analysis."""
        strategies = ["Always-Small", "Always-Large", "Random", "Query-Aware", "Workload-Aware"]
        results = []
        for strat in strategies:
            res = cls.run_experiment(
                name=f"Comparison: {strat} ({workload})",
                strategy=strat,
                workload=workload,
                request_count=request_count
            )
            results.append(res)
        return results

    @classmethod
    def get_experiments(cls) -> List[Dict[str, Any]]:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM experiments ORDER BY timestamp DESC")
        rows = c.fetchall()
        experiments = []
        for r in rows:
            details = {}
            if r["details_json"]:
                try:
                    import json
                    details = json.loads(r["details_json"])
                except Exception:
                    pass
            experiments.append({
                "id": r["id"],
                "timestamp": r["timestamp"],
                "name": r["name"],
                "strategy": r["strategy"],
                "workload": r["workload"],
                "request_count": r["request_count"],
                "mean_quality": round(r["mean_quality"], 3),
                "total_cost": round(r["total_cost"], 5),
                "mean_latency_s": round(r["mean_latency_s"], 3),
                "p50_latency_s": round(r["p50_latency_s"], 3),
                "p95_latency_s": round(r["p95_latency_s"], 3),
                "sla_violation_rate": round(r["sla_violation_rate"], 1),
                "throughput_rps": round(r["throughput_rps"], 1),
                "router_overhead_ms": round(r["router_overhead_ms"], 2),
                "details": details
            })
        conn.close()
        return experiments
