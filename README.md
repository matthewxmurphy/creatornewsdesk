# Creator Newsdesk

Automated news content pipeline for WordPress with AI-powered article rewriting and image generation.

## Features

- **Automated News Fetching** - Fetches news via Brave API from specific brands/creators/platforms
- **AI Article Rewriting** - Rewrites articles using local llama.cpp or external AI providers (xAI, OpenAI, MiniMax)
- **WordPress Integration** - Creates posts with categories and tags via WPGraphQL
- **Image Generation** - Generates featured images and OG images via OpenClaw, ComfyUI, or A1111
- **Dashboard** - Web-based dashboard for monitoring and managing the pipeline
- **Tag Analysis** - Auto-analyzes and adds relevant tags to posts via LLM

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Creator Newsdesk                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Brave API  │───▶│   Pipeline   │───▶│  WordPress  │      │
│  │  (News)     │    │   (Python)   │    │   (Posts)    │      │
│  └──────────────┘    └──────┬───────┘    └──────────────┘      │
│                              │                                    │
│         ┌────────────────────┼────────────────────┐              │
│         ▼                    ▼                    ▼              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Local LLM    │    │  xAI/OpenAI  │    │  Image Gen   │      │
│  │ (llama.cpp)  │    │  (External)  │    │ (OpenClaw/   │      │
│  │ :1240        │    │              │    │  ComfyUI)    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                              │                                    │
│                              ▼                                    │
│                   ┌──────────────────┐                           │
│                   │   Dashboard      │                           │
│                   │   (HTML/JS)      │                           │
│                   │   :8888          │                           │
│                   └──────────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Requirements

- **Hardware**: AMD Ryzen 9 7950X3D, 128GB RAM, NVIDIA GPU (for image generation)
- **OS**: Ubuntu 24.04 (or macOS for development)
- **Software**:
  - Python 3.10+
  - llama.cpp server (for local LLM)
  - Docker (for OpenClaw, ComfyUI, A1111)
  - WordPress with WPGraphQL plugin

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/matthewxmurphy/creatornewsdesk.git
cd creatornewsdesk
```

### 2. Install Dependencies

```bash
pip install requests beautifulsoup4 python-dateutil
```

### 3. Configure

Copy `config.json` and fill in your API keys:

```bash
cp config.json config.json.example
# Edit config.json with your settings
```

Required configuration:
- `wp_admin_token` - WordPress admin authentication token
- `brave_keys` - Brave API key for news fetching
- `external_ai.xai.api_key` - xAI API key (optional, for external AI)
- `llm.base_url` - Local LLM server URL (default: http://172.17.0.1:1240)

### 4. Run the Dashboard

```bash
# As a systemd service (Ubuntu)
sudo cp creatornewsdesk-dashboard.service /etc/systemd/system/
sudo systemctl enable creatornewsdesk-dashboard
sudo systemctl start creatornewsdesk-dashboard

# Or manually
python3 dashboard_server.py
```

Dashboard runs at `http://localhost:8888/dashboard.html`

### 5. Run the Pipeline

```bash
# Fetch and process news
python3 cnd_news_pipeline.py
```

## Configuration

### config.json Structure

```json
{
  "wp_admin_token": "YOUR_WP_ADMIN_TOKEN",
  "sites": [
    {
      "id": "creatornewsdesk",
      "name": "Creator Newsdesk",
      "active": true,
      "wp": {
        "api_base": "https://www.creatornewsdesk.com/wp-json",
        "authors": [
          {"id": 2, "user": "mmurphy", "weight": 100, "categories": []}
        ]
      },
      "brave_keys": ["YOUR_BRAVE_API_KEY"],
      "llm": {
        "provider": "local",
        "base_url": "http://172.17.0.1:1240",
        "model": "Mistral-7B-Instruct-v0.3-Q4_K_M.gguf"
      },
      "external_ai": {
        "xai": {
          "enabled": false,
          "api_key": "YOUR_XAI_KEY",
          "model": "grok-2-1212"
        }
      },
      "search": {
        "structure": {
          "Drones": {
            "DJI": ["DJI Mini", "DJI Mavic", "DJI Air"],
            "Autel": ["Autel EVO"]
          },
          "Tech": {
            "Apple": ["Apple Watch", "iPhone"],
            "Samsung": ["Galaxy S", "Galaxy Z"]
          }
        }
      }
    }
  ]
}
```

## Services

### Local LLM (llama.cpp)

```bash
# Start llama-server
llama-server --host 0.0.0.0 --port 1234 -m /path/to/model.gguf -c 32768
```

The pipeline uses port 1240 which is an OpenAI-compatible proxy to the local llama-server.

### OpenClaw (Image Generation)

Run via Docker:

```bash
cd ~/homelab/services/ai/openclaw
docker-compose up -d
```

### ComfyUI (Alternative Image Gen)

```bash
docker run -d -p 8188:8188 --name comfyui comfyanonymous/comfyui
```

## Dashboard Pages

| Page | Description |
|------|-------------|
| Dashboard | Overview stats, pipeline controls |
| Brands | Manage brand categories and search terms |
| Creators | Track creator-specific news |
| Platforms | Platform-specific news (YouTube, TikTok, etc.) |
| OG Images | Generate and manage OpenGraph images |
| Generate | Manual image generation |
| Brave | Brave API search testing |
| AI | Test AI rewriting |
| Settings | Configuration editor |

## API Endpoints

### Dashboard Server (Python)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/dashboard.html` | GET | Main dashboard UI |
| `/config.json` | GET | Current configuration |
| `/api/save-config` | POST | Save configuration |
| `/api/run-pipeline` | POST | Start the pipeline |
| `/api/fetch-50` | POST | Fetch 50 articles |
| `/api/status` | GET | Pipeline status |

### WordPress REST API (via Plugin)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/wp-json/cnd/v1/stats` | GET | Post statistics |
| `/wp-json/cnd/v1/posts-needs-images` | GET | Posts missing featured images |
| `/wp-json/cnd/v1/posts-needs-og` | GET | Posts missing OG images |
| `/wp-json/cnd/v1/posts-needs-tags` | GET | Posts needing tag analysis |
| `/wp-json/cnd/v1/generate/{id}` | POST | Generate image for post |
| `/wp-json/cnd/v1/tags/analyze/{id}` | POST | Analyze and add tags |

## File Structure

```
creatornewsdesk/
├── dashboard.html          # Main dashboard UI
├── dashboard_server.py     # Python HTTP server
├── config.json           # Configuration (not committed)
├── cnd_news_pipeline.py   # Main pipeline script
├── cnd-openclaw/
│   └── cnd-openclaw.php  # WordPress plugin
├── *.png, *.jpg          # Logo and header images
├── brave_fetch_news.py   # Brave API integration
├── cnd_image_worker*.py  # Image generation workers
├── llm_generate_post.py  # LLM-powered post generation
├── main-pipeline.py      # Entry point
├── search_terms.py       # Search term management
└── wordpress_taxonomy.py # WP category/tag sync
```

## Troubleshooting

### Pipeline not fetching articles

1. Check Brave API key is valid
2. Verify network connectivity
3. Check search terms in config.json

### Image generation failing

1. Ensure OpenClaw/ComfyUI is running
2. Check dashboard for error messages
3. Verify GPU is available: `nvidia-smi`

### LLM not responding

1. Check llama-server is running: `ss -tlnp | grep 1234`
2. Verify port 1240 proxy is running
3. Check model file exists and is loaded

### Dashboard not loading

1. Check service status: `systemctl status creatornewsdesk-dashboard`
2. Check logs: `journalctl -u creatornewsdesk-dashboard -f`
3. Verify port 8888 is not blocked

## Development

### Adding a new AI Provider

1. Edit `cnd_news_pipeline.py`
2. Add provider to the `fallback_chain` in config
3. Implement the `generate_*` function for the new provider

### Adding a new Image Generator

1. Add provider configuration in config.json
2. Implement image generation in dashboard_server.py
3. Add UI option in dashboard.html

## License

MIT License - see LICENSE file

## Credits

- llama.cpp for local LLM inference
- Brave API for news search
- WordPress and WPGraphQL
- OpenClaw, ComfyUI, and A1111 for image generation
