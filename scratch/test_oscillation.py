import sys
sys.path.insert(0, ".")
from backend.engine.vehicle import Vehicle

v1 = Vehicle({"road_id": "A", "lane_index": 0, "s": 380, "initial_speed": 0})
v2 = Vehicle({"road_id": "A", "lane_index": 0, "s": 350, "initial_speed": 0})

dt = 0.025
speeds = []
accels = []
for tick in range(30):
    a = v2.calculate_idm_acceleration(v1, "RED")
    v2.speed = max(0.0, v2.speed + a * dt)
    v2.s += v2.speed * dt
    speeds.append(round(v2.speed, 2))
    accels.append(round(a, 1))

print("Accels:", accels)
print("Speeds:", speeds)
