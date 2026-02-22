#!/usr/bin/env python3
import json
import os
import requests
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime
import threading
import time

STATUS_FILE = "pipeline_status.json"
CONFIG_FILE = "config.json"

default_status = {
    "running": False,
    "started": None,
    "completed": None,
    "stats": {"fetched": 0, "processed": 0, "created": 0, "skipped": 0, "errors": 0},
    "lastPost": None,
    "lastError": None
}

def load_status():
    if os.path.exists(STATUS_FILE):
        try:
            return json.load(open(STATUS_FILE))
        except:
            pass
    return default_status.copy()

def save_status(data):
    json.dump(data, open(STATUS_FILE, "w"), indent=2)

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(load_status()).encode())
        elif self.path == '/api/run-pipeline':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            status = load_status()
            status["running"] = True
            status["started"] = datetime.now().isoformat()
            status["stats"] = {"fetched": 0, "processed": 0, "created": 0, "skipped": 0}
            save_status(status)
            
            threading.Thread(target=run_pipeline, daemon=True).start()
            
            self.wfile.write(json.dumps({"started": True}).encode())
        else:
            super().do_GET()
    
    def do_POST(self):
        if self.path == '/api/update':
            length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(length))
            
            status = load_status()
            if "stats" in data:
                status["stats"].update(data["stats"])
            if "lastPost" in data:
                status["lastPost"] = data["lastPost"]
            if "lastError" in data:
                status["lastError"] = data["lastError"]
            if "running" in data:
                status["running"] = data["running"]
                if not data["running"]:
                    status["completed"] = datetime.now().isoformat()
            save_status(status)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True}).encode())
        
        elif self.path == '/api/save-config':
            length = int(self.headers.get('Content-Length', 0))
            config_data = json.loads(self.rfile.read(length))
            
            json.dump(config_data, open(CONFIG_FILE, "w"), indent=2)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"saved": True}).encode())
        
        elif self.path == '/api/fetch-50':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            config = json.load(open(CONFIG_FILE)) if os.path.exists(CONFIG_FILE) else {}
            site = config.get("sites", [None])[0] if config.get("sites") else None
            
            if not site:
                self.wfile.write(json.dumps({"error": "No site configured"}).encode())
                return
            
            api_keys = config.get("brave_keys", [])
            if not api_keys:
                self.wfile.write(json.dumps({"error": "No Brave API keys configured"}).encode())
                return
            
            structure = site.get("search", {}).get("structure", {})
            all_terms = []
            
            for category, subcats in structure.items():
                if isinstance(subcats, dict):
                    for subcat, data in subcats.items():
                        terms = data.get("brands", []) if isinstance(data, dict) else data
                        if isinstance(terms, list):
                            all_terms.extend(terms)
                        elif isinstance(terms, str):
                            all_terms.append(terms)
            
            all_terms = list(set(all_terms))[:50]
            
            articles = []
            processed_urls = set()
            
            for term in all_terms:
                if len(articles) >= 50:
                    break
                    
                for key in api_keys:
                    if len(articles) >= 50:
                        break
                        
                    url = "https://api.search.brave.com/res/v1/web/search"
                    headers = {"Accept": "application/json", "X-Subscription-Token": key}
                    params = {"q": f"{term} February 1 2025", "count": 20, "freshness": "pd"}
                    
                    try:
                        r = requests.get(url, headers=headers, params=params, timeout=30)
                        if r.status_code == 200:
                            results = r.json().get("web", {}).get("results", [])
                            for result in results:
                                if len(articles) >= 50:
                                    break
                                article_url = result.get("url", "")
                                if article_url and article_url not in processed_urls:
                                    processed_urls.add(article_url)
                                    articles.append({
                                        "title": result.get("title", ""),
                                        "url": article_url,
                                        "description": result.get("description", ""),
                                        "category": term,
                                        "date": "2025-02-01"
                                    })
                    except Exception as e:
                        print(f"Search error: {e}")
            
            self.wfile.write(json.dumps({"articles": articles, "count": len(articles)}).encode())
        
        elif self.path == '/api/deploy-openclaw':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            import subprocess
            
            result = subprocess.run([
                'docker', 'run', '-d', '--name', 'openclaw',
                '-p', '8050:8050',
                'openclawi/openclaw'
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                self.wfile.write(json.dumps({"success": True, "url": "http://localhost:8050"}).encode())
            else:
                if 'already exists' in result.stderr:
                    subprocess.run(['docker', 'start', 'openclaw'], capture_output=True)
                    self.wfile.write(json.dumps({"success": True, "url": "http://localhost:8050", "note": "Started existing container"}).encode())
                else:
                    self.wfile.write(json.dumps({"success": False, "error": result.stderr[:200]}).encode())
        
        elif self.path == '/api/download-openclaw-agent':
            self.send_response(200)
            self.send_header('Content-Type', 'application/octet-stream')
            self.send_header('Content-Disposition', 'attachment; filename="openclaw-agent.sh"')
            self.end_headers()
            
            config = json.load(open(CONFIG_FILE)) if os.path.exists(CONFIG_FILE) else {}
            site = config.get("sites", [None])[0] if config.get("sites") else None
            
            xai_key = ""
            if site:
                xai = site.get("external_ai", {}).get("xai", {})
                xai_key = xai.get("api_key", "")
            
            script = """#!/bin/bash
# CND OpenClaw Agent Setup Script
# Run this on your Mac: chmod +x openclaw-agent.sh && ./openclaw-agent.sh

set -e

echo "🎯 Setting up CND OpenClaw Agent..."

mkdir -p ~/.cnd-openclaw

cat > ~/.cnd-openclaw/config.json << 'CFEOF'
{
    "xai_api_key": "XAI_KEY_PLACEHOLDER",
    "dashboard_url": "http://localhost:6666",
    "wp_api_base": "https://www.creatornewsdesk.com/wp-json",
    "providers": {
        "openclaw": {"enabled": true, "url": "http://localhost:8050"},
        "xai": {"enabled": true},
        "comfyui": {"enabled": false, "url": "http://localhost:8188"},
        "a1111": {"enabled": false, "url": "http://localhost:7860"}
    },
    "fallback_chain": ["openclaw", "xai", "comfyui", "a1111"]
}
CFEOF

echo "✅ Config saved to ~/.cnd-openclaw/config.json"

# Agent script placeholder - download from GitHub
echo "Downloading agent script..."
curl -sL https://raw.githubusercontent.com/anomalyco/opencode/main/agent.py -o ~/.cnd-openclaw/agent.py 2>/dev/null || echo "echo 'Run: pip install requests && python3 -c \\\"import requests;...\\\"'"

chmod +x ~/.cnd-openclaw/agent.py
echo "Done! Run: cd ~/.cnd-openclaw && ./agent.py"
"""

            self.send_response(200)

PORT = 8888

if __name__ == '__main__':
    print("=" * 50)
    print(f"Dashboard: http://localhost:{PORT}/dashboard.html")
    print("=" * 50)
    server = HTTPServer(('0.0.0.0', PORT), Handler)
    server.serve_forever()
