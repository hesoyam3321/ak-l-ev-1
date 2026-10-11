"""
Remote PC Wake-on-LAN Web Server
Sade, modern ve bagimsiz (hicbir ek kutuphane gerektirmez, saf Python 3).
"""

import http.server
import socketserver
import socket
import json
import os
import sys
import subprocess
import platform
import time
import secrets
import mimetypes

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")

# Basit bellek ici oturum anahtarlari
VALID_SESSIONS = set()

def load_config():
    default_config = {
        "target_mac": "2C:F0:5D:A7:F0:EC",
        "target_ip": "192.168.1.114",
        "broadcast_ip": "192.168.1.255",
        "wol_port": 9,
        "pc_name": "Eren PC (Realtek GbE)",
        "web_port": 5000,
        "password_hash_check": "3321"
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                default_config.update(data)
        except Exception as e:
            print(f"[!] Config okunamadi: {e}")
    return default_config

def save_config(cfg):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[!] Config kaydedilemedi: {e}")
        return False

def get_local_ip():
    """Cihazin agdaki yerel IP adresini bulur."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip

def send_wol_packet(mac_address, broadcast_ip="255.255.255.255", port=9):
    """Wake-on-LAN Sihirli Paketini (Magic Packet) gonderir."""
    # MAC adresini temizle (: veya - kaldir)
    cleaned_mac = mac_address.replace(":", "").replace("-", "").replace(".", "").strip()
    if len(cleaned_mac) != 12:
        raise ValueError(f"Gecersiz MAC Adresi: {mac_address} (12 karakter olmali)")
    
    # Sihirli paket: 6 byte 0xFF + 16 defa MAC adresi byte'i
    mac_bytes = bytes.fromhex(cleaned_mac)
    magic_packet = b"\xff" * 6 + mac_bytes * 16

    results = []
    # Hem hedefin ag yayinina hem de genel yayina (255.255.255.255) paket at
    targets = [broadcast_ip, "255.255.255.255"]
    for target in set(targets):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
                s.sendto(magic_packet, (target, int(port)))
                results.append(f"{target}:{port} adresine basariyla yollandi")
        except Exception as e:
            results.append(f"{target} hata: {str(e)}")
            
    return results

def check_ping(ip_address):
    """Hedef bilgisayarin acik olup olmadigini ping ile kontrol eder."""
    is_win = platform.system().lower() == "windows"
    cmd = ["ping", "-n" if is_win else "-c", "1", "-w" if is_win else "-W", "1000" if is_win else "1", ip_address]
    try:
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return res.returncode == 0
    except Exception:
        return False

class WolRequestHandler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        # CORS & Guvenlik basliklari
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def check_auth(self):
        auth_header = self.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            if token in VALID_SESSIONS:
                return True
        return False

    def send_json(self, status_code, data):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        parsed_path = self.path.split("?")[0]

        # API: Hedef PC Durumunu Kontrol Et
        if parsed_path == "/api/status":
            cfg = load_config()
            target_ip = cfg.get("target_ip", "192.168.1.114")
            is_online = check_ping(target_ip)
            self.send_json(200, {
                "success": True,
                "online": is_online,
                "target_ip": target_ip,
                "target_mac": cfg.get("target_mac", "2C:F0:5D:A7:F0:EC"),
                "pc_name": cfg.get("pc_name", "Eren PC"),
                "time": time.time()
            })
            return

        # API: Ayarlari Oku
        if parsed_path == "/api/config":
            if not self.check_auth():
                self.send_json(401, {"success": False, "message": "Yetkisiz erisim"})
                return
            cfg = load_config()
            # Guvenlik icin sifreyi gondermiyoruz
            safe_cfg = {k: v for k, v in cfg.items() if k != "password_hash_check"}
            self.send_json(200, {"success": True, "config": safe_cfg})
            return

        # Statik Dosyalari Sun (Kok Dizin veya public/)
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        rel_path = "index.html" if (parsed_path == "/" or parsed_path == "") else parsed_path.lstrip("/")

        # Once kok dizine bak, yoksa public dizinine bak
        file_path = os.path.join(BASE_DIR, rel_path)
        if not (os.path.exists(file_path) and os.path.isfile(file_path)):
            file_path = os.path.join(PUBLIC_DIR, rel_path)

        # Guvenlik kontrolu (Directory Traversal engelleme)
        abs_file = os.path.abspath(file_path)
        if not (abs_file.startswith(BASE_DIR) or abs_file.startswith(os.path.abspath(PUBLIC_DIR))):
            self.send_response(403)
            self.end_headers()
            return

        # Sadece statik izin verilen uzantilari sun
        allowed_exts = (".html", ".css", ".js", ".json", ".png", ".jpg", ".svg", ".ico")
        if not any(abs_file.lower().endswith(ext) for ext in allowed_exts):
            self.send_response(403)
            self.end_headers()
            return

        if os.path.exists(file_path) and os.path.isfile(file_path):
            mime_type, _ = mimetypes.guess_type(file_path)
            if not mime_type:
                mime_type = "application/octet-stream"
            
            with open(file_path, "rb") as f:
                content = f.read()

            self.send_response(200)
            self.send_header("Content-Type", f"{mime_type}; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"404 Not Found")

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
        try:
            req_data = json.loads(body)
        except Exception:
            req_data = {}

        parsed_path = self.path.split("?")[0]

        # 1. GIRIS API: Kullanici adi: admin, Sifre: 3321
        if parsed_path == "/api/login":
            username = req_data.get("username", "").strip()
            password = str(req_data.get("password", "")).strip()

            cfg = load_config()
            expected_pw = str(cfg.get("password_hash_check", "3321")).strip()

            if username == "admin" and password == expected_pw:
                token = secrets.token_hex(24)
                VALID_SESSIONS.add(token)
                self.send_json(200, {
                    "success": True,
                    "token": token,
                    "message": "Giris basarili!",
                    "user": "admin"
                })
            else:
                self.send_json(401, {
                    "success": False,
                    "message": "Hatali sifre veya kullanici adi! (Varsayilan: 3321)"
                })
            return

        # 2. BİLGİSAYARI AÇ (WAKE-ON-LAN) API
        if parsed_path == "/api/wake":
            if not self.check_auth():
                self.send_json(401, {"success": False, "message": "Lutfen once giris yapin."})
                return

            cfg = load_config()
            target_mac = req_data.get("mac") or cfg.get("target_mac", "2C:F0:5D:A7:F0:EC")
            broadcast_ip = req_data.get("broadcast") or cfg.get("broadcast_ip", "192.168.1.255")
            wol_port = int(req_data.get("port") or cfg.get("wol_port", 9))

            try:
                logs = send_wol_packet(target_mac, broadcast_ip, wol_port)
                self.send_json(200, {
                    "success": True,
                    "message": f"Sihirli Paket (Wake-on-LAN) {target_mac} adresine yollandi!",
                    "logs": logs,
                    "target_mac": target_mac
                })
            except Exception as e:
                self.send_json(500, {
                    "success": False,
                    "message": f"Hata olustu: {str(e)}"
                })
            return

        # 3. BILGISAYAR KONTROL (Kapat / Yeniden Baslat / Uyku)
        # Sadece sunucu bu bilgisayarda calisiyorsa dogrudan uygular
        if parsed_path == "/api/power":
            if not self.check_auth():
                self.send_json(401, {"success": False, "message": "Lutfen once giris yapin."})
                return

            action = req_data.get("action", "")
            is_win = platform.system().lower() == "windows"

            if action == "sleep":
                if is_win:
                    subprocess.Popen(["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"])
                    self.send_json(200, {"success": True, "message": "Bilgisayar uyku moduna aliniyor..."})
                else:
                    self.send_json(200, {"success": True, "message": "Uyku komutu gonderildi."})
                return
            elif action == "restart":
                if is_win:
                    subprocess.Popen(["shutdown", "/r", "/t", "5", "/c", "Uzaktan yeniden baslatiliyor"])
                    self.send_json(200, {"success": True, "message": "Bilgisayar 5 saniye icinde yeniden baslatilacak."})
                return
            elif action == "shutdown":
                if is_win:
                    subprocess.Popen(["shutdown", "/s", "/t", "5", "/c", "Uzaktan kapatiliyor"])
                    self.send_json(200, {"success": True, "message": "Bilgisayar 5 saniye icinde kapatilacak."})
                return
            else:
                self.send_json(400, {"success": False, "message": "Bilinmeyen guc komutu"})
                return

        # 4. AYARLARI GUNCELLEME API
        if parsed_path == "/api/config":
            if not self.check_auth():
                self.send_json(401, {"success": False, "message": "Yetkisiz islem"})
                return

            cfg = load_config()
            if "target_mac" in req_data:
                cfg["target_mac"] = req_data["target_mac"].strip()
            if "target_ip" in req_data:
                cfg["target_ip"] = req_data["target_ip"].strip()
            if "broadcast_ip" in req_data:
                cfg["broadcast_ip"] = req_data["broadcast_ip"].strip()
            if "wol_port" in req_data:
                cfg["wol_port"] = int(req_data["wol_port"])
            if "pc_name" in req_data:
                cfg["pc_name"] = req_data["pc_name"].strip()

            if save_config(cfg):
                self.send_json(200, {"success": True, "message": "Ayarlar kaydedildi!", "config": cfg})
            else:
                self.send_json(500, {"success": False, "message": "Ayarlar kaydedilemedi."})
            return

        self.send_response(404)
        self.end_headers()

def run_server():
    cfg = load_config()
    port = int(cfg.get("web_port", 5000))
    local_ip = get_local_ip()

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", port), WolRequestHandler) as httpd:
        print("=" * 60)
        print("[*] REMOTE PC WAKE-ON-LAN WEB SUNUCUSU BASLATILDI")
        print("=" * 60)
        print(f"-> Bilgisayardan erisim: http://localhost:{port}")
        print(f"-> Telefondan erisim:    http://{local_ip}:{port}")
        print("-" * 60)
        print(f"- Varsayilan Kullanici: admin")
        print(f"- Varsayilan Sifre:     3321")
        print(f"- Hedef MAC:            {cfg.get('target_mac')}")
        print(f"- Hedef IP:             {cfg.get('target_ip')}")
        print("=" * 60)
        print("Sunucuyu kapatmak icin bu pencereyi kapatabilir veya Ctrl+C yapabilirsiniz.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nSunucu kapatildi.")

if __name__ == "__main__":
    run_server()
