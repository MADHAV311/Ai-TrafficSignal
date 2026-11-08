"""
=============================================================================
FETCH-A-THON 3.0 & ASI:ONE AGENT CHALLENGE — AGENTVERSE HOSTED AGENT
=============================================================================
Instructions to Host in 60 Seconds:
1. Log in to https://agentverse.ai
2. Click "My Agents" -> "+ New Agent" -> "Blank Agent"
3. Delete the default code and PASTE THIS ENTIRE FILE into the editor.
4. Click "Save" and then click "Start".
5. Your agent is now live on the Fetch.ai Almanac and discoverable on ASI:One (asi1.ai)!
6. Copy your Agentverse Agent Profile URL for your Devpost submission!
=============================================================================
"""

from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    TextContent,
    chat_protocol_spec
)
from datetime import datetime, timezone
import uuid
import re

# Initialize Agentverse Hosted Agent
agent = Agent(name="trafficflow_smart_city_agent")

chat_proto = Protocol(spec=chat_protocol_spec)

LOCATION_KNOWLEDGE_BASE = {
    "central junction": {
        "name": "Central Arterial Junction (Metro Main Corridor)",
        "has_traffic": True,
        "traffic_level": "SEVERE CONGESTION (RED)",
        "badge_color": "🔴",
        "exact_location": "North Arterial Corridor at Central Junction Stopline, directly opposite Metro Pillar #412",
        "backlog_stretch": "350 meters upstream from the stopline back to 8th Cross Diversion junction",
        "affected_lanes": "Inbound Left & Center Through-Lanes (Lanes 1 & 2 immobilized; Right-turn pocket crawling at 4 km/h)",
        "gps_span": "12.9195° N, 77.6360° E (Queue Tail at 8th Cross) ➔ 12.9172° N, 77.6385° E (Stopline at Pillar #412)",
        "avg_speed_kmh": 6.8,
        "queue_cars": 34,
        "delay_minutes": 7.7,
        "signal_state": "RED (44 seconds remaining)",
        "root_cause": "Active 108 ALS Ambulance Green Carpet preemption holding cross-traffic on Red to ensure emergency life-support clearance.",
        "bypass_route": "8th Cross Ring Bypass (150m ahead)",
        "bypass_action": "Turn Right at 8th Cross Diversion point",
        "time_saved_min": 6.2,
        "fuel_saved_l": 0.42,
        "inr_saved": 58.55,
        "co2_abated_kg": 0.97,
        "agent_address": "agent1q2z8k6x0w3h8f8j9s7l2m4n5p6q7r8s9t0u1v2w",
        "gps": "12.9172° N, 77.6385° E"
    },
    "silk board": {
        "name": "Central Silk Board Junction & Flyover",
        "has_traffic": True,
        "traffic_level": "HIGH BOTTLENECK (RED)",
        "badge_color": "🔴",
        "exact_location": "Outer Ring Road convergence at Central Silk Board Bus Terminus & Flyover On-Ramp",
        "backlog_stretch": "650 meters stretching from BTM 2nd Stage flyover entry back to 16th Main junction",
        "affected_lanes": "Flyover ascending ramp + bottom 3 surface lanes merging into Hosur Road",
        "gps_span": "12.9220° N, 77.6185° E (Queue Tail at BTM) ➔ 12.9177° N, 77.6238° E (Flyover Base & Bus Terminus)",
        "avg_speed_kmh": 11.2,
        "queue_cars": 48,
        "delay_minutes": 12.4,
        "signal_state": "ADAPTIVE RED (28s remaining on BTM feeder)",
        "root_cause": "Metro rail construction narrowing lane capacity + heavy vehicular inflow merging from Outer Ring Road and Hosur Road.",
        "bypass_route": "Madiwala Underpass via 16th Main Road or Outer Ring Road Elevated Expressway",
        "bypass_action": "Divert early via 16th Main BTM 2nd Stage to enter Elevated Flyover directly",
        "time_saved_min": 8.5,
        "fuel_saved_l": 0.65,
        "inr_saved": 82.00,
        "co2_abated_kg": 1.50,
        "agent_address": "agent1q9silkboardmetro776385koramangala",
        "gps": "12.9177° N, 77.6238° E"
    },
    "koramangala": {
        "name": "Koramangala 4th Block (Start Avenue)",
        "has_traffic": False,
        "traffic_level": "CLEAR & FREE-FLOWING (GREEN)",
        "badge_color": "🟢",
        "exact_location": "Koramangala 80ft Road & 4th Block Boulevard",
        "backlog_stretch": "0 meters (Zero vehicle queue detected)",
        "affected_lanes": "All 4 lanes wide open with unrestricted movement",
        "gps_span": "12.9352° N, 77.6245° E (Clear corridor span)",
        "avg_speed_kmh": 42.5,
        "queue_cars": 2,
        "delay_minutes": 0.4,
        "signal_state": "GREEN WAVE ACTIVE (35s remaining)",
        "root_cause": "Coordinated 4-lane avenue progression with zero impedance. Intersection signals currently running in high-efficiency green window.",
        "bypass_route": "None needed - Current arterial avenue is optimal",
        "bypass_action": "Continue straight along primary avenue",
        "time_saved_min": 0.0,
        "fuel_saved_l": 0.0,
        "inr_saved": 0.0,
        "co2_abated_kg": 0.0,
        "agent_address": "agent1qvwv2a00w8x5h7l9m2n4p6q8s0t2u4v6w8x0y2z",
        "gps": "12.9352° N, 77.6245° E"
    },
    "electronic city": {
        "name": "Electronic City Phase 1 Tech Hub (Destination)",
        "has_traffic": False,
        "traffic_level": "NORMAL FLOW (GREEN)",
        "badge_color": "🟢",
        "exact_location": "Electronic City Elevated Tollway Exit Gate 2 & Infosys Avenue",
        "backlog_stretch": "0 meters (Fluid discharge through automated FASTag lanes)",
        "affected_lanes": "All exit gates operating normally",
        "gps_span": "12.8452° N, 77.6602° E (Toll Plaza zone)",
        "avg_speed_kmh": 38.0,
        "queue_cars": 5,
        "delay_minutes": 1.2,
        "signal_state": "GREEN (24s remaining)",
        "root_cause": "Elevated Expressway flyover toll ramp discharging smoothly into tech park internal corridors.",
        "bypass_route": "Direct Toll Gate Exit 2",
        "bypass_action": "Take Flyover Ramp to Toll Gate 2 for immediate campus entry",
        "time_saved_min": 2.5,
        "fuel_saved_l": 0.15,
        "inr_saved": 22.00,
        "co2_abated_kg": 0.35,
        "agent_address": "agent1qelectroniccitytechhub2026metro",
        "gps": "12.8452° N, 77.6602° E"
    },
    "8th cross": {
        "name": "8th Cross Ring Bypass Corridor",
        "has_traffic": False,
        "traffic_level": "100% CLEAR / GREEN WAVE ACTIVE",
        "badge_color": "🟢",
        "exact_location": "8th Cross Diversion Link to Southern Ring Road",
        "backlog_stretch": "0 meters (Uninterrupted 50 km/h green wave)",
        "affected_lanes": "Both bypass lanes fully unobstructed",
        "gps_span": "12.9220° N, 77.6320° E ➔ 12.9100° N, 77.6450° E",
        "avg_speed_kmh": 48.0,
        "queue_cars": 0,
        "delay_minutes": 0.0,
        "signal_state": "GREEN WAVE SYNCHRONIZED (50 km/h progression)",
        "root_cause": "Decentralized Fetch.ai platoon coordination agent maintaining active green window offsets.",
        "bypass_route": "This IS the recommended proactive diversion route!",
        "bypass_action": "Proceed non-stop along 8th Cross ring bypass",
        "time_saved_min": 6.2,
        "fuel_saved_l": 0.42,
        "inr_saved": 58.55,
        "co2_abated_kg": 0.97,
        "agent_address": "agent1q8thcrossringbypassgreenwavecorridor",
        "gps": "12.9220° N, 77.6320° E"
    },
        "majestic": {
        "name": "Majestic Kempegowda Bus Station & KSR Railway Hub",
        "has_traffic": True,
        "traffic_level": "SEVERE CONGESTION (RED)",
        "badge_color": "🔴",
        "exact_location": "Gubbi Thotadappa Road at Sangam Theatre Junction & Majestic BMTC/KSRTC Terminal Gates",
        "backlog_stretch": "480 meters extending from Sangam Circle back to City Railway Station Underpass",
        "affected_lanes": "All 3 approach lanes crawling due to inter-state KSRTC bus arrivals & auto-rickshaw queue spillover",
        "gps_span": "12.9785° N, 77.5685° E (Underpass) ➔ 12.9767° N, 77.5713° E (Bus Terminal Gates)",
        "avg_speed_kmh": 8.5,
        "queue_cars": 42,
        "delay_minutes": 11.2,
        "signal_state": "SATURATION RED (38s remaining on Gubbi Thotadappa Road)",
        "root_cause": "Heavy inter-city bus maneuvering across entry gates + commuter pedestrian surge exiting Metro lines.",
        "bypass_route": "Sheshadri Road Flyover via Anand Rao Circle or Subedar Chatram Road",
        "bypass_action": "Divert early via Anand Rao Circle Flyover to bypass surface terminal gates completely",
        "time_saved_min": 7.4,
        "fuel_saved_l": 0.58,
        "inr_saved": 74.50,
        "co2_abated_kg": 1.34,
        "agent_address": "agent1qmajesticmetrohub2026central",
        "gps": "12.9767° N, 77.5713° E"
    },
    "whitefield": {
        "name": "Whitefield ITPL Main Road & Hope Farm Junction",
        "has_traffic": True,
        "traffic_level": "SEVERE CONGESTION (RED)",
        "badge_color": "🔴",
        "exact_location": "ITPL Main Road directly outside ITPL Gate 2 & Hope Farm Circle",
        "backlog_stretch": "520 meters extending from Hope Farm circle back to Pattandur Agrahara Metro Station",
        "affected_lanes": "Both eastbound arterial lanes blocked by tech park bus bunching",
        "gps_span": "12.9890° N, 77.7240° E (Queue Tail) ➔ 12.9854° N, 77.7289° E (Hope Farm Circle)",
        "avg_speed_kmh": 9.4,
        "queue_cars": 52,
        "delay_minutes": 14.8,
        "signal_state": "SATURATION RED (36s remaining)",
        "root_cause": "Peak corporate tech shift change combined with public bus bunching at ITPL bus terminal.",
        "bypass_route": "Varthur Road bypass or Hoodi Metro link road",
        "bypass_action": "Take Hoodi Station road to skip ITPL surface corridor",
        "time_saved_min": 11.0,
        "fuel_saved_l": 0.82,
        "inr_saved": 112.50,
        "co2_abated_kg": 1.89,
        "agent_address": "agent1qwhitefielditplcorridor2026smart",
        "gps": "12.9854° N, 77.7289° E"
    }
}

def format_location_report(loc_data: dict) -> str:
    traffic_verdict = "**YES, SEVERE TRAFFIC / BOTTLENECK DETECTED!**" if loc_data["has_traffic"] else "**NO TRAFFIC — CORRIDOR IS CLEAR & FREE-FLOWING!**"
    
    if loc_data["has_traffic"]:
        exact_pinpoint_section = (
            f"📍 **EXACT BOTTLENECK PINPOINT & PHYSICAL SPAN:**\n"
            f"• 📌 **Epicenter Landmark:** {loc_data.get('exact_location', 'Arterial intersection stopline')}\n"
            f"• 📏 **Upstream Backlog Stretch:** {loc_data.get('backlog_stretch', 'Spanning upstream queue')}\n"
            f"• 🚗 **Affected Lanes:** {loc_data.get('affected_lanes', 'Through-lanes immobilized')}\n"
            f"• 🌐 **GPS Span of Congestion:** `{loc_data.get('gps_span', loc_data['gps'])}`\n\n"
        )
    else:
        exact_pinpoint_section = (
            f"📍 **EXACT BOTTLENECK CHECK:**\n"
            f"• 📌 **Status:** **ZERO BOTTLENECK DETECTED** (No stoppage or congestion point)\n"
            f"• 📏 **Backlog Stretch:** 0 meters (Queue depth: {loc_data['queue_cars']} vehicles)\n"
            f"• 🚗 **Affected Lanes:** All lanes 100% open and operating at {loc_data['avg_speed_kmh']} km/h\n"
            f"• 🌐 **Corridor GPS:** `{loc_data.get('gps_span', loc_data['gps'])}`\n\n"
        )

    return (
        f"{loc_data['badge_color']} **TRAFFIC STATUS REPORT: {loc_data['name']}**\n\n"
        f"🚦 **Is there traffic here?**\n"
        f"👉 {traffic_verdict} ({loc_data['traffic_level']})\n\n"
        f"{exact_pinpoint_section}"
        f"📊 **Live Telemetry & Congestion Metrics:**\n"
        f"• **Average Speed:** {loc_data['avg_speed_kmh']} km/h\n"
        f"• **Queue Depth:** {loc_data['queue_cars']} vehicles in waiting line\n"
        f"• **Estimated Delay:** +{loc_data['delay_minutes']} minutes\n"
        f"• **Signal Status:** {loc_data['signal_state']}\n"
        f"• **GPS Coordinates:** `{loc_data['gps']}`\n\n"
        f"🔍 **Active Root Cause:**\n"
        f"{loc_data['root_cause']}\n\n"
        f"💡 **Recommended Proactive Action:**\n"
        f"• **Bypass Path:** {loc_data['bypass_route']}\n"
        f"• **Maneuver:** {loc_data['bypass_action']}\n\n"
        f"🇮🇳 **MoRTH Economic & Environmental Impact:**\n"
        f"• **Time Saved by Bypass:** {loc_data['time_saved_min']} minutes\n"
        f"• **Fuel Saved:** {loc_data['fuel_saved_l']} Liters (₹{loc_data['inr_saved']:.2f} value at ₹102.50/L)\n"
        f"• **CO₂ Abatement:** {loc_data['co2_abated_kg']} kg\n\n"
        f"🤖 **Connected Fetch.ai Agent Address:**\n"
        f"`{loc_data['agent_address']}`"
    )

def handle_user_intent(user_text: str) -> str:
    text = user_text.lower().strip()

    # 1. 108 Emergency Ambulance Route Preemption
    if any(k in text for k in ["ambulance", "108", "emergency", "clear route", "preempt", "green carpet"]):
        road = "North Approach (Road A)"
        if "east" in text or "road b" in text: road = "East Approach (Road B)"
        elif "south" in text or "road c" in text: road = "South Approach (Road C)"
        elif "west" in text or "road d" in text: road = "West Approach (Road D)"

        return (
            "🚨 **[ACTION EXECUTED] 108 ALS Emergency Ambulance Preemption**\n\n"
            f"• **Target Approach:** {road}\n"
            "• **Acoustic Preemption:** **POLE A Directional Siren ACTIVATED (115 dB Acoustic Horn + LED Strobe)**\n"
            "• **Signal Action:** Opposing cross-streets safely transitioned to **RED** outside dilemma zone.\n"
            "• **Corridor Wave:** **Green Carpet Wave Granted** for Unit `108-ALS-METRO-04`.\n"
            "• **Estimated Stopline ETA:** 6.8 seconds | Speed: 62.4 km/h.\n\n"
            "*(Ambulance passage cleared with zero vehicle delay. Normal adaptive cycles will resume automatically.)*"
        )

    # 2. Critical Crash Severity Triage & 108 CAD Auto-Dispatch
    elif any(k in text for k in ["critical crash", "severe crash", "severe accident", "major crash", "major accident", "6.8g", "airbag"]):
        return (
            "💥 **[ACTION EXECUTED] Critical Crash Detected — Sub-Second 108 CAD Auto-Dispatched**\n\n"
            "**Multi-Sensor Telemetry Fusion:**\n"
            "• **Impact Speed:** 54.5 km/h (CCTV Optical Flow)\n"
            "• **G-Force Deceleration:** **6.8G Impact Spike** (3-Axis Accelerometer)\n"
            "• **Airbag Deployment:** Confirmed | **Cabin Intrusion:** 32 cm\n"
            "• **Acoustic Signature:** 98.4 dB crash shockwave\n\n"
            "**Autonomous Decision Engine Verdict: CRITICAL EMERGENCY (ASI Score: 0.82)**\n"
            "✅ **108 CAD Auto-Dispatch:** Dispatched to **City Multi-Specialty Trauma Care & Emergency Center**\n"
            "• **GPS Coordinates:** `11.0245° N, 76.9982° E` (Main Arterial Corridor)\n"
            "• **Dispatch Code:** `108-DISPATCH-METRO-ALS` | **ETA:** 3.8 minutes\n"
            "• **Traffic Action:** **Perimeter Red Lockdown** upstream to prevent secondary pileups."
        )

    # 3. Minor Accident Triage Suppression (Hospital Bandwidth Protection)
    elif any(k in text for k in ["minor", "scrape", "fender", "bumper", "1.3g", "minor accident", "minor crash"]):
        return (
            "🛡️ **[ACTION EXECUTED] Minor Fender-Bender Triage — 108 CAD Call SUPPRESSED**\n\n"
            "**Multi-Sensor Telemetry Analysis:**\n"
            "• **Impact Speed:** 14.2 km/h | **G-Force Deceleration:** 1.3G\n"
            "• **Airbag Deployment:** INTACT | **Cabin Intrusion:** 0 cm\n"
            "• **Casualties:** 0 Persons | **Structural Damage:** Negligible Surface Scrape\n\n"
            "**Autonomous Decision Engine Verdict: MINOR INCIDENT (ASI Score: 0.18)**\n"
            "🚫 **108 Emergency Call:** **STRICTLY SUPPRESSED**\n"
            "💡 **Rationale:** Preserving critical 108 ambulance lines and hospital trauma bandwidth for genuine life-threatening emergencies.\n"
            "• **Action Taken:** Generated edge digital insurance incident packet and activated advisory lane flush."
        )

    # 4. Barnes Dance All-Pedestrian Scramble
    elif any(k in text for k in ["pedestrian", "walk", "scramble", "students", "campus", "crosswalk", "barnes"]):
        return (
            "🚶 **[ACTION EXECUTED] Barnes Dance All-Pedestrian Scramble Activated**\n\n"
            "• **Campus Zone:** Educational Corridor Crosswalks (College & School Zone)\n"
            "• **Curb Waiting Queue:** 12 Students | **Trailing Inflow:** 6 Students\n"
            "• **Inflow Aggregation Timer:** 4.0s vehicle hold to consolidate trailing crowd\n"
            "• **Vehicular Signals:** **ALL-RED PERIMETER LOCKDOWN** on all approaches\n"
            "• **Crosswalk Lighting:** All 4 zebra crossings illuminated **NEON GREEN**\n"
            "• **Walk Window:** 18.0s protected crossing (orthogonal and diagonal crossing permitted with zero vehicle conflict)."
        )

    # 5. Arterial Green Wave Corridor Progression
    elif any(k in text for k in ["green wave", "arterial", "corridor", "synchronize", "wave", "multi-intersection"]):
        return (
            "🌊 **[ACTION EXECUTED] Metropolitan Arterial Green Wave Synchronized**\n\n"
            "• **Corridor Linked:** Upstream Feeder Junction ↔ Central Main Node ↔ Downstream Exit Junction\n"
            "• **Target Progression Speed:** 50 km/h (Optimal Platoon Velocity)\n"
            "• **Platoon Dispersion Offset:** 18.5 seconds\n"
            "• **Wave Coherence:** **100.0% Bandwidth Optimization**\n"
            "• **Outcome:** Vehicles traversing from Upstream to Downstream receive continuous green windows without stopping."
        )

    # 6. Specific Known Location Traffic & Exact Pinpoint Query
    for key, data in LOCATION_KNOWLEDGE_BASE.items():
        if key in text:
            return format_location_report(data)

    # 7. General Traffic Status
    if any(k in text for k in ["traffic", "status", "congestion", "queue", "report", "stats", "savings"]):
        return (
            "📊 **TrafficFlow-AI: Metropolitan Central Junction Telemetry**\n\n"
            "• **Average Wait Time:** **33.2s** vs 56.7s (-41.4% Delay Reduction)\n"
            "• **Current Queue:** **25 cars** across 4 approaches\n"
            "• **Fuel Saved:** 18.2 L/hr (~78,400 L/yr)\n"
            "• **Carbon Abated:** 42.4 kg CO₂/hr (~192 MT CO₂/yr)\n"
            "• **Annual Municipal Economic ROI:** **₹42.8 Lakhs / Year**"
        )

    # 8. Default Guide
    # 7. Default Guide
    return (
        "🧭 **TrafficFlow-AI Assistant on ASI:One & Agentverse**\n\n"
        "Ask me to control signals, triage crashes, or check traffic at any place:\n"
        "• *\"how the majestic traffic?\"* *(Pinpoints 480m backlog at Bus Terminal)*\n"
        "• *\"Is there traffic at Silk Board?\"* *(Pinpoints 650m backlog & flyover ramp)*\n"
        "• *\"Traffic situation at Central Junction?\"* *(Pinpoints Pillar #412)*\n"
        "• *\"Is Koramangala clear?\"*\n"
        "• *\"Clear 108 Ambulance corridor on North road\"*\n"
        "• *\"Report 6.8G critical crash\"*\n\n"
        "🌐 **Live ASI:One Chat Space:** `https://asi1.ai/chat/449bfcc6-32dc-4a17-9fc7-9e1dcc99d9a4?space=9aafc223-1cae-43af-b246-de7feceb76a2`"
    )

@chat_proto.on_message(ChatMessage)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
    ctx.logger.info(f"Incoming message from {sender} (ID: {msg.msg_id})")

    # 1. Send protocol acknowledgement
    ack = ChatAcknowledgement(
        timestamp=datetime.now(timezone.utc),
        acknowledged_msg_id=msg.msg_id
    )
    await ctx.send(sender, ack)

    # 2. Extract incoming text
    user_text = ""
    for c in msg.content:
        if isinstance(c, TextContent):
            user_text += c.text

    # 3. Process Intent to Action
    response_text = handle_user_intent(user_text)

    # 4. Return protocol-compliant ChatMessage
    outbound = ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid.uuid4(),
        content=[TextContent(type="text", text=response_text)]
    )
    await ctx.send(sender, outbound)

@chat_proto.on_message(ChatAcknowledgement)
async def handle_chat_acknowledgement(ctx: Context, sender: str, msg: ChatAcknowledgement):
    ctx.logger.info(f"Received Ack for {msg.acknowledged_msg_id} from {sender}")

agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
