import sys
sys.path.insert(0, ".")
from backend.engine.vehicle import Vehicle

v = Vehicle({"road_id": "A", "lane_index": 0, "s": 250, "initial_speed": 60})

dt = 0.025
speeds = []
accels = []
for tick in range(120):
    a = v.calculate_idm_acceleration(None, "RED")
    v.speed = max(0.0, v.speed + a * dt)
    v.s += v.speed * dt
    speeds.append(round(v.speed, 2))
    accels.append(round(a, 1))

print("Stopping run:")
for i in range(0, len(speeds), 5):
    print(f"t={i*dt:.2f}s | dist_to_stop={v.stop_line_s - (v.s - sum(speeds[i:])*dt):.1f}m | acc={accels[i]} | spd={speeds[i]}")
