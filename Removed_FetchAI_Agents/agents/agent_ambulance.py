"""
Agent 2: EmergencyFleetAgent
Autonomous emergency vehicle mobile agent representing 108 ALS Ambulance & Fire Tenders.
Emits authenticated EmergencyPassageRequests and negotiates green carpet preemption.
"""

from uagents import Agent, Context, Protocol
import time
from .models import (
    EmergencyPassageRequest,
    EmergencyPassageResponse
)

ambulance_agent = Agent(
    name="emergency_ambulance_108_agent",
    port=8002,
    seed="emergency_ambulance_108_agent_seed_2026_metro"
)

ambulance_proto = Protocol(name="EmergencyFleetProtocol", version="1.0.0")

@ambulance_agent.on_event("startup")
async def on_startup(ctx: Context):
    ctx.logger.info(f"[108 AMBULANCE AGENT] 🚑 Initialized: Address = {ctx.agent.address}")
    ctx.logger.info(f"[108 AMBULANCE AGENT] Unit: 108-ALS-METRO-04 | Base: City Trauma Care Center")

@ambulance_proto.on_message(model=EmergencyPassageResponse)
async def handle_preemption_response(ctx: Context, sender: str, msg: EmergencyPassageResponse):
    if msg.granted:
        ctx.logger.info(f"[108 AMBULANCE AGENT] 🎉 PREEMPTION CONFIRMED from Junction ({sender})!")
        ctx.logger.info(f"                        Siren Beacon: {msg.active_siren_pole} Active (115 dB)")
        ctx.logger.info(f"                        Cleared Phase: {msg.cleared_phase}")
        ctx.logger.info(f"                        Status: {msg.preemption_status}")
    else:
        ctx.logger.warn(f"[108 AMBULANCE AGENT] ⚠️ Preemption held in dilemma safety buffer")

async def request_corridor_clearance(ctx: Context, junction_address: str, approach_road: str = "A", speed: float = 62.4, eta: float = 6.8):
    req = EmergencyPassageRequest(
        vehicle_id="AMB-108-METRO",
        vehicle_type="ALS_AMBULANCE",
        approach_road=approach_road,
        speed_kmh=speed,
        eta_seconds=eta,
        siren_code="CODE_3_SIREN_OPTICAL"
    )
    ctx.logger.info(f"[108 AMBULANCE AGENT] 🚨 Emitting EmergencyPassageRequest to {junction_address} for Road {approach_road}")
    await ctx.send(junction_address, req)

ambulance_agent.include(ambulance_proto)

if __name__ == "__main__":
    ambulance_agent.run()
