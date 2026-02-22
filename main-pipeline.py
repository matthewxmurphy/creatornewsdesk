from wmill import get_variable
import json
import random

# Import your existing scripts (these must exist at these paths)
from f.CreatorNewdesk.brave_fetch_news import main as brave_fetch_news
from f.CreatorNewdesk.extract_publish_date import main as extract_publish_date


def gv(path: str, default=None, required: bool = False):
    try:
        v = get_variable(path)
        if v is None:
            raise Exception("None")
        if isinstance(v, str) and not v.strip():
            raise Exception("empty")
        return v
    except Exception:
        if required:
            raise
        return default


def _json_list(v, default_list):
    if v is None:
        return list(default_list)
    if isinstance(v, str):
        s = v.strip()
        if not s:
            return list(default_list)
        return list(json.loads(s))
    return list(v)


def main():
    terms = _json_list(gv("f/CreatorNewdesk/SEARCH_TERMS_JSON", required=True), [])
    terms = [str(t).strip() for t in terms if str(t).strip()]
    random.shuffle(terms)

    crawl_rate = int(gv("f/CreatorNewdesk/CRAWL_RATE", default="10") or 10)
    backfill_windows = _json_list(gv("f/CreatorNewdesk/BACKFILL_WINDOWS", default='["pd10"]'), ["pd10"])

    out = []
    seen_urls = set()

    for term in terms[:crawl_rate]:
        for freshness in backfill_windows:
            brave = brave_fetch_news(term=term, count=8, freshness=freshness) or {}
            items = brave.get("items") or []
            if not items:
                continue

            # pick first item (you can change to scoring later)
            it = items[0] or {}
            url = (it.get("url") or "").strip()
            if not url.startswith("http"):
                continue
            if url in seen_urls:
                continue
            seen_urls.add(url)

            pub = extract_publish_date(url=url) or {}

            out.append(
                {
                    "term": term,
                    "freshness": freshness,
                    "url": url,
                    "title": it.get("title") or "",
                    "description": it.get("description") or "",
                    "image_url": it.get("image_url") or "",
                    "brave_published_time": it.get("brave_published_time"),
                    "date_gmt": pub.get("date_gmt"),
                    "date_source": pub.get("source"),
                }
            )

    return {"count": len(out), "items": out}