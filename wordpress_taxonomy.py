from wmill import get_variable
import requests
import json
import re
from typing import Any

BRAVE_URL = "https://api.search.brave.com/res/v1/news/search"

def clamp(s: Any, n: int) -> str:
    s = "" if s is None else str(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s[:n]

def normalize_term(term: Any) -> str:
    # Windmill sometimes passes objects; accept {"term": "..."} or {"name": "..."}
    if term is None:
        return ""
    if isinstance(term, dict):
        term = term.get("term") or term.get("name") or term.get("q") or ""
    if isinstance(term, (list, tuple)):
        term = "".join(str(x) for x in term if x is not None)
    return clamp(term, 140)

def pick_image(item: dict) -> str:
    for k in ("image", "thumbnail", "img"):
        v = item.get(k)
        if isinstance(v, str) and v.startswith("http"):
            return v
        if isinstance(v, dict):
            u = v.get("url") or v.get("src")
            if isinstance(u, str) and u.startswith("http"):
                return u
    return ""

def norm_iso(s: Any) -> str | None:
    if not s:
        return None
    s = str(s).strip()
    return s or None

def main(term: Any = "", count: int = 5, freshness: str = "pd10"):
    brave_key = get_variable("f/CreatorNewdesk/BRAVE_API_KEY")
    if not brave_key or not str(brave_key).strip():
        raise Exception("Missing variable: f/CreatorNewdesk/BRAVE_API_KEY")

    term = normalize_term(term)
    if not term:
        raise Exception("term is empty (pass a string or {'term': '...'} )")

    # Escape quotes so we don't break the query
    term_q = term.replace('"', '\\"')

    q = f"\"{term_q}\" (creator OR influencer OR youtuber OR streamer OR tiktok OR instagram OR reels OR shorts OR podcast OR youtube)"

    headers = {
        "X-Subscription-Token": str(brave_key).strip(),
        "Accept": "application/json",
        "User-Agent": "CreatorNewsdesk/1.0",
    }

    r = requests.get(
        BRAVE_URL,
        headers=headers,
        params={
            "q": q,
            "freshness": str(freshness),
            "count": int(count),
            "safesearch": "moderate",
            "text_decorations": False,
        },
        timeout=(10, 25),
    )

    if r.status_code != 200:
        raise Exception(f"Brave API failed {r.status_code}: {r.text[:400]}")

    payload = r.json() if r.text else {}
    results = payload.get("results", []) or []

    out = []
    for it in results:
        url = clamp(it.get("url") or "", 500)
        if not url.startswith("http"):
            continue

        out.append({
            "term": term,
            "url": url,
            "title": clamp(it.get("title") or "", 220),
            "description": clamp(it.get("description") or "", 800),
            "image_url": clamp(pick_image(it), 500),
            "brave_published_time": norm_iso(it.get("published_time") or it.get("publishedAt") or it.get("date") or ""),
            "source": clamp((it.get("source") or it.get("meta_url", {}).get("hostname") or ""), 120),
        })

    return {"term": term, "query": q, "count": len(out), "items": out}