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
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime
import threading
import time

# File paths for status and configuration
STATUS_FILE = "pipeline_status.json"
CONFIG_FILE = "config.json"

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


class Handler(SimpleHTTPRequestHandler):
    """
    HTTP request handler for dashboard API endpoints.
    
    Extends SimpleHTTPRequestHandler to provide REST API for:
    - Pipeline control (start, status)
    - Configuration management
    - OpenClaw agent deployment
    """
    
    def do_GET(self):
        """
        Handle GET requests for API endpoints and static files.
        """
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
                self.wfile.write(open(CONFIG_FILE).read().encode())
            else:
                self.wfile.write(b'{}')
                
        # Serve static files (dashboard.html, images, etc.)
        else:
            # Use default file serving for other requests
            SimpleHTTPRequestHandler.do_GET(self)
    
    def do_POST(self):
        """
        Handle POST requests for API endpoints.
        """
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
                with open(CONFIG_FILE, 'w') as f:
                    json.dump(config_data, f, indent=2)
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
    server = HTTPServer(('0.0.0.0', PORT), Handler)
    server.serve_forever()
