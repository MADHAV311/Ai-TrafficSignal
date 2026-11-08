"""
AI Adaptive Traffic Signal Digital Twin - Full-Stack Application Server
Hosts the Backend Service Layer (simulation engine, traffic generation, controllers, experiment engine)
and exposes REST APIs + serves static frontend assets.
"""

import sys
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Ensure parent directory is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_DIR)
for p in [CURRENT_DIR, PARENT_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

import time
import json
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import urllib.parse

from backend.engine.twin_manager import TwinManager
from backend.engine.experiment_engine import ExperimentEngine
from backend.api.handlers import (
    handle_get_state,
    handle_control,
    handle_traffic_preset,
    handle_traffic_rates,
    handle_signals_fixed,
    handle_signals_adaptive,
    handle_algorithm_mode,
    handle_weather_mode,
    handle_incident_trigger,
    handle_spawn_vehicle,
    handle_experiment_run,
    handle_export_csv,
    handle_situation_mode,
    handle_accident_trigger,
    handle_accident_clear,
    handle_pedestrian_button,
    handle_pedestrian_surge,
    handle_corridor_mode,
    handle_crime_trigger,
    handle_crime_clear,
    handle_school_trigger
)

PORT = 8080
if os.path.exists(os.path.join(CURRENT_DIR, "frontend")):
    FRONTEND_DIR = os.path.join(CURRENT_DIR, "frontend")
elif os.path.exists(os.path.join(PARENT_DIR, "frontend")):
    FRONTEND_DIR = os.path.join(PARENT_DIR, "frontend")
else:
    FRONTEND_DIR = CURRENT_DIR

# Singleton Backend Engine Instances
twin_manager = TwinManager()
experiment_engine = ExperimentEngine()
state_lock = threading.Lock()

# Background Simulation Thread Runner
sim_running = True

def simulation_background_loop():
    last_time = time.perf_counter()
    target_dt = 1.0 / 30.0  # 30 updates per second

    while sim_running:
        start = time.perf_counter()
        raw_dt = start - last_time
        last_time = start

        with state_lock:
            twin_manager.update(raw_dt)

        elapsed = time.perf_counter() - start
        sleep_time = max(0.001, target_dt - elapsed)
        time.sleep(sleep_time)


class FullStackTrafficHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def do_GET(self):
        print(f"[SERVER GET] {self.path}", flush=True)
        try:
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path

            if path == "/api/state":
                with state_lock:
                    res = handle_get_state(twin_manager)
                self._send_response_dict(res)
                return

            elif path == "/api/export/csv":
                with state_lock:
                    res = handle_export_csv(twin_manager)
                body_bytes = res["body"].encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", res["content_type"])
                self.send_header("Content-Length", str(len(body_bytes)))
                self.send_header("Content-Disposition", 'attachment; filename="traffic_telemetry.csv"')
                self.end_headers()
                self.wfile.write(body_bytes)
                self.wfile.flush()
                return

            elif path == "/api/experiment/report":
                results = experiment_engine.last_results or experiment_engine.run_benchmark(60.0)
                self._send_response_dict({
                    "status": 200,
                    "content_type": "application/json",
                    "body": json.dumps(results)
                })
                return

            # Fallback to serving static files from root directory
            return super().do_GET()
        except Exception as e:
            import traceback
            traceback.print_exc()
            sys.stderr.flush()

    def do_POST(self):
        print(f"[SERVER POST] {self.path}", flush=True)
        try:
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path

            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            payload = {}
            if post_data:
                try:
                    payload = json.loads(post_data.decode("utf-8"))
                except Exception:
                    payload = {}

            with state_lock:
                if path == "/api/control":
                    res = handle_control(twin_manager, payload)
                elif path == "/api/traffic/preset":
                    res = handle_traffic_preset(twin_manager, payload)
                elif path == "/api/traffic/rates":
                    res = handle_traffic_rates(twin_manager, payload)
                elif path == "/api/signals/fixed":
                    res = handle_signals_fixed(twin_manager, payload)
                elif path == "/api/signals/adaptive":
                    res = handle_signals_adaptive(twin_manager, payload)
                elif path == "/api/signals/algorithm":
                    res = handle_algorithm_mode(twin_manager, payload)
                elif path == "/api/environment/weather":
                    res = handle_weather_mode(twin_manager, payload)
                elif path == "/api/incident/trigger":
                    res = handle_incident_trigger(twin_manager, payload)
                elif path == "/api/vehicles/spawn":
                    res = handle_spawn_vehicle(twin_manager, payload)
                elif path == "/api/situation/mode":
                    res = handle_situation_mode(twin_manager, payload)
                elif path == "/api/accident/trigger":
                    res = handle_accident_trigger(twin_manager, payload)
                elif path == "/api/accident/clear":
                    res = handle_accident_clear(twin_manager)
                elif path == "/api/pedestrian/button":
                    res = handle_pedestrian_button(twin_manager, payload)
                elif path == "/api/pedestrian/surge":
                    res = handle_pedestrian_surge(twin_manager)
                elif path == "/api/corridor/mode":
                    res = handle_corridor_mode(twin_manager, payload)
                elif path == "/api/crime/trigger":
                    res = handle_crime_trigger(twin_manager, payload)
                elif path == "/api/crime/clear":
                    res = handle_crime_clear(twin_manager)
                elif path == "/api/school/trigger":
                    res = handle_school_trigger(twin_manager, payload)
                elif path == "/api/experiment/run":
                    res = handle_experiment_run(experiment_engine, payload)
                else:
                    res = {
                        "status": 404,
                        "content_type": "application/json",
                        "body": json.dumps({"error": f"API endpoint {path} not found"})
                    }

            self._send_response_dict(res)
        except Exception as e:
            import traceback
            traceback.print_exc()
            sys.stderr.flush()
            err_body = json.dumps({"error": str(e)})
            self._send_response_dict({
                "status": 500,
                "content_type": "application/json",
                "body": err_body
            })

    def _send_response_dict(self, res):
        body_bytes = res["body"].encode("utf-8")
        self.send_response(res["status"])
        self.send_header("Content-Type", res["content_type"])
        self.send_header("Content-Length", str(len(body_bytes)))
        self.end_headers()
        self.wfile.write(body_bytes)
        self.wfile.flush()

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        # Mute repetitive state polling log noise
        if len(args) > 0 and "/api/state" in str(args[0]):
            return
        super().log_message(format, *args)


def main():
    print(f"================================================================")
    print(f"  AI Adaptive Traffic Signal Digital Twin — Full-Stack Server")
    print(f"================================================================")
    print(f"  Backend Simulation Service: Running in background thread")
    print(f"  REST API Endpoints:        http://localhost:{PORT}/api/*")
    print(f"  Frontend Dashboard:        http://localhost:{PORT}")
    print(f"================================================================")

    # Start simulation loop thread
    sim_thread = threading.Thread(target=simulation_background_loop, daemon=True)
    sim_thread.start()

    server = ThreadingHTTPServer(("0.0.0.0", PORT), FullStackTrafficHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        global sim_running
        sim_running = False
        print("\nStopping traffic simulation server...")
        server.server_close()


if __name__ == "__main__":
    main()
