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
from typing import List, Dict, Any, Optional

# ============================================================================
# Configuration - Environment Variables
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


def search_brave(query: str, api_key: str, count: int = 10) -> List[Dict]:
    """
    Search Brave News API for articles matching query.
    
    Uses Brave Search API to find news articles. Results include title,
    description, URL, and published date.
    
    Args:
        query (str): Search query string
        api_key (str): Brave API key
        count (int): Number of results to fetch (default: 10)
    
    Returns:
        list: List of article dictionaries
    """
    try:
        # Brave Search API endpoint
        url = "https://api.search.brave.com/res/v1/web/search"
        headers = {
            "X-Subscription-Token": api_key,
            "Accept": "application/json"
        }
        params = {
            "q": query,
            "count": count,
            "search_lang": "en"
        }
        
        resp = requests.get(url, headers=headers, params=params, timeout=30)
        
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("web", {}).get("results", [])
            
            articles = []
            for item in results:
                # Extract relevant fields from Brave response
                article = {
                    "title": item.get("title", ""),
                    "description": item.get("description", ""),
                    "url": item.get("url", ""),
                    "published": item.get("age", ""),
                    "domain": item.get("domain", "")
                }
                articles.append(article)
            
            return articles
        
    except Exception as e:
        print(f"Brave API error for '{query}': {e}")
    
    return []


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
                   status: str = "draft") -> Optional[int]:
    """
    Create a new WordPress post.
    
    Uses WP REST API to create a new post with the given title, content,
    categories, and tags.
    
    Args:
        auth (dict): WordPress authentication (api_base, user, password)
        title (str): Post title
        content (str): Post content (HTML)
        categories (list): List of category IDs
        tags (list): List of tag IDs
        status (str): Post status ('draft' or 'publish')
    
    Returns:
        int: Created post ID, or None on failure
    """
    api_base = auth.get("api_base", WP_API_BASE)
    user = auth.get("user", WP_USER)
    password = auth.get("password", WP_APP_PASSWORD)
    
    try:
        resp = requests.post(
            f"{api_base}/wp/v2/posts",
            auth=(user, password),
            json={
                "title": title,
                "content": content,
                "status": status,
                "categories": categories or [],
                "tags": tags or []
            }
        )
        
        if resp.status_code in (200, 201):
            return resp.json()["id"]
        else:
            print(f"WP create error: {resp.status_code} - {resp.text}")
    
    except Exception as e:
        print(f"WP API error: {e}")
    
    return None


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
    print("Starting Creator News Pipeline...")
    
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
    auth = site.get("wp", {})
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
        articles = search_brave(query, api_key, count=10)
        
        stats["fetched"] += len(articles)
        
        for article in articles:
            url = article.get("url", "")
            
            # Skip already processed URLs
            if url in processed_urls:
                stats["skipped"] += 1
                continue
            
            # Mark as processed
            processed_urls.add(url)
            
            # Rewrite article with LLM
            prompt = f"""Rewrite this news article for a tech news website.
Keep it informative but concise. Write in a professional style.

Title: {article.get('title', '')}
Source: {article.get('domain', '')}
Description: {article.get('description', '')}

Write a new article:"""
            
            generated_content = generate_with_llm(prompt)
            
            if not generated_content:
                stats["errors"] += 1
                continue
            
            # Create WordPress post
            post_id = create_wp_post(
                auth,
                title=article.get("title", ""),
                content=generated_content,
                status=PUBLISH_MODE
            )
            
            if post_id:
                stats["created"] += 1
                print(f"Created post {post_id}: {article.get('title', '')[:50]}...")
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
    
    return stats


if __name__ == "__main__":
    main()
