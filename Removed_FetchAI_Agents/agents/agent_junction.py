"""
Agent 1: JunctionControllerAgent
Autonomous traffic signal controller for the central arterial intersection.
Handles emergency preemption, directional pole siren waves, and pedestrian scrambles.
"""

from uagents import Agent, Context, Protocol
import time
from .models import (
    EmergencyPassageRequest,
    EmergencyPassageResponse,
    PedestrianScrambleRequest,
    PedestrianScrambleResponse,
    ArterialPlatoonSync,
    TrafficStatusQuery,
    TrafficStatusResponse,
    AgentHeartbeat
)

junction_agent = Agent(
    name="junction_controller_agent",
    port=8001,
    seed="junction_controller_agent_seed_2026_metro_central"
)

junction_proto = Protocol(name="JunctionCoordinationProtocol", version="1.0.0")

@junction_proto.on_message(model=EmergencyPassageRequest, replies=EmergencyPassageResponse)
async def handle_emergency_request(ctx: Context, sender: str, msg: EmergencyPassageRequest):
    ctx.logger.info(f"[JUNCTION AGENT] 🚑 Received {msg.vehicle_type} ({msg.vehicle_id}) approaching Road {msg.approach_road}")
    ctx.logger.info(f"                 Speed: {msg.speed_kmh} km/h, Stopline ETA: {msg.eta_seconds}s")

    # Map road to directional high-mast corner pole
    pole_map = {"A": "POLE_A", "B": "POLE_B", "C": "POLE_C", "D": "POLE_D"}
    siren_pole = pole_map.get(msg.approach_road, "POLE_A")

    # Determine cleared phase and opposing roads to lock down
    if msg.approach_road in ["A", "C"]:
        cleared_phase = "NORTH_SOUTH_GREEN"
        lockdown = ["B", "D"]
    else:
        cleared_phase = "EAST_WEST_GREEN"
        lockdown = ["A", "C"]

    ctx.logger.info(f"[JUNCTION AGENT] ✅ PREEMPTION GRANTED: Activating {siren_pole} (115 dB Directional Horn + LED Strobe)")
    ctx.logger.info(f"                 Holding {lockdown} on RED. Deploying Green Carpet Wave on Road {msg.approach_road}")

    response = EmergencyPassageResponse(
        granted=True,
        active_siren_pole=siren_pole,
        cleared_phase=cleared_phase,
        lockdown_roads=lockdown,
        acoustic_decibels=115.0,
        preemption_status="GREEN_CARPET_WAVE_ACTIVE"
    )
    await ctx.send(sender, response)

@junction_proto.on_message(model=PedestrianScrambleRequest, replies=PedestrianScrambleResponse)
async def handle_pedestrian_request(ctx: Context, sender: str, msg: PedestrianScrambleRequest):
    ctx.logger.info(f"[JUNCTION AGENT] 🚶 Pedestrian Scramble Demand from {sender}: {msg.waiting_pedestrians} waiting, {msg.trailing_inflow} trailing")

    # Smart platoon aggregation: If students are still approaching, hold 4s before scramble
    hold_delay = 4.0 if msg.trailing_inflow > 3 else 0.0
    walk_window = 18.0 if msg.waiting_pedestrians > 8 else 12.0

    ctx.logger.info(f"[JUNCTION AGENT] 🛑 SCRAMBLE GRANTED: Holding vehicles ALL-RED after {hold_delay}s. Walk Window: {walk_window}s.")

    response = PedestrianScrambleResponse(
        scramble_granted=True,
        hold_delay_seconds=hold_delay,
        walk_window_seconds=walk_window,
        traffic_state="ALL_RED_LOCKDOWN",
        crosswalk_illumination="NEON_GREEN_ACTIVE"
    )
    await ctx.send(sender, response)

@junction_proto.on_message(model=ArterialPlatoonSync)
async def handle_arterial_platoon(ctx: Context, sender: str, msg: ArterialPlatoonSync):
    ctx.logger.info(f"[JUNCTION AGENT] 🌊 Arterial Platoon from {msg.source_node}: {msg.platoon_size_vehicles} vehicles @ {msg.progression_speed_kmh} km/h")
    ctx.logger.info(f"                 Opening green window at t+{msg.offset_seconds}s for non-stop progression.")

@junction_proto.on_message(model=TrafficStatusQuery, replies=TrafficStatusResponse)
async def handle_status_query(ctx: Context, sender: str, msg: TrafficStatusQuery):
    ctx.logger.info(f"[JUNCTION AGENT] 📊 Telemetry query received from {sender}")
    response = TrafficStatusResponse(
        corridor_name="Metropolitan Arterial Corridor (Smart City)",
        ai_algorithm="Webster Demand-Responsive Adaptive AI",
        active_phase="NORTH_SOUTH_GREEN",
        total_vehicles_cleared=7420,
        avg_wait_time_sec=33.2,
        wait_time_reduction_pct=41.4,
        queue_reduction_pct=43.0,
        fuel_saved_liters=26.7,
        rupees_saved_inr=5850.0,
        annual_savings_lakhs=142.28
    )
    await ctx.send(sender, response)

@junction_agent.on_interval(period=15.0)
async def junction_heartbeat(ctx: Context):
    ctx.logger.info(f"[JUNCTION AGENT] 💓 Heartbeat online: Address = {ctx.agent.address}")

junction_agent.include(junction_proto)

if __name__ == "__main__":
    junction_agent.run()
