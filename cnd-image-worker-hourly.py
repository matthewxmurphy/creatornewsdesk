"""
Image Generation Worker (Hourly)

Background worker that generates featured images for WordPress posts.
Runs hourly via cron or scheduler to process posts that need images.

Features:
- Rate limiting (hourly and daily caps)
- Multiple image generation providers (OpenClaw, ComfyUI, A1111)
- Automatic retry with fallback providers
- Usage tracking and statistics

Usage:
    # Run once
    python3 cnd_image_worker_hourly.py
    
    # Or set up cron for hourly runs:
    # 0 * * * * cd /path/to/creatornewsdesk && python3 cnd_image_worker_hourly.py

Environment Variables:
    CND_HOURLY_CAP    - Maximum images per hour (default: 8)
    CND_DAILY_CAP     - Maximum images per day (default: 180)
    CND_RUN_ENABLED   - Set to "0" to disable (default: "1")

Author: Matthew Murphy
License: MIT
"""

import os
import json
import time
import datetime as dt
import requests
import mimetypes
from typing import List, Dict, Any, Optional

# =============================================================================
# Configuration
# =============================================================================

# File to track image generation usage timestamps
USAGE_FILE = ".cnd_image_usage.json"

# Rate limiting configuration from environment
# Default values are conservative to avoid hitting API limits
HOURLY_CAP = int(os.environ.get("CND_HOURLY_CAP", "8"))     # 7 or 8 recommended
DAILY_CAP = int(os.environ.get("CND_DAILY_CAP", "180"))   # 150-200 range
RUN_ENABLED = os.environ.get("CND_RUN_ENABLED", "1") == "1"


def load_usage() -> List[float]:
    """
    Load timestamp history of image generations.
    
    Returns:
        list: List of Unix timestamps when images were generated
    """
    if not os.path.exists(USAGE_FILE):
        return []
    try:
        data = json.load(open(USAGE_FILE, "r", encoding="utf-8"))
        if isinstance(data, list):
            return [float(x) for x in data]
    except Exception:
        pass
    return []


def save_usage(ts: List[float]) -> None:
    """
    Save timestamp history to file.
    
    Args:
        ts (list): List of Unix timestamps
    """
    json.dump(ts, open(USAGE_FILE, "w", encoding="utf-8"), indent=2)


def prune(ts: List[float], seconds: int) -> List[float]:
    """
    Remove timestamps older than specified seconds.
    
    Args:
        ts (list): List of Unix timestamps
        seconds (int): Age threshold in seconds
    
    Returns:
        list: Filtered list with only recent timestamps
    """
    cutoff = time.time() - seconds
    return [t for t in ts if t > cutoff]


def can_generate() -> bool:
    """
    Check if we can generate another image (rate limiting).
    
    Checks both hourly and daily caps before allowing generation.
    
    Returns:
        bool: True if generation is allowed
    """
    usage = load_usage()
    now = time.time()
    
    # Count usage in last hour
    hourly = prune(usage, 3600)
    if len(hourly) >= HOURLY_CAP:
        print(f" hourly cap reached ({HOURLY_CAP})")
        return False
    
    # Count usage in last day
    daily = prune(usage, 86400)
    if len(daily) >= DAILY_CAP:
        print(f" daily cap reached ({DAILY_CAP})")
        return False
    
    return True


def record_usage() -> None:
    """
    Record current timestamp as an image generation event.
    """
    usage = load_usage()
    usage.append(time.time())
    save_usage(usage)


def get_posts_needing_images(limit: int = 10) -> List[Dict]:
    """
    Fetch posts from WordPress that need featured images.
    
    Uses WPGraphQL or REST API to find posts without featured images.
    
    Args:
        limit (int): Maximum number of posts to fetch
    
    Returns:
        list: List of post dictionaries
    """
    # Get WordPress config from environment
    wp_base = os.environ.get("WP_API_BASE", "https://www.creatornewsdesk.com/wp-json")
    wp_user = os.environ.get("WP_USER", "")
    wp_pass = os.environ.get("WP_APP_PASSWORD", "")
    
    try:
        # Query posts without featured image
        resp = requests.get(
            f"{wp_base}/wp/v2/posts",
            auth=(wp_user, wp_pass),
            params={
                "per_page": limit,
                "_fields": "id,title,featured_media"
            }
        )
        
        if resp.status_code == 200:
            posts = resp.json()
            # Filter to posts without featured image
            return [p for p in posts if p.get("featured_media") == 0]
    
    except Exception as e:
        print(f"Error fetching posts: {e}")
    
    return []


def generate_image_openclaw(prompt: str, width: int = 1200, height: int = 630) -> Optional[str]:
    """
    Generate image using OpenClaw service.
    
    OpenClaw is a containerized image generation service.
    
    Args:
        prompt (str): Image generation prompt
        width (int): Image width
        height (int): Image height
    
    Returns:
        str: URL of generated image, or None on failure
    """
    openclaw_url = os.environ.get("OPENCLAW_URL", "http://localhost:8050")
    
    try:
        resp = requests.post(
            f"{openclaw_url}/generate",
            json={
                "prompt": prompt,
                "width": width,
                "height": height,
                "num_inference_steps": 20
            },
            timeout=120
        )
        
        if resp.status_code == 200:
            data = resp.json()
            return data.get("image_url")
    
    except Exception as e:
        print(f"OpenClaw error: {e}")
    
    return None


def generate_image_comfyui(prompt: str, width: int = 1200, height: int = 630) -> Optional[str]:
    """
    Generate image using ComfyUI API.
    
    Args:
        prompt (str): Image generation prompt
        width (int): Image width
        height (int): Image height
    
    Returns:
        str: URL of generated image, or None on failure
    """
    comfyui_url = os.environ.get("COMFYUI_URL", "http://localhost:8188")
    
    try:
        # ComfyUI workflow would go here
        # This is a simplified example
        resp = requests.post(
            f"{comfyui_url}/prompt",
            json={"prompt": {"inputs": {"text": prompt}}},
            timeout=180
        )
        
        if resp.status_code == 200:
            # Parse response for image URL
            return None  # Implement based on ComfyUI response format
    
    except Exception as e:
        print(f"ComfyUI error: {e}")
    
    return None


def upload_to_wordpress(image_url: str, post_id: int) -> Optional[int]:
    """
    Download generated image and upload to WordPress media library.
    
    Args:
        image_url (str): URL of generated image
        post_id (int): WordPress post ID to attach image to
    
    Returns:
        int: Media attachment ID, or None on failure
    """
    wp_base = os.environ.get("WP_API_BASE", "https://www.creatornewsdesk.com/wp-json")
    wp_user = os.environ.get("WP_USER", "")
    wp_pass = os.environ.get("WP_APP_PASSWORD", "")
    
    try:
        # Download image
        img_resp = requests.get(image_url, timeout=60)
        if img_resp.status_code != 200:
            return None
        
        # Determine content type
        content_type = img_resp.headers.get("Content-Type", "image/jpeg")
        ext = mimetypes.guess_extension(content_type) or ".jpg"
        
        # Upload to WordPress
        files = {
            "file": (f"featured{ext}", img_resp.content, content_type)
        }
        
        data = {
            "alt_text": f"Featured image for post {post_id}",
            "post": post_id
        }
        
        resp = requests.post(
            f"{wp_base}/wp/v2/media",
            auth=(wp_user, wp_pass),
            files=files,
            data=data
        )
        
        if resp.status_code in (200, 201):
            return resp.json()["id"]
    
    except Exception as e:
        print(f"Upload error: {e}")
    
    return None


def set_featured_image(post_id: int, media_id: int) -> bool:
    """
    Set featured image for a WordPress post.
    
    Args:
        post_id (int): WordPress post ID
        media_id (int): Media attachment ID
    
    Returns:
        bool: True on success
    """
    wp_base = os.environ.get("WP_API_BASE", "https://www.creatornewsdesk.com/wp-json")
    wp_user = os.environ.get("WP_USER", "")
    wp_pass = os.environ.get("WP_APP_PASSWORD", "")
    
    try:
        resp = requests.post(
            f"{wp_base}/wp/v2/posts/{post_id}",
            auth=(wp_user, wp_pass),
            json={"featured_media": media_id}
        )
        
        return resp.status_code in (200, 201)
    
    except Exception as e:
        print(f"Set featured error: {e}")
    
    return False


def process_posts(limit: int = 5) -> Dict[str, int]:
    """
    Main processing loop - finds posts and generates images.
    
    Args:
        limit (int): Maximum posts to process
    
    Returns:
        dict: Processing statistics
    """
    stats = {
        "attempted": 0,
        "generated": 0,
        "uploaded": 0,
        "failed": 0,
        "skipped": 0
    }
    
    # Get posts needing images
    posts = get_posts_needing_images(limit)
    
    for post in posts:
        post_id = post.get("id")
        title = post.get("title", {}).get("rendered", "Untitled")[:50]
        
        # Check rate limits
        if not can_generate():
            print("Rate limit reached, stopping")
            break
        
        stats["attempted"] += 1
        
        # Build prompt from title
        prompt = f"Featured image for: {title}. Professional news article illustration."
        
        # Try to generate image
        image_url = generate_image_openclaw(prompt)
        
        if not image_url:
            # Try fallback
            image_url = generate_image_comfyui(prompt)
        
        if not image_url:
            stats["failed"] += 1
            print(f"Failed: {title}")
            continue
        
        stats["generated"] += 1
        record_usage()
        
        # Upload to WordPress
        media_id = upload_to_wordpress(image_url, post_id)
        
        if media_id and set_featured_image(post_id, media_id):
            stats["uploaded"] += 1
            print(f"Success: {title}")
        else:
            stats["failed"] += 1
    
    return stats


def main():
    """
    Main entry point for hourly image worker.
    """
    print(f"Image Worker - {dt.datetime.now().isoformat()}")
    print(f"Rate limits: {HOURLY_CAP}/hour, {DAILY_CAP}/day")
    
    if not RUN_ENABLED:
        print("Disabled via CND_RUN_ENABLED")
        return
    
    stats = process_posts(limit=5)
    
    print(f"\nResults: {stats}")
    
    return stats


if __name__ == "__main__":
    main()
