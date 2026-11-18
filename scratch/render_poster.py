import subprocess
import time
import json
import os
import urllib.request
import websocket
import base64

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 9448
USER_DATA_DIR = r"C:\Users\vsoma\AppData\Local\Temp\chrome_poster_render"

os.makedirs(USER_DATA_DIR, exist_ok=True)

# Launch headless Chrome with huge canvas (3840x2880)
cmd = [
    CHROME_PATH,
    "--headless=new",
    f"--remote-debugging-port={PORT}",
    f"--user-data-dir={USER_DATA_DIR}",
    "--window-size=3840,2880",
    "--hide-scrollbars",
    "--disable-gpu",
    "--no-sandbox",
    "--allow-file-access-from-files",
    "about:blank"
]

print("Launching Chrome...")
proc = subprocess.Popen(cmd)

try:
    time.sleep(2.5)
    
    # Query targets
    req = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json")
    targets = json.loads(req.read().decode())
    ws_url = targets[0]["webSocketDebuggerUrl"]
    print("Connecting to ws:", ws_url)
    
    ws = websocket.create_connection(ws_url, timeout=30)
    
    msg_id = 1
    def send_cmd(method, params=None):
        global msg_id
        payload = {"id": msg_id, "method": method, "params": params or {}}
        ws.send(json.dumps(payload))
        msg_id += 1
        while True:
            resp = json.loads(ws.recv())
            if resp.get("id") == payload["id"]:
                return resp.get("result", {})
    
    # Enable Page and Emulation
    send_cmd("Page.enable")
    send_cmd("Emulation.setDeviceMetricsOverride", {
        "width": 3840,
        "height": 2880,
        "deviceScaleFactor": 1,
        "mobile": False
    })
    
    # Navigate to poster HTML
    poster_path = "file:///d:/PS1/poster/index.html"
    print("Navigating to:", poster_path)
    send_cmd("Page.navigate", {"url": poster_path})
    
    # Wait for document to load and fonts to settle
    time.sleep(4)
    
    # Evaluate document.fonts.ready
    eval_res = send_cmd("Runtime.evaluate", {
        "expression": "document.fonts.ready.then(() => true)",
        "awaitPromise": True
    })
    print("Fonts ready:", eval_res)
    time.sleep(2)
    
    # Capture Full-Resolution PNG Screenshot
    print("Capturing 4K/UHD Poster Screenshot...")
    shot_res = send_cmd("Page.captureScreenshot", {
        "format": "png",
        "captureBeyondViewport": True
    })
    
    img_bytes = base64.b64decode(shot_res["data"])
    out_png_workspace = r"d:\PS1\poster\poster_presentation_full.png"
    out_png_artifact = r"C:\Users\vsoma\.gemini\antigravity\brain\1d3d6bd2-0a66-41d7-a3b6-2477972643c3\poster_presentation_full.png"
    
    with open(out_png_workspace, "wb") as f:
        f.write(img_bytes)
    with open(out_png_artifact, "wb") as f:
        f.write(img_bytes)
    print("Saved screenshot to workspace and artifact dir!")
    
    # Capture PDF (48x36 in landscape)
    print("Generating Print-Ready PDF (48in x 36in)...")
    pdf_res = send_cmd("Page.printToPDF", {
        "paperWidth": 48.0,
        "paperHeight": 36.0,
        "marginTop": 0,
        "marginBottom": 0,
        "marginLeft": 0,
        "marginRight": 0,
        "printBackground": True,
        "preferCSSPageSize": True
    })
    
    pdf_bytes = base64.b64decode(pdf_res["data"])
    out_pdf_workspace = r"d:\PS1\poster\poster_presentation_48x36.pdf"
    with open(out_pdf_workspace, "wb") as f:
        f.write(pdf_bytes)
    print("Saved PDF to d:\\PS1\\poster\\poster_presentation_48x36.pdf")
    
    ws.close()
    print("Done successfully!")

finally:
    proc.terminate()
