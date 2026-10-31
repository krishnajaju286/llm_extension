"""
Adaptive LLM Router - Database Models and Schemas
Lightweight SQLite data access layer for research telemetry, requests, decisions, and experiments.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class RequestRecord(BaseModel):
    id: str
    timestamp: str
    prompt: str
    prompt_tokens: int
    task_category: str
    complexity: float
    priority: str
    sla_profile: str
    max_latency_ms: Optional[float] = None
    max_cost: Optional[float] = None

class CandidateEvaluation(BaseModel):
    model: str
    predicted_quality: float
    predicted_latency_s: float
    estimated_cost: float
    current_load_pct: float
    queue_length: int
    sla_status: str  # "Pass" or "Fail"
    router_score: float
    quality_component: float
    cost_penalty: float
    latency_penalty: float
    workload_penalty: float
    sla_penalty: float
    is_available: bool

class RoutingDecisionRecord(BaseModel):
    request_id: str
    selected_model: str
    routing_strategy: str
    router_score: float
    router_overhead_ms: float
    explanation: str
    decision_trace: Dict[str, Any]
    candidate_evaluations: List[CandidateEvaluation]

class ResultRecord(BaseModel):
    request_id: str
    response_text: str
    actual_latency_s: float
    estimated_quality: float
    sla_satisfied: bool
    tokens_generated: int
    total_cost: float

class ExperimentRecord(BaseModel):
    id: str
    timestamp: str
    name: str
    strategy: str
    workload: str
    request_count: int
    mean_quality: float
    total_cost: float
    mean_latency_s: float
    p50_latency_s: float
    p95_latency_s: float
    sla_violation_rate: float
    throughput_rps: float
    router_overhead_ms: float
    details_json: Optional[str] = None
