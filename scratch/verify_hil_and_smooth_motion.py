import asyncio
import json
import os
import subprocess
import time
import urllib.request
import base64
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9228
ARTIFACT_DIR = r"C:\Users\vsoma\.gemini\antigravity\brain\1d3d6bd2-0a66-41d7-a3b6-2477972643c3"
SCREENSHOT_PATH = os.path.join(ARTIFACT_DIR, "screenshot_bagalur_cross_hil_smooth.png")

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

            # Click Bagalur Live situation mode button
            await send("Runtime.evaluate", {
                "expression": """
                const btn = document.querySelector('button[data-mode="BAGALUR_LIVE"]');
                if (btn) btn.click();
                """
            })

            # Wait 3 seconds for simulation to populate and render
            await asyncio.sleep(3.0)

            # Evaluate DOM and 3D mesh state
            eval_res = await send("Runtime.evaluate", {
                "expression": """
                ({
                    relayByte: document.getElementById('b3d-relay-byte')?.textContent,
                    timerA: document.getElementById('b3d-timer-a')?.textContent,
                    relayA: document.getElementById('b3d-relay-a')?.textContent,
                    total3DMeshes: window.appInstance?.renderer?.threeScene?.vehicleMeshes?.size || 0,
                    vehicleTypesInScene: (() => {
                        const types = {};
                        window.appInstance?.renderer?.threeScene?.vehicleMeshes?.forEach(m => {
                            const t = m.userData?.type || 'UNKNOWN';
                            types[t] = (types[t] || 0) + 1;
                        });
                        return types;
                    })()
                })
                """,
                "returnByValue": True
            })
            val = eval_res.get("result", {}).get("value", {})
            print("Browser HIL Status:", json.dumps(val, indent=2))

            # Take high-resolution screenshot
            shot = await send("Page.captureScreenshot", {"format": "png"})
            with open(SCREENSHOT_PATH, "wb") as f:
                f.write(base64.b64decode(shot["data"]))
            print("Saved screenshot to", SCREENSHOT_PATH)

    finally:
        chrome_proc.terminate()

if __name__ == "__main__":
    asyncio.run(main())
