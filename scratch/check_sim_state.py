import urllib.request
import json
import time

url = "http://127.0.0.1:8080/api/state"
res = urllib.request.urlopen(url)
data = json.loads(res.read().decode())
print("is_running:", data.get("is_running"))
print("isPlaying:", data.get("isPlaying"))
print("stepCount:", data.get("stepCount"))
print("situationMode:", data.get("situationMode"))
ai_sim = data.get("ai_simulation", {})
vehs = ai_sim.get("vehicles", [])
print("total vehicles:", len(vehs))
types = {}
roads = {}
speeds = []
for v in vehs:
    t = v.get("type", "UNKNOWN")
    types[t] = types.get(t, 0) + 1
    r = v.get("roadId", "?")
    roads[r] = roads.get(r, 0) + 1
    speeds.append(v.get("speed", 0))

print("Types:", types)
print("Roads:", roads)
if speeds:
    print(f"Avg speed: {sum(speeds)/len(speeds):.2f}, Min speed: {min(speeds):.2f}, Max speed: {max(speeds):.2f}")
    moving = sum(1 for s in speeds if s > 0.1)
    stopped = len(speeds) - moving
    print(f"Moving: {moving}, Stopped (in queue): {stopped}")

time.sleep(1)
res2 = urllib.request.urlopen(url)
data2 = json.loads(res2.read().decode())
print("stepCount after 1s:", data2.get("stepCount"))
vehs2 = data2.get("ai_simulation", {}).get("vehicles", [])
print("total vehicles after 1s:", len(vehs2))
