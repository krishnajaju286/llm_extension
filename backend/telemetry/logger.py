"""
Adaptive LLM Router - Telemetry Logger & Analytics Service
Records all inference traffic and aggregates real-time performance metrics,
percentiles, time-series, and SLA compliance data.
"""
import json
import math
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from backend.database.db import get_connection, save_request, save_routing_decision, save_result

class TelemetryService:
    @classmethod
    def record_interaction(
        cls,
        req_id: str,
        prompt: str,
        sla_profile: str,
        priority: str,
        max_latency_ms: Optional[float],
        max_cost: Optional[float],
        routing_result: Dict[str, Any],
        inference_result: Dict[str, Any]
    ):
        now_iso = datetime.now(timezone.utc).isoformat()
        features = routing_result["features"]

        # 1. Save request
        save_request({
            "id": req_id,
            "timestamp": now_iso,
            "prompt": prompt,
            "prompt_tokens": features["estimated_tokens"],
            "task_category": features["task_category"],
            "complexity": features["complexity_score"],
            "priority": priority,
            "sla_profile": sla_profile,
            "max_latency_ms": max_latency_ms,
            "max_cost": max_cost
        })

        # 2. Save routing decision
        save_routing_decision({
            "request_id": req_id,
            "selected_model": routing_result["selected_model"],
            "routing_strategy": routing_result["routing_strategy"],
            "router_score": routing_result["router_score"],
            "router_overhead_ms": routing_result["router_overhead_ms"],
            "explanation": routing_result["explanation"],
            "decision_trace": routing_result["decision_trace"],
            "candidate_evaluations": routing_result["candidate_evaluations"]
        })

        # 3. Save inference result
        save_result({
            "request_id": req_id,
            "response_text": inference_result["text"],
            "actual_latency_s": inference_result["actual_latency_s"],
            "estimated_quality": inference_result["estimated_quality"],
            "sla_satisfied": routing_result["decision_trace"].get("step6_sla_status") == "Pass",
            "tokens_generated": inference_result["completion_tokens"],
            "total_cost": inference_result["estimated_cost"]
        })

    @classmethod
    def get_live_metrics(cls) -> Dict[str, Any]:
        conn = get_connection()
        c = conn.cursor()

        # Summary KPIs
        c.execute("""
            SELECT 
                COUNT(*) as total_requests,
                AVG(actual_latency_s) as avg_latency,
                SUM(total_cost) as total_cost,
                AVG(sla_satisfied) as sla_compliance,
                AVG(router_overhead_ms) as avg_overhead
            FROM results
            JOIN routing_decisions ON results.request_id = routing_decisions.request_id
        """)
        row = c.fetchone()

        total_requests = row["total_requests"] or 0
        avg_latency = row["avg_latency"] or 0.0
        total_cost = row["total_cost"] or 0.0
        sla_comp = (row["sla_compliance"] or 0.0) * 100.0
        avg_overhead = row["avg_overhead"] or 0.0

        # Calculate P95 latency
        c.execute("SELECT actual_latency_s FROM results ORDER BY actual_latency_s ASC")
        latencies = [r["actual_latency_s"] for r in c.fetchall()]
        p95_latency = 0.0
        p50_latency = 0.0
        if latencies:
            idx95 = min(len(latencies) - 1, int(len(latencies) * 0.95))
            idx50 = min(len(latencies) - 1, int(len(latencies) * 0.50))
            p95_latency = latencies[idx95]
            p50_latency = latencies[idx50]

        # Model Selection Distribution
        c.execute("""
            SELECT selected_model, COUNT(*) as cnt
            FROM routing_decisions
            GROUP BY selected_model
        """)
        dist_rows = c.fetchall()
        model_distribution = {r["selected_model"]: r["cnt"] for r in dist_rows}

        # Requests Over Time (last 20 requests or bucketed)
        c.execute("""
            SELECT requests.id, requests.timestamp, results.actual_latency_s, results.total_cost, 
                   routing_decisions.selected_model, results.sla_satisfied
            FROM requests
            JOIN results ON requests.id = results.request_id
            JOIN routing_decisions ON requests.id = routing_decisions.request_id
            ORDER BY requests.timestamp DESC
            LIMIT 25
        """)
        time_rows = list(reversed(c.fetchall()))
        requests_over_time = [
            {
                "time": r["timestamp"][-8:-1] if len(r["timestamp"]) > 8 else r["timestamp"],
                "latency_s": round(r["actual_latency_s"], 2),
                "cost_usd": round(r["total_cost"], 5),
                "model": r["selected_model"],
                "sla_satisfied": bool(r["sla_satisfied"])
            }
            for r in time_rows
        ]

        conn.close()

        return {
            "total_requests": total_requests,
            "avg_latency_s": round(avg_latency, 3),
            "p50_latency_s": round(p50_latency, 3),
            "p95_latency_s": round(p95_latency, 3),
            "total_cost_usd": round(total_cost, 5),
            "sla_compliance_pct": round(sla_comp, 1),
            "avg_router_overhead_ms": round(avg_overhead, 2),
            "model_distribution": model_distribution,
            "requests_over_time": requests_over_time
        }

    @classmethod
    def get_requests(
        cls,
        limit: int = 50,
        offset: int = 0,
        model_filter: Optional[str] = None,
        sla_filter: Optional[str] = None,
        category_filter: Optional[str] = None,
        strategy_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        conn = get_connection()
        c = conn.cursor()

        query = """
            SELECT 
                r.id as request_id,
                r.timestamp,
                r.prompt,
                r.prompt_tokens,
                r.task_category,
                r.complexity,
                r.priority,
                r.sla_profile,
                d.selected_model,
                d.routing_strategy,
                d.router_score,
                d.router_overhead_ms,
                res.actual_latency_s,
                res.estimated_quality,
                res.sla_satisfied,
                res.total_cost
            FROM requests r
            LEFT JOIN routing_decisions d ON r.id = d.request_id
            LEFT JOIN results res ON r.id = res.request_id
            WHERE 1=1
        """
        params = []
        if model_filter and model_filter != "All":
            query += " AND d.selected_model = ?"
            params.append(model_filter)
        if sla_filter and sla_filter != "All":
            query += " AND res.sla_satisfied = ?"
            params.append(1 if sla_filter == "Satisfied" else 0)
        if category_filter and category_filter != "All":
            query += " AND r.task_category = ?"
            params.append(category_filter)
        if strategy_filter and strategy_filter != "All":
            query += " AND d.routing_strategy = ?"
            params.append(strategy_filter)

        query += " ORDER BY r.timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        c.execute(query, params)
        rows = c.fetchall()
        results = []
        for row in rows:
            results.append({
                "request_id": row["request_id"],
                "timestamp": row["timestamp"],
                "prompt_preview": row["prompt"][:80] + ("..." if len(row["prompt"]) > 80 else ""),
                "prompt": row["prompt"],
                "task_category": row["task_category"],
                "complexity": round(row["complexity"], 2),
                "priority": row["priority"],
                "sla_profile": row["sla_profile"],
                "selected_model": row["selected_model"] or "N/A",
                "routing_strategy": row["routing_strategy"] or "N/A",
                "predicted_quality": round(row["estimated_quality"] or 0.0, 2),
                "estimated_cost": round(row["total_cost"] or 0.0, 5),
                "latency_s": round(row["actual_latency_s"] or 0.0, 2),
                "sla_satisfied": bool(row["sla_satisfied"]),
                "router_overhead_ms": round(row["router_overhead_ms"] or 0.0, 2)
            })

        conn.close()
        return results

    @classmethod
    def get_request_detail(cls, request_id: str) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        c = conn.cursor()

        c.execute("SELECT * FROM requests WHERE id = ?", (request_id,))
        req = c.fetchone()
        if not req:
            conn.close()
            return None

        c.execute("SELECT * FROM routing_decisions WHERE request_id = ?", (request_id,))
        dec = c.fetchone()

        c.execute("SELECT * FROM candidate_evaluations WHERE request_id = ?", (request_id,))
        candidates = [dict(row) for row in c.fetchall()]

        c.execute("SELECT * FROM results WHERE request_id = ?", (request_id,))
        res = c.fetchone()

        conn.close()

        trace = {}
        if dec and dec["decision_trace_json"]:
            try:
                trace = json.loads(dec["decision_trace_json"])
            except Exception:
                pass

        return {
            "request": dict(req),
            "decision": {
                "selected_model": dec["selected_model"] if dec else None,
                "routing_strategy": dec["routing_strategy"] if dec else None,
                "router_score": dec["router_score"] if dec else None,
                "router_overhead_ms": dec["router_overhead_ms"] if dec else None,
                "explanation": dec["explanation"] if dec else None,
                "decision_trace": trace,
            },
            "candidates": candidates,
            "result": dict(res) if res else None
        }

    @classmethod
    def get_analytics_data(cls) -> Dict[str, Any]:
        conn = get_connection()
        c = conn.cursor()

        # 1. Cost vs Quality scatter points
        c.execute("""
            SELECT 
                r.task_category,
                r.complexity,
                d.selected_model,
                d.routing_strategy,
                res.total_cost,
                res.estimated_quality,
                res.actual_latency_s
            FROM requests r
            JOIN routing_decisions d ON r.id = d.request_id
            JOIN results res ON r.id = res.request_id
            ORDER BY r.timestamp DESC LIMIT 150
        """)
        scatter_rows = c.fetchall()
        cost_vs_quality = [
            {
                "model": row["selected_model"],
                "strategy": row["routing_strategy"],
                "category": row["task_category"],
                "complexity": round(row["complexity"], 2),
                "cost": round(row["total_cost"], 5),
                "quality": round(row["estimated_quality"], 2),
                "latency": round(row["actual_latency_s"], 2)
            }
            for row in scatter_rows
        ]

        # 2. Strategy Comparison (SLA violation rate, mean cost, mean quality, p95 latency)
        c.execute("""
            SELECT 
                d.routing_strategy,
                COUNT(*) as count,
                AVG(res.estimated_quality) as mean_quality,
                AVG(res.total_cost) as mean_cost,
                AVG(res.actual_latency_s) as mean_latency,
                AVG(CASE WHEN res.sla_satisfied = 0 THEN 1.0 ELSE 0.0 END) as sla_violation_rate,
                AVG(d.router_overhead_ms) as avg_overhead
            FROM routing_decisions d
            JOIN results res ON d.request_id = res.request_id
            GROUP BY d.routing_strategy
        """)
        strategy_rows = c.fetchall()
        strategy_comparison = [
            {
                "strategy": r["routing_strategy"],
                "count": r["count"],
                "mean_quality": round(r["mean_quality"], 3),
                "mean_cost": round(r["mean_cost"], 5),
                "mean_latency": round(r["mean_latency"], 3),
                "sla_violation_rate": round(r["sla_violation_rate"] * 100.0, 1),
                "router_overhead_ms": round(r["avg_overhead"], 2)
            }
            for r in strategy_rows
        ]

        # 3. Model tier breakdown
        c.execute("""
            SELECT 
                d.selected_model,
                COUNT(*) as count,
                AVG(res.estimated_quality) as mean_quality,
                AVG(res.actual_latency_s) as mean_latency,
                AVG(res.total_cost) as mean_cost
            FROM routing_decisions d
            JOIN results res ON d.request_id = res.request_id
            GROUP BY d.selected_model
        """)
        tier_breakdown = [
            {
                "model": r["selected_model"],
                "count": r["count"],
                "mean_quality": round(r["mean_quality"], 2),
                "mean_latency": round(r["mean_latency"], 2),
                "mean_cost": round(r["mean_cost"], 5)
            }
            for r in c.fetchall()
        ]

        # 4. Task Category breakdown
        c.execute("""
            SELECT task_category, COUNT(*) as count
            FROM requests
            GROUP BY task_category
        """)
        category_distribution = {r["task_category"]: r["count"] for r in c.fetchall()}

        conn.close()

        return {
            "cost_vs_quality": cost_vs_quality,
            "strategy_comparison": strategy_comparison,
            "tier_breakdown": tier_breakdown,
            "category_distribution": category_distribution
        }
