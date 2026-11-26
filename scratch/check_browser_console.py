import subprocess
import json
import time
import urllib.request
import os

# Start Chrome in remote debugging mode
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
user_data_dir = r"C:\Users\vsoma\AppData\Local\Temp\chrome_test_profile"
port = 9222

cmd = [
    chrome_path,
    f"--remote-debugging-port={port}",
    f"--user-data-dir={user_data_dir}",
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "http://127.0.0.1:8080"
]

proc = subprocess.Popen(cmd)
time.sleep(3)

try:
    # Get webSocketDebuggerUrl
    tabs = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{port}/json").read().decode())
    target_tab = None
    for tab in tabs:
        if "8080" in tab.get("url", ""):
            target_tab = tab
            break
    if not target_tab:
        target_tab = tabs[0]
    
    ws_url = target_tab["webSocketDebuggerUrl"]
    print("Found tab:", target_tab.get("url"))

    import asyncio
    import websockets

    async def run():
        async with websockets.connect(ws_url, max_size=100*1024*1024) as ws:
            # Enable Runtime and Console
            await ws.send(json.dumps({"id": 1, "method": "Console.enable"}))
            await ws.send(json.dumps({"id": 2, "method": "Runtime.enable"}))
            await ws.send(json.dumps({"id": 3, "method": "Log.enable"}))

            # Wait a few seconds and collect console logs
            logs = []
            
            # Evaluate some JS to check status
            eval_req = {
                "id": 4,
                "method": "Runtime.evaluate",
                "params": {
                    "expression": """
                    ({
                        hasThreeScene: !!window.dashboardUI?.threeScene,
                        vehiclesInScene: window.dashboardUI?.threeScene?.vehicleMeshes?.size || 0,
                        currentSituation: window.dashboardUI?.currentMode || 'none',
                        hasErrors: window.errors || []
                    })
                    """,
                    "returnByValue": True
                }
            }
            await ws.send(json.dumps(eval_req))

            t0 = time.time()
            while time.time() - t0 < 4:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=1.0)
                    data = json.loads(msg)
                    if data.get("id") == 4:
                        print("JS Evaluation result:", data.get("result", {}).get("value"))
                    if "Runtime.consoleAPICalled" in data.get("method", ""):
                        print("Console:", data.get("params", {}).get("type"), [a.get("value") for a in data.get("params", {}).get("args", [])])
                    if "Runtime.exceptionThrown" in data.get("method", ""):
                        print("EXCEPTION:", data.get("params"))
                except asyncio.TimeoutError:
                    pass

    asyncio.run(run())

finally:
    proc.terminate()
