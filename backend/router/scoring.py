"""
Adaptive LLM Router - Multi-Objective Scoring & Explanation Engine
Implements the core utility function:
Score(model) = w_q * Q - w_c * C_norm - w_lat * Lat_norm - w_workload * P_workload - w_sla * P_sla
"""
from typing import Dict, Any, List, Tuple, Optional
from backend.router.policies import PolicyWeights
from backend.models.adapters import ModelAdapter
from backend.models.simulator import ModelTelemetry
from backend.features.extractor import RequestFeatures

MAX_REF_COST = 0.015  # Benchmark reference cost for 1k tokens on large frontier model
MAX_REF_LATENCY_S = 4.0

class ModelCandidateScore:
    def __init__(
        self,
        model_name: str,
        tier: str,
        predicted_quality: float,
        predicted_latency_s: float,
        estimated_cost: float,
        current_load_pct: float,
        queue_length: int,
        sla_status: str,
        router_score: float,
        quality_component: float,
        cost_penalty: float,
        latency_penalty: float,
        workload_penalty: float,
        sla_penalty: float,
        is_available: bool,
        rejection_reasons: List[str]
    ):
        self.model_name = model_name
        self.tier = tier
        self.predicted_quality = predicted_quality
        self.predicted_latency_s = predicted_latency_s
        self.estimated_cost = estimated_cost
        self.current_load_pct = current_load_pct
        self.queue_length = queue_length
        self.sla_status = sla_status
        self.router_score = router_score
        self.quality_component = quality_component
        self.cost_penalty = cost_penalty
        self.latency_penalty = latency_penalty
        self.workload_penalty = workload_penalty
        self.sla_penalty = sla_penalty
        self.is_available = is_available
        self.rejection_reasons = rejection_reasons

    def to_dict(self) -> Dict[str, Any]:
        return {
            "model": self.model_name,
            "tier": self.tier,
            "predicted_quality": round(self.predicted_quality, 3),
            "predicted_latency_s": round(self.predicted_latency_s, 3),
            "estimated_cost": round(self.estimated_cost, 6),
            "current_load_pct": round(self.current_load_pct, 1),
            "queue_length": self.queue_length,
            "sla_status": self.sla_status,
            "router_score": round(self.router_score, 3),
            "quality_component": round(self.quality_component, 3),
            "cost_penalty": round(self.cost_penalty, 3),
            "latency_penalty": round(self.latency_penalty, 3),
            "workload_penalty": round(self.workload_penalty, 3),
            "sla_penalty": round(self.sla_penalty, 3),
            "is_available": self.is_available,
            "rejection_reasons": self.rejection_reasons
        }

class ScoringEngine:
    """Evaluates candidate models against query requirements and cluster telemetry."""

    @classmethod
    def evaluate_model(
        cls,
        tier: str,
        adapter: ModelAdapter,
        telemetry: ModelTelemetry,
        features: RequestFeatures,
        weights: PolicyWeights,
        routing_strategy: str = "Workload-Aware"
    ) -> ModelCandidateScore:
        rejection_reasons = []

        # 1. Availability check
        if not adapter.is_online or not telemetry.is_online:
            return ModelCandidateScore(
                model_name=adapter.specs.name,
                tier=tier,
                predicted_quality=0.0,
                predicted_latency_s=0.0,
                estimated_cost=0.0,
                current_load_pct=0.0,
                queue_length=0,
                sla_status="Fail",
                router_score=-999.0,
                quality_component=0.0,
                cost_penalty=0.0,
                latency_penalty=0.0,
                workload_penalty=1.0,
                sla_penalty=1.0,
                is_available=False,
                rejection_reasons=["Model tier is currently marked OFFLINE by administrator."]
            )

        # 2. Quality estimation
        pred_quality = adapter.predict_quality(features.task_category, features.complexity_score)

        # 3. Latency & Congestion
        # Under Query-Aware routing, workload is ignored (treated as nominal zero queue, low base load)
        if routing_strategy == "Query-Aware":
            effective_load = 20.0
            effective_queue = 0
        else:
            effective_load = telemetry.utilization_pct
            effective_queue = telemetry.queue_length

        pred_latency = adapter.predict_latency(
            prompt_tokens=features.estimated_tokens,
            current_load_pct=effective_load,
            queue_length=effective_queue
        )

        # 4. Cost estimation
        est_tokens_out = max(40, round(features.estimated_tokens * 0.7))
        est_cost = adapter.estimate_cost(features.estimated_tokens, est_tokens_out)

        # 5. Normalizations
        norm_cost = min(1.0, max(0.01, est_cost / MAX_REF_COST))
        norm_latency = min(1.0, max(0.05, pred_latency / MAX_REF_LATENCY_S))

        # 6. Workload penalty
        if routing_strategy == "Query-Aware":
            workload_penalty = 0.0
        else:
            util_factor = (effective_load / 100.0) ** 1.8
            q_factor = min(1.0, effective_queue / 20.0)
            workload_penalty = (0.6 * util_factor) + (0.4 * q_factor)
            if effective_load > 85.0:
                workload_penalty += 0.25
                rejection_reasons.append(f"High infrastructure load ({effective_load:.1f}%) and queue depth ({effective_queue})")

        # 7. SLA penalty calculation
        sla_penalty = 0.0
        sla_fail = False

        # Quality constraint check
        if pred_quality < (features.quality_requirement - 0.05):
            defect = features.quality_requirement - pred_quality
            sla_penalty += defect * 2.0
            sla_fail = True
            rejection_reasons.append(f"Predicted quality ({pred_quality:.2f}) falls below target SLA ({features.quality_requirement:.2f})")

        # Latency constraint check
        if features.latency_requirement_ms is not None:
            max_lat_s = features.latency_requirement_ms / 1000.0
            if pred_latency > max_lat_s:
                excess = (pred_latency - max_lat_s) / max_lat_s
                sla_penalty += min(2.0, 0.4 + excess * 1.5)
                sla_fail = True
                rejection_reasons.append(f"Predicted latency ({pred_latency:.2f}s) violates maximum latency target ({max_lat_s:.2f}s)")

        # Cost constraint check
        if features.cost_constraint_usd is not None and features.cost_constraint_usd > 0:
            if est_cost > features.cost_constraint_usd:
                excess_cost = (est_cost - features.cost_constraint_usd) / features.cost_constraint_usd
                sla_penalty += min(2.0, 0.5 + excess_cost * 2.0)
                sla_fail = True
                rejection_reasons.append(f"Estimated cost (${est_cost:.5f}) exceeds budget cap (${features.cost_constraint_usd:.5f})")

        sla_status = "Fail" if sla_fail else "Pass"

        # 8. Compute final utility score
        # Score(model) = w_q * Q - w_c * C - w_lat * Lat - w_workload * P_workload - w_sla * P_sla
        quality_component = weights.w_quality * pred_quality
        cost_penalty_val = weights.w_cost * norm_cost
        latency_penalty_val = weights.w_latency * norm_latency
        workload_penalty_val = weights.w_workload * workload_penalty
        sla_penalty_val = weights.w_sla * sla_penalty

        final_score = (
            quality_component
            - cost_penalty_val
            - latency_penalty_val
            - workload_penalty_val
            - sla_penalty_val
        )

        return ModelCandidateScore(
            model_name=adapter.specs.name,
            tier=tier,
            predicted_quality=pred_quality,
            predicted_latency_s=pred_latency,
            estimated_cost=est_cost,
            current_load_pct=effective_load,
            queue_length=effective_queue,
            sla_status=sla_status,
            router_score=final_score,
            quality_component=quality_component,
            cost_penalty=cost_penalty_val,
            latency_penalty=latency_penalty_val,
            workload_penalty=workload_penalty_val,
            sla_penalty=sla_penalty_val,
            is_available=True,
            rejection_reasons=rejection_reasons
        )

    @classmethod
    def generate_explanation(
        cls,
        winner: ModelCandidateScore,
        candidates: List[ModelCandidateScore],
        features: RequestFeatures,
        strategy: str
    ) -> str:
        """Generates deterministic, mathematically grounded explanation for research review."""
        if winner.router_score < -900:
            return "No candidate models were available to service this request. All models are currently offline."

        tier = winner.tier
        task = features.task_category
        complexity = features.complexity_score
        sla_stat = winner.sla_status

        # Identify key rejected competitors
        others = [c for c in candidates if c.tier != tier and c.is_available]
        competitor_notes = []

        for c in others:
            if c.tier == "Large":
                if c.sla_status == "Fail" or c.current_load_pct > 80.0:
                    competitor_notes.append(
                        f"Large Model was penalized due to heavy cluster congestion ({c.current_load_pct:.0f}% utilization, {c.queue_length} queued) "
                        f"and higher inference cost (${c.estimated_cost:.4f})"
                    )
                else:
                    competitor_notes.append(
                        f"Large Model offered marginal quality gain (+{c.predicted_quality - winner.predicted_quality:.2f}) "
                        f"that did not justify the {c.estimated_cost / max(0.0001, winner.estimated_cost):.1f}x cost multiplier"
                    )
            elif c.tier == "Small":
                if c.predicted_quality < features.quality_requirement:
                    competitor_notes.append(
                        f"Small Model was eliminated due to quality deficiency ({c.predicted_quality:.2f} predicted vs {features.quality_requirement:.2f} required for {task})"
                    )
                else:
                    competitor_notes.append(
                        f"Small Model scored lower in overall multi-objective utility ({c.router_score:.2f} vs {winner.router_score:.2f})"
                    )
            elif c.tier == "Medium":
                competitor_notes.append(
                    f"Medium Model ranked second with utility score {c.router_score:.2f}"
                )

        reasons_str = ". ".join(competitor_notes)

        if tier == "Medium":
            narrative = (
                f"Medium Model was selected (Router Score: {winner.router_score:.2f}) because it represents the Pareto-optimal compromise "
                f"for this {task} request (complexity {complexity:.2f}). It delivers high predicted quality ({winner.predicted_quality:.2f}) "
                f"while sustaining an acceptable latency profile ({winner.predicted_latency_s:.2f}s) under current infrastructure conditions. "
                f"{reasons_str}."
            )
        elif tier == "Large":
            narrative = (
                f"Large Model was selected (Router Score: {winner.router_score:.2f}) because this high-complexity {task} query "
                f"(score {complexity:.2f}) demands top-tier reasoning capability ({winner.predicted_quality:.2f}). "
                f"Infrastructure utilization ({winner.current_load_pct:.0f}%) and queue latency were within acceptable bounds for the active SLA. "
                f"{reasons_str}."
            )
        else:  # Small
            narrative = (
                f"Small Model was selected (Router Score: {winner.router_score:.2f}) to minimize latency ({winner.predicted_latency_s:.2f}s) "
                f"and operational cost (${winner.estimated_cost:.5f}). The query complexity ({complexity:.2f}) falls within the model's "
                f"capability threshold, satisfying the SLA with zero unnecessary overhead. "
                f"{reasons_str}."
            )

        if strategy != "Workload-Aware":
            narrative += f" [Note: Evaluated under baseline strategy '{strategy}'.]"

        return narrative
