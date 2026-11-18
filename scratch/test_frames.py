import asyncio
import json
import urllib.request
import websockets
import subprocess

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 9226

async def run():
    p = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        f"--remote-debugging-port={PORT}",
        "--disable-gpu",
        "--no-sandbox",
        "http://localhost:8080"
    ])
    try:
        await asyncio.sleep(2.5)
        with urllib.request.urlopen(f"http://localhost:{PORT}/json") as r:
            ws_url = json.loads(r.read())[0]["webSocketDebuggerUrl"]
        async with websockets.connect(ws_url) as ws:
            req_id = 0
            async def send(method, params=None):
                nonlocal req_id
                req_id += 1
                cid = req_id
                await ws.send(json.dumps({"id": cid, "method": method, "params": params or {}}))
                while True:
                    m = json.loads(await ws.recv())
                    if m.get("id") == cid:
                        return m.get("result", {})

            await send("Page.enable")
            await send("Runtime.enable")
            await asyncio.sleep(3.0)

            script = """
            new Promise(resolve => {
                const ts = window.appInstance.renderer.threeScene;
                const posLog = [];
                let targetId = null;

                function record() {
                    if (!targetId) {
                        for (const [id, mesh] of ts.vehicleMeshes.entries()) {
                            if (mesh.userData.speed > 30) {
                                targetId = id;
                                break;
                            }
                        }
                    }
                    if (targetId && ts.vehicleMeshes.has(targetId)) {
                        const m = ts.vehicleMeshes.get(targetId);
                        posLog.push({ x: m.position.x, z: m.position.z, spd: m.userData.speed });
                        if (posLog.length >= 25) {
                            resolve({ id: targetId, posLog });
                            return;
                        }
                    }
                    requestAnimationFrame(record);
                }
                record();
            })
            """
            eval_res = await send("Runtime.evaluate", {"expression": script, "awaitPromise": True, "returnByValue": True})
            val = eval_res["result"]["value"]
            print("Tracked vehicle:", val["id"])
            for i, p_info in enumerate(val["posLog"]):
                dx = p_info["x"] - val["posLog"][i-1]["x"] if i > 0 else 0
                dz = p_info["z"] - val["posLog"][i-1]["z"] if i > 0 else 0
                dist = (dx*dx + dz*dz)**0.5
                print(f"Frame {i:02d}: x={p_info['x']:.2f}, z={p_info['z']:.2f}, speed={p_info['spd']:.1f}, step={dist:.3f}")
    finally:
        p.terminate()

if __name__ == "__main__":
    asyncio.run(run())
