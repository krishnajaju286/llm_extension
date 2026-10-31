"""
Adaptive LLM Router - Database Management
SQLite storage for request telemetry, routing decisions, model candidate evaluations, inference results, and experiments.
"""
import sqlite3
import os
import json
from typing import List, Dict, Any, Optional

DB_PATH = os.environ.get("ROUTER_DB_PATH", os.path.join(os.path.dirname(__file__), "..", "router_telemetry.db"))

def get_connection():
    db_file = os.path.abspath(DB_PATH)
    os.makedirs(os.path.dirname(db_file), exist_ok=True)
    conn = sqlite3.connect(db_file)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Requests table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        prompt TEXT NOT NULL,
        prompt_tokens INTEGER NOT NULL,
        task_category TEXT NOT NULL,
        complexity REAL NOT NULL,
        priority TEXT NOT NULL,
        sla_profile TEXT NOT NULL,
        max_latency_ms REAL,
        max_cost REAL
    )
    """)

    # Routing decisions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS routing_decisions (
        request_id TEXT PRIMARY KEY,
        selected_model TEXT NOT NULL,
        routing_strategy TEXT NOT NULL,
        router_score REAL NOT NULL,
        router_overhead_ms REAL NOT NULL,
        explanation TEXT NOT NULL,
        decision_trace_json TEXT NOT NULL,
        FOREIGN KEY(request_id) REFERENCES requests(id)
    )
    """)

    # Candidate model evaluations per request
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS candidate_evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id TEXT NOT NULL,
        model TEXT NOT NULL,
        predicted_quality REAL NOT NULL,
        predicted_latency_s REAL NOT NULL,
        estimated_cost REAL NOT NULL,
        current_load_pct REAL NOT NULL,
        queue_length INTEGER NOT NULL,
        sla_status TEXT NOT NULL,
        router_score REAL NOT NULL,
        quality_component REAL NOT NULL,
        cost_penalty REAL NOT NULL,
        latency_penalty REAL NOT NULL,
        workload_penalty REAL NOT NULL,
        sla_penalty REAL NOT NULL,
        is_available INTEGER NOT NULL,
        FOREIGN KEY(request_id) REFERENCES requests(id)
    )
    """)

    # Results table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS results (
        request_id TEXT PRIMARY KEY,
        response_text TEXT NOT NULL,
        actual_latency_s REAL NOT NULL,
        estimated_quality REAL NOT NULL,
        sla_satisfied INTEGER NOT NULL,
        tokens_generated INTEGER NOT NULL,
        total_cost REAL NOT NULL,
        FOREIGN KEY(request_id) REFERENCES requests(id)
    )
    """)

    # Experiments table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS experiments (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        name TEXT NOT NULL,
        strategy TEXT NOT NULL,
        workload TEXT NOT NULL,
        request_count INTEGER NOT NULL,
        mean_quality REAL NOT NULL,
        total_cost REAL NOT NULL,
        mean_latency_s REAL NOT NULL,
        p50_latency_s REAL NOT NULL,
        p95_latency_s REAL NOT NULL,
        sla_violation_rate REAL NOT NULL,
        throughput_rps REAL NOT NULL,
        router_overhead_ms REAL NOT NULL,
        details_json TEXT
    )
    """)

    # System state & config table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    conn.commit()
    conn.close()

def save_request(req_data: Dict[str, Any]):
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT OR REPLACE INTO requests 
        (id, timestamp, prompt, prompt_tokens, task_category, complexity, priority, sla_profile, max_latency_ms, max_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        req_data["id"], req_data["timestamp"], req_data["prompt"], req_data["prompt_tokens"],
        req_data["task_category"], req_data["complexity"], req_data["priority"], req_data["sla_profile"],
        req_data.get("max_latency_ms"), req_data.get("max_cost")
    ))
    conn.commit()
    conn.close()

def save_routing_decision(dec_data: Dict[str, Any]):
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT OR REPLACE INTO routing_decisions
        (request_id, selected_model, routing_strategy, router_score, router_overhead_ms, explanation, decision_trace_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        dec_data["request_id"], dec_data["selected_model"], dec_data["routing_strategy"],
        dec_data["router_score"], dec_data["router_overhead_ms"], dec_data["explanation"],
        json.dumps(dec_data["decision_trace"])
    ))

    # Candidate evaluations
    for cand in dec_data.get("candidate_evaluations", []):
        c.execute("""
            INSERT INTO candidate_evaluations
            (request_id, model, predicted_quality, predicted_latency_s, estimated_cost,
             current_load_pct, queue_length, sla_status, router_score,
             quality_component, cost_penalty, latency_penalty, workload_penalty, sla_penalty, is_available)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            dec_data["request_id"], cand["model"], cand["predicted_quality"], cand["predicted_latency_s"],
            cand["estimated_cost"], cand["current_load_pct"], cand["queue_length"], cand["sla_status"],
            cand["router_score"], cand["quality_component"], cand["cost_penalty"], cand["latency_penalty"],
            cand["workload_penalty"], cand["sla_penalty"], 1 if cand.get("is_available", True) else 0
        ))
    conn.commit()
    conn.close()

def save_result(res_data: Dict[str, Any]):
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT OR REPLACE INTO results
        (request_id, response_text, actual_latency_s, estimated_quality, sla_satisfied, tokens_generated, total_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        res_data["request_id"], res_data["response_text"], res_data["actual_latency_s"],
        res_data["estimated_quality"], 1 if res_data["sla_satisfied"] else 0,
        res_data["tokens_generated"], res_data["total_cost"]
    ))
    conn.commit()
    conn.close()

def save_experiment(exp_data: Dict[str, Any]):
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT OR REPLACE INTO experiments
        (id, timestamp, name, strategy, workload, request_count, mean_quality, total_cost,
         mean_latency_s, p50_latency_s, p95_latency_s, sla_violation_rate, throughput_rps, router_overhead_ms, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        exp_data["id"], exp_data["timestamp"], exp_data["name"], exp_data["strategy"],
        exp_data["workload"], exp_data["request_count"], exp_data["mean_quality"], exp_data["total_cost"],
        exp_data["mean_latency_s"], exp_data["p50_latency_s"], exp_data["p95_latency_s"],
        exp_data["sla_violation_rate"], exp_data["throughput_rps"], exp_data["router_overhead_ms"],
        json.dumps(exp_data.get("details", {}))
    ))
    conn.commit()
    conn.close()
