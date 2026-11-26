import asyncio
import json
import os
import subprocess
import time
import urllib.request
import base64
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9227

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
            await send("Log.enable")

            # Check appInstance
            res = await send("Runtime.evaluate", {
                "expression": """
                ({
                    hasApp: !!window.appInstance,
                    hasRenderer: !!window.appInstance?.renderer,
                    hasThreeScene: !!window.appInstance?.renderer?.threeScene,
                    meshCount: window.appInstance?.renderer?.threeScene?.vehicleMeshes?.size || 0,
                    viewMode: window.appInstance?.renderer?.viewMode,
                    latestStateReceived: !!window.appInstance?.latestState,
                    vehiclesInLatestState: window.appInstance?.latestState?.simAdaptive?.vehicles?.length || 0,
                    situationMode: window.appInstance?.latestState?.situationMode
                })
                """,
                "returnByValue": True
            })
            print("App inspection:", json.dumps(res.get("result", {}).get("value"), indent=2))

    finally:
        chrome_proc.terminate()

if __name__ == "__main__":
    asyncio.run(main())
