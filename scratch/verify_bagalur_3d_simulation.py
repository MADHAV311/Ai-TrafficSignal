import asyncio
import json
import os
import subprocess
import time
import urllib.request
import base64
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9225
ARTIFACT_DIR = r"C:\Users\vsoma\.gemini\antigravity\brain\1d3d6bd2-0a66-41d7-a3b6-2477972643c3"
SCREENSHOT_PATH = os.path.join(ARTIFACT_DIR, "screenshot_bagalur_cross_3d_simulation.png")

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
                    res = json.loads(await ws.recv())
                    if res.get("id") == cid:
                        return res.get("result", {})

            await send("Page.enable")
            await send("Runtime.enable")
            
            # Wait 3 seconds for initial 3D scene and backend sync
            await asyncio.sleep(3.0)

            # Activate Bagalur Live situation mode
            eval_mode = await send("Runtime.evaluate", {
                "expression": """
                (() => {
                    const btn = document.querySelector('.situation-btn.bagalur-live');
                    if (btn) {
                        btn.click();
                        return { clicked: true };
                    }
                    return { clicked: false };
                })()
                """,
                "returnByValue": True
            })
            print("Bagalur Live Situation Button Clicked:", eval_mode.get("result", {}).get("value"))

            # Wait 2 seconds for camera transition and vehicle movement
            await asyncio.sleep(2.0)

            # Check 3D HUD DOM values
            eval_hud = await send("Runtime.evaluate", {
                "expression": """
                (() => {
                    return {
                        hudVisible: !!document.getElementById('bagalur-3d-live-hud'),
                        serverTime: document.getElementById('b3d-server-time')?.innerText,
                        spdA: document.getElementById('b3d-spd-a')?.innerText,
                        spdC: document.getElementById('b3d-spd-c')?.innerText,
                        spdB: document.getElementById('b3d-spd-b')?.innerText,
                        spdD: document.getElementById('b3d-spd-d')?.innerText,
                        temp: document.getElementById('b3d-temp')?.innerText,
                        weather: document.getElementById('b3d-weather')?.innerText
                    };
                })()
                """,
                "returnByValue": True
            })
            hud_data = eval_hud.get("result", {}).get("value")
            print("3D Viewport HUD Data:", json.dumps(hud_data, indent=2))

            # Capture Screenshot of the live 3D simulation
            ss_res = await send("Page.captureScreenshot", {"format": "png"})
            b64_img = ss_res.get("data", "")
            if b64_img:
                with open(SCREENSHOT_PATH, "wb") as f:
                    f.write(base64.b64decode(b64_img))
                print(f"✓ 3D Simulation screenshot saved to: {SCREENSHOT_PATH}")
            else:
                print("✗ Failed to capture screenshot")

    finally:
        chrome_proc.terminate()

if __name__ == "__main__":
    asyncio.run(main())
