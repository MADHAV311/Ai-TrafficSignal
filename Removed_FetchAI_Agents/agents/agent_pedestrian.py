"""
Agent 4: PedestrianVRUAgent
Autonomous Vulnerable Road User (VRU) & Campus Student Safety Agent.
Monitors pedestrian pushbuttons, tracks approaching crowd platoons, and commands
the Barnes Dance All-Pedestrian Scramble Phase.
"""

from uagents import Agent, Context, Protocol
from .models import (
    PedestrianScrambleRequest,
    PedestrianScrambleResponse
)

pedestrian_agent = Agent(
    name="pedestrian_vru_campus_agent",
    port=8004,
    seed="pedestrian_vru_campus_agent_seed_2026_metro"
)

pedestrian_proto = Protocol(name="PedestrianVRUProtocol", version="1.0.0")

@pedestrian_agent.on_event("startup")
async def on_startup(ctx: Context):
    ctx.logger.info(f"[PEDESTRIAN VRU AGENT] 🚶 Initialized: Address = {ctx.agent.address}")
    ctx.logger.info(f"[PEDESTRIAN VRU AGENT] Zone: Educational & University Campus Crosswalks")

@pedestrian_proto.on_message(model=PedestrianScrambleResponse)
async def handle_scramble_response(ctx: Context, sender: str, msg: PedestrianScrambleResponse):
    if msg.scramble_granted:
        ctx.logger.info(f"[PEDESTRIAN VRU AGENT] 🟢 BARNES DANCE SCRAMBLE ACTIVATED by {sender}!")
        ctx.logger.info(f"                        Hold Delay: {msg.hold_delay_seconds}s (Student Aggregation)")
        ctx.logger.info(f"                        Walk Window: {msg.walk_window_seconds}s")
        ctx.logger.info(f"                        Crosswalks: {msg.crosswalk_illumination}")

async def request_pedestrian_scramble(ctx: Context, junction_address: str, waiting: int = 12, inflow: int = 6):
    req = PedestrianScrambleRequest(
        crosswalk_id="CW_CAMPUS_MAIN",
        waiting_pedestrians=waiting,
        trailing_inflow=inflow,
        school_zone_active=True,
        urgency_level="HIGH" if waiting > 8 else "NORMAL"
    )
    ctx.logger.info(f"[PEDESTRIAN VRU AGENT] 📢 Requesting Scramble from {junction_address} ({waiting} waiting, {inflow} trailing)")
    await ctx.send(junction_address, req)

pedestrian_agent.include(pedestrian_proto)

if __name__ == "__main__":
    pedestrian_agent.run()
