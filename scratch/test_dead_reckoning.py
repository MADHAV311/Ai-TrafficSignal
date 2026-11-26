import math

# Simulate 1 second with packet delay of 0.5s (2 packets per second)
speed = 80.0
angle = math.pi / 2.0 # heading along Z
dt = 1.0 / 60.0

# Old vs New dead reckoning
old_z = 0.0
new_z = 0.0

server_z = 0.0
server_time = 0.0

# 60 frames = 1 second
old_trajectory = []
new_trajectory = []

for frame in range(60):
    t = frame * dt
    # Packet arrives every 30 frames (0.5s)
    if frame % 30 == 0:
        server_z = t * speed
        server_time = t

    # Old way:
    vz = math.sin(angle) * speed
    old_z += vz * dt
    err_old = server_z - old_z
    old_z += err_old * min(1.0, 2.5 * dt)
    old_trajectory.append(round(old_z, 1))

    # New way with projected ground-truth:
    elapsed = t - server_time
    proj_z = server_z + vz * elapsed
    err_new = proj_z - new_z
    new_z += vz * dt + err_new * min(1.0, 8.0 * dt)
    new_trajectory.append(round(new_z, 1))

print("Ground truth at 1s:", round(speed * 1.0, 1))
print("Old Z every 10 frames:", old_trajectory[::10])
print("New Z every 10 frames:", new_trajectory[::10])

# Speeds
old_vels = [(old_trajectory[i] - old_trajectory[i-1])/dt for i in range(1, len(old_trajectory))]
new_vels = [(new_trajectory[i] - new_trajectory[i-1])/dt for i in range(1, len(new_trajectory))]
print("Old apparent speeds:", [round(s, 1) for s in old_vels[::10]])
print("New apparent speeds:", [round(s, 1) for s in new_vels[::10]])
