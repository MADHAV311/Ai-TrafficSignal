import asyncio
import base64
import json
import os
import subprocess
import time
import urllib.request
import websockets

ARTIFACT_DIR = r"C:\Users\vsoma\.gemini\antigravity\brain\1d3d6bd2-0a66-41d7-a3b6-2477972643c3"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 9452
USER_DATA = r"C:\Users\vsoma\AppData\Local\Temp\chrome_dev_civic_9452"

async def run():
    print(f"[1] Launching Chrome on port {PORT}...")
    cmd = [
        CHROME_PATH,
        "--headless=new",
        f"--remote-debugging-port={PORT}",
        "--remote-allow-origins=*",
        f"--user-data-dir={USER_DATA}",
        "--window-size=1600,1000",
        "--hide-scrollbars",
        "--disable-gpu-watchdog",
        "about:blank"
    ]
    proc = subprocess.Popen(cmd)
    time.sleep(2)

    ws_url = None
    for _ in range(15):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json") as resp:
                data = json.loads(resp.read().decode())
                for item in data:
                    if item.get("type") == "page" and "webSocketDebuggerUrl" in item:
                        ws_url = item["webSocketDebuggerUrl"]
                        break
                if ws_url:
                    break
        except Exception:
            time.sleep(0.5)

    if not ws_url:
        print("Failed to find Chrome WebSocket debugger URL!")
        proc.kill()
        return

    print(f"[2] Connecting to CDP WebSocket: {ws_url}")
    msg_id = 0
    try:
        async with websockets.connect(ws_url, max_size=50*1024*1024) as ws:
            async def call(method, params=None):
                nonlocal msg_id
                msg_id += 1
                payload = {"id": msg_id, "method": method, "params": params or {}}
                await ws.send(json.dumps(payload))
                while True:
                    res = json.loads(await ws.recv())
                    if res.get("id") == msg_id:
                        return res.get("result", {})

            await call("Page.enable")
            await call("Emulation.setDeviceMetricsOverride", {
                "width": 1600,
                "height": 1000,
                "deviceScaleFactor": 1,
                "mobile": False
            })

            url = "http://localhost:8080/"
            print(f"[3] Navigating to {url}...")
            await call("Page.navigate", {"url": url})
            await asyncio.sleep(4)

            # 1. Pothole Detail (Looking down at Pothole #104 with PWD Cones)
            print("[4] Capturing Pothole Detail with PWD Cones...")
            await call("Runtime.evaluate", {
                "expression": """
                (() => {
                    const ts = window.appInstance && window.appInstance.renderer && window.appInstance.renderer.threeScene;
                    if (ts) {
                        ts.animateCameraTo(42, 38, -112, 17.5, 0, -140);
                    }
                })()
                """
            })
            await asyncio.sleep(2.5)
            shot1 = await call("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(ARTIFACT_DIR, "screenshot_3d_pothole_detail.png"), "wb") as f:
                f.write(base64.b64decode(shot1["data"]))
            print("Saved screenshot_3d_pothole_detail.png")

            # 2. Smart Pole Hero Closeup (Looking West from the pedestrian plaza - zero occlusion)
            print("[5] Capturing Smart Pole Hero...")
            await call("Runtime.evaluate", {
                "expression": """
                (() => {
                    const ts = window.appInstance && window.appInstance.renderer && window.appInstance.renderer.threeScene;
                    if (ts) {
                        ts.animateCameraTo(108, 24, -64, 75, 24, -64);
                    }
                })()
                """
            })
            await asyncio.sleep(2.5)
            shot2 = await call("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(ARTIFACT_DIR, "screenshot_3d_smart_pole.png"), "wb") as f:
                f.write(base64.b64decode(shot2["data"]))
            print("Saved screenshot_3d_smart_pole.png")

            # 3. Waterlogging Puddle Detail
            print("[6] Capturing Waterlogging Puddle...")
            await call("Runtime.evaluate", {
                "expression": """
                (() => {
                    const ts = window.appInstance && window.appInstance.renderer && window.appInstance.renderer.threeScene;
                    if (ts) {
                        ts.animateCameraTo(45, 24, 48, 65, 0, 70);
                    }
                })()
                """
            })
            await asyncio.sleep(2.5)
            shot3 = await call("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(ARTIFACT_DIR, "screenshot_3d_waterlogging.png"), "wb") as f:
                f.write(base64.b64decode(shot3["data"]))
            print("Saved screenshot_3d_waterlogging.png")

            # 4. Cinematic 3D Isometric Overview
            print("[7] Capturing Cinematic 3D Isometric Overview...")
            await call("Runtime.evaluate", {
                "expression": """
                (() => {
                    const ts = window.appInstance && window.appInstance.renderer && window.appInstance.renderer.threeScene;
                    if (ts) {
                        ts.animateCameraTo(0, 460, 500, 0, 0, 0);
                    }
                })()
                """
            })
            await asyncio.sleep(2.5)
            shot4 = await call("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(ARTIFACT_DIR, "screenshot_3d_civic_overview.png"), "wb") as f:
                f.write(base64.b64decode(shot4["data"]))
            print("Saved screenshot_3d_civic_overview.png")

    finally:
        print("[8] Terminating headless Chrome...")
        proc.kill()

if __name__ == "__main__":
    asyncio.run(run())
