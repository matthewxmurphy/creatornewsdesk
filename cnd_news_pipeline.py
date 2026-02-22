import os
import json
import requests
import datetime as dt
import random
from typing import List, Dict, Any, Optional

BRAVE_API_KEY = os.environ.get("BRAVE_API_KEY", "")
BRAVE_API_KEYS_JSON = os.environ.get("BRAVE_API_KEYS_JSON", "[]")
WP_API_BASE = os.environ.get("WP_API_BASE", "")
WP_USER = os.environ.get("WP_USER", "")
WP_APP_PASSWORD = os.environ.get("WP_APP_PASSWORD", "")
LOCAL_LLM_BASE_URL = os.environ.get("LOCAL_LLM_BASE_URL", "http://172.17.0.1:1240")
LOCAL_LLM_MODEL = os.environ.get("LOCAL_LLM_MODEL", "Mistral-7B-Instruct-v0.3-Q4_K_M.gguf")
SEARCH_TERMS_JSON = os.environ.get("SEARCH_TERMS_JSON", "[]")
WP_AUTH_PROFILES = os.environ.get("WP_AUTH_PROFILES", "[]")
WP_AUTH_WEIGHTS = os.environ.get("WP_AUTH_WEIGHTS", "[]")
PUBLISH_MODE = os.environ.get("PUBLISH_MODE", "draft")
BACKFILL_WINDOW_DAYS = int(os.environ.get("BACKFILL_WINDOW_DAYS", "10"))

STATUS_FILE = "pipeline_status.json"
DASHBOARD_URL = os.environ.get("DASHBOARD_URL", "http://localhost:8000")
CONFIG_FILE = "config.json"

PROCESSED_FILE = ".processed_urls.json"
CACHE_FILE = ".wp_cache.json"

wp_cache = {}

def load_wp_cache():
    global wp_cache
    if os.path.exists(CACHE_FILE):
        try:
            wp_cache = json.load(open(CACHE_FILE))
        except:
            wp_cache = {}

def save_wp_cache():
    json.dump(wp_cache, open(CACHE_FILE, "w"), indent=2)

def load_config() -> Dict:
    if os.path.exists(CONFIG_FILE):
        try:
            return json.load(open(CONFIG_FILE))
        except:
            pass
    return {}

def load_processed() -> set:
    if os.path.exists(PROCESSED_FILE):
        try:
            return set(json.load(open(PROCESSED_FILE)))
        except:
            pass
    return set()

def save_processed(urls: set):
    json.dump(list(urls), open(PROCESSED_FILE, "w"), indent=2)

def get_wp_categories(auth) -> Dict[int, Dict]:
    global wp_cache
    categories = {}
    try:
        r = requests.get(f"{WP_API_BASE}/categories", auth=auth, params={"per_page": 100}, timeout=30)
        if r.status_code == 200:
            for cat in r.json():
                categories[cat["id"]] = {
                    "name": cat["name"],
                    "slug": cat.get("slug", ""),
                    "parent": cat.get("parent", 0)
                }
            wp_cache["categories"] = categories
            save_wp_cache()
        else:
            print(f"WP categories error: {r.status_code}")
            categories = wp_cache.get("categories", {})
    except Exception as e:
        print(f"Failed to fetch categories: {e}")
        categories = wp_cache.get("categories", {})
    
    return categories

def get_category_by_slug(slug: str, auth) -> Optional[int]:
    categories = get_wp_categories(auth)
    for cat_id, cat_data in categories.items():
        if cat_data["slug"].lower() == slug.lower():
            return cat_id
    return None

def get_category_by_name(name: str, auth) -> Optional[int]:
    categories = get_wp_categories(auth)
    for cat_id, cat_data in categories.items():
        if cat_data["name"].lower() == name.lower():
            return cat_id
    return None

def sync_wp_categories(config: Dict, auth):
    structure = config.get("search", {}).get("structure", {})
    brands = structure.get("Brands", {})
    created = 0
    
    for category_name in brands.keys():
        slug = category_name.lower().replace(" & ", "-").replace(" ", "-")
        brands_list = brands[category_name]
        
        existing_id = get_category_by_slug(slug, auth)
        if existing_id:
            print(f"Category exists: {category_name}")
            continue
        
        try:
            r = requests.post(f"{WP_API_BASE}/categories", auth=auth, json={
                "name": category_name,
                "description": f"News about {category_name} - Brands: {', '.join(brands_list[:5])}"
            }, timeout=30)
            if r.status_code in (200, 201):
                print(f"Created category: {category_name}")
                created += 1
            else:
                print(f"Failed to create {category_name}: {r.status_code}")
        except Exception as e:
            print(f"Error creating category {category_name}: {e}")
    
    load_wp_cache()
    return created

def build_search_terms(config: Dict) -> List[str]:
    search_terms = []
    structure = config.get("search", {}).get("structure", {})
    events = config.get("search", {}).get("events", [])
    
    for category, subcats in structure.items():
        if isinstance(subcats, dict):
            for subcat, terms in subcats.items():
                if isinstance(terms, list):
                    for term in terms:
                        search_terms.append(term)
                        if events:
                            for event in events[:2]:
                                search_terms.append(f"{term} {event}")
                else:
                    search_terms.append(str(terms))
                    if events:
                        search_terms.append(f"{subcats} {events[0]}")
        else:
            search_terms.append(str(subcats))
    
    return search_terms

def get_author_for_category(category_name: str, authors: List[Dict]) -> Optional[Dict]:
    category_lower = category_name.lower()
    
    for author in authors:
        author_cats = [c.lower() for c in author.get("categories", [])]
        if category_lower in author_cats:
            return author
    
    return None

def select_author(authors: List[Dict], category_name: str = "") -> Dict:
    if not authors:
        return {"user": WP_USER, "password": WP_APP_PASSWORD}
    
    if category_name:
        cat_author = get_author_for_category(category_name, authors)
        if cat_author:
            return cat_author
    
    weights = [a.get("weight", 1) for a in authors]
    total = sum(weights)
    r = random.random() * total
    cumsum = 0
    for i, w in enumerate(weights):
        cumsum += w
        if r <= cumsum:
            return authors[i]
    
    return authors[0]

def update_dashboard(stats: Dict = None, running: bool = None, lastPost: str = None, lastError: str = None):
    data = {}
    if stats is not None:
        data["stats"] = stats
    if running is not None:
        data["running"] = running
    if lastPost:
        data["lastPost"] = lastPost
    if lastError:
        data["lastError"] = lastError
    
    try:
        requests.post(f"{DASHBOARD_URL}/api/update", json=data, timeout=5)
    except:
        pass

def search_brave(query: str, api_key: str, count: int = 10) -> List[Dict]:
    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        "Accept": "application/json",
        "X-Subscription-Token": api_key,
    }
    params = {
        "q": query,
        "count": count,
        "freshness": "pw",
    }
    
    try:
        r = requests.get(url, headers=headers, params=params, timeout=30)
        if r.status_code != 200:
            print(f"Brave API error {r.status_code}: {r.text[:200]}")
            return []
        data = r.json()
        return data.get("web", {}).get("results", [])
    except Exception as e:
        print(f"Brave search failed: {e}")
        return []

def filter_relevant(results: List[Dict], config: Dict = None) -> List[Dict]:
    relevant = []
    
    keywords = set()
    if config:
        structure = config.get("search", {}).get("structure", {})
        for category, subcats in structure.items():
            if isinstance(subcats, dict):
                keywords.update([k.lower() for k in subcats.keys()])
                for terms in subcats.values():
                    if isinstance(terms, list):
                        keywords.update([t.lower() for t in terms])
            else:
                keywords.add(str(subcats).lower())
        
        events = config.get("search", {}).get("events", [])
    else:
        keywords = {"dji", "insta360", "gopro", "sony", "canon", "rode", "blackmagic", "hp",
                   "youtube", "tiktok", "instagram", "twitch", "mrbeast", "marques"}
        events = ["arrest", "scandal", "lawsuit", "new release", "launch", "announcement"]
    
    for r in results:
        title = r.get("title", "").lower()
        desc = r.get("description", "").lower()
        combined = title + " " + desc
        
        keyword_match = any(k in combined for k in keywords)
        event_match = any(e in combined for e in events) if events else False
        
        if keyword_match or event_match:
            relevant.append(r)
    
    return relevant

def call_llama(prompt: str, system_prompt: str = "") -> Dict[str, Any]:
    payload = {
        "prompt": f"{system_prompt + ' ' if system_prompt else ''}{prompt}",
        "stream": False,
    }
    
    try:
        r = requests.post(f"{LOCAL_LLM_BASE_URL}/v1/completions", json=payload, timeout=120)
        if r.status_code != 200:
            return {"error": f"LLM error: {r.status_code}", "text": ""}
        return r.json()
    except Exception as e:
        return {"error": str(e), "text": ""}

def generate_wp_post(article: Dict) -> Dict[str, Any]:
    title = article.get("title", "Untitled")
    url = article.get("url", "")
    desc = article.get("description", "")
    
    system_prompt = """You are a news writer for Creator Newsdesk. Create a compelling news article.
Rules:
- Write in journalistic style
- Include the source URL at the end
- If no valid publish date is found, return {"publish": false}
- If article is real news, return {"publish": true, "title": "...", "content": "...", "category": "...", "tags": ["tag1", "tag2"]}

Categories: DJI, Insta360, GoPro, Røde, Sony, Tech, YouTube, TikTok, Business, Canon, Nikon, Blackmagic, HP

Respond ONLY in JSON format."""

    prompt = f"""Title: {title}
Description: {desc}
URL: {url}

Create a news article or return {{"publish": false}} if this seems fake/unreliable."""

    result = call_llama(prompt, system_prompt)
    
    try:
        text = result.get("text", "") or ""
        if not text:
            text = result.get("choices", [{}])[0].get("text", "") or result.get("choices", [{}])[0].get("message", {}).get("content", "") or ""
        
        parsed = json.loads(text)
        return parsed
    except:
        return {"publish": False, "error": "Failed to parse LLM response"}

def wp_create_post(title: str, content: str, category_id: int, author_id: int, tags: List[str] = None, auth = None) -> Optional[int]:
    url = f"{WP_API_BASE}/posts"
    data = {
        "title": title,
        "content": content,
        "status": PUBLISH_MODE,
        "categories": [category_id],
    }
    if author_id:
        data["author"] = author_id
    if tags:
        data["tags"] = tags
    
    try:
        r = requests.post(url, auth=auth, json=data, timeout=60)
        if r.status_code in (200, 201):
            return r.json().get("id")
        print(f"WP error: {r.status_code} - {r.text[:200]}")
    except Exception as e:
        print(f"WP post failed: {e}")
    return None

def get_category_id(category_name: str, auth) -> int:
    r = requests.get(f"{WP_API_BASE}/categories", auth=auth, params={"search": category_name}, timeout=30)
    if r.status_code == 200:
        cats = r.json()
        if cats:
            return cats[0]["id"]
    
    r = requests.get(f"{WP_API_BASE}/categories", auth=auth, params={"per_page": 100}, timeout=30)
    if r.status_code == 200:
        for c in r.json():
            if c["name"].lower() == category_name.lower():
                return c["id"]
    
    return 1

def run():
    print("=== Creator News Pipeline ===")
    
    config = load_config()
    load_wp_cache()
    
    site = None
    for s in config.get("sites", []):
        if s.get("active", True):
            site = s
            break
    
    if not site:
        print("No active site found in config")
        return
    
    global WP_API_BASE, WP_USER, WP_APP_PASSWORD, LOCAL_LLM_BASE_URL, LOCAL_LLM_MODEL
    WP_API_BASE = site.get("wp", {}).get("api_base", WP_API_BASE)
    authors = site.get("wp", {}).get("authors", [])
    LOCAL_LLM_BASE_URL = site.get("llm", {}).get("base_url", LOCAL_LLM_BASE_URL)
    LOCAL_LLM_MODEL = site.get("llm", {}).get("model", LOCAL_LLM_MODEL)
    publish_mode = site.get("publish_mode", "draft")
    
    if not WP_API_BASE:
        print("WP_API_BASE not configured")
        return
    
    stats = {"fetched": 0, "processed": 0, "created": 0, "skipped": 0}
    update_dashboard(stats, running=True)
    
    processed = load_processed()
    
    if not authors:
        author = {"user": WP_USER, "password": WP_APP_PASSWORD}
    else:
        author = select_author(authors, "")
    
    auth = (author.get("user", WP_USER), author.get("password", WP_APP_PASSWORD))
    
    print("Fetching categories from WordPress...")
    categories = get_wp_categories(auth)
    print(f"Found {len(categories)} categories")
    
    print("Building search terms from config...")
    search_terms = build_search_terms(config)
    print(f"Generated {len(search_terms)} search terms")
    
    api_keys = config.get("brave_keys", [])
    if not api_keys:
        api_keys = [BRAVE_API_KEY]
    current_key_idx = 0
    
    all_results = []
    
    for query in search_terms:
        if current_key_idx >= len(api_keys):
            break
            
        print(f"Searching: {query}")
        results = search_brave(query, api_keys[current_key_idx])
        
        for r in results:
            url = r.get("url", "")
            if url and url not in processed:
                all_results.append(r)
                processed.add(url)
        
        current_key_idx += 1
    
    save_processed(processed)
    print(f"Found {len(all_results)} new articles")
    stats["fetched"] = len(all_results)
    update_dashboard(stats)
    
    relevant = filter_relevant(all_results, config)
    print(f"Relevant: {len(relevant)}")
    
    for article in relevant:
        print(f"Processing: {article.get('title', '')[:50]}...")
        stats["processed"] += 1
        
        result = generate_wp_post(article)
        
        if result.get("publish"):
            cat_name = result.get("category", "Tech")
            cat_id = get_category_by_name(cat_name, auth)
            if not cat_id:
                cat_id = get_category_by_slug(cat_name.lower().replace(" ", "-"), auth)
            if not cat_id:
                print(f"Category not found: {cat_name}, using default")
                cat_id = 1
            
            author_id = int(author.get("id", 0))
            tags = result.get("tags", [])
            
            post_id = wp_create_post(
                result.get("title") or article.get("title") or "Untitled",
                result.get("content") or article.get("description") or "",
                cat_id,
                author_id,
                tags,
                auth
            )
            
            if post_id:
                print(f"Created post #{post_id}")
                stats["created"] += 1
                update_dashboard(stats, lastPost=result.get("title", ""))
            else:
                print("Failed to create post")
        else:
            print(f"Skipped: {result.get('error', 'Not publishable')}")
            stats["skipped"] += 1
    
    update_dashboard(stats, running=False)
    print("=== Done ===")

if __name__ == "__main__":
    run()
