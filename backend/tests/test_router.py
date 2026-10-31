"""
Adaptive LLM Router - Unit & Integration Test Suite
Validates feature extraction, model availability toggling, multi-objective score calculations,
SLA constraints, policy weight changes, workload-aware model switching, and experiment aggregation.
"""
import pytest
from backend.database.db import init_db
from backend.features.extractor import FeatureExtractor
from backend.models.adapters import registry
from backend.models.simulator import simulator
from backend.router.policies import policy_manager, PolicyWeights
from backend.router.scoring import ScoringEngine
from backend.router.router import AdaptiveRouter
from backend.experiments.runner import ExperimentRunner

@pytest.fixture(autouse=True)
def setup_test_db():
    init_db()

def test_feature_extraction():
    # Test coding detection and complexity
    code_prompt = """
    ```python
    def calculate_metrics(data: list) -> dict:
        total = sum(data)
        return {"avg": total / len(data)}
    ```
    Please debug this function and ensure it handles empty input lists without throwing ZeroDivisionError.
    """
    feat = FeatureExtractor.extract_features(code_prompt, sla_profile="Balanced")
    assert feat.task_category == "Coding"
    assert feat.complexity_score > 0.40
    assert feat.estimated_tokens > 10

    # Test reasoning detection
    reasoning_prompt = "Prove step by step why every continuous function on a closed interval [a, b] is bounded. Use the Heine-Borel theorem."
    feat_reasoning = FeatureExtractor.extract_features(reasoning_prompt, sla_profile="Quality First")
    assert feat_reasoning.task_category == "Reasoning"
    assert feat_reasoning.complexity_score > 0.50

    # Test summarization
    summary_prompt = "Summarize this quarterly earnings announcement in 2 bullet points."
    feat_summary = FeatureExtractor.extract_features(summary_prompt, sla_profile="Cost Optimized")
    assert feat_summary.task_category == "Summarization"

def test_model_availability_toggle():
    # Toggle Medium model offline
    registry.set_online("Medium", False)
    assert not registry.get_adapter("Medium").is_online

    # Route request under condition where Medium might otherwise be considered
    res = AdaptiveRouter.route("General QA prompt for testing availability", strategy="Workload-Aware")
    assert res.selected_tier != "Medium", "Offline model must never be selected by the router"

    # Restore online status
    registry.set_online("Medium", True)
    assert registry.get_adapter("Medium").is_online

def test_multi_objective_scoring_and_weights():
    weights = PolicyWeights(w_quality=0.8, w_cost=0.05, w_latency=0.05, w_workload=0.05, w_sla=0.05).normalized()
    assert abs(weights.w_quality + weights.w_cost + weights.w_latency + weights.w_workload + weights.w_sla - 1.0) < 0.01

    policy_manager.set_preset("Quality First")
    assert policy_manager.active_preset == "Quality First"
    assert policy_manager.active_weights.w_quality >= 0.50

    policy_manager.set_preset("Balanced")
    assert policy_manager.active_preset == "Balanced"

def test_sla_constraint_handling():
    # Strict latency limit of 400ms: Large model (latency > 2.0s) should fail SLA
    prompt = "Simple question about Python syntax."
    res = AdaptiveRouter.route(
        prompt=prompt,
        sla_profile="Low Latency",
        max_latency_ms=400.0,
        strategy="Workload-Aware"
    )
    # The winner should be Small (lowest latency)
    assert res.selected_tier == "Small"

    # Check candidate evaluation for Large has SLA status Fail or heavy penalty
    large_eval = next((c for c in res.candidate_evaluations if c["tier"] == "Large"), None)
    assert large_eval is not None
    assert large_eval["sla_status"] == "Fail" or large_eval["sla_penalty"] > 0

def test_workload_aware_model_switching():
    """
    CRITICAL RESEARCH HYPOTHESIS TEST:
    Given an identical complex query:
    1. Under Low Load (Large Model has low utilization and short queue), Large Model should be selected.
    2. Under High Load (Large Model heavily congested with strict SLA), Medium Model should be selected.
    This proves runtime workload state directly and adaptively affects model routing!
    """
    complex_prompt = (
        "Solve this advanced algorithmic problem: Design an optimal data structure for real-time "
        "spatial point query clustering under high-velocity streaming constraints. Provide formal "
        "asymptotic bounds and step-by-step logic."
    )

    # 1. Condition A: Low Load
    simulator.set_mode("Low Load")
    res_low = AdaptiveRouter.route(
        prompt=complex_prompt,
        sla_profile="Balanced",
        strategy="Workload-Aware"
    )
    # Under low load, Large has minimal queue and provides maximum quality
    assert res_low.selected_tier == "Large", f"Expected Large under Low Load, got {res_low.selected_tier}"

    # 2. Condition B: High Load with strict/balanced latency requirement
    simulator.set_mode("High Load")
    res_high = AdaptiveRouter.route(
        prompt=complex_prompt,
        sla_profile="Balanced",
        max_latency_ms=2500.0,  # 2.5s maximum acceptable latency
        strategy="Workload-Aware"
    )
    # Under high load, Large Model is heavily congested (queue 18+, load 89%),
    # causing its latency to balloon (> 3.5s) and incur heavy queue & SLA penalties.
    # Medium Model should take over to preserve the SLA!
    assert res_high.selected_tier == "Medium", (
        f"Expected Medium to take over under High Load due to congestion, got {res_high.selected_tier}"
    )

def test_query_aware_vs_workload_aware():
    """
    Tests that Query-Aware routing fails to adapt to high load because it ignores cluster telemetry,
    whereas Workload-Aware routing successfully adapts.
    """
    complex_prompt = "Perform deep mathematical theorem proving with multiple lemma steps."
    simulator.set_mode("High Load")

    # Query-Aware ignores cluster queue and still picks Large
    res_query_aware = AdaptiveRouter.route(
        prompt=complex_prompt,
        sla_profile="Balanced",
        max_latency_ms=2500.0,
        strategy="Query-Aware"
    )
    assert res_query_aware.selected_tier == "Large", "Query-Aware should pick Large because it ignores workload"

    # Workload-Aware detects the 89% load on Large and shifts to Medium
    res_workload_aware = AdaptiveRouter.route(
        prompt=complex_prompt,
        sla_profile="Balanced",
        max_latency_ms=2500.0,
        strategy="Workload-Aware"
    )
    assert res_workload_aware.selected_tier == "Medium", "Workload-Aware should switch to Medium under high contention"

def test_experiment_runner():
    # Run a miniature benchmark of 10 requests
    exp = ExperimentRunner.run_experiment(
        name="Test Experiment",
        strategy="Workload-Aware",
        workload="Low Load",
        request_count=10
    )
    assert exp["request_count"] == 10
    assert exp["mean_quality"] > 0.50
    assert exp["throughput_rps"] > 0.0
    assert "p95_latency_s" in exp
    assert exp["strategy"] == "Workload-Aware"
