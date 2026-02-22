from wmill import get_variable
import json

def main():
    raw = get_variable("f/CreatorNewdesk/SEARCH_TERMS_JSON")

    try:
        terms = json.loads(raw) if isinstance(raw, str) else raw
    except Exception as e:
        raise Exception(f"SEARCH_TERMS_JSON is not valid JSON: {e}")

    if not isinstance(terms, list) or not all(isinstance(x, str) for x in terms):
        raise Exception("SEARCH_TERMS_JSON must be a JSON array of strings")

    terms = [t.strip() for t in terms if t and t.strip()]

    # optional: de-dupe while preserving order
    seen = set()
    out = []
    for t in terms:
        k = t.lower()
        if k not in seen:
            seen.add(k)
            out.append(t)

    return {"terms": out, "count": len(out)}