"""
Typed Agent-to-Agent (A2A) Message Models (Fetch.ai uAgents Protocol)
"""

from uagents import Model
from typing import List, Optional, Dict, Any

class EmergencyPassageRequest(Model):
    vehicle_id: str = "AMB-108-METRO"
    vehicle_type: str = "ALS_AMBULANCE"     # "ALS_AMBULANCE" | "FIRE_TENDER"
    approach_road: str = "A"                # "A" (North), "B" (East), "C" (South), "D" (West)
    speed_kmh: float = 62.4
    eta_seconds: float = 6.8
    siren_code: str = "CODE_3_SIREN_OPTICAL"

class EmergencyPassageResponse(Model):
    granted: bool = True
    active_siren_pole: str = "POLE_A"       # "POLE_A" | "POLE_B" | "POLE_C" | "POLE_D"
    cleared_phase: str = "NORTH_SOUTH_GREEN"
    lockdown_roads: List[str] = ["B", "D"]
    acoustic_decibels: float = 115.0
    preemption_status: str = "GREEN_CARPET_WAVE_ACTIVE"

class CollisionTelemetry(Model):
    incident_id: str = "INC-CRASH-2026-01"
    approach_road: str = "C"
    speed_at_impact_kmh: float = 54.5
    g_force: float = 6.8
    airbags_deployed: bool = True
    cabin_intrusion_cm: float = 32.0
    estimated_casualties: int = 2
    acoustic_signature_db: float = 98.4
    gps_lat: float = 11.0245
    gps_lng: float = 76.9982

class CADDispatchPacket(Model):
    cad_id: str
    severity: str                           # "CRITICAL_TRAUMA" | "SUPPRESSED_MINOR"
    should_call_108: bool
    destination_hospital: str
    dispatch_code: str
    rationale: str
    traffic_action: str
    gps_coordinates: Dict[str, Any]

class PedestrianScrambleRequest(Model):
    crosswalk_id: str = "CW_CAMPUS_MAIN"
    waiting_pedestrians: int = 12
    trailing_inflow: int = 6
    school_zone_active: bool = True
    urgency_level: str = "HIGH"

class PedestrianScrambleResponse(Model):
    scramble_granted: bool = True
    hold_delay_seconds: float = 4.0        # Aggregation hold for trailing students
    walk_window_seconds: float = 18.0       # Barnes dance walk duration
    traffic_state: str = "ALL_RED_LOCKDOWN"
    crosswalk_illumination: str = "NEON_GREEN_ACTIVE"

class ArterialPlatoonSync(Model):
    source_node: str = "UPSTREAM_FEEDER"
    target_node: str = "CENTRAL_MAIN"
    platoon_size_vehicles: int = 14
    progression_speed_kmh: float = 50.0
    offset_seconds: float = 18.5
    coordination_mode: str = "COOPERATIVE_GREEN_WAVE"

class TrafficStatusQuery(Model):
    requested_by: str = "ASI_ONE_GATEWAY"
    query_type: str = "FULL_CORRIDOR"

class TrafficStatusResponse(Model):
    corridor_name: str
    ai_algorithm: str
    active_phase: str
    total_vehicles_cleared: int
    avg_wait_time_sec: float
    wait_time_reduction_pct: float
    queue_reduction_pct: float
    fuel_saved_liters: float
    rupees_saved_inr: float
    annual_savings_lakhs: float
    active_emergency: Optional[str] = None
    active_incident: Optional[str] = None

class AgentHeartbeat(Model):
    agent_name: str
    agent_role: str
    timestamp: float
    status: str = "ONLINE"
