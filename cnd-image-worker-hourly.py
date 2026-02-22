import os
import json
import time
import datetime as dt
import requests
import mimetypes
from typing import List, Dict, Any

USAGE_FILE = ".cnd_image_usage.json"

# Set your caps here
HOURLY_CAP = int(os.environ.get("CND_HOURLY_CAP", "8"))     # 7 or 8 recommended
DAILY_CAP  = int(os.environ.get("CND_DAILY_CAP",  "180"))  # 150-200 range
RUN_ENABLED = os.environ.get("CND_RUN_ENABLED", "1") == "1"

def load_usage() -> List[float]:
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
    json.dump(ts, open(USAGE_FILE, "w", encoding="utf-8"), indent=2)

def prune(ts: List[float], seconds: int) -> List[float]:
    now = time.time()
    cutoff = now - seconds
    return [t for t in ts if t >= cutoff]

def remaining_slots(ts: List[float]) -> Dict[str, int]:
    hourly_used = len(prune(ts, 3600))
    daily_used  = len(prune(ts, 24 * 3600))
    return {
        "hourly_used": hourly_used,
        "daily_used": daily_used,
        "hourly_remaining": max(0, HOURLY_CAP - hourly_used),
        "daily_remaining": max(0, DAILY_CAP - daily_used),
    }

def guess_mime(path: str) -> str:
    mt, _ = mimetypes.guess_type(path)
    return mt or "application/octet-stream"

def wp_get_posts_needing_images(wp_api_base: str, auth, max_needed: int = 20, max_pages: int = 10) -> List[Dict[str, Any]]:
    found = []
    page = 1

    while len(found) < max_needed and page <= max_pages:
        r = requests.get(
            f"{wp_api_base}/posts",
            auth=auth,
            params={
                "per_page": 100,
                "page": page,
                "status": "publish",
                "orderby": "date",
                "order": "desc",
                "context": "edit",
            },
            timeout=60,
        )

        if r.status_code != 200:
            raise RuntimeError(f"WP list failed {r.status_code}: {r.text[:300]}")

        posts = r.json()
        if not posts:
            break

        for p in posts:
            if len(found) >= max_needed:
                break

            if int(p.get("featured_media") or 0) != 0:
                continue

            meta = p.get("meta") or {}
            # Skip already finished
            if meta.get("cnd_img_state") == "generated":
                continue
            # Optional: skip currently queued
            if meta.get("cnd_img_state") == "queued":
                continue

            found.append(p)

        page += 1

    return found

def wp_upload_media(wp_api_base: str, auth, image_path: str) -> int:
    mime = guess_mime(image_path)
    filename = os.path.basename(image_path)

    with open(image_path, "rb") as f:
        data = f.read()

    r = requests.post(
        f"{wp_api_base}/media",
        auth=auth,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": mime,
        },
        data=data,
        timeout=180,
    )
    if r.status_code not in (200, 201):
        raise RuntimeError(f"media upload failed {r.status_code}: {r.text[:500]}")
    return int(r.json()["id"])

def wp_update_post(wp_api_base: str, auth, post_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    r = requests.post(
        f"{wp_api_base}/posts/{post_id}",
        auth=auth,
        json=payload,
        timeout=60,
    )
    if r.status_code not in (200, 201):
        raise RuntimeError(f"post update failed {r.status_code}: {r.text[:500]}")
    return r.json()

def build_prompt(post: Dict[str, Any]) -> str:
    title = (post.get("title") or {}).get("rendered") or ""
    meta = post.get("meta") or {}
    focus_kw = meta.get("_yoast_wpseo_focuskw") or ""

    return f"""Create a clean, modern featured image for Creator Newsdesk.
No text, no logos, no watermarks.
Cinematic, professional, modern creator-tech vibe.
Topic: {title}
Keyword: {focus_kw or title}
Aspect ratio: 16:9
"""

def generate_image_locally(post: Dict[str, Any], out_dir: str) -> str:
    """
    IMPLEMENT THIS to call your SuperGrok inside VS Code workflow.
    Contract:
      - produce an image file at out_dir/post-<id>.(webp|png|jpg)
      - return the full path
    """
    os.makedirs(out_dir, exist_ok=True)
    post_id = int(post["id"])
    prompt = build_prompt(post)

    # If you want manual workflow:
    # 1) print prompt
    # 2) wait for you to save file
    print("\nPROMPT FOR SUPERGROK:\n" + prompt)

    # Expected file name
    expected = os.path.join(out_dir, f"post-{post_id}.webp")
    print(f"Save image as: {expected}")
    input("Press ENTER after the image is saved... ")

    if not os.path.exists(expected):
        raise RuntimeError(f"Expected image not found: {expected}")

    return expected

def main():
    if not RUN_ENABLED:
        print("CND_RUN_ENABLED=0 -> automation disabled.")
        return

    wp_api_base = os.environ["WP_API_BASE"].rstrip("/")
    wp_user = os.environ["WP_USER"]
    wp_app_pass = os.environ["WP_APP_PASSWORD"]
    auth = (wp_user, wp_app_pass)

    out_dir = os.environ.get("OUT_DIR", "./generated_images")
    batch_id = dt.datetime.utcnow().strftime("%Y-%m-%d") + "-HOURLY"

    usage = load_usage()
    usage = prune(usage, 24 * 3600)  # keep file small
    slots = remaining_slots(usage)

    allowed = min(slots["hourly_remaining"], slots["daily_remaining"])
    print(f"Hourly: {slots['hourly_used']}/{HOURLY_CAP} used, remaining {slots['hourly_remaining']}")
    print(f"Daily:  {slots['daily_used']}/{DAILY_CAP} used, remaining {slots['daily_remaining']}")

    if allowed <= 0:
        print("No slots available.")
        return

    print(f"Processing up to {allowed} posts...")

    posts = wp_get_posts_needing_images(wp_api_base, auth, max_needed=allowed)
    print(f"Found {len(posts)} posts needing images")

    for post in posts:
        post_id = int(post["id"])
        print(f"\n--- Post {post_id}: {(post.get('title') or {}).get('rendered', '')[:60]} ---")

        try:
            wp_update_post(wp_api_base, auth, post_id, {"meta": {"cnd_img_state": "queued"}})

            img_path = generate_image_locally(post, out_dir)
            media_id = wp_upload_media(wp_api_base, auth, img_path)

            wp_update_post(wp_api_base, auth, post_id, {
                "featured_media": media_id,
                "meta": {"cnd_img_state": "generated"},
            })
            print(f"✓ Set featured media {media_id}")

            usage.append(time.time())
            save_usage(usage)

        except Exception as e:
            print(f"✗ Failed: {e}")
            wp_update_post(wp_api_base, auth, post_id, {"meta": {"cnd_img_state": "failed"}})

    print("\nDone.")