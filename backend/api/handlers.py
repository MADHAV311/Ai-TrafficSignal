"""
AI Adaptive Traffic Signal Digital Twin - API Route Handlers (Backend Service Layer)
Provides REST and state interfaces for the frontend presentation layer.
"""

import json

def api_response(data, status=200):
    body = json.dumps(data)
    return {
        "status": status,
        "content_type": "application/json",
        "body": body
    }

def handle_get_state(twin_manager):
    return api_response(twin_manager.get_state())

def handle_control(twin_manager, payload):
    action = payload.get("action")
    if action == "play":
        twin_manager.is_playing = True
    elif action == "pause":
        twin_manager.is_playing = False
    elif action == "toggle":
        twin_manager.is_playing = not twin_manager.is_playing
    elif action == "step":
        twin_manager.is_playing = False
        twin_manager.step()
    elif action == "reset":
        twin_manager.reset()
    elif action == "speed":
        twin_manager.speed_multiplier = float(payload.get("speed", 1.0))
    elif action == "viewMode":
        twin_manager.view_mode = payload.get("viewMode", "DUAL")

    return api_response({"success": True, "state": twin_manager.get_state()})

def handle_traffic_preset(twin_manager, payload):
    preset_key = payload.get("preset")
    if preset_key:
        twin_manager.generator.apply_preset(preset_key)
    return api_response({"success": True, "preset": preset_key, "rates": twin_manager.generator.arrival_rates})

def handle_traffic_rates(twin_manager, payload):
    rates = payload.get("rates", {})
    for road_id, rate in rates.items():
        twin_manager.generator.set_rate(road_id, float(rate))
    twin_manager.generator.current_preset_key = "CUSTOM"
    return api_response({"success": True, "rates": twin_manager.generator.arrival_rates})

def handle_signals_fixed(twin_manager, payload):
    timings = payload.get("greenDurations", {})
    for r_id, dur in timings.items():
        twin_manager.fixed_controller.set_road_green(r_id, float(dur))
    return api_response({"success": True, "greenDurations": twin_manager.fixed_controller.green_durations})

def handle_signals_adaptive(twin_manager, payload):
    if "minGreen" in payload:
        twin_manager.ai_controller.min_green = float(payload["minGreen"])
    if "maxGreen" in payload:
        twin_manager.ai_controller.max_green = float(payload["maxGreen"])
    return api_response({
        "success": True,
        "minGreen": twin_manager.ai_controller.min_green,
        "maxGreen": twin_manager.ai_controller.max_green
    })

def handle_algorithm_mode(twin_manager, payload):
    algo = payload.get("algorithm", "WEBSTER")
    success = twin_manager.set_ai_algorithm(algo)
    return api_response({"success": success, "algorithm": twin_manager.ai_controller.algorithm_mode})

def handle_weather_mode(twin_manager, payload):
    weather = payload.get("weather", "CLEAR")
    success = twin_manager.set_weather(weather)
    return api_response({"success": success, "weather": twin_manager.weather_mode})

def handle_incident_trigger(twin_manager, payload):
    incident_type = payload.get("type", "SURGE")
    if incident_type == "SURGE":
        # Surge Road B to 55 veh/min
        twin_manager.generator.set_rate("B", 55.0)
        twin_manager.generator.current_preset_key = "SURGE"
    elif incident_type == "BUS":
        # Spawn transit bus on Road A
        twin_manager.spawn_manual_vehicle("A", "BUS")
    elif incident_type == "EMERGENCY":
        road = payload.get("roadId", "A")
        twin_manager.spawn_emergency_vehicle(road)
    return api_response({"success": True, "incident": incident_type})

def handle_spawn_vehicle(twin_manager, payload):
    road_id = payload.get("roadId", "A")
    type_key = payload.get("type", "SEDAN")
    is_emergency = bool(payload.get("isEmergency", False))

    if is_emergency:
        twin_manager.spawn_emergency_vehicle(road_id)
    else:
        twin_manager.spawn_manual_vehicle(road_id, type_key)

    return api_response({"success": True, "spawned": True, "roadId": road_id, "isEmergency": is_emergency})

def handle_experiment_run(experiment_engine, payload):
    duration = float(payload.get("durationSec", 120.0))
    results = experiment_engine.run_benchmark(duration_sec=duration)
    return api_response(results)

def handle_export_csv(twin_manager):
    hist_f = twin_manager.sim_fixed.history
    hist_a = twin_manager.sim_adaptive.history

    csv_lines = ["Timestamp_sec,Fixed_AvgWait_sec,AI_AvgWait_sec,Fixed_Queue,AI_Queue,Fixed_Cleared,AI_Cleared\n"]
    length = min(len(hist_f["time"]), len(hist_a["time"]))
    for i in range(length):
        csv_lines.append(
            f"{hist_f['time'][i]},{hist_f['avgWaitTime'][i]},{hist_a['avgWaitTime'][i]},"
            f"{hist_f['queueLength'][i]},{hist_a['queueLength'][i]},"
            f"{hist_f['cumulativeCleared'][i]},{hist_a['cumulativeCleared'][i]}\n"
        )
    csv_content = "".join(csv_lines)
    return {
        "status": 200,
        "content_type": "text/csv",
        "body": csv_content
    }

def handle_situation_mode(twin_manager, payload):
    mode = payload.get("mode", "NORMAL")
    result = twin_manager.apply_situation_mode(mode)
    return api_response(result)

def handle_accident_trigger(twin_manager, payload):
    severity = payload.get("severity", "CRITICAL")
    road_id = payload.get("roadId", "C")
    result = twin_manager.trigger_accident(severity_type=severity, road_id=road_id)
    return api_response({"success": True, "accident": result})

def handle_accident_clear(twin_manager):
    twin_manager.clear_accident()
    return api_response({"success": True, "cleared": True})

def handle_pedestrian_button(twin_manager, payload):
    road_id = payload.get("roadId", "A")
    twin_manager.press_pedestrian_button(road_id)
    return api_response({"success": True, "roadId": road_id, "demand": True})

def handle_pedestrian_surge(twin_manager):
    twin_manager.trigger_pedestrian_surge()
    return api_response({"success": True, "scramble": True})

def handle_corridor_mode(twin_manager, payload):
    mode = payload.get("mode", "COOPERATIVE_GREEN_WAVE")
    twin_manager.multi_intersection.corridor_metrics["coordinationMode"] = mode
    return api_response({"success": True, "mode": mode})

def handle_crime_trigger(twin_manager, payload):
    threat_type = payload.get("threatType", "CRITICAL")
    road_id = payload.get("roadId", "B")
    result = twin_manager.trigger_crime(threat_type=threat_type, road_id=road_id)
    return api_response({"success": True, "crime": result})

def handle_crime_clear(twin_manager):
    twin_manager.clear_crime()
    return api_response({"success": True, "cleared": True})

def handle_school_trigger(twin_manager, payload):
    scenario = payload.get("scenario", "SMALL_GROUP")
    result = twin_manager.trigger_school_zone(scenario)
    return api_response({"success": True, "schoolZone": result})

def handle_realtime_config(twin_manager, payload):
    adapter = twin_manager.realtime_adapter
    if "enabled" in payload:
        adapter.is_live_sync_enabled = bool(payload["enabled"])
    if "mode" in payload and payload["mode"] in ("BENGALURU_REALTIME_MODEL", "TOMTOM_API", "EDGE_CAMERA"):
        adapter.active_mode = payload["mode"]
    if "tomtomApiKey" in payload:
        adapter.tomtom_api_key = str(payload["tomtomApiKey"]).strip()
        if adapter.tomtom_api_key:
            adapter.active_mode = "TOMTOM_API"
    return api_response({"success": True, "realtimeTraffic": adapter.to_dict()})

def handle_realtime_vehicle_count(twin_manager, payload):
    road_id = payload.get("road", "A").upper()
    count = int(payload.get("count", 1))
    fps = float(payload.get("fps", 30.0))
    ok = twin_manager.realtime_adapter.record_camera_detection(road_id, count=count, fps=fps)
    return api_response({"success": ok, "road": road_id, "count": count, "gateway": twin_manager.realtime_adapter.camera_gateway})

def handle_realtime_status(twin_manager):
    return api_response({"success": True, "realtimeTraffic": twin_manager.realtime_adapter.to_dict()})


