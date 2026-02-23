"""
Creator News Pipeline

Main pipeline script for fetching news from Brave Search API, rewriting articles
using local LLM or external AI providers, and creating WordPress posts.

This script:
1. Fetches news articles based on configured search terms
2. Rewrites content using AI (local llama.cpp or external providers)
3. Creates WordPress posts with categories and tags
4. Generates featured images and OG images

Environment Variables (can also be set in config.json):
    BRAVE_API_KEY(S)     - Brave Search API key(s)
    WP_API_BASE          - WordPress REST API base URL
    WP_USER              - WordPress username
    WP_APP_PASSWORD      - WordPress application password
    LOCAL_LLM_BASE_URL   - Local LLM server URL (default: http://172.17.0.1:1240)
    LOCAL_LLM_MODEL      - Model name for local LLM
    DASHBOARD_URL        - Dashboard URL for status updates
    PUBLISH_MODE         - 'draft' or 'publish'

Usage:
    python3 cnd_news_pipeline.py

Author: Matthew Murphy
License: MIT
"""

import os
import json
import requests
import datetime as dt
import random
import re
from typing import List, Dict, Any, Optional
from datetime import datetime

# Try to import social poster
try:
    import social_poster
    HAS_SOCIAL = True
except ImportError:
    HAS_SOCIAL = False

# RSS Feed sources
RSS_FEEDS = [
    # Creator Economy
    {"name": "Creator Economy", "url": "https://creatoreconomy.so/feed", "category": "Creator"},
    {"name": "Passionfruit", "url": "https://passionfru.it/feed", "category": "Creator"},
    {"name": "Simon Owens", "url": "https://simonowens.substack.com/feed", "category": "Creator"},
    {"name": "ICYMI", "url": "https://icymi.email/feed", "category": "Creator"},
    {"name": "Digiday", "url": "https://digiday.com/feed/?category=creator-economy", "category": "Creator"},
    {"name": "Influencer Marketing Hub", "url": "https://influencermarketinghub.com/feed/", "category": "Creator"},
    # YouTube/TikTok/Social
    {"name": "YouTube Blog", "url": "https://blog.youtube/rss.xml", "category": "YouTube"},
    {"name": "Tubefilter", "url": "https://www.tubefilter.com/feed", "category": "YouTube"},
    {"name": "Twitch Blog", "url": "https://blog.twitch.tv/feed", "category": "Twitch"},
    # Gear
    {"name": "PetaPixel", "url": "https://petapixel.com/feed/", "category": "Camera"},
    {"name": "No Film School", "url": "https://nofilmschool.com/feed", "category": "Camera"},
    {"name": "Fstoppers", "url": "https://fstoppers.com/rss.xml", "category": "Camera"},
    {"name": "CineD", "url": "https://www.cined.com/feed/", "category": "Camera"},
    {"name": "DroneDJ", "url": "https://dronedj.com/feed/", "category": "Drone"},
    # Tech
    {"name": "TechCrunch", "url": "https://techcrunch.com/feed/", "category": "Tech"},
    {"name": "The Verge", "url": "https://www.theverge.com/rss/index.xml", "category": "Tech"},
    # Software
    {"name": "Descript Blog", "url": "https://www.descript.com/blog/rss.xml", "category": "Software"},
    {"name": "Social Media Examiner", "url": "https://www.socialmediaexaminer.com/feed/", "category": "Creator"},
]

# Platform Policies Knowledgebase
PLATFORM_POLICIES = {
    "facebook": {
        "name": "Facebook",
        "policies": [
            "Community Standards - no hate speech, violence, harassment, misinformation",
            "Content moderation - AI + human reviewers, 3 strikes = account restriction",
            "Monetization - in-stream ads require 10K followers, 600K minutes viewed",
            "Branded Content - must use branded content tool, disclose partnerships",
            "Copyright - use Content ID, 3 strikes = page deletion possible",
            "Personal account vs Page - Pages need admin who must use real name, can't run personal ad accounts without business verification, Page admins visible to public",
            "Facebook Reels - 30-90 seconds, vertical format, no watermarks",
            "Live streaming - 1000 followers minimum for stars/gifts",
            "Meta Verified - requires government ID, $11.99/month for blue badge",
            "Advertising policies - must follow ad rules, no banned content, political ads need authorization",
            "Reel bonuses - follow engagement guidelines for bonus eligibility",
            "Group rules - admins must enforce community guidelines, weekly activity needed",
            "Shop rules - e-commerce must follow commerce policies, product approval required",
            "Meta AI - content created by AI must be labeled as AI-generated",
            "Teen safety - ages 13-17 have restricted features, parental supervision required",
        ],
        "hashtags": ["#FacebookTips", "#CreatorCommunity", "#MetaVerified", "#CreatorsListenUp"],
        "page_url": "https://www.facebook.com/xmatthewxmurphyx",
        "handle": "@xmatthewxmurphyx"
    },
    "youtube": {
        "name": "YouTube",
        "policies": [
            "Advertiser-friendly content guidelines - no violence, profanity, harmful behavior",
            "Community Guidelines - no hate speech, harassment, spam, misinformation",
            "Monetization requirements - 1000 subscribers + 4000 watch hours OR 10M Shorts views",
            "Copyright strike system - 3 strikes = channel termination",
            "Content ID - creators can claim copyrighted material in your videos",
            "YouTube Shorts rules - max 60 seconds, no watermarks, vertical format",
            "Live stream requirements - verified + no live strikes for 90 days",
            "Ad revenue share - creators get 55% of ad revenue",
            "Super Chat & Super Stickers - must be 18+ or 13+ with supervised accounts",
            "YouTube Partner Program policies - no reused content, no engagement manipulation",
        ],
        "hashtags": ["#YouTubeTips", "#CreatorCommunity", "#YouTubePartner"]
    },
    "tiktok": {
        "name": "TikTok",
        "policies": [
            "Community Guidelines - no hate speech, dangerous acts, harassment, drugs",
            "Content policy - no nudity, sexual content, violence, misinformation",
            "Creator fund requirements - 10K followers, 100K views in last 30 days",
            "Live streaming rules - 16+ for live, 18+ for gifts/badges",
            "Music usage - only use sounds from TikTok library",
            "Duet & Stitch guidelines - respect original creator's settings",
            "Branded content toggle - must disclose sponsorships",
            "Copyright - 3 strikes = account ban",
            "Under 13 - no accounts allowed, will be removed",
            "TikTok Shop policies - varies by region, follow local laws",
        ],
        "hashtags": ["#TikTokTips", "#CreatorEconomy", "#TikTok"]
    },
    "instagram": {
        "name": "Instagram",
        "policies": [
            "Community Guidelines - no hate speech, bullying, harassment",
            "Creator rules - no nudity, sexual content, violence",
            "Monetization - badges, IGTV ads, branded content (varies by country)",
            "Branded content - must use 'Paid partnership' label",
            "Copyright - reuse others' content without permission = removal",
            "Reels bonuses - follow community guidelines for bonus programs",
            "Live badges - 18+ requirement",
            "Shopping - must have business account, follow commerce policies",
            "Account security - 2FA recommended, beware of phishing",
            "Follow engagement pods - can result in reduced reach",
        ],
        "hashtags": ["#InstagramTips", "#Creator", "#Insta"]
    },
    "twitch": {
        "name": "Twitch",
        "policies": [
            "Community Guidelines - no hate speech, harassment, violence, illegal content",
            "Terms of Service - must be 13+, partner program rules",
            "Partner requirements - 75 concurrent viewers, 3 average viewers, broadcast 25+ hours",
            "Affiliate requirements - 50 followers, 7 unique broadcasts, 3 avg viewers",
            "Copyright music - copyrighted music = potential strike/ mute",
            "Hate content policy - zero tolerance for hate speech",
            "Self-harm policy - resources provided, may require pause",
            "Saturated fat & drugs - no promotion of unhealthy products to minors",
            "Raiding - positive raiding culture encouraged",
            "Extensions - must follow extension policies",
        ],
        "hashtags": ["#TwitchTips", "#TwitchStreamer", "#LiveStreaming"]
    },
    "podcasting": {
        "name": "Podcasting",
        "policies": [
            "Apple Podcasts guidelines - no hate speech, explicit content must be marked",
            "Spotify policies - no misinformation, branded content disclosure required",
            "RSS feed requirements - valid feed, proper episode metadata",
            "Copyright - music licensing for all audio content",
            "Sponsorship disclosure - clearly state sponsored content",
            "Privacy - don't share personal info of others without consent",
            "Recording consent - laws vary by state on recording conversations",
            "Content ratings - tag explicit content appropriately",
            "Ad reads - FTC requires clear sponsorship disclosure",
            "Distribution rights - ensure you have rights to all content distributed",
        ],
        "hashtags": ["#PodcastTips", "#Creator", "#Podcasting"]
    },
    "general": {
        "name": "General Creator",
        "policies": [
            "FTC Disclosure - clearly disclose sponsorships with #ad, #sponsored",
            "GDPR/CCPA - handle viewer data responsibly",
            "Terms of Service - read and follow each platform's ToS",
            "Age restrictions - different features require different ages (13+, 18+, 21+)",
            "Account security - use strong passwords, enable 2FA",
            "Content ownership - you own what you create (unless work for hire)",
            "Contract basics - get deals in writing, understand your rights",
            "Taxes - income from content creation is taxable",
            " trademark - don't use others' trademarks without permission",
            "Fair use - limited, consult lawyer for commercial use",
        ],
        "hashtags": ["#CreatorTips", "#ContentCreation", "#CreatorEconomy"]
    }
}

# Hashtag for policy reminder posts
POLICY_REMINDER_HASHTAG = "#CreatorsListenUp"
# ============================================================================

# Brave Search API configuration
# Multiple keys can be provided for rate limiting - script will rotate through them
BRAVE_API_KEY = os.environ.get("BRAVE_API_KEY", "")
BRAVE_API_KEYS_JSON = os.environ.get("BRAVE_API_KEYS_JSON", "[]")

# WordPress configuration
WP_API_BASE = os.environ.get("WP_API_BASE", "")
WP_USER = os.environ.get("WP_USER", "")
WP_APP_PASSWORD = os.environ.get("WP_APP_PASSWORD", "")

# Local LLM configuration (llama.cpp with OpenAI-compatible proxy)
# The local LLM server should be running at the specified URL
LOCAL_LLM_BASE_URL = os.environ.get("LOCAL_LLM_BASE_URL", "http://172.17.0.1:1240")
LOCAL_LLM_MODEL = os.environ.get("LOCAL_LLM_MODEL", "Mistral-7B-Instruct-v0.3-Q4_K_M.gguf")

# Search and publishing configuration
SEARCH_TERMS_JSON = os.environ.get("SEARCH_TERMS_JSON", "[]")
WP_AUTH_PROFILES = os.environ.get("WP_AUTH_PROFILES", "[]")
WP_AUTH_WEIGHTS = os.environ.get("WP_AUTH_WEIGHTS", "[]")
PUBLISH_MODE = os.environ.get("PUBLISH_MODE", "draft")  # 'draft' or 'publish'
BACKFILL_WINDOW_DAYS = int(os.environ.get("BACKFILL_WINDOW_DAYS", "10"))

# File paths for status and caching
STATUS_FILE = "pipeline_status.json"
DASHBOARD_URL = os.environ.get("DASHBOARD_URL", "http://localhost:8000")
CONFIG_FILE = "config.json"

# Cache files to avoid duplicate processing
PROCESSED_FILE = ".processed_urls.json"  # URLs already processed
CACHE_FILE = ".wp_cache.json"           # WordPress cache for categories/tags

# Category mapping - maps search terms to WordPress category IDs
CATEGORY_MAP = {
    # Drone brands -> category
    "DJI": 13, "GoPro": 17, "Insta360": 16, "Skydio": 14, "Autel": 15,
    # Camera brands -> use Canon category (19) since it's most popular
    "Sony": 19, "Canon": 19, "Nikon": 19, "Fujifilm": 19, "Panasonic": 19,
    # Audio brands
    "Rode": 6, "Shure": 6, "Sennheiser": 6, "Audio-Technica": 6,
    # Lighting
    "Aputure": 7, "Nanlite": 7, "Godox": 7, "Lume Cube": 7,
    # Gimbals -> Action Cameras
    "Zhiyun": 5, "Moza": 5, "Hohem": 5, "FeiyuTech": 5,
    # Streaming
    "Elgato": 23, "Logitech": 23, "Razer": 23,
    # Lenses
    "Sigma": 8, "Tamron": 8, "Tokina": 8,
    # Creator
    "MrBeast": 11, "Marques Brownlee": 11, "MKBHD": 11, "Markiplier": 11,
    "PewDiePie": 11, "Mark Rober": 11, "WhistlinDiesel": 11, "Dude Perfect": 11,
    # Platforms
    "YouTube": 10, "TikTok": 10, "Instagram": 10,
}

# Brand names as tags
BRAND_TAGS = {
    "DJI": "dji", "GoPro": "gopro", "Insta360": "insta360", "Skydio": "skydio", "Autel": "autel",
    "Sony": "sony", "Canon": "canon", "Nikon": "nikon", "Fujifilm": "fujifilm", "Panasonic": "panasonic",
    "Rode": "rode", "Shure": "shure", "Sennheiser": "sennheiser", "Audio-Technica": "audio-technica",
    "Aputure": "aputure", "Nanlite": "nanlite", "Godox": "godox",
    "Zhiyun": "zhiyun", "Moza": "moza", "Hohem": "hohem",
    "Elgato": "elgato", "Logitech": "logitech", "Razer": "razer",
    "Sigma": "sigma", "Tamron": "tamron", "Tokina": "tokina",
    "YouTube": "youtube", "TikTok": "tiktok", "Instagram": "instagram",
}

# Tag mapping - category-based tags
TAG_MAP = {
    "drone": 4, "drones": 4,
    "camera": 8, "cameras": 8, "lens": 8, "lenses": 8,
    "microphone": 6, "mic": 6, "audio": 6,
    "lighting": 7, "light": 7, "led": 7,
    "gimbal": 5, "stabilizer": 5,
    "streaming": 9, "stream": 9,
    "youtube": 10, "youtuber": 10,
    "tiktok": 11, "tiktoker": 11,
    "review": 12, "news": 13, "announcement": 14,
    "action camera": 5, "360": 5,
}

# Title strip tokens - remove site names from titles
TITLE_STRIP_TOKENS = [
    " | Tom's Guide", " - Tom's Guide", " — Tom's Guide",
    " | The Verge", " | TechCrunch", " | Engadget",
    " | PetaPixel", " | DPReview", " | Fstoppers",
    " | B&H Photo", " | B&H", "B&H eXplor",
    " | Adorama", " | YouTube", " | Twitch", " | Instagram",
    " — PetaPixel", " — TechCrunch", " — The Verge",
]

# Brand tones - different writing styles per brand
BRAND_TONES = {
    "gopro": [
        "Write from a creator's personal experience perspective. Be very skeptical and critical - the author has personally experienced GoPro overheating issues where cameras shut down during use, losing footage. Mention that GoPro cameras have known overheating problems in real-world use. The author states the ONLY way they'd try new GoPro hardware is if GoPro gave it to them for free, and even then they wouldn't trust it for important shots. Share that the author no longer recommends GoPro products. If mentioning competitors, favor DJI or Insta360 as better alternatives.",
        "Write as a frustrated creator who learned the hard way. Share that after using GoPro products for years, the overheating issues persist. Be blunt: GoPro keeps releasing new models but the core problem isn't fixed. Ask readers if they've experienced the same issues. Skeptical but fair tone.",
        "Write from a professional content creator who tests gear daily. Be analytical about GoPro's issues - the overheating isn't just a bug, it's a design flaw that affects real-world use. Compare objectively to competitors like DJI and Insta360. Critical but knowledgeable tone.",
    ],
    "dji": [
        "Be enthusiastic and positive. DJI is the industry leader in drones. Mention their innovation and market dominance.",
        "Write as a drone enthusiast highlighting DJI's continuous innovation. Mention specific features that make their drones stand out.",
    ],
    "insta360": [
        "Be positive. Insta360 makes innovative 360 cameras that solve many action camera problems. Highlight unique features.",
        "Write enthusiastically about how Insta360 is changing the game with 360 cameras. Mention the creative possibilities.",
    ],
    "sony": [
        "Be neutral to positive. Sony cameras are professional grade. Mention their autofocus and sensor technology.",
    ],
    "canon": [
        "Be neutral. Canon is a trusted camera brand. Mention their lens ecosystem.",
    ],
    "nikon": [
        "Be neutral. Nikon makes quality cameras. Mention their Z-mount system.",
    ],
    "fujifilm": [
        "Be positive. Fujifilm has great color science and retro design. Mention their X-T and GFX lines.",
    ],
    "gimbal": [
        "Be practical. Gimbals help creators. Mention stabilization quality.",
    ],
    "microphone": [
        "Be helpful. Good audio is crucial for creators. Mention audio quality.",
    ],
    "default": [
        "Be informative and professional. Write for content creators.",
    ],
}

# Global WordPress cache
# Stores fetched categories, tags, and authors to reduce API calls
wp_cache = {}


def load_wp_cache():
    """
    Load WordPress cache from JSON file.
    
    The cache stores:
    - Categories (id -> name mapping)
    - Tags (id -> name mapping)
    - Authors (id -> name mapping)
    
    This reduces API calls to WordPress during pipeline execution.
    """
    global wp_cache
    if os.path.exists(CACHE_FILE):
        try:
            wp_cache = json.load(open(CACHE_FILE))
        except:
            wp_cache = {}


def save_wp_cache():
    """
    Save WordPress cache to JSON file.
    
    Called after pipeline completes to persist cache for next run.
    """
    json.dump(wp_cache, open(CACHE_FILE, "w"), indent=2)


def load_config() -> Dict:
    """
    Load configuration from config.json file.
    
    Returns:
        dict: Configuration dictionary or empty dict if file doesn't exist
    """
    if os.path.exists(CONFIG_FILE):
        try:
            return json.load(open(CONFIG_FILE))
        except:
            pass
    return {}


def load_processed() -> set:
    """
    Load set of already-processed URLs.
    
    Returns:
        set: Set of URLs that have already been processed
    """
    if os.path.exists(PROCESSED_FILE):
        try:
            return set(json.load(open(PROCESSED_FILE)))
        except:
            pass
    return set()


def save_processed(urls: set):
    """
    Save processed URLs to file.
    
    Args:
        urls (set): Set of URLs to save
    """
    json.dump(list(urls), open(PROCESSED_FILE, "w"), indent=2)


def get_wp_categories(auth) -> Dict[int, Dict]:
    """
    Fetch all WordPress categories for the site.
    
    Uses WP REST API to get categories, caches results in wp_cache.
    
    Args:
        auth (dict): Authentication configuration with 'api_base', 'user', 'password'
    
    Returns:
        dict: Category ID -> category data mapping
    """
    global wp_cache
    
    # Check cache first
    if "categories" in wp_cache:
        return wp_cache["categories"]
    
    # Fetch from WordPress
    api_base = auth.get("api_base", WP_API_BASE)
    user = auth.get("user", WP_USER)
    password = auth.get("password", WP_APP_PASSWORD)
    
    try:
        resp = requests.get(
            f"{api_base}/wp/v2/categories",
            auth=(user, password),
            params={"per_page": 100}
        )
        if resp.status_code == 200:
            categories = {cat["id"]: cat for cat in resp.json()}
            wp_cache["categories"] = categories
            return categories
    except Exception as e:
        print(f"Error fetching categories: {e}")
    
    return {}


def get_wp_tags(auth) -> Dict[int, Dict]:
    """
    Fetch all WordPress tags.
    
    Args:
        auth (dict): Authentication configuration
    
    Returns:
        dict: Tag ID -> tag data mapping
    """
    global wp_cache
    
    if "tags" in wp_cache:
        return wp_cache["tags"]
    
    api_base = auth.get("api_base", WP_API_BASE)
    user = auth.get("user", WP_USER)
    password = auth.get("password", WP_APP_PASSWORD)
    
    try:
        resp = requests.get(
            f"{api_base}/wp/v2/tags",
            auth=(user, password),
            params={"per_page": 100}
        )
        if resp.status_code == 200:
            tags = {tag["id"]: tag for tag in resp.json()}
            wp_cache["tags"] = tags
            return tags
    except Exception as e:
        print(f"Error fetching tags: {e}")
    
    return {}


def search_brave(query: str, api_key: str, count: int = 10, days_back: int = 7) -> List[Dict]:
    """
    Search Brave News API for articles matching query.
    
    Uses Brave Search API to find news articles. Results include title,
    description, URL, and published date. Filters to only recent articles.
    
    Args:
        query (str): Search query string
        api_key (str): Brave API key
        count (int): Number of results to fetch (default: 10)
        days_back (int): Only return articles from last N days
    
    Returns:
        list: List of article dictionaries
    """
    try:
        # Brave News API endpoint (different from web search)
        url = "https://api.search.brave.com/res/v1/news/search"
        headers = {
            "X-Subscription-Token": api_key,
            "Accept": "application/json",
            "User-Agent": "CreatorNewsdesk/1.0"
        }
        # Fetch from February 2025
        params = {
            "q": query,
            "count": count,
            "search_lang": "en",
            "freshness": "pw"  # Past week - works with Brave API
        }
        
        resp = requests.get(url, headers=headers, params=params, timeout=30)
        
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("results", [])
            
            articles = []
            for item in results:
                domain = item.get("domain", "")
                url = item.get("url", "")
                
                # Skip Reddit and other unwanted sources
                skip_domains = ["reddit.com", "old.reddit.com", "new.reddit.com", 
                               "youtu.be", "instagram.com", "tiktok.com", "twitter.com", "x.com"]
                if any(d in domain.lower() or d in url.lower() for d in skip_domains):
                    continue
                
                # Extract image from various possible fields
                image = item.get("thumbnail") or item.get("image") or ""
                if isinstance(image, dict):
                    image = image.get("url", "")
                
                article = {
                    "title": item.get("title", ""),
                    "description": item.get("description", ""),
                    "url": url,
                    "age": item.get("age", ""),
                    "domain": domain,
                    "image": image,
                    "published_time": item.get("published_time", "")
                }
                articles.append(article)
            
            return articles
        
    except Exception as e:
        print(f"Brave API error for '{query}': {e}")
    
    return []


def fetch_rss_feeds(count: int = 10, category_filter: str = None) -> List[Dict]:
    """Fetch articles from RSS feeds."""
    articles = []
    
    # Filter feeds if category specified
    feeds = RSS_FEEDS
    if category_filter:
        feeds = [f for f in RSS_FEEDS if f.get("category", "").lower() == category_filter.lower()]
    
    for feed in feeds[:10]:  # Limit to 10 feeds
        try:
            resp = requests.get(feed["url"], timeout=15)
            if resp.status_code != 200:
                continue
            
            # Simple XML parsing
            content = resp.text
            
            # Extract items (basic parsing)
            items = re.findall(r'<item>(.*?)</item>', content, re.DOTALL)
            
            for item_xml in items[:5]:  # 5 items per feed
                try:
                    title = re.search(r'<title><!\[CDATA\[(.*?)\]\]></title>', item_xml)
                    if not title:
                        title = re.search(r'<title>(.*?)</title>', item_xml)
                    title = title.group(1) if title else ""
                    
                    link = re.search(r'<link>(.*?)</link>', item_xml)
                    link = link.group(1) if link else ""
                    
                    desc = re.search(r'<description><!\[CDATA\[(.*?)\]\]></description>', item_xml)
                    if not desc:
                        desc = re.search(r'<description>(.*?)</description>', item_xml)
                    desc = desc.group(1) if desc else ""
                    # Strip HTML
                    desc = re.sub(r'<[^>]+>', '', desc)[:300]
                    
                    pub_date = re.search(r'<pubDate>(.*?)</pubDate>', item_xml)
                    pub_date = pub_date.group(1) if pub_date else ""
                    
                    # Parse date
                    post_date = None
                    if pub_date:
                        try:
                            from email.utils import parsedate_to_datetime
                            dt_obj = parsedate_to_datetime(pub_date)
                            post_date = dt_obj.strftime("%Y-%m-%dT%H:%M:%S")
                        except:
                            pass
                    
                    if title and link:
                        articles.append({
                            "title": title,
                            "description": desc,
                            "url": link,
                            "age": pub_date,
                            "domain": feed["name"],
                            "image": "",
                            "published_time": post_date or "",
                            "source": "rss",
                            "feed_category": feed.get("category", "")
                        })
                except Exception as e:
                    continue
        
        except Exception as e:
            continue
    
    return articles


def generate_with_llm(prompt: str, base_url: str = None, model: str = None) -> str:
    """
    Generate text using local LLM (llama.cpp via OpenAI-compatible API).
    
    Sends a prompt to the local LLM server and returns the generated text.
    Falls back gracefully if LLM is unavailable.
    
    Args:
        prompt (str): Input prompt for the LLM
        base_url (str, optional): Override LLM base URL
        model (str, optional): Override model name
    
    Returns:
        str: Generated text or empty string on failure
    """
    url = (base_url or LOCAL_LLM_BASE_URL) + "/v1/chat/completions"
    model_name = model or LOCAL_LLM_MODEL
    
    try:
        resp = requests.post(
            url,
            json={
                "model": model_name,
                "messages": [
                    {"role": "system", "content": "You are a professional news writer."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 2000
            },
            timeout=120
        )
        
        if resp.status_code == 200:
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    
    except Exception as e:
        print(f"LLM generation error: {e}")
    
    return ""


def create_wp_post(auth: Dict, title: str, content: str, 
                   categories: List[int] = None, tags: List[int] = None,
                   status: str = "draft",
                   seo_title: str = None, seo_description: str = None,
                   featured_image: str = None,
                   post_date: str = None,
                   social_message: str = None) -> Optional[int]:
    """

    Create a new WordPress post.
    
    Uses WP REST API to create a new post with the given title, content,
    categories, tags, and featured image.
    
    Args:
        auth (dict): WordPress authentication (api_base, user, password)
        title (str): Post title
        content (str): Post content (HTML)
        categories (list): List of category IDs
        tags (list): List of tag IDs
        status (str): Post status ('draft' or 'publish')
        seo_title (str): Yoast SEO title
        seo_description (str): Yoast SEO meta description
        featured_image (str): URL of featured image
        post_date (str): Publication date in ISO format (YYYY-MM-DDTHH:MM:SS)
        social_message (str): Social media message with hashtags
    
    Returns:
        int: Created post ID, or None on failure
    """
    api_base = auth.get("api_base", WP_API_BASE)
    user = auth.get("user", WP_USER)
    password = auth.get("password", WP_APP_PASSWORD)
    
    post_data = {
        "title": title,
        "content": content,
        "status": status,
        "categories": categories or [],
        "tags": tags or []
    }
    
    # Set the post date if provided
    if post_date:
        post_data["date"] = post_date
    
    # Build meta fields
    meta = {}
    
    # Add Yoast SEO meta fields if provided
    if seo_title:
        meta["_yoast_wpseo_title"] = seo_title
        meta["_yoast_wpseo_metadesc"] = seo_description or ""
    
    # Add Jetpack Social message with hashtags
    if social_message:
        meta["jetpack_publicize_message"] = social_message
    
    if meta:
        post_data["meta"] = meta
    
    try:
        resp = requests.post(
            f"{api_base}/wp/v2/posts",
            auth=(user, password),
            json=post_data
        )
        
        if resp.status_code in (200, 201):
            return resp.json()["id"]
        else:
            print(f"WP create error: {resp.status_code} - {resp.text}")
    
    except Exception as e:
        print(f"WP API error: {e}")
    
    return None


def upload_media_to_wp(auth: Dict, image_url: str, title: str = "", alt_text: str = "", caption: str = "", description: str = "") -> Optional[int]:
    """Upload image from URL to WordPress media library with full SEO metadata."""
    if not image_url:
        return None
    
    api_base = auth.get("api_base", WP_API_BASE)
    user = auth.get("user", WP_USER)
    password = auth.get("password", WP_APP_PASSWORD)
    
    try:
        # Download image
        img_resp = requests.get(image_url, timeout=30)
        if img_resp.status_code != 200:
            print(f"Failed to download image: {image_url}")
            return None
        
        # Get file extension
        ext = "jpg"
        if "png" in img_resp.headers.get("Content-Type", ""):
            ext = "png"
        elif "gif" in img_resp.headers.get("Content-Type", ""):
            ext = "gif"
        
        files = {
            "file": (f"image.{ext}", img_resp.content, img_resp.headers.get("Content-Type", "image/jpeg"))
        }
        
        # Build SEO data
        data = {
            "title": title or "Featured Image",
            "alt_text": alt_text or title or "Creator Newsdesk image",
            "caption": caption or title or "",
            "description": description or title or "",
        }
        
        resp = requests.post(
            f"{api_base}/wp/v2/media",
            auth=(user, password),
            files=files,
            data=data,
            timeout=60
        )
        
        if resp.status_code in (200, 201):
            return resp.json()["id"]
        else:
            print(f"Media upload error: {resp.status_code}")
            return None
    
    except Exception as e:
        print(f"Media upload error: {e}")
        return None


def set_featured_image(auth: Dict, post_id: int, media_id: int) -> bool:
    """Set featured image for a post."""
    api_base = auth.get("api_base", WP_API_BASE)
    user = auth.get("user", WP_USER)
    password = auth.get("password", WP_APP_PASSWORD)
    
    try:
        resp = requests.post(
            f"{api_base}/wp/v2/posts/{post_id}",
            auth=(user, password),
            json={"featured_media": media_id}
        )
        return resp.status_code in (200, 201)
    except Exception as e:
        print(f"Set featured image error: {e}")
        return False


def create_wp_category(auth: Dict, name: str, description: str = "") -> Optional[int]:
    """
    Create a new WordPress category.
    
    Args:
        auth (dict): WordPress authentication
        name (str): Category name
        description (str, optional): Category description
    
    Returns:
        int: Created category ID or None
    """
    api_base = auth.get("api_base", WP_API_BASE)
    user = auth.get("user", WP_USER)
    password = auth.get("password", WP_APP_PASSWORD)
    
    try:
        resp = requests.post(
            f"{api_base}/wp/v2/categories",
            auth=(user, password),
            json={"name": name, "description": description}
        )
        
        if resp.status_code in (200, 201):
            return resp.json()["id"]
    
    except Exception as e:
        print(f"Category creation error: {e}")
    
    return None


def create_wp_tag(auth: Dict, name: str) -> Optional[int]:
    """Create a new WordPress tag."""
    api_base = auth.get("api_base", WP_API_BASE)
    user = auth.get("user", WP_USER)
    password = auth.get("password", WP_APP_PASSWORD)
    
    try:
        resp = requests.post(
            f"{api_base}/wp/v2/tags",
            auth=(user, password),
            json={"name": name}
        )
        
        if resp.status_code in (200, 201):
            return resp.json()["id"]
        elif resp.status_code == 400:
            # Tag might already exist, try to find it
            search_resp = requests.get(
                f"{api_base}/wp/v2/tags",
                auth=(user, password),
                params={"search": name}
            )
            if search_resp.status_code == 200:
                tags = search_resp.json()
                for tag in tags:
                    if tag.get("name", "").lower() == name.lower():
                        return tag["id"]
    
    except Exception as e:
        print(f"Tag creation error: {e}")
    
    return None


def main():
    """
    Main pipeline execution function.
    
    Orchestrates the full news pipeline:
    1. Load configuration and processed URLs
    2. Build search queries from configured brands/platforms
    3. Fetch articles from Brave API
    4. Filter out already-processed URLs
    5. Rewrite articles using LLM
    6. Create WordPress posts
    
    Returns:
        dict: Pipeline execution statistics
    """


def extract_category_from_query(query: str) -> Optional[int]:
    """Extract WordPress category ID from search query."""
    query_upper = query.upper()
    for brand, cat_id in CATEGORY_MAP.items():
        if brand.upper() in query_upper:
            return cat_id
    return None


def get_article_age_days(age_str: str) -> Optional[int]:
    """Parse article age string and return days, or None if unknown."""
    if not age_str:
        return None
    age_lower = age_str.lower()
    if "hour" in age_lower:
        return 0
    if "day" in age_lower:
        import re
        match = re.search(r'(\d+)', age_str)
        return int(match.group(1)) if match else None
    if "week" in age_lower:
        import re
        match = re.search(r'(\d+)', age_str)
        return int(match.group(1)) * 7 if match else None
    if "month" in age_lower:
        import re
        match = re.search(r'(\d+)', age_str)
        return int(match.group(1)) * 30 if match else None
    return None


def parse_brave_date(published_time: str) -> Optional[str]:
    """Convert Brave's published_time to WP date format."""
    if not published_time:
        return None
    try:
        # Brave returns ISO format like "2026-02-20T15:55:43"
        # Convert to WP format "2026-02-20T15:55:00"
        from datetime import datetime
        dt = datetime.fromisoformat(published_time.replace('Z', '+00:00'))
        return dt.strftime("%Y-%m-%dT%H:%M:%S")
    except:
        return None


def get_tags_from_query(query: str) -> List[int]:
    """Extract tag IDs from search query and category context."""
    tags = []
    query_lower = query.lower()
    
    # Map brand names to WP tag IDs
    brand_to_tag_id = {
        "dji": 3, "gopro": 28, "insta360": 27, "skydio": 29, "autel": 30,
        "sony": 31, "canon": 32, "nikon": 33, "fujifilm": 34, "panasonic": 35,
        "rode": 36, "shure": 37, "sennheiser": 38, "audio-technica": 39,
        "elgato": 44, "logitech": 50, "razer": 48,
        "sigma": None, "tamron": None, "tokina": None,
    }
    
    # Check query for brand keywords
    for keyword, tag_id in TAG_MAP.items():
        if keyword in query_lower:
            if tag_id not in tags:
                tags.append(tag_id)
    
    # Add brand tags
    for brand, tag_id in brand_to_tag_id.items():
        if brand in query_lower and tag_id:
            if tag_id not in tags:
                tags.append(tag_id)
    
    # Also add tags based on category
    category = extract_category_from_query(query)
    if category:
        if category == 4 or category in [13, 17, 16, 14, 15]:  # Drones
            tags.extend([4, 3])  # drone + dji tag
        elif category in [18, 19, 20, 40, 41]:  # Camera
            tags.extend([8])  
        elif category in [21, 22, 42, 43, 6]:  # Audio
            tags.extend([6])
        elif category in [23, 49, 47]:  # Streaming
            tags.extend([9])
        elif category == 7:  # Lighting
            tags.extend([7])
    
    return list(set(tags))  # Remove duplicates


def get_brand_tone(query: str, article_content: str = "") -> str:
    """Get the writing tone based on the brand in the query or article content."""
    import random
    
    # Check query first
    query_lower = query.lower()
    for brand, tone in BRAND_TONES.items():
        if brand in query_lower:
            # Handle both list and string
            if isinstance(tone, list):
                return random.choice(tone)
            return tone
    
    # Also check article title/content if provided
    if article_content:
        content_lower = article_content.lower()
        for brand, tone in BRAND_TONES.items():
            if brand in content_lower:
                if isinstance(tone, list):
                    return random.choice(tone)
                return tone
    
    default_tone = BRAND_TONES.get("default", "Be informative and professional. Write for content creators.")
    if isinstance(default_tone, list):
        return random.choice(default_tone)
    return default_tone


def strip_title_site_names(title: str) -> str:
    """Remove site names like '| TechCrunch' from titles."""
    result = title
    for token in TITLE_STRIP_TOKENS:
        result = result.replace(token, "")
    return result.strip()


def main():
    
    # Load configuration
    config = load_config()
    
    # Load caches
    load_wp_cache()
    processed_urls = load_processed()
    
    stats = {
        "fetched": 0,
        "processed": 0,
        "created": 0,
        "skipped": 0,
        "errors": 0
    }
    
    # Get first configured site
    sites = config.get("sites", [])
    if not sites:
        print("No sites configured in config.json")
        return stats
    
    site = sites[0]
    wp_config = site.get("wp", {})
    authors = wp_config.get("authors", [])
    author = authors[0] if authors else {}
    auth = {
        "api_base": wp_config.get("api_base", WP_API_BASE),
        "user": author.get("user", WP_USER),
        "password": author.get("password", WP_APP_PASSWORD)
    }
    search_config = site.get("search", {})
    structure = search_config.get("structure", {})
    
    # Build search terms from configured brands
    search_queries = []
    for category, brands in structure.items():
        if isinstance(brands, dict):
            for brand, terms in brands.items():
                if isinstance(terms, list):
                    for term in terms:
                        search_queries.append(f"{brand} {term}")
                else:
                    search_queries.append(f"{brand} {brands}")
        else:
            search_queries.append(category)
    
    print(f"Built {len(search_queries)} search queries")
    
    # Get Brave API keys
    brave_keys = site.get("brave_keys", [])
    if not brave_keys:
        brave_keys = [BRAVE_API_KEY]
    
    # Process each search query
    for i, query in enumerate(search_queries):
        # Rotate through API keys to avoid rate limits
        api_key = brave_keys[i % len(brave_keys)]
        
        print(f"Searching: {query}")
        
        # Fetch from RSS feeds first (they have real dates)
        rss_articles = fetch_rss_feeds(count=5)
        articles = rss_articles
        
        # Also try Brave - only get recent ones with images
        brave_articles = search_brave(query, api_key, count=50)
        # Filter Brave results: only today, only with images
        for ba in brave_articles:
            age = get_article_age_days(ba.get("age", ""))
            if age is not None and age <= 1 and ba.get("image"):
                articles.append(ba)
        
        stats["fetched"] += len(articles)
        
        # Limit articles if specified (for cron - process 1 at a time)
        max_articles = os.environ.get("MAX_ARTICLES")
        if max_articles:
            articles = articles[:int(max_articles)]
        
        for article in articles:
            url = article.get("url", "")
            
            # Skip already processed URLs
            if url in processed_urls:
                stats["skipped"] += 1
                continue
            
            # Mark as processed
            processed_urls.add(url)
            
            # Extract category from search query
            article_category = extract_category_from_query(query)
            
            # Determine if article has valid date and image
            article_age_days = get_article_age_days(article.get("age", ""))
            has_image = bool(article.get("image"))
            
            # For RSS articles, use the actual date for age calculation
            if article.get("source") == "rss" and article.get("published_time"):
                try:
                    from datetime import datetime
                    dt_obj = datetime.fromisoformat(article["published_time"].replace('Z', '+00:00'))
                    age = datetime.now() - dt_obj.replace(tzinfo=None)
                    article_age_days = age.days
                except:
                    pass
            
            # Skip articles older than 7 days
            if article_age_days is not None and article_age_days > 7:
                stats["skipped"] += 1
                continue
            
            # Always create as draft first - will publish only if has image
            post_status = "draft"
            
            # Get tags for this article
            article_tags = get_tags_from_query(query)
            
            # Get brand-specific tone
            brand_tone = get_brand_tone(query, article.get('title', '') + ' ' + article.get('description', ''))
            
            # Strip site names from title
            clean_title = strip_title_site_names(article.get('title', ''))
            
            # Rewrite article with LLM - use description for actual content
            prompt = f"""You are a tech journalist. {brand_tone}

Summary: {article.get('description', '')[:300]}
Source: {article.get('domain', '')}
Date: {article.get('age', '')}

Generate output in this EXACT format (4 lines):
HEADLINE: [Your new catchy SEO-friendly headline, max 60 chars]
META: [Your SEO meta description, max 155 chars, include keywords]
TAGS: [comma-separated list of 3-5 relevant tags/keywords for this article, like: dji, drone, camera, review, news]
ARTICLE: [Your 2-3 paragraph article content]"""

            generated_content = generate_with_llm(prompt)
            
            if not generated_content:
                stats["errors"] += 1
                continue
            
            # Parse LLM response
            seo_title = clean_title
            seo_description = ""
            tag_names = []
            new_content = generated_content.strip()
            
            lines = generated_content.split('\n')
            for line in lines:
                line = line.strip()
                if line.startswith("HEADLINE:"):
                    seo_title = line.replace("HEADLINE:", "").strip()
                elif line.startswith("META:"):
                    seo_description = line.replace("META:", "").strip()
                elif line.startswith("TAGS:"):
                    tags_str = line.replace("TAGS:", "").strip()
                    tag_names = [t.strip().lower() for t in tags_str.split(',') if t.strip()]
                elif line.startswith("ARTICLE:"):
                    new_content = line.replace("ARTICLE:", "").strip()
            
            # Use extracted title
            new_title = seo_title
            
            # Clean up title
            new_title = strip_title_site_names(new_title)
            new_title = strip_title_site_names(new_title)
            
            # Count words
            word_count = len(new_content.split())
            
            # Skip if content is too short for SEO
            if word_count < 400:
                print(f"  Skipped: Content too short ({word_count} words)")
                stats["skipped"] += 1
                continue
            
            # Create new tags from LLM response if they don't exist
            for tag_name in tag_names:
                if tag_name:
                    tag_id = create_wp_tag(auth, tag_name)
                    if tag_id and tag_id not in article_tags:
                        article_tags.append(tag_id)
            
            # Create WordPress post with category, tags, and appropriate status
            # Build social message with 3 hashtags from tags
            social_hashtags = []
            for tag in tag_names[:3]:  # Use first 3 tags as hashtags
                if tag and len(tag) > 2:  # Skip short tags
                    # Clean tag for hashtag (no spaces, lowercase)
                    hashtag = re.sub(r'[^a-zA-Z0-9]', '', tag).lower()
                    if hashtag and hashtag not in social_hashtags:
                        social_hashtags.append(f"#{hashtag}")
            
            social_message = f"{new_title[:200]} {' '.join(social_hashtags)}" if social_hashtags else None
            
            post_id = create_wp_post(
                auth,
                title=new_title,
                content=new_content,
                categories=[article_category] if article_category else [],
                tags=article_tags,
                status=post_status,
                seo_title=seo_title,
                seo_description=seo_description,
                featured_image=article.get('image', ''),
                post_date=parse_brave_date(article.get('published_time')) or None,
                social_message=social_message
            )
            
            status_label = "Published" if has_image else "Drafted"
            if post_id:
                # Try to set featured image with full SEO
                img_url = article.get('image', '')
                if img_url:
                    # Build SEO metadata for image
                    alt_text = f"{new_title} - {article.get('domain', 'Creator Newsdesk')}"
                    caption = new_title
                    description = f"Image for article: {new_title} - {article.get('description', '')[:200]}"
                    
                    media_id = upload_media_to_wp(
                        auth, 
                        img_url, 
                        title=new_title,
                        alt_text=alt_text,
                        caption=caption,
                        description=description
                    )
                    if media_id:
                        set_featured_image(auth, post_id, media_id)
                        print(f"  Added featured image with SEO metadata")
                        
                        # Update post to publish status
                        api_base = auth.get("api_base", WP_API_BASE)
                        user = auth.get("user", WP_USER)
                        password = auth.get("password", WP_APP_PASSWORD)
                        requests.post(
                            f"{api_base}/wp/v2/posts/{post_id}",
                            auth=(user, password),
                            json={"status": "publish"}
                        )
                        print(f"  Published!")
                        
                        # Post to social media
                        if HAS_SOCIAL:
                            try:
                                post_url = f"https://www.creatornewsdesk.com/?p={post_id}"
                                social_results = social_poster.post_to_all_socials(
                                    new_title,
                                    post_url,
                                    img_url
                                )
                                print(f"  Social: {social_results}")
                            except Exception as e:
                                print(f"  Social post error: {e}")
                        
                        # Stop after publishing one with image
                        break
                        
                stats["created"] += 1
                print(f"{status_label} post {post_id}: {article.get('title', '')[:50]}...")
                
                # If we published this one (had image), stop
                if has_image:
                    break
            else:
                stats["errors"] += 1
            
            stats["processed"] += 1
    
    # Save caches
    save_wp_cache()
    save_processed(processed_urls)
    
    print(f"\nPipeline complete:")
    print(f"  Fetched: {stats['fetched']}")
    print(f"  Processed: {stats['processed']}")
    print(f"  Created: {stats['created']}")
    print(f"  Skipped: {stats['skipped']}")
    print(f"  Errors: {stats['errors']}")
    
    # Generate policy reminder post
    maybe_generate_policy_post(auth)
    
    return stats


def generate_policy_reminder_post(auth: Dict, platform: str = None) -> Optional[int]:
    """Generate a policy reminder post using the knowledgebase."""
    import random
    
    # Pick a random platform if not specified
    if not platform:
        platform = random.choice(list(PLATFORM_POLICIES.keys()))
    
    policy_data = PLATFORM_POLICIES.get(platform, PLATFORM_POLICIES["general"])
    policies = policy_data.get("policies", [])
    platform_name = policy_data.get("name", "Creator")
    hashtags = policy_data.get("hashtags", [])
    
    # Pick 1 policy as teaser
    selected_policy = random.choice(policies) if policies else "Stay updated on platform policies!"
    
    # Build content - teaser format to drive traffic to site
    site_url = "https://www.creatornewsdesk.com"
    
    content_lines = [
        f"<h2>{POLICY_REMINDER_HASHTAG} {platform_name} Tip</h2>",
        f"<p><strong>Quick Tip:</strong> {selected_policy}</p>",
        f"<p>Want more {platform_name} tips? We've got a full breakdown of {platform_name} policies every creator needs to know.</p>",
        f"<p><a href=\"{site_url}\" class=\"button\">Read the Full Guide on Our Site</a></p>",
        f"<p>{POLICY_REMINDER_HASHTAG} Follow: @xmatthewxmurphyx</p>"
    ]
    
    content = "\n".join(content_lines)
    
    # Generate SEO title
    seo_title = f"{platform_name} Creator Tip of the Day - {POLICY_REMINDER_HASHTAG}"
    meta_desc = f"Daily creator tip: {platform_name} policies you need to know. {POLICY_REMINDER_HASHTAG}"
    
    # Get tag IDs - create if don't exist
    tag_ids = []
    tag_names_to_create = ["creators", "creatorslistenup", platform_name.lower()]
    for tag_name in tag_names_to_create:
        tag_id = create_wp_tag(auth, tag_name)
        if tag_id:
            tag_ids.append(tag_id)
    
    # Build social message with hashtags for policy posts
    social_hashtags = [f"#{tag}" for tag in ["CreatorsListenUp", platform_name.lower()]]
    social_message = f"{seo_title[:200]} {' '.join(social_hashtags)}"
    
    # Create post
    post_id = create_wp_post(
        auth,
        title=seo_title,
        content=content,
        categories=[10],  # Platform News category
        tags=tag_ids,
        status="publish",
        seo_title=seo_title,
        seo_description=meta_desc,
        social_message=social_message
    )
    
    # Try to get a relevant image URL for featured image
    # For now, we'll skip Grok image generation and use a placeholder
    # In production, you could integrate with Grok's image API
    
    return post_id


def maybe_generate_policy_post(auth: Dict):
    """Maybe generate a policy post (30% chance per run)."""
    import random
    if random.random() < 0.3:  # 30% chance
        platform = random.choice(list(PLATFORM_POLICIES.keys()))
        post_id = generate_policy_reminder_post(auth, platform)
        if post_id:
            print(f"Generated policy reminder post for {platform} (ID: {post_id})")
            return True
    return False


if __name__ == "__main__":
    main()
