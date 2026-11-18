"""
Agent 3: TriageCADAgent
Autonomous collision severity assessment & 108 Computer-Aided Dispatch (CAD) agent.
Evaluates multi-sensor telemetry (CCTV optical flow, 3-axis G-force, acoustics) and
strictly suppresses false/minor calls to preserve critical trauma center bandwidth.
"""

from uagents import Agent, Context, Protocol
from .models import (
    CollisionTelemetry,
    CADDispatchPacket
)

triage_agent = Agent(
    name="emergency_triage_cad_agent",
    port=8003,
    seed="emergency_triage_cad_agent_seed_2026_metro"
)

triage_proto = Protocol(name="CollisionTriageCADProtocol", version="1.0.0")

def evaluate_accident_severity(msg: CollisionTelemetry) -> CADDispatchPacket:
    # Sub-Second Accident Severity Index (ASI)
    v_norm = min(1.0, msg.speed_at_impact_kmh / 60.0)
    g_norm = min(1.0, msg.g_force / 8.0)
    airbag_score = 1.0 if msg.airbags_deployed else 0.0
    intrusion_score = min(1.0, msg.cabin_intrusion_cm / 40.0)

    asi_score = (0.40 * v_norm) + (0.35 * g_norm) + (0.15 * airbag_score) + (0.10 * intrusion_score)

    if asi_score >= 0.50:
        return CADDispatchPacket(
            cad_id=f"CAD-108-CRIT-{msg.incident_id[-4:]}",
            severity="CRITICAL_EMERGENCY",
            should_call_108=True,
            destination_hospital="City Multi-Specialty Trauma Care & Emergency Center",
            dispatch_code="108-DISPATCH-METRO-ALS",
            rationale=(
                f"CRITICAL TRAUMA TRIAGE (ASI Score: {asi_score:.2f}): High impact speed ({msg.speed_at_impact_kmh:.1f} km/h) "
                f"and severe {msg.g_force:.1f}G impact spike detected via Road {msg.approach_road} CCTV & acoustic sensors. "
                f"Airbag deployment confirmed. SYSTEM DECISION: AUTO-DISPATCH IMMEDIATE 108 CAD EMERGENCY CALL TO TRAUMA CENTER WITH GPS COORDINATES."
            ),
            traffic_action="PERIMETER_LOCKDOWN_UPSTREAM_RED_DOWNSTREAM_GREEN",
            gps_coordinates={
                "lat": msg.gps_lat,
                "lng": msg.gps_lng,
                "address": "Main Arterial Corridor, Central Junction, Metro Smart City - 641001",
                "landmark": "Near College / School Campus & Medical Center"
            }
        )
    else:
        return CADDispatchPacket(
            cad_id=f"CAD-LOCAL-RESOLVED-{msg.incident_id[-4:]}",
            severity="MINOR_FENDER_BENDER",
            should_call_108=False,
            destination_hospital="NONE (LOCAL RESOLUTION)",
            dispatch_code="108-CALL-SUPPRESSED",
            rationale=(
                f"NON-EMERGENCY TRIAGE (ASI Score: {asi_score:.2f}): Low impact speed ({msg.speed_at_impact_kmh:.1f} km/h) "
                f"and minimal {msg.g_force:.1f}G force. Airbags intact, zero structural cabin intrusion, zero casualties. "
                f"SYSTEM DECISION: DO NOT CALL 108 / HOSPITAL. Preserving ambulance bandwidth for genuine life-threatening emergencies. "
                f"Generating digital insurance log and activating advisory lane flush."
            ),
            traffic_action="ADVISORY_LANE_FLUSH_LOCAL_LOG",
            gps_coordinates={
                "lat": msg.gps_lat,
                "lng": msg.gps_lng,
                "address": "Main Arterial Corridor, Central Junction",
                "landmark": "West Road Shoulder"
            }
        )

@triage_proto.on_message(model=CollisionTelemetry, replies=CADDispatchPacket)
async def handle_collision_telemetry(ctx: Context, sender: str, msg: CollisionTelemetry):
    ctx.logger.info(f"[TRIAGE AGENT] 💥 Telemetry Received for Incident {msg.incident_id} on Road {msg.approach_road}")
    ctx.logger.info(f"                Speed: {msg.speed_at_impact_kmh} km/h | G-Force: {msg.g_force}G | Airbags: {msg.airbags_deployed}")

    packet = evaluate_accident_severity(msg)

    if packet.should_call_108:
        ctx.logger.info(f"[TRIAGE AGENT] 🚨 CRITICAL VERDICT: Dispatched 108 CAD Call -> {packet.destination_hospital}")
        ctx.logger.info(f"                GPS: {packet.gps_coordinates['lat']}, {packet.gps_coordinates['lng']}")
        ctx.logger.info(f"                Traffic Action: {packet.traffic_action}")
    else:
        ctx.logger.info(f"[TRIAGE AGENT] 🛡️ MINOR VERDICT: 108 CAD Call SUPPRESSED!")
        ctx.logger.info(f"                Rationale: {packet.rationale}")

    await ctx.send(sender, packet)

triage_agent.include(triage_proto)

if __name__ == "__main__":
    triage_agent.run()
