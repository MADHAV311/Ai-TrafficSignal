import asyncio
import json
import os
import subprocess
import time
import urllib.request
import base64
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9224
ARTIFACT_DIR = r"C:\Users\vsoma\.gemini\antigravity\brain\1d3d6bd2-0a66-41d7-a3b6-2477972643c3"
SCREENSHOT_PATH = os.path.join(ARTIFACT_DIR, "screenshot_bagalur_cross_telemetry.png")

async def main():
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        f"--remote-debugging-port={REMOTE_PORT}",
        "--disable-gpu",
        "--no-sandbox",
        "--window-size=1600,1100",
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
            
            # Wait 2 seconds for initial backend sync
            await asyncio.sleep(2.0)

            # Click Bagalur tab
            eval_res = await send("Runtime.evaluate", {
                "expression": """
                (() => {
                    const btn = document.querySelector('.nav-tab-btn[data-view="bagalur"]');
                    if (btn) {
                        btn.click();
                        return { clicked: true };
                    }
                    return { clicked: false };
                })()
                """,
                "returnByValue": True
            })
            print("Tab Clicked:", eval_res.get("result", {}).get("value"))

            # Wait 1.5s for tab render and metrics population
            await asyncio.sleep(1.5)

            # Check DOM elements
            eval_dom = await send("Runtime.evaluate", {
                "expression": """
                (() => {
                    return {
                        syncStatus: document.getElementById('bagalur-sync-status')?.innerText,
                        serverTime: document.getElementById('bagalur-server-time')?.innerText,
                        spdA: document.getElementById('spd-a-val')?.innerText,
                        spdB: document.getElementById('spd-b-val')?.innerText,
                        spdC: document.getElementById('spd-c-val')?.innerText,
                        spdD: document.getElementById('spd-d-val')?.innerText,
                        temp: document.getElementById('bengaluru-temp')?.innerText,
                        weatherCondition: document.getElementById('bengaluru-condition')?.innerText,
                        cameraDetections: document.getElementById('camera-total-detections')?.innerText
                    };
                })()
                """,
                "returnByValue": True
            })
            dom_data = eval_dom.get("result", {}).get("value")
            print("DOM Telemetry Data:", json.dumps(dom_data, indent=2))

            # Capture Screenshot
            ss_res = await send("Page.captureScreenshot", {"format": "png"})
            b64_img = ss_res.get("data", "")
            if b64_img:
                with open(SCREENSHOT_PATH, "wb") as f:
                    f.write(base64.b64decode(b64_img))
                print(f"✓ Screenshot saved to: {SCREENSHOT_PATH}")
            else:
                print("✗ Failed to capture screenshot")

    finally:
        chrome_proc.terminate()

if __name__ == "__main__":
    asyncio.run(main())
