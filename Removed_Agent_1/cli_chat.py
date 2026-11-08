"""
Interactive CLI to test and chat with the TrafficFlow-AI Agent Swarm directly in the terminal.
"""
import sys
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.agents.agent_asi_one import process_user_intent

def main():
    print("=" * 70)
    print("  TRAFFICFLOW-AI : INTERACTIVE AGENT CHAT (ACP SIMULATOR)")
    print("  Type any command or query to test your agents live!")
    print("  Examples to try:")
    print("    1. Clear 108 Ambulance corridor on North road")
    print("    2. Severe accident 55 km/h 6.8G crash")
    print("    3. Minor bumper scrape with 1.3G force")
    print("    4. Activate pedestrian scramble for student crowd")
    print("    5. Synchronize corridor for green wave")
    print("    6. What is the traffic congestion and savings?")
    print("  Type 'exit' or 'quit' to stop.")
    print("=" * 70)

    while True:
        try:
            user_input = input("\n[YOU] > ").strip()
            if not user_input:
                continue
            if user_input.lower() in ["exit", "quit", "q"]:
                print("Exiting interactive agent chat. Bye!")
                break

            response = process_user_intent(user_input)
            print(f"\n[AGENT @trafficflow-ai-traff]:\n{response}")
            print("-" * 70)
        except (KeyboardInterrupt, EOFError):
            print("\nExiting interactive agent chat.")
            break

if __name__ == "__main__":
    main()
