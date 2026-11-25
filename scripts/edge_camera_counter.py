#!/usr/bin/env python3
"""
TrafficFlow-AI: Edge Computer-Vision Vehicle Detection & Live Ingestion Gateway
Simulates or captures live camera video, counts vehicles crossing virtual detection tripwires,
and transmits real-time telemetry to the Digital Twin at http://localhost:8080.
"""

import sys
import time
import json
import argparse
import urllib.request
import urllib.error

def send_detection(server_url, road_id, count=1, fps=30.0):
    endpoint = f"{server_url.rstrip('/')}/api/realtime/vehicle-count"
    payload = json.dumps({"road": road_id, "count": count, "fps": fps}).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            return resp.status == 200
    except Exception as e:
        return False

def run_mock_edge_stream(server_url="http://localhost:8080"):
    """Simulates an edge IoT camera running YOLOv8 on the Bagalur Cross gantry."""
    print("=" * 70, flush=True)
    print("  TRAFFICFLOW-AI: EDGE CAMERA INGESTION GATEWAY (MOCK STREAM ACTIVE)", flush=True)
    print(f"  Target Server: {server_url}", flush=True)
    print("  Monitoring: Bagalur Cross (NH 44 Airport Road, Bangalore)", flush=True)
    print("  Tripwires: Road A (Airport Inbound), Road C (Outbound), Road B (SH 104)", flush=True)
    print("=" * 70, flush=True)

    import random
    roads = ["A", "B", "C", "D"]
    weights = [0.35, 0.25, 0.30, 0.10] # NH 44 carries majority traffic
    seq = 0

    while True:
        seq += 1
        road = random.choices(roads, weights=weights)[0]
        count = random.choice([1, 1, 1, 2])
        fps = round(random.uniform(28.5, 30.2), 1)

        ok = send_detection(server_url, road, count, fps)
        status = "✓ TRANSMITTED" if ok else "✗ SERVER OFFLINE"
        print(f"[{time.strftime('%H:%M:%S')}] Tripwire #{seq:04d} TRIGGERED: Road {road} | Count: +{count} | FPS: {fps} | {status}", flush=True)
        time.sleep(random.uniform(1.2, 2.5))

def run_opencv_camera(source, server_url="http://localhost:8080", road_id="A"):
    """Opens live camera or video stream with motion detection / contour tripwire."""
    try:
        import cv2
    except ImportError:
        print("[ERROR] OpenCV (cv2) is not installed. Run 'pip install opencv-python' or use '--mock' mode.")
        sys.exit(1)

    cap = cv2.VideoCapture(int(source) if source.isdigit() else source)
    if not cap.isOpened():
        print(f"[ERROR] Could not open video source: {source}")
        sys.exit(1)

    print(f"[INFO] Streaming edge detection from: {source} -> Digital Twin Road {road_id}")
    bg_sub = cv2.createBackgroundSubtractorMOG2(history=500, varThreshold=25, detectShadows=True)
    tripwire_y = 240
    vehicle_count = 0
    fps_timer = time.time()
    frames = 0
    current_fps = 30.0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0) # Loop video
                continue

            frames += 1
            if time.time() - fps_timer >= 1.0:
                current_fps = round(frames / (time.time() - fps_timer), 1)
                frames = 0
                fps_timer = time.time()

            h, w = frame.shape[:2]
            tripwire_y = int(h * 0.55)

            # Motion mask
            fg = bg_sub.apply(frame)
            _, thresh = cv2.threshold(fg, 200, 255, cv2.THRESH_BINARY)
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            detected_this_frame = 0
            for c in contours:
                if cv2.contourArea(c) < 1200:
                    continue
                x, y, cw, ch = cv2.boundingRect(c)
                cy = y + ch // 2
                cv2.rectangle(frame, (x, y), (x + cw, y + ch), (0, 255, 128), 2)

                # Check if centroid crossed tripwire
                if abs(cy - tripwire_y) < 12:
                    detected_this_frame += 1

            if detected_this_frame > 0:
                vehicle_count += detected_this_frame
                send_detection(server_url, road_id, detected_this_frame, current_fps)

            # Overlay HUD
            cv2.line(frame, (0, tripwire_y), (w, tripwire_y), (0, 0, 255), 2)
            cv2.putText(frame, f"BAGALUR CROSS EDGE CV TRIPWIRE (Road {road_id})", (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            cv2.putText(frame, f"Vehicles Counted: {vehicle_count} | FPS: {current_fps}", (15, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

            cv2.imshow("Bagalur Cross - Edge Camera Ingestion", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TrafficFlow-AI: Edge Camera Ingestion Gateway")
    parser.add_argument("--mock", action="store_true", help="Run simulated edge camera telemetry stream without webcam")
    parser.add_argument("--source", type=str, default="0", help="Camera index (0, 1) or IP camera RTSP/HTTP URL or video file")
    parser.add_argument("--server", type=str, default="http://localhost:8080", help="TrafficFlow-AI server base URL")
    parser.add_argument("--road", type=str, default="A", choices=["A", "B", "C", "D"], help="Road approach monitored by this camera")
    args = parser.parse_args()

    if args.mock:
        run_mock_edge_stream(args.server)
    else:
        run_opencv_camera(args.source, args.server, args.road)
