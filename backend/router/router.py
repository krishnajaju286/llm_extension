"""
Adaptive LLM Router - Core Routing Engine
Implements adaptive routing, baseline comparison strategies, telemetry tracking,
and step-by-step decision traces.
"""
import time
import random
from typing import Dict, Any, List, Optional
from backend.features.extractor import FeatureExtractor, RequestFeatures
from backend.models.adapters import registry, ModelAdapter
from backend.models.simulator import simulator, WorkloadState
from backend.router.policies import policy_manager, PolicyWeights
from backend.router.scoring import ScoringEngine, ModelCandidateScore

class RoutingResult:
    def __init__(
        self,
        selected_tier: str,
        selected_model_name: str,
        routing_strategy: str,
        router_score: float,
        router_overhead_ms: float,
        explanation: str,
        candidate_evaluations: List[Dict[str, Any]],
        decision_trace: Dict[str, Any],
        features: RequestFeatures,
        telemetry_snapshot: Dict[str, Any]
    ):
        self.selected_tier = selected_tier
        self.selected_model_name = selected_model_name
        self.routing_strategy = routing_strategy
        self.router_score = router_score
        self.router_overhead_ms = router_overhead_ms
        self.explanation = explanation
        self.candidate_evaluations = candidate_evaluations
        self.decision_trace = decision_trace
        self.features = features
        self.telemetry_snapshot = telemetry_snapshot

    def to_dict(self) -> Dict[str, Any]:
        return {
            "selected_model": self.selected_tier,
            "selected_model_name": self.selected_model_name,
            "routing_strategy": self.routing_strategy,
            "router_score": round(self.router_score, 3),
            "router_overhead_ms": round(self.router_overhead_ms, 2),
            "explanation": self.explanation,
            "candidate_evaluations": self.candidate_evaluations,
            "decision_trace": self.decision_trace,
            "features": self.features.model_dump(),
            "telemetry_snapshot": self.telemetry_snapshot
        }

class AdaptiveRouter:
    """Main routing controller orchestrating feature extraction, workload state, and multi-objective scoring."""

    @classmethod
    def route(
        cls,
        prompt: str,
        sla_profile: str = "Balanced",
        priority: str = "Medium",
        max_latency_ms: Optional[float] = None,
        max_cost: Optional[float] = None,
        strategy: str = "Workload-Aware",
        custom_weights: Optional[Dict[str, float]] = None
    ) -> RoutingResult:
        start_time = time.perf_counter()

        # Step 1: Feature Extraction
        features = FeatureExtractor.extract_features(
            prompt=prompt,
            sla_profile=sla_profile,
            priority=priority,
            max_latency_ms=max_latency_ms,
            max_cost=max_cost
        )

        # Step 2: System & Workload Telemetry Snapshot
        cluster_state = simulator.get_cluster_state(registry)
        telemetry_snapshot = {
            "mode": cluster_state.mode,
            "total_rps": cluster_state.total_cluster_rps,
            "tiers": {k: v.model_dump() for k, v in cluster_state.models.items()}
        }

        # Step 3: Policy Weights
        if custom_weights:
            weights = PolicyWeights(**custom_weights).normalized()
        else:
            weights = policy_manager.get_weights_for_sla(sla_profile)

        # Step 4: Model Evaluation
        candidates: List[ModelCandidateScore] = []
        all_adapters = registry.get_all()

        for tier in ["Small", "Medium", "Large"]:
            adapter = all_adapters[tier]
            t_data = cluster_state.models[tier]
            score_obj = ScoringEngine.evaluate_model(
                tier=tier,
                adapter=adapter,
                telemetry=t_data,
                features=features,
                weights=weights,
                routing_strategy=strategy
            )
            candidates.append(score_obj)

        # Filter available (online) models
        available_candidates = [c for c in candidates if c.is_available]

        # Step 5: Selection Strategy Execution
        if not available_candidates:
            # All models offline fallback
            selected_candidate = candidates[0]
            selected_tier = "None"
        elif strategy == "Always-Small":
            small_match = next((c for c in available_candidates if c.tier == "Small"), available_candidates[0])
            selected_candidate = small_match
            selected_tier = small_match.tier
        elif strategy == "Always-Large":
            large_match = next((c for c in available_candidates if c.tier == "Large"), available_candidates[0])
            selected_candidate = large_match
            selected_tier = large_match.tier
        elif strategy == "Random":
            selected_candidate = random.choice(available_candidates)
            selected_tier = selected_candidate.tier
        elif strategy == "Query-Aware":
            # Scored ignoring workload
            selected_candidate = max(available_candidates, key=lambda c: c.router_score)
            selected_tier = selected_candidate.tier
        else:  # "Workload-Aware" (Proposed)
            selected_candidate = max(available_candidates, key=lambda c: c.router_score)
            selected_tier = selected_candidate.tier

        # Step 6: Generate Deterministic Explanation
        explanation = ScoringEngine.generate_explanation(
            winner=selected_candidate,
            candidates=candidates,
            features=features,
            strategy=strategy
        )

        overhead_ms = (time.perf_counter() - start_time) * 1000.0

        # Build visual decision trace
        candidate_eval_dicts = [c.to_dict() for c in candidates]
        decision_trace = {
            "step1_request": {
                "prompt_tokens": features.estimated_tokens,
                "priority": features.priority,
                "sla_profile": sla_profile,
                "max_latency_ms": features.latency_requirement_ms,
                "max_cost": features.cost_constraint_usd
            },
            "step2_features": {
                "category": features.task_category,
                "complexity": features.complexity_score,
                "quality_requirement": features.quality_requirement
            },
            "step3_infrastructure": {
                "workload_mode": cluster_state.mode,
                "cluster_load": {
                    k: f"{v['utilization_pct']}% (queue: {v['queue_length']})"
                    for k, v in telemetry_snapshot["tiers"].items()
                }
            },
            "step4_evaluation": [
                {
                    "tier": c["tier"],
                    "quality": c["predicted_quality"],
                    "latency": f"{c['predicted_latency_s']}s",
                    "cost": f"${c['estimated_cost']:.5f}",
                    "load": f"{c['current_load_pct']}%",
                    "sla": c["sla_status"],
                    "score": c["router_score"]
                }
                for c in candidate_eval_dicts
            ],
            "step5_selection": {
                "selected_model": selected_tier,
                "selected_score": selected_candidate.router_score,
                "strategy": strategy,
                "overhead_ms": round(overhead_ms, 2)
            },
            "step6_sla_status": selected_candidate.sla_status
        }

        return RoutingResult(
            selected_tier=selected_tier,
            selected_model_name=selected_candidate.model_name,
            routing_strategy=strategy,
            router_score=selected_candidate.router_score,
            router_overhead_ms=overhead_ms,
            explanation=explanation,
            candidate_evaluations=candidate_eval_dicts,
            decision_trace=decision_trace,
            features=features,
            telemetry_snapshot=telemetry_snapshot
        )
