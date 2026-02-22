from wmill import get_variable
import requests, json, re
from datetime import datetime

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "CreatorNewsdeskBot/1.0"})

def gv(path: str, default=None, required=False):
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

def clamp(s, n):
    s = "" if s is None else str(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s[:n]

def extract_json(text: str) -> dict:
    text = (text or "").strip()
    # remove code fences if any
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    # pull the first {...} block
    m = re.search(r"\{.*\}", text, re.S)
    if m:
        text = m.group(0).strip()
    return json.loads(text)

def main(
    term: str = "",
    url: str = "",
    title: str = "",
    description: str = "",
    page_text: str = "",
    date_gmt: str = ""
):
    term = (term or "").strip()
    url = (url or "").strip()
    title = (title or "").strip()
    description = (description or "").strip()
    page_text = (page_text or "").strip()
    date_gmt = (date_gmt or "").strip()

    if not term:
        raise Exception("term is required")
    if url and not url.startswith("http"):
        raise Exception("url must start with http(s)")

    lm_host = str(gv("f/CreatorNewdesk/LM_STUDIO_HOST", required=True)).strip().rstrip("/")
    model = str(gv("f/CreatorNewdesk/LM_MODEL", default="mistralai/mistral-7b-instruct-v0.3")).strip()

    # Keep page_text bounded so LM doesn't choke
    page_text = page_text[:4000]

    prompt = f"""
You write for CreatorNewsdesk.com.

Write an ORIGINAL news-style blog post based on the source info below.
Do NOT copy sentences or paragraphs from the source.

Return ONLY valid JSON (no markdown, no commentary) with EXACT keys:
- wp_title: string (original, not the source title; <= 120 chars)
- html: string (HTML only; 600-900 words; no <html><head><body> wrapper)
- seo_title: string (<= 60 chars)
- meta_desc: string (120-155 chars)
- focus_kw: string (2-5 words)
- tags: array of strings (3-8 tags)

Term: {term}
Source URL: {url}
Source title: {title}
Source description: {description}
Publish date (GMT ISO8601, if known): {date_gmt}

Source excerpt (may be messy):
{page_text}
""".strip()

    r = SESSION.post(
        f"{lm_host}/v1/chat/completions",
        json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": 1800,
            "stream": False
        },
        timeout=(10, 240),
    )

    if r.status_code != 200:
        raise Exception(f"LM Studio failed {r.status_code}: {r.text[:400]}")

    content = (r.json().get("choices", [{}])[0].get("message", {}).get("content") or "").strip()
    if not content:
        raise Exception("LM Studio returned empty content")

    try:
        j = extract_json(content)
    except Exception:
        raise Exception(f"LM returned non-JSON: {content[:300]}")

    wp_title = clamp(j.get("wp_title"), 120)
    html = (j.get("html") or "").strip()
    seo_title = clamp(j.get("seo_title") or wp_title, 60)
    meta_desc = clamp(j.get("meta_desc"), 155)
    focus_kw = clamp(j.get("focus_kw") or term, 60)
    tags = j.get("tags") or []

    # normalize tags
    if not isinstance(tags, list):
        tags = []
    tags = [clamp(t, 40) for t in tags if str(t).strip()]
    tags = tags[:8]

    # strip accidental wrappers
    html = html.replace("```html", "").replace("```", "").strip()
    html = re.sub(r"(?is)^\s*<!doctype.*?<body[^>]*>", "", html).strip()
    html = re.sub(r"(?is)</body>\s*</html>\s*$", "", html).strip()

    if not wp_title:
        raise Exception("LM missing wp_title")
    if not html:
        raise Exception("LM missing html")

    return {
        "term": term,
        "url": url,
        "wp_title": wp_title,
        "html": html,
        "seo_title": seo_title,
        "meta_desc": meta_desc,
        "focus_kw": focus_kw,
        "tags": tags,
        "model": model
    }