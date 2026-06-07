"""公网隧道看门狗 - 自动维护隧道并记录URL"""
import os
import sys
import json
import time
import signal
import subprocess
import threading
import re

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public_url.json")
CLOUDFLARED_PATH = os.path.join(
    os.environ.get("LOCALAPPDATA", ""),
    "Microsoft", "WinGet", "Packages",
    "Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe",
    "cloudflared.exe"
)

# serveo备用URL提取正则
SERVEO_PATTERN = re.compile(r'Forwarding HTTP traffic from (https://[^\s]+)')


def write_url(source, url):
    """写入当前公网URL"""
    data = {"source": source, "url": url, "updated_at": time.strftime("%Y-%m-%d %H:%M:%S")}
    try:
        # 也尝试读取已有URL保留备用
        existing = {}
        if os.path.exists(URL_FILE):
            with open(URL_FILE, 'r') as f:
                existing = json.load(f)
        existing[source] = url
        existing["primary"] = url
        existing["updated_at"] = data["updated_at"]
        with open(URL_FILE, 'w') as f:
            json.dump(existing, f, ensure_ascii=False)
        print(f"[Tunnel] URL written: {url}")
    except Exception as e:
        print(f"[Tunnel] Failed to write URL: {e}")


def run_cloudflared():
    """运行cloudflared隧道"""
    if not os.path.exists(CLOUDFLARED_PATH):
        print(f"[Tunnel] cloudflared not found at {CLOUDFLARED_PATH}")
        return

    url_pattern = re.compile(r'https://[a-z0-9-]+\.trycloudflare\.com')

    while True:
        try:
            print("[Tunnel] Starting cloudflared...")
            proc = subprocess.Popen(
                [CLOUDFLARED_PATH, "tunnel", "--url", "http://localhost:8000"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
            )

            for line in proc.stdout:
                line = line.strip()
                if line:
                    print(f"[cloudflared] {line[:120]}")
                match = url_pattern.search(line)
                if match:
                    write_url("cloudflared", match.group(0))

            proc.wait()
            print("[Tunnel] cloudflared exited, restarting in 5s...")
        except Exception as e:
            print(f"[Tunnel] cloudflared error: {e}")
        time.sleep(5)


def run_serveo():
    """运行serveo SSH隧道作为备份"""
    while True:
        try:
            print("[Tunnel] Starting serveo backup...")
            proc = subprocess.Popen(
                ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ServerAliveInterval=60",
                 "-R", "80:localhost:8000", "serveo.net"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )

            for line in proc.stdout:
                line = line.strip()
                if line:
                    print(f"[serveo] {line[:120]}")
                match = SERVEO_PATTERN.search(line)
                if match:
                    write_url("serveo", match.group(1))

            proc.wait()
            print("[Tunnel] serveo exited, restarting in 5s...")
        except Exception as e:
            print(f"[Tunnel] serveo error: {e}")
        time.sleep(5)


def main():
    print("[Tunnel] Watchdog started")
    print(f"[Tunnel] URL file: {URL_FILE}")

    # 并行运行两个隧道
    threads = []
    if os.path.exists(CLOUDFLARED_PATH):
        t = threading.Thread(target=run_cloudflared, daemon=True)
        t.start()
        threads.append(t)

    t = threading.Thread(target=run_serveo, daemon=True)
    t.start()
    threads.append(t)

    # 保持主线程运行
    try:
        while True:
            time.sleep(30)
    except KeyboardInterrupt:
        print("[Tunnel] Shutting down...")


if __name__ == "__main__":
    main()
