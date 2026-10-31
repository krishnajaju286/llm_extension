"""
Adaptive LLM Router - Workload Simulator
Simulates cluster telemetry (utilization, queue depth, throughput, latency degradation)
under Low, Medium, High, and Bursty workload profiles.
"""
import time
import math
import random
from typing import Dict, Any, Tuple
from pydantic import BaseModel

class ModelTelemetry(BaseModel):
    tier: str
    utilization_pct: float
    queue_length: int
    throughput_rps: float
    simulated_latency_s: float
    is_online: bool
    status_label: str  # e.g., "Optimal", "Moderate Load", "Heavy Congestion"

class WorkloadState(BaseModel):
    mode: str  # "Low Load", "Medium Load", "High Load", "Bursty Load"
    timestamp: float
    models: Dict[str, ModelTelemetry]
    total_cluster_rps: float
    is_simulation: bool = True
    notice: str = "Prototype Simulation Layer: Cluster telemetry simulated for academic evaluation."

class WorkloadSimulator:
    """
    Simulates cluster-level telemetry across candidate model tiers.
    Provides deterministic and semi-dynamic profiles to test workload-aware routing.
    """

    def __init__(self):
        self.current_mode: str = "Medium Load"
        self.last_updated = time.time()
        self.override_loads: Dict[str, Dict[str, Any]] = {}
        self.auto_cycle = False

    def set_mode(self, mode: str):
        valid_modes = ["Low Load", "Medium Load", "High Load", "Bursty Load"]
        if mode in valid_modes:
            self.current_mode = mode
            self.last_updated = time.time()

    def get_cluster_state(self, model_registry) -> WorkloadState:
        now = time.time()
        all_adapters = model_registry.get_all()
        telemetry: Dict[str, ModelTelemetry] = {}
        
        mode = self.current_mode
        # If bursty, determine whether we are in a burst peak (every 20s cycle)
        burst_multiplier = 1.0
        if mode == "Bursty Load":
            phase = math.sin((now % 30) / 30.0 * 2 * math.pi)
            # High burst in positive half, moderate in negative
            burst_multiplier = 1.0 + (0.45 * max(0.0, phase))

        for tier, adapter in all_adapters.items():
            is_online = adapter.is_online
            
            if not is_online:
                telemetry[tier] = ModelTelemetry(
                    tier=tier,
                    utilization_pct=0.0,
                    queue_length=0,
                    throughput_rps=0.0,
                    simulated_latency_s=0.0,
                    is_online=False,
                    status_label="Offline (Excluded from Routing)"
                )
                continue

            # Deterministic base profiles by workload mode
            if mode == "Low Load":
                if tier == "Small":
                    util = 22.0
                    q = 0
                    rps = 14.5
                elif tier == "Medium":
                    util = 34.0
                    q = 1
                    rps = 8.2
                else:  # Large
                    util = 42.0
                    q = 1
                    rps = 4.1
            elif mode == "Medium Load":
                if tier == "Small":
                    util = 44.0
                    q = 2
                    rps = 32.0
                elif tier == "Medium":
                    util = 58.0
                    q = 4
                    rps = 18.5
                else:  # Large
                    util = 68.0
                    q = 5
                    rps = 8.5
            elif mode == "High Load":
                if tier == "Small":
                    util = 62.0
                    q = 4
                    rps = 48.0
                elif tier == "Medium":
                    util = 74.0
                    q = 8
                    rps = 24.0
                else:  # Large: severely congested!
                    util = 89.0
                    q = 18
                    rps = 11.0
            else:  # Bursty Load
                if tier == "Small":
                    util = min(92.0, 50.0 * burst_multiplier)
                    q = int(3 * burst_multiplier)
                    rps = 35.0 * burst_multiplier
                elif tier == "Medium":
                    util = min(94.0, 65.0 * burst_multiplier)
                    q = int(7 * burst_multiplier)
                    rps = 20.0 * burst_multiplier
                else:  # Large
                    util = min(98.0, 75.0 * burst_multiplier)
                    q = int(16 * burst_multiplier)
                    rps = 9.0 * burst_multiplier

            # Minor jitter for realism (within +/- 2%)
            jitter = math.sin(now + hash(tier) % 10) * 1.5
            util = round(max(5.0, min(99.0, util + jitter)), 1)
            
            # Predict latency based on utilization & queue
            sim_lat = adapter.predict_latency(prompt_tokens=250, current_load_pct=util, queue_length=q)

            if util < 50.0:
                label = "Nominal Load"
            elif util < 80.0:
                label = "Moderate Congestion"
            else:
                label = "High Contention / Saturated"

            telemetry[tier] = ModelTelemetry(
                tier=tier,
                utilization_pct=util,
                queue_length=q,
                throughput_rps=round(rps, 1),
                simulated_latency_s=sim_lat,
                is_online=is_online,
                status_label=label
            )

        total_rps = sum(t.throughput_rps for t in telemetry.values() if t.is_online)

        return WorkloadState(
            mode=mode,
            timestamp=now,
            models=telemetry,
            total_cluster_rps=round(total_rps, 1)
        )

# Global simulator instance
simulator = WorkloadSimulator()
