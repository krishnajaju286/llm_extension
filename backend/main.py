"""
Adaptive LLM Router - Backend REST API
Research prototype server implementing workload-aware LLM routing, telemetry collection,
policy configuration, and benchmark experimentation.
"""
import os
import uuid
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend.database.db import init_db
from backend.models.adapters import registry
from backend.models.simulator import simulator
from backend.router.policies import policy_manager, PolicyWeights
from backend.router.router import AdaptiveRouter
from backend.telemetry.logger import TelemetryService
from backend.experiments.runner import ExperimentRunner
from backend.telemetry.seed_data import seed_database_if_empty

app = FastAPI(
    title="Adaptive LLM Router API",
    description="Research prototype backend for workload-aware enterprise LLM inference optimization.",
    version="0.1.0"
)

# Enable CORS for local frontend dev server & future browser extensions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event: initialize DB and seed telemetry
@app.on_event("startup")
def on_startup():
    init_db()
    seed_database_if_empty()

# -------------------------------------------------------------
# Request & Response Schemas
# -------------------------------------------------------------

class RouteRequest(BaseModel):
    prompt: str = Field(..., description="User prompt text")
    sla_profile: str = Field("Balanced", description="SLA Preset: Cost Optimized, Balanced, Quality First, Low Latency, Custom")
    priority: str = Field("Medium", description="Request priority: Low, Medium, High, Critical")
    max_latency_ms: Optional[float] = Field(None, description="Maximum acceptable latency in ms")
    max_cost: Optional[float] = Field(None, description="Maximum acceptable cost in USD")
    strategy: str = Field("Workload-Aware", description="Routing strategy: Workload-Aware, Query-Aware, Always-Small, Always-Large, Random")
    custom_weights: Optional[Dict[str, float]] = Field(None, description="Custom policy weights if Custom preset is active")

class InferenceRequest(BaseModel):
    prompt: str
    selected_tier: str
    task_category: str = "General QA"
    complexity: float = 0.50

class RouteAndRunRequest(BaseModel):
    prompt: str
    sla_profile: str = "Balanced"
    priority: str = "Medium"
    max_latency_ms: Optional[float] = None
    max_cost: Optional[float] = None
    strategy: str = "Workload-Aware"
    custom_weights: Optional[Dict[str, float]] = None

class ToggleModelRequest(BaseModel):
    tier: str
    is_online: bool

class SetWorkloadRequest(BaseModel):
    mode: str

class UpdatePolicyRequest(BaseModel):
    preset: Optional[str] = None
    weights: Optional[Dict[str, float]] = None

class ExperimentRequest(BaseModel):
    name: Optional[str] = None
    strategy: str = "Workload-Aware"
    workload: str = "High Load"
    request_count: int = 50
    custom_weights: Optional[Dict[str, float]] = None

class BaselinesExperimentRequest(BaseModel):
    workload: str = "High Load"
    request_count: int = 50

# -------------------------------------------------------------
# API Endpoints
# -------------------------------------------------------------

@app.get("/api/info")
def get_api_info():
    return {
        "prototype": "Adaptive LLM Router",
        "research_title": "A Workload-Aware Adaptive Routing Framework for Cost-, Latency-, Quality-, and SLA-Optimized Enterprise LLM Inference",
        "stage": "Early-stage research prototype undergoing initial testing",
        "simulation_mode": True,
        "docs_url": "/docs"
    }

@app.get("/")
def get_root():
    dist_index = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist", "index.html")
    if os.path.exists(dist_index):
        return FileResponse(dist_index)
    return get_api_info()

@app.post("/api/route")
def route_prompt(req: RouteRequest):
    """Calculates query features, evaluates candidate models, and returns routing decision."""
    result = AdaptiveRouter.route(
        prompt=req.prompt,
        sla_profile=req.sla_profile,
        priority=req.priority,
        max_latency_ms=req.max_latency_ms,
        max_cost=req.max_cost,
        strategy=req.strategy,
        custom_weights=req.custom_weights
    )
    return result.to_dict()

@app.post("/api/inference")
def execute_inference(req: InferenceRequest):
    """Executes model inference (simulated or real adapter) on selected tier."""
    adapter = registry.get_adapter(req.selected_tier)
    if not adapter:
        raise HTTPException(status_code=400, detail=f"Invalid model tier: {req.selected_tier}")
    if not adapter.is_online:
        raise HTTPException(status_code=503, detail=f"Model tier '{req.selected_tier}' is currently OFFLINE")

    resp = adapter.generate(
        prompt=req.prompt,
        task_category=req.task_category,
        complexity=req.complexity,
        simulation_delay=False
    )
    return resp.model_dump()

@app.post("/api/route-and-run")
def route_and_run(req: RouteAndRunRequest):
    """
    Combined end-to-end endpoint:
    Route -> Inference -> Telemetry Persistence -> Complete Response.
    """
    req_id = f"req-{uuid.uuid4().hex[:8]}"

    # 1. Routing
    route_res = AdaptiveRouter.route(
        prompt=req.prompt,
        sla_profile=req.sla_profile,
        priority=req.priority,
        max_latency_ms=req.max_latency_ms,
        max_cost=req.max_cost,
        strategy=req.strategy,
        custom_weights=req.custom_weights
    )

    tier = route_res.selected_tier
    adapter = registry.get_adapter(tier)
    if not adapter or not adapter.is_online:
        raise HTTPException(status_code=503, detail=f"Selected model '{tier}' is offline or unavailable")

    # 2. Inference
    m_resp = adapter.generate(
        prompt=req.prompt,
        task_category=route_res.features.task_category,
        complexity=route_res.features.complexity_score,
        simulation_delay=False
    )

    # 3. Telemetry recording
    TelemetryService.record_interaction(
        req_id=req_id,
        prompt=req.prompt,
        sla_profile=req.sla_profile,
        priority=req.priority,
        max_latency_ms=req.max_latency_ms,
        max_cost=req.max_cost,
        routing_result=route_res.to_dict(),
        inference_result=m_resp.model_dump()
    )

    return {
        "request_id": req_id,
        "routing": route_res.to_dict(),
        "response": m_resp.model_dump(),
        "is_simulation": True,
        "simulation_disclaimer": "Prototype Simulation: Performance and cluster telemetry simulated for academic prototype evaluation."
    }

@app.get("/api/models")
def get_models():
    """Returns candidate model specifications, availability status, and current live load."""
    cluster_state = simulator.get_cluster_state(registry)
    all_adapters = registry.get_all()

    models_data = []
    for tier, adapter in all_adapters.items():
        telemetry = cluster_state.models.get(tier)
        specs = adapter.specs
        models_data.append({
            "tier": tier,
            "name": specs.name,
            "family": specs.family,
            "context_window": specs.context_window,
            "cost_per_1k_input": specs.cost_per_1k_input,
            "cost_per_1k_output": specs.cost_per_1k_output,
            "base_latency_s": specs.base_latency_s,
            "quality_profile": specs.quality_profile,
            "concurrency_limit": specs.concurrency_limit,
            "is_online": adapter.is_online,
            "is_simulated": specs.is_simulated,
            "current_utilization_pct": telemetry.utilization_pct if telemetry else 0.0,
            "current_queue": telemetry.queue_length if telemetry else 0,
            "current_throughput_rps": telemetry.throughput_rps if telemetry else 0.0,
            "simulated_latency_s": telemetry.simulated_latency_s if telemetry else specs.base_latency_s,
            "status_label": telemetry.status_label if telemetry else "Unknown"
        })

    return {
        "models": models_data,
        "workload_mode": cluster_state.mode,
        "total_rps": cluster_state.total_cluster_rps,
        "is_simulation": True
    }

@app.post("/api/models/toggle")
def toggle_model_availability(req: ToggleModelRequest):
    """Manually toggles a model tier online/offline to demonstrate router resilience."""
    success = registry.set_online(req.tier, req.is_online)
    if not success:
        raise HTTPException(status_code=404, detail=f"Model tier '{req.tier}' not found.")
    return {"tier": req.tier, "is_online": req.is_online}

@app.get("/api/system-state")
def get_system_state():
    """Returns current cluster workload, simulated queue lengths, and cluster throughput."""
    state = simulator.get_cluster_state(registry)
    return state.model_dump()

@app.post("/api/system-state/workload")
def set_workload_mode(req: SetWorkloadRequest):
    """Sets the cluster simulation workload mode (Low, Medium, High, Bursty)."""
    simulator.set_mode(req.mode)
    return {"mode": simulator.current_mode}

@app.get("/api/requests")
def get_requests(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    model: Optional[str] = None,
    sla: Optional[str] = None,
    category: Optional[str] = None,
    strategy: Optional[str] = None
):
    """Returns searchable/filterable telemetry logs."""
    return TelemetryService.get_requests(
        limit=limit,
        offset=offset,
        model_filter=model,
        sla_filter=sla,
        category_filter=category,
        strategy_filter=strategy
    )

@app.get("/api/requests/{request_id}")
def get_request_detail(request_id: str):
    """Returns comprehensive trace and candidate evaluations for a specific request."""
    detail = TelemetryService.get_request_detail(request_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Request not found.")
    return detail

@app.get("/api/live-monitor")
def get_live_monitor_metrics():
    """Returns real-time KPIs and chart data for the Live Monitor dashboard."""
    metrics = TelemetryService.get_live_metrics()
    cluster = simulator.get_cluster_state(registry)
    metrics["current_workload"] = cluster.model_dump()
    return metrics

@app.get("/api/analytics")
def get_analytics():
    """Returns aggregated research analytics (Cost vs Quality, SLA violation rate by strategy, etc.)."""
    return TelemetryService.get_analytics_data()

@app.get("/api/policy")
def get_policy():
    """Returns active routing policy weights and available presets."""
    return {
        "active_preset": policy_manager.active_preset,
        "weights": policy_manager.active_weights.model_dump(),
        "presets": policy_manager.PRESETS
    }

@app.put("/api/policy")
def update_policy(req: UpdatePolicyRequest):
    """Updates routing policy weights or switches presets."""
    if req.preset and req.preset in policy_manager.PRESETS:
        pw = policy_manager.set_preset(req.preset)
    elif req.weights:
        pw = policy_manager.update_custom_weights(req.weights)
    else:
        raise HTTPException(status_code=400, detail="Must provide preset or weights dictionary.")

    return {
        "active_preset": policy_manager.active_preset,
        "weights": pw.model_dump()
    }

@app.post("/api/experiments")
def run_experiment(req: ExperimentRequest):
    """Executes synthetic benchmark experiment for specified strategy and workload."""
    result = ExperimentRunner.run_experiment(
        name=req.name or f"Bench-{req.strategy}-{req.workload[:4]}",
        strategy=req.strategy,
        workload=req.workload,
        request_count=req.request_count,
        custom_weights=req.custom_weights
    )
    return result

@app.post("/api/experiments/baselines")
def run_baseline_benchmark(req: BaselinesExperimentRequest):
    """Executes all 5 baseline strategies against identical workload batch."""
    results = ExperimentRunner.run_all_baselines(
        workload=req.workload,
        request_count=req.request_count
    )
    return results

@app.get("/api/experiments")
def list_experiments():
    """Lists all stored experiment runs for historical and comparative evaluation."""
    return ExperimentRunner.get_experiments()

# Mount frontend production build if available
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")
