"""
Adaptive LLM Router - Routing Policies & Weight Configurations
Defines multi-objective optimization weights, SLA profiles, and presets.
"""
from typing import Dict, Any
from pydantic import BaseModel, Field, model_validator

class PolicyWeights(BaseModel):
    w_quality: float = Field(0.40, ge=0.0, le=1.0, description="Weight for predicted quality")
    w_cost: float = Field(0.20, ge=0.0, le=1.0, description="Weight for cost minimization")
    w_latency: float = Field(0.15, ge=0.0, le=1.0, description="Weight for latency minimization")
    w_workload: float = Field(0.10, ge=0.0, le=1.0, description="Weight for workload/queue avoidance")
    w_sla: float = Field(0.15, ge=0.0, le=1.0, description="Weight for SLA compliance guarantee")

    def normalized(self) -> "PolicyWeights":
        total = self.w_quality + self.w_cost + self.w_latency + self.w_workload + self.w_sla
        if total <= 0:
            return PolicyWeights()
        return PolicyWeights(
            w_quality=round(self.w_quality / total, 3),
            w_cost=round(self.w_cost / total, 3),
            w_latency=round(self.w_latency / total, 3),
            w_workload=round(self.w_workload / total, 3),
            w_sla=round(self.w_sla / total, 3)
        )

class PolicyManager:
    """Manages active routing policy and presets."""

    PRESETS: Dict[str, Dict[str, float]] = {
        "Balanced": {
            "w_quality": 0.40,
            "w_cost": 0.20,
            "w_latency": 0.15,
            "w_workload": 0.10,
            "w_sla": 0.15,
        },
        "Quality First": {
            "w_quality": 0.60,
            "w_cost": 0.10,
            "w_latency": 0.10,
            "w_workload": 0.05,
            "w_sla": 0.15,
        },
        "Cost Saver": {
            "w_quality": 0.20,
            "w_cost": 0.45,
            "w_latency": 0.15,
            "w_workload": 0.10,
            "w_sla": 0.10,
        },
        "Low Latency": {
            "w_quality": 0.20,
            "w_cost": 0.10,
            "w_latency": 0.45,
            "w_workload": 0.15,
            "w_sla": 0.10,
        },
        "SLA Critical": {
            "w_quality": 0.20,
            "w_cost": 0.05,
            "w_latency": 0.20,
            "w_workload": 0.15,
            "w_sla": 0.40,
        },
    }

    def __init__(self):
        self.active_preset: str = "Balanced"
        self.active_weights: PolicyWeights = PolicyWeights(**self.PRESETS["Balanced"])

    def set_preset(self, preset_name: str) -> PolicyWeights:
        if preset_name in self.PRESETS:
            self.active_preset = preset_name
            self.active_weights = PolicyWeights(**self.PRESETS[preset_name])
        return self.active_weights

    def update_custom_weights(self, weights: Dict[str, float]) -> PolicyWeights:
        pw = PolicyWeights(**weights).normalized()
        self.active_preset = "Custom"
        self.active_weights = pw
        return self.active_weights

    def get_weights_for_sla(self, sla_profile: str) -> PolicyWeights:
        """Get weights corresponding to a specific SLA profile preset."""
        preset = self.PRESETS.get(sla_profile, self.PRESETS.get(self.active_preset, self.PRESETS["Balanced"]))
        return PolicyWeights(**preset)

# Global policy manager instance
policy_manager = PolicyManager()
