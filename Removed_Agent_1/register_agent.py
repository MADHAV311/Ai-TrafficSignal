import os
import sys
from uagents_core.utils.registration import (
    register_chat_agent,
    RegistrationRequestCredentials,
    AgentverseRequestError
)

# 1. Retrieve or prompt for credentials
api_key = os.environ.get("AGENTVERSE_KEY")
if not api_key and len(sys.argv) > 1:
    api_key = sys.argv[1].strip()

if not api_key:
    print("[ERROR] AGENTVERSE_KEY is required. Pass it as an argument or set AGENTVERSE_KEY env var.")
    print("Usage: python register_agent.py <YOUR_AGENTVERSE_KEY>")
    sys.exit(1)

seed_phrase = os.environ.get("AGENT_SEED_PHRASE", "trafficflow_asi_one_gateway_seed_2026_metro_blr")

# 2. Endpoints
# Prefer Cloudflare Tunnel for enterprise stability, fallback to localtunnel if needed
endpoint_url = os.environ.get("AGENT_ENDPOINT_URL", "https://email-daniel-remedies-victorian.trycloudflare.com/api/acp/chat")

print(f"Registering agent: 'TrafficFlow-AI'")
print(f"Endpoint: {endpoint_url}")
print(f"Seed phrase: {seed_phrase[:10]}...")

try:
    success = register_chat_agent(
        "TrafficFlow-AI",
        endpoint_url,
        active=True,
        credentials=RegistrationRequestCredentials(
            agentverse_api_key=api_key,
            agent_seed_phrase=seed_phrase,
        ),
        description="Autonomous Metropolitan Smart City Traffic Copilot & Location Intelligence for ASI:One",
        starter_prompts=[
            "Is there traffic at Silk Board?",
            "What is the traffic situation at Central Junction?",
            "Is Koramangala 4th Block clear?",
            "Clear 108 Ambulance corridor on North road"
        ]
    )
    if success:
        print("\n[SUCCESS] Agent registered successfully with Agentverse & ASI:One!")
        print("Now return to your browser and click: 'Evaluate my agent\\'s registration'!")
    else:
        print("\n[WARNING] Registration call returned False. Please check Agentverse dashboard.")
except AgentverseRequestError as err:
    print(f"\n[ERROR] Agentverse registration error: {err}")
except Exception as ex:
    print(f"\n[ERROR] Unexpected error: {ex}")
