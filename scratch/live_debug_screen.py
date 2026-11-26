import asyncio
import json
import os
import subprocess
import time
import urllib.request
import base64
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9226
ARTIFACT_DIR = r"C:\Users\vsoma\.gemini\antigravity\brain\1d3d6bd2-0a66-41d7-a3b6-2477972643c3"
SCREENSHOT_PATH = os.path.join(ARTIFACT_DIR, "live_debug_screen.png")

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
            await send("Console.enable")

            # Collect console messages
            eval_res = await send("Runtime.evaluate", {
                "expression": """
                ({
                    url: window.location.href,
                    title: document.title,
                    hasDashboardUI: !!window.dashboardUI,
                    hasThreeScene: !!window.dashboardUI?.threeScene,
                    meshCount: window.dashboardUI?.threeScene?.vehicleMeshes?.size || 0,
                    isPlaying: window.dashboardUI?.isPlaying,
                    heroMode: window.dashboardUI?.heroMode,
                    currentMode: window.dashboardUI?.currentMode,
                    errors: window.__errors || []
                })
                """,
                "returnByValue": True
            })
            print("Status in browser:", json.dumps(eval_res.get("result", {}).get("value"), indent=2))

            # Wait another 2 seconds
            await asyncio.sleep(2.0)

            # Capture screenshot
            shot = await send("Page.captureScreenshot", {"format": "png"})
            with open(SCREENSHOT_PATH, "wb") as f:
                f.write(base64.b64decode(shot["data"]))
            print("Screenshot saved to", SCREENSHOT_PATH)

    finally:
        chrome_proc.terminate()

if __name__ == "__main__":
    asyncio.run(main())
