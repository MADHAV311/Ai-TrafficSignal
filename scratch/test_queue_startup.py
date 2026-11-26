import sys
sys.path.insert(0, ".")
from backend.engine.vehicle import Vehicle

# 5 cars queued up
cars = []
stop_line = 405.0
for i in range(5):
    # each car length 28 + gap 6 = 34
    s = stop_line - 10.0 - i * 36.0
    cars.append(Vehicle({"road_id": "A", "lane_index": 0, "s": s, "initial_speed": 0}))

dt = 0.025
# Now signal turns GREEN
print("Queue startup when signal turns GREEN:")
for sec in range(1, 10):
    for tick in range(40): # 1 sec
        for idx, c in enumerate(cars):
            lead = cars[idx-1] if idx > 0 else None
            a = c.calculate_idm_acceleration(lead, "GREEN")
            c.speed = max(0.0, c.speed + a * dt)
            c.s += c.speed * dt
    print(f"t={sec}s: " + " | ".join([f"Car{i}: s={c.s:.1f}, spd={c.speed:.1f}" for i, c in enumerate(cars)]))
