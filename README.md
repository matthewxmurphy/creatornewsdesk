# Creator Newsdesk

Automated news content pipeline for WordPress with AI-powered article rewriting and image generation.

## Features

- **Automated News Fetching** - Fetches news via Brave API from specific brands/creators/platforms
- **AI Article Rewriting** - Rewrites articles using local llama.cpp or external AI providers (xAI, OpenAI, MiniMax)
- **WordPress Integration** - Creates posts with categories and tags via WPGraphQL
- **Image Generation** - Generates featured images and OG images via explicitly selected xAI, ComfyUI, or A1111
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
│  │ (llama.cpp)  │    │  (External)  │    │ (xAI/         │      │
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
  - Docker (for local ComfyUI or A1111)
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

Start from the placeholder example and keep populated configuration private:

```bash
umask 077
cp config.example.json config.json
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
# Supply a random owner-private CND_DASHBOARD_TOKEN before starting.
# CND_CONFIG_FILE and CND_STATUS_FILE may point outside the source directory.
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

### ComfyUI (Alternative Image Gen)

```bash
docker run -d -p 8188:8188 --name comfyui comfyanonymous/comfyui
```

## Image tools source removal and owner rollout

The retired OpenClaw provider, key setting, deploy/download agent controls and
worker fallback are removed from maintained source. Historical changelog entries
and explicit rejection tests retain the retired name as evidence.

The retained WordPress plugin is `cnd-image-tools/cnd-image-tools.php` (CND Image
Tools). Its class/admin slug/settings group are renamed; its existing `cnd/v1`
routes, per-post permissions, stats/tag handlers and xAI/ComfyUI/A1111 provider
bodies remain. Existing nonretired `cnd_*` option names are preserved. Requests
must explicitly select `method=xai`, `comfyui` or `a1111`; absent, retired or invalid
methods return 400 before post/provider/media work. No paid provider is a default.
The hourly worker supports its existing ComfyUI adapter only and requires
`CND_IMAGE_PROVIDER=comfyui` before reading posts or recording usage. Its existing
ComfyUI queue adapter is not a verified completed-image pipeline.

An owner must separately review deployment, deactivate the old plugin basename
before activating the new one, then verify routes/permissions on owned staging.
Do not activate both: they register the same routes. Existing options, old keys,
runtime agents and installations are not removed by this source change. No live
activation, option cleanup, provider action or release is authorized here.
Rollback requires the owner's reviewed plugin activation plan; retain private
state and the prior Git source. PR7/PR8 retain the retired component and must not
be integrated as a continuation of this removal. Their final disposition belongs
to the reviewer/release owner.

Developer: [Matthew X Murphy](https://MatthewxMurphy.com). Product attribution:
https://builtnotbegged.com. Release owner: CreatorPublishingHub.com. Native plugin
1.1, root MIT and upstream/component credits are preserved; no version or tested
release is allocated. See the security notes for source checks and open gates.

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
├── cnd-image-tools/
│   └── cnd-image-tools.php  # WordPress plugin
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

1. Select a supported provider explicitly and confirm its existing configuration
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

The repository-root [LICENSE](LICENSE) remains MIT, copyright 2025 Matthew Murphy.
CND Article Feed already declares GPL version 2 or later in its entrypoint; its
complete component terms and scope are now alongside the source in
[cnd-article-feed.LICENSE.txt](cnd-article-feed.LICENSE.txt) and
[cnd-article-feed.NOTICE.md](cnd-article-feed.NOTICE.md). Keep the separate
[Chart.js notice](Chart.js-LICENSE.md). This is not a repository-wide relicense.

### CND Article Feed source maintenance

Developer: [Matthew X Murphy](https://MatthewxMurphy.com); product attribution:
https://builtnotbegged.com. Release owner: CreatorPublishingHub.com. See the
[component notes](cnd-article-feed.README.md) for architecture, native capability
requirements, source verification, rollback and standards-adoption gaps.
Native1.0.0 and all executable bytes remain unchanged by this metadata/legal
correction. The public source mirror is not a new package/update channel, a
deployment or release approval; existing updater work remains separate.

## Credits

- llama.cpp for local LLM inference
- Brave API for news search
- WordPress and WPGraphQL
- ComfyUI and A1111; xAI integration remains available when explicitly selected for image generation

## Security maintenance

See [security boundaries, configuration and tests](docs/SECURITY-BOUNDARIES.md).
