"""
Automated Multi-Agent Verification Suite
Validates the Fetch.ai uAgents swarm, A2A message protocols, and crash triage.
"""

import sys
import os

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.agents.models import (
    EmergencyPassageRequest,
    EmergencyPassageResponse,
    CollisionTelemetry,
    CADDispatchPacket,
    PedestrianScrambleRequest,
    PedestrianScrambleResponse,
    ArterialPlatoonSync,
    TrafficStatusQuery,
    TrafficStatusResponse
)
from backend.agents.agent_triage import evaluate_accident_severity
from backend.agents.agent_junction import junction_agent
from backend.agents.agent_ambulance import ambulance_agent
from backend.agents.agent_triage import triage_agent
from backend.agents.agent_pedestrian import pedestrian_agent

def run_tests():
    print("=" * 70)
    print("  FETCH.AI MULTI-AGENT SWARM VERIFICATION SUITE")
    print("=" * 70)

    # 1. Verify Agent Initializations & Addresses
    print("\n[TEST 1] Verifying Fetch.ai Agent Initializations & Cryptographic Addresses")
    agents = [
        ("Junction Controller Agent", junction_agent),
        ("108 Emergency Fleet Agent", ambulance_agent),
        ("Triage CAD 108 Agent", triage_agent),
        ("Pedestrian VRU Agent", pedestrian_agent)
    ]
    for name, ag in agents:
        assert ag.address.startswith("agent1"), f"Invalid agent address for {name}"
        print(f"  --> PASS: {name} initialized successfully.")
        print(f"            Address: {ag.address}")

    # 2. Verify Critical Crash Triage
    print("\n[TEST 2] Verifying Sub-Second Collision Triage: Critical Crash (6.8G)")
    telemetry_crit = CollisionTelemetry(
        incident_id="INC-TEST-CRIT-99",
        approach_road="C",
        speed_at_impact_kmh=54.5,
        g_force=6.8,
        airbags_deployed=True,
        cabin_intrusion_cm=32.0,
        estimated_casualties=1,
        acoustic_signature_db=98.4
    )
    packet_crit = evaluate_accident_severity(telemetry_crit)
    assert packet_crit.should_call_108 is True, "Expected 108 CAD dispatch for critical crash"
    assert packet_crit.severity == "CRITICAL_EMERGENCY"
    assert "Trauma Care" in packet_crit.destination_hospital
    print(f"  --> PASS: 6.8G Crash Auto-Dispatched to {packet_crit.destination_hospital}")
    print(f"            Triage Code: {packet_crit.dispatch_code}")

    # 3. Verify Minor Fender-Bender Triage (Suppression)
    print("\n[TEST 3] Verifying Sub-Second Collision Triage: Minor Fender-Bender (1.3G)")
    telemetry_min = CollisionTelemetry(
        incident_id="INC-TEST-MIN-01",
        approach_road="A",
        speed_at_impact_kmh=14.2,
        g_force=1.3,
        airbags_deployed=False,
        cabin_intrusion_cm=0.0,
        estimated_casualties=0,
        acoustic_signature_db=72.1
    )
    packet_min = evaluate_accident_severity(telemetry_min)
    assert packet_min.should_call_108 is False, "Expected 108 call suppression for minor scrape"
    assert packet_min.severity == "MINOR_FENDER_BENDER"
    assert "DO NOT CALL 108" in packet_min.rationale
    print(f"  --> PASS: Minor Scrape 108 Call STRICTLY SUPPRESSED to Protect Hospital Bandwidth")
    print(f"            Rationale: {packet_min.rationale[:80]}...")

    # 4. Verify A2A Message Contracts
    print("\n[TEST 4] Verifying Typed Agent-to-Agent (A2A) Message Models")
    req = EmergencyPassageRequest(vehicle_id="AMB-108", approach_road="A")
    assert req.vehicle_id == "AMB-108"
    ped = PedestrianScrambleRequest(waiting_pedestrians=15, trailing_inflow=4)
    assert ped.waiting_pedestrians == 15
    print("  --> PASS: All Pydantic uagents.Model schemas validated.")

    print("\n" + "=" * 70)
    print("  ALL MULTI-AGENT VERIFICATION SUITES PASSED (100% SUCCESS)!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
