#!/usr/bin/env python3
"""
Creator Newsdesk Dashboard Server

A simple HTTP server that serves the dashboard UI and provides API endpoints
for managing the news pipeline, configuration, and OpenClaw agent deployment.

Endpoints:
    - GET  /              : Serve dashboard files
    - GET  /config.json   : Get current configuration
    - POST /api/save-config: Save configuration
    - POST /api/run-pipeline: Start the news pipeline
    - POST /api/fetch-50  : Fetch 50 articles from Brave API
    - GET  /api/status    : Get pipeline status
    - POST /api/deploy-openclaw: Deploy OpenClaw agent script

Author: Matthew Murphy
License: MIT
"""

import json
import os
import requests
import hmac
import tempfile
from pathlib import Path
from urllib.parse import urlsplit
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime
import threading
import time

# File paths for status and configuration
STATUS_FILE = os.environ.get("CND_STATUS_FILE", "pipeline_status.json")
CONFIG_FILE = os.environ.get("CND_CONFIG_FILE", "config.json")

# Default status returned when no status file exists
# Used to track pipeline execution state
default_status = {
    "running": False,           # Is pipeline currently running
    "started": None,             # ISO timestamp when started
    "completed": None,          # ISO timestamp when completed
    "stats": {                  # Pipeline statistics
        "fetched": 0,           # Articles fetched from Brave
        "processed": 0,        # Articles processed
        "created": 0,          # Posts created in WordPress
        "skipped": 0,          # Articles skipped (duplicates/errors)
        "errors": 0            # Number of errors encountered
    },
    "lastPost": None,           # Title of last created post
    "lastError": None          # Last error message
}


def load_status():
    """
    Load pipeline status from JSON file.
    
    Returns:
        dict: Current status or default_status if file doesn't exist
    """
    if os.path.exists(STATUS_FILE):
        try:
            return json.load(open(STATUS_FILE))
        except:
            # If file is corrupted, return defaults
            pass
    return default_status.copy()


def save_status(data):
    """
    Save pipeline status to JSON file.
    
    Args:
        data (dict): Status dictionary to save
    """
    json.dump(data, open(STATUS_FILE, "w"), indent=2)


# Copyright (c) 2026 Matthew X Murphy — https://MatthewxMurphy.com
# Product: https://builtnotbegged.com — SPDX-License-Identifier: MIT
# Static routing is deliberately separate from the working/configuration directory.
PUBLIC_ROOT = Path(__file__).resolve().parent
PUBLIC_FILES = {"dashboard.html", "chart.umd.min.js", "CreatorNewsdesk-Cover.png", "CreatorNewsdesk.png",
    "creatornewsdesk-favicon-512.png", "creatornewsdesk-fb-cover-1640x624.jpg",
    "creatornewsdesk-header-1920x500.jpg", "creatornewsdesk-header-nologo-1600x600.jpg",
    "creatornewsdesk-logo-header-228.png"}
MAX_BODY = 1024 * 1024


def private_json_write(destination, value):
    """Replace config atomically with a private inode, retaining original on error."""
    destination = Path(destination)
    if destination.is_symlink():
        raise ValueError("Configuration symlinks are not supported")
    descriptor, temporary = tempfile.mkstemp(prefix=".cnd-config-", dir=destination.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            json.dump(value, output, indent=2)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, destination)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def create_server(host="127.0.0.1", port=8888, token=None):
    """An external/private transport does not replace owner authentication."""
    token = token if token is not None else os.environ.get("CND_DASHBOARD_TOKEN", "")
    if len(token.encode("utf-8")) < 32:
        raise ValueError("Set CND_DASHBOARD_TOKEN to at least 32 random bytes before starting")
    server = HTTPServer((host, port), Handler)
    server.dashboard_token = token
    return server


class Handler(SimpleHTTPRequestHandler):
    """
    HTTP request handler for dashboard API endpoints.
    
    Extends SimpleHTTPRequestHandler to provide REST API for:
    - Pipeline control (start, status)
    - Configuration management
    - OpenClaw agent deployment
    """
    
    def log_message(self, format, *args):
        # Never log a request target/query that could contain operator credentials.
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def authorized(self):
        expected = getattr(self.server, "dashboard_token", "")
        supplied = self.headers.get("Authorization", "")
        if not expected or not hmac.compare_digest(supplied.encode(), ("Bearer " + expected).encode()):
            self.send_error(401, "Owner authentication required")
            return False
        origin = self.headers.get("Origin")
        if origin:
            parsed = urlsplit(origin)
            if parsed.scheme not in {"http", "https"} or parsed.netloc != self.headers.get("Host"):
                self.send_error(403, "Cross-origin requests denied")
                return False
        return True

    def serve_public(self, head=False):
        target = "dashboard.html" if self.path == "/" else self.path.lstrip("/")
        if target not in PUBLIC_FILES:
            self.send_error(404)
            return
        file = PUBLIC_ROOT / target
        if not file.is_file() or file.is_symlink():
            self.send_error(404)
            return
        payload = file.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", self.guess_type(str(file)))
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        if not head:
            self.wfile.write(payload)

    def do_HEAD(self):
        self.path = urlsplit(self.path).path
        self.serve_public(head=True)

    def do_GET(self):
        """
        Handle GET requests for API endpoints and static files.
        """
        self.path = urlsplit(self.path).path
        if self.path in {"/api/status", "/config.json", "/api/config"} and not self.authorized():
            return
        # API: Get pipeline status
        if self.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(load_status()).encode())
            
        # API: Get configuration
        elif self.path == '/config.json' or self.path == '/api/config':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            if os.path.exists(CONFIG_FILE):
                self.wfile.write(Path(CONFIG_FILE).read_bytes())
            else:
                self.wfile.write(b'{}')
                
        # Serve static files (dashboard.html, images, etc.)
        else:
            # Use default file serving for other requests
            self.serve_public()
    
    def do_POST(self):
        """
        Handle POST requests for API endpoints.
        """
        if not self.authorized():
            return
        if self.headers.get("Transfer-Encoding"):
            self.send_error(400, "Chunked bodies are not supported")
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_error(400, "Invalid body length")
            return
        if not 0 <= size <= MAX_BODY:
            self.send_error(413, "Request too large")
            return
        # API: Run the news pipeline
        if self.path == '/api/run-pipeline':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            # Update status to indicate pipeline is running
            status = load_status()
            status["running"] = True
            status["started"] = datetime.now().isoformat()
            status["stats"] = {"fetched": 0, "processed": 0, "created": 0, "skipped": 0, "errors": 0}
            save_status(status)
            
            # Note: Actual pipeline execution would be started in a separate thread
            # For now, we just update status. The actual pipeline (cnd_news_pipeline.py)
            # would need to be run separately or via subprocess
            self.wfile.write(json.dumps({"status": "started"}).encode())
            
        # API: Fetch 50 articles from Brave API
        elif self.path.startswith('/api/fetch-50'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            # Extract date parameter if provided
            date_param = "2025-02-01"
            if 'date=' in self.path:
                date_param = self.path.split('date=')[1].split('&')[0]
            
            # Load config to get Brave API key
            config = {}
            if os.path.exists(CONFIG_FILE):
                config = json.load(open(CONFIG_FILE))
            
            brave_keys = config.get("sites", [{}])[0].get("brave_keys", [])
            api_key = brave_keys[0] if brave_keys else ""
            
            # Fetch from Brave Search API
            # This is a simplified example - actual implementation would
            # use brave_fetch_news.py with proper search queries
            articles = []
            if api_key:
                try:
                    # Example API call structure
                    # response = requests.get(
                    #     f"https://api.search.brave.com/res/v1/web/search?q=tech+news&count=50",
                    #     headers={"X-Subscription-Token": api_key}
                    # )
                    # articles = response.json().get("web", {}).get("results", [])
                    pass
                except Exception as e:
                    status = load_status()
                    status["lastError"] = str(e)
                    save_status(status)
            
            self.wfile.write(json.dumps({"articles": articles}).encode())
            
        # API: Save configuration
        elif self.path == '/api/save-config':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            try:
                config_data = json.loads(body)
                if not isinstance(config_data, dict):
                    raise ValueError("Configuration must be a JSON object")
                private_json_write(CONFIG_FILE, config_data)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "saved"}).encode())
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
                
        # API: Deploy OpenClaw agent script
        elif self.path == '/api/deploy-openclaw':
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            
            # Load config for API keys
            config = {}
            if os.path.exists(CONFIG_FILE):
                config = json.load(open(CONFIG_FILE))
            
            site = config.get("sites", [{}])[0] if config.get("sites") else {}
            xai_key = ""
            if site:
                xai = site.get("external_ai", {}).get("xai", {})
                xai_key = xai.get("api_key", "")
            
            # Generate shell script to set up OpenClaw agent
            # This script would be run on the user's Mac to set up
            # the OpenClaw agent for image generation
            script = f"""#!/bin/bash
# CND OpenClaw Agent Setup Script
# Run this on your Mac: chmod +x openclaw-agent.sh && ./openclaw-agent.sh

set -e

echo "Setting up CND OpenClaw Agent..."

mkdir -p ~/.cnd-openclaw

# Write configuration file
cat > ~/.cnd-openclaw/config.json << 'CFEOF'
{{
    "xai_api_key": "YOUR_XAI_KEY_HERE",
    "dashboard_url": "http://192.168.88.11:8888",
    "wp_api_base": "https://www.creatornewsdesk.com/wp-json",
    "providers": {{
        "openclaw": {{"enabled": true, "url": "http://localhost:8050"}},
        "xai": {{"enabled": true}},
        "comfyui": {{"enabled": false, "url": "http://localhost:8188"}},
        "a1111": {{"enabled": false, "url": "http://localhost:7860"}}
    }},
    "fallback_chain": ["openclaw", "xai", "comfyui", "a1111"]
}}
CFEOF

echo "Config saved to ~/.cnd-openclaw/config.json"
echo "Edit the config file to add your API keys, then run the agent."
"""
            
            self.wfile.write(script.encode())
            
        else:
            self.send_response(404)
            self.end_headers()


def run_pipeline_thread():
    """
    Background thread to run the news pipeline.
    
    This would import and run cnd_news_pipeline.py in a separate
    thread to avoid blocking the HTTP server.
    """
    # Import and run pipeline
    # import cnd_news_pipeline
    # cnd_news_pipeline.main()
    pass


# Server configuration
PORT = 8888


if __name__ == '__main__':
    """
    Main entry point for the dashboard server.
    
    Starts HTTP server on specified port and serves dashboard UI
    and API endpoints.
    """
    print("=" * 50)
    print(f"Dashboard: http://localhost:{PORT}/dashboard.html")
    print("=" * 50)
    
    # Create and start HTTP server
    # Handler class handles all HTTP requests
    server = create_server(os.environ.get('CND_DASHBOARD_HOST', '127.0.0.1'), PORT)
    server.serve_forever()
