from wmill import get_variable
import requests, json, re, random

BRAVE_URL = "https://api.search.brave.com/res/v1/news/search"

def clamp(s, n):
    s = "" if s is None else str(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s[:n]

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

def load_terms() -> list[str]:
    raw = get_variable("f/CreatorNewdesk/SEARCH_TERMS_JSON")
    if not raw or not str(raw).strip():
        raise Exception("Missing variable: f/CreatorNewdesk/SEARCH_TERMS_JSON")

    try:
        terms = json.loads(raw) if isinstance(raw, str) else raw
    except Exception as e:
        raise Exception(f"SEARCH_TERMS_JSON is not valid JSON: {e}")

    if not isinstance(terms, list) or not terms:
        raise Exception("SEARCH_TERMS_JSON must be a non-empty JSON array")

    cleaned = []
    for t in terms:
        t = clamp(t, 140)
        if t:
            cleaned.append(t)
    if not cleaned:
        raise Exception("SEARCH_TERMS_JSON contains no usable terms")
    return cleaned

def main(count: int = 5, freshness: str = "pd10"):
    brave_key = get_variable("f/CreatorNewdesk/BRAVE_API_KEY")
    if not brave_key or not str(brave_key).strip():
        raise Exception("Missing variable: f/CreatorNewdesk/BRAVE_API_KEY")

    terms = load_terms()
    term = random.choice(terms)

    q = f"\"{term}\" (creator OR influencer OR youtuber OR streamer OR tiktok OR instagram OR reels OR shorts OR podcast OR youtube)"

    headers = {
        "X-Subscription-Token": str(brave_key).strip(),
        "Accept": "application/json",
        "User-Agent": "CreatorNewsdesk/1.0"
    }

    r = requests.get(
        BRAVE_URL,
        headers=headers,
        params={
            "q": q,
            "freshness": freshness,
            "count": int(count),
            "safesearch": "moderate",
            "text_decorations": False
        },
        timeout=(10, 25)
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

        title = it.get("title") or ""
        desc = it.get("description") or ""
        published = it.get("published_time") or it.get("publishedAt") or it.get("date") or ""
        img = pick_image(it)

        out.append({
            "term": term,
            "url": url,
            "title": clamp(title, 220),
            "description": clamp(desc, 800),
            "image_url": clamp(img, 500),
            "brave_published_time": clamp(published, 80),
            "source": clamp((it.get("source") or it.get("meta_url", {}).get("hostname") or ""), 120),
        })

    return {
        "term": term,
        "query": q,
        "count": len(out),
        "items": out
    }