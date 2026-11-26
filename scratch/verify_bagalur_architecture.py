import asyncio
import json
import os
import subprocess
import time
import urllib.request
import base64
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9229
ARTIFACT_DIR = r"C:\Users\vsoma\.gemini\antigravity\brain\1d3d6bd2-0a66-41d7-a3b6-2477972643c3"
SCREENSHOT_PATH_1 = os.path.join(ARTIFACT_DIR, "screenshot_bagalur_cross_station_overview.png")
SCREENSHOT_PATH_2 = os.path.join(ARTIFACT_DIR, "screenshot_bagalur_cross_metro_cam.png")

async def main():
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        f"--remote-debugging-port={REMOTE_PORT}",
        "--disable-gpu",
        "--no-sandbox",
        "--window-size=1680,1050",
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
                    msg = await ws.recv()
                    data = json.loads(msg)
                    if data.get("id") == cid:
                        return data.get("result", {})

            await send("Page.enable")
            await send("Runtime.enable")

            # Activate Bagalur Live Mode
            await send("Runtime.evaluate", {
                "expression": """
                const btn = document.querySelector('button[data-mode="BAGALUR_LIVE"]');
                if (btn) btn.click();
                """
            })
            await asyncio.sleep(2.5)

            # Capture Overview Screenshot
            shot1 = await send("Page.captureScreenshot", {"format": "png"})
            with open(SCREENSHOT_PATH_1, "wb") as f:
                f.write(base64.b64decode(shot1["data"]))
            print("Saved overview screenshot:", SCREENSHOT_PATH_1)

            # Switch to BAGALUR_METRO Camera
            await send("Runtime.evaluate", {
                "expression": """
                const metroBtn = document.querySelector('button[data-cam="BAGALUR_METRO"]');
                if (metroBtn) metroBtn.click();
                """
            })
            await asyncio.sleep(2.0)

            # Capture Metro Station Angle Screenshot
            shot2 = await send("Page.captureScreenshot", {"format": "png"})
            with open(SCREENSHOT_PATH_2, "wb") as f:
                f.write(base64.b64decode(shot2["data"]))
            print("Saved metro station angle screenshot:", SCREENSHOT_PATH_2)

            # Check scene statistics
            res = await send("Runtime.evaluate", {
                "expression": """
                ({
                    hasMetroGroup: !!window.appInstance?.renderer?.threeScene?.metroGroup,
                    hasMetroTrain: !!window.appInstance?.renderer?.threeScene?.metroTrain,
                    metroTrainZ: window.appInstance?.renderer?.threeScene?.metroTrain?.position?.z,
                    totalVehicles: window.appInstance?.renderer?.threeScene?.vehicleMeshes?.size || 0,
                    cameraMode: window.appInstance?.renderer?.threeScene?.cameraMode
                })
                """,
                "returnByValue": True
            })
            print("Scene Verification Stats:", json.dumps(res.get("result", {}).get("value"), indent=2))

    finally:
        chrome_proc.terminate()

if __name__ == "__main__":
    asyncio.run(main())
