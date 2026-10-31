"""
Adaptive LLM Router - Telemetry Database Seeder
Populates SQLite with realistic simulated request history, candidate comparisons,
and baseline benchmark runs so observability dashboards are populated immediately on first boot.
"""
import uuid
import random
from datetime import datetime, timezone, timedelta
from backend.database.db import init_db, get_connection
from backend.router.router import AdaptiveRouter
from backend.models.adapters import registry
from backend.models.simulator import simulator
from backend.telemetry.logger import TelemetryService
from backend.experiments.runner import ExperimentRunner, SYNTHETIC_PROMPT_POOL

def seed_database_if_empty():
    init_db()
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM requests")
    count = c.fetchone()[0]
    conn.close()

    if count > 10:
        return  # Already seeded

    print("[Seeder] Populating database with realistic simulated research telemetry...")
    now = datetime.now(timezone.utc)

    strategies = ["Workload-Aware", "Workload-Aware", "Workload-Aware", "Query-Aware", "Always-Small", "Always-Large", "Random"]
    workloads = ["Low Load", "Medium Load", "High Load", "Bursty Load"]
    sla_presets = ["Balanced", "Cost Optimized", "Quality First", "Low Latency"]

    # Generate 50 realistic historical requests spaced over the last 2 hours
    for i in range(50):
        prompt_item = SYNTHETIC_PROMPT_POOL[i % len(SYNTHETIC_PROMPT_POOL)]
        prompt_text, category, priority, _ = prompt_item
        sla_preset = random.choice(sla_presets)
        strat = random.choice(strategies)
        wload = random.choice(workloads)
        req_id = f"req-{uuid.uuid4().hex[:8]}"

        simulator.set_mode(wload)

        route_res = AdaptiveRouter.route(
            prompt=prompt_text,
            sla_profile=sla_preset,
            priority=priority,
            strategy=strat
        )

        tier = route_res.selected_tier
        adapter = registry.get_adapter(tier)
        if adapter:
            m_resp = adapter.generate(
                prompt=prompt_text,
                task_category=category,
                complexity=route_res.features.complexity_score,
                simulation_delay=False
            )
        else:
            continue

        # Adjust timestamp so requests are spread out
        offset_minutes = 50 - i
        req_time = (now - timedelta(minutes=offset_minutes)).isoformat() + "Z"

        TelemetryService.record_interaction(
            req_id=req_id,
            prompt=prompt_text,
            sla_profile=sla_preset,
            priority=priority,
            max_latency_ms=route_res.features.latency_requirement_ms,
            max_cost=route_res.features.cost_constraint_usd,
            routing_result=route_res.to_dict(),
            inference_result=m_resp.model_dump()
        )

        # Update timestamps in DB to be historically ordered
        conn = get_connection()
        conn.cursor().execute("UPDATE requests SET timestamp = ? WHERE id = ?", (req_time, req_id))
        conn.commit()
        conn.close()

    # Pre-seed baseline benchmark comparison
    print("[Seeder] Seeding initial baseline comparison experiments...")
    simulator.set_mode("High Load")
    baseline_benchmarks = [
        ("Always-Small", "High Load", 50, 0.64, 0.0125, 0.48, 0.45, 0.52, 38.0, 42.0, 0.65),
        ("Always-Large", "High Load", 50, 0.96, 0.3850, 3.42, 3.10, 4.65, 44.0, 12.0, 0.68),
        ("Random", "High Load", 50, 0.79, 0.1620, 1.85, 1.40, 3.80, 26.0, 22.0, 0.72),
        ("Query-Aware", "High Load", 50, 0.88, 0.1450, 2.45, 1.80, 4.20, 28.0, 26.0, 1.42),
        ("Workload-Aware", "High Load", 50, 0.87, 0.0820, 1.25, 1.15, 1.65, 4.0, 36.0, 1.85),
    ]

    for strat, wload, n_req, m_qual, tot_cost, m_lat, p50, p95, sla_viol, tput, overhead in baseline_benchmarks:
        exp_id = f"exp-{uuid.uuid4().hex[:6]}"
        exp_time = (now - timedelta(minutes=15)).isoformat() + "Z"
        conn = get_connection()
        c = conn.cursor()
        c.execute("""
            INSERT OR REPLACE INTO experiments
            (id, timestamp, name, strategy, workload, request_count, mean_quality, total_cost,
             mean_latency_s, p50_latency_s, p95_latency_s, sla_violation_rate, throughput_rps, router_overhead_ms, details_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            exp_id, exp_time, f"Baseline Study: {strat} ({wload})", strat, wload, n_req,
            m_qual, tot_cost, m_lat, p50, p95, sla_viol, tput, overhead,
            '{"seeded": true, "evaluation_phase": "Phase 1 Baseline Benchmark"}'
        ))
        conn.commit()
        conn.close()

    print("[Seeder] Successfully initialized database with telemetry and baseline benchmarks.")

if __name__ == "__main__":
    seed_database_if_empty()
