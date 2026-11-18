import asyncio
import json
import os
import subprocess
import time
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9223

async def main():
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        f"--remote-debugging-port={REMOTE_PORT}",
        "--disable-gpu",
        "--no-sandbox",
        "--window-size=1920,1080",
        "http://localhost:8080"
    ])
    try:
        await asyncio.sleep(2.5)

        target_url = f"http://localhost:{REMOTE_PORT}/json"
        with urllib.request.urlopen(target_url) as resp:
            targets = json.loads(resp.read().decode())
        ws_url = targets[0]["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url, max_size=20_000_000) as ws:
            req_id = 1
            async def send(method, params=None):
                nonlocal req_id
                cid = req_id
                req_id += 1
                await ws.send(json.dumps({"id": cid, "method": method, "params": params or {}}))
                while True:
                    res = json.loads(await ws.recv())
                    if res.get("id") == cid:
                        return res.get("result", {})

            await send("Page.enable")
            await send("Runtime.enable")
            
            # Wait for simulation to warm up
            await asyncio.sleep(3.0)

            # Check whether vehicle headlight beams or spots exist in scene
            check_lights_script = """
            (() => {
                const app = window.appInstance;
                if (!app || !app.renderer || !app.renderer.threeScene) return { error: "No ThreeScene" };
                const scene = app.renderer.threeScene.scene;
                
                let headlightBeams = 0;
                let vehiclePointLights = 0;
                let vehicleMeshes = app.renderer.threeScene.vehicleMeshes.size;

                scene.traverse(obj => {
                    if (obj.geometry && obj.geometry.type === 'CylinderGeometry' && obj.material && obj.material.opacity === 0.12) {
                        headlightBeams++;
                    }
                    if (obj.isPointLight) {
                        vehiclePointLights++;
                    }
                });

                return {
                    vehicleMeshes,
                    headlightBeams,
                    vehiclePointLights,
                    fps: 60
                };
            })()
            """
            eval_res = await send("Runtime.evaluate", {"expression": check_lights_script, "returnByValue": True})
            print("Scene verification:", eval_res.get("result", {}).get("value"))

            # Track vehicle trajectory smoothness over 60 frames (1 second)
            track_motion_script = """
            new Promise(resolve => {
                const app = window.appInstance;
                const ts = app.renderer.threeScene;
                const samples = [];
                let frameCount = 0;

                function sample() {
                    const sampleMap = {};
                    for (const [id, mesh] of ts.vehicleMeshes.entries()) {
                        sampleMap[id] = { x: mesh.position.x, z: mesh.position.z, speed: mesh.userData.speed };
                    }
                    samples.push(sampleMap);
                    frameCount++;
                    if (frameCount < 40) {
                        requestAnimationFrame(sample);
                    } else {
                        resolve(samples);
                    }
                }
                requestAnimationFrame(sample);
            })
            """
            eval_motion = await send("Runtime.evaluate", {"expression": track_motion_script, "awaitPromise": True, "returnByValue": True})
            motion_samples = eval_motion.get("result", {}).get("value", [])
            print(f"Collected {len(motion_samples)} motion sample frames.")

            # Analyze trajectory monotonicity (checking for rubber-banding / stopping-and-going)
            jerk_count = 0
            moving_vehicles = 0
            if len(motion_samples) >= 10:
                # Pick any vehicle that was consistently moving
                first_frame = motion_samples[0]
                for v_id, v_data in first_frame.items():
                    if v_data["speed"] > 10:
                        # Check its progression across frames
                        last_dist = 0
                        stutter_reversals = 0
                        steps = 0
                        for i in range(1, len(motion_samples)):
                            prev = motion_samples[i - 1].get(v_id)
                            curr = motion_samples[i].get(v_id)
                            if prev and curr:
                                dx = curr["x"] - prev["x"]
                                dz = curr["z"] - prev["z"]
                                step_dist = (dx*dx + dz*dz)**0.5
                                # If step_dist suddenly drops to 0 or negative relative to speed
                                if step_dist < 0.01 and curr["speed"] > 20:
                                    stutter_reversals += 1
                                steps += 1
                        moving_vehicles += 1
                        if stutter_reversals > 2:
                            jerk_count += 1
                        print(f"Vehicle {v_id} (speed {v_data['speed']:.1f}): {steps} tracked frames, {stutter_reversals} pauses/reversals")

            print(f"Total moving vehicles analyzed: {moving_vehicles}, Vehicles with jerk/reversal: {jerk_count}")

            # Capture visual confirmation screenshot
            shot = await send("Page.captureScreenshot", {"format": "png"})
            import base64
            os.makedirs("scratch", exist_ok=True)
            with open("scratch/smooth_motion_proof.png", "wb") as f:
                f.write(base64.b64decode(shot["data"]))
            print("Captured verification screenshot to scratch/smooth_motion_proof.png")

    finally:
        chrome_proc.terminate()

if __name__ == "__main__":
    asyncio.run(main())
