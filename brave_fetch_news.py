"""
Brave News Fetcher

Fetches news articles from Brave Search API based on configured search terms.
This module provides functions to query Brave's news API and extract
relevant article information.

Note: This originally used Windmill (wmill) for variable storage.
Now uses environment variables from .env file instead.

Usage:
    python3 brave_fetch_news.py

Author: Matthew Murphy
License: MIT
"""

import os
import json
import re
import requests

# Brave Search API endpoint
# See https://brave.com/search/api/ for API documentation
BRAVE_URL = "https://api.search.brave.com/res/v1/news/search"

# Get API key from environment
def get_brave_api_key() -> str:
    """
    Get Brave API key from environment variable.
    
    Returns:
        str: Brave API key, or empty string if not set
    """
    return os.environ.get("BRAVE_API_KEY", "")


def clamp(s: str, n: int) -> str:
    """
    Clean and truncate a string to a maximum length.
    
    Removes extra whitespace and truncates to n characters.
    
    Args:
        s (str): Input string
        n (int): Maximum length
    
    Returns:
        str: Cleaned and truncated string
    """
    if s is None:
        s = ""
    s = str(s)
    # Remove extra whitespace
    s = re.sub(r"\s+", " ", s).strip()
    return s[:n]


def pick_image(item: dict) -> str:
    """
    Extract image URL from Brave API response item.
    
    Brave returns images in various formats - this function
    tries multiple keys to find a valid URL.
    
    Args:
        item (dict): Single result item from Brave API
    
    Returns:
        str: Image URL or empty string if not found
    """
    # Try common image keys
    for k in ("image", "thumbnail", "img"):
        v = item.get(k)
        if isinstance(v, str) and v.startswith("http"):
            return v
        # Handle nested object format
        if isinstance(v, dict):
            u = v.get("url") or v.get("src")
            if isinstance(u, str) and u.startswith("http"):
                return u
    return ""


def load_terms() -> list:
    """
    Load search terms from environment variable.
    
    Reads SEARCH_TERMS_JSON from environment (or .env file via python-dotenv)
    and validates it's a non-empty list.
    
    Returns:
        list: List of search terms
    
    Raises:
        Exception: If SEARCH_TERMS_JSON is missing or invalid
    """
    # Try environment variable first
    raw = os.environ.get("SEARCH_TERMS_JSON", "")
    
    # If empty, try loading from .env file
    if not raw or not str(raw).strip():
        try:
            from dotenv import load_dotenv
            load_dotenv()
            raw = os.environ.get("SEARCH_TERMS_JSON", "")
        except ImportError:
            pass
    
    if not raw or not str(raw).strip():
        raise Exception("Missing environment variable: SEARCH_TERMS_JSON")

    try:
        terms = json.loads(raw) if isinstance(raw, str) else raw
    except Exception as e:
        raise Exception(f"SEARCH_TERMS_JSON is not valid JSON: {e}")

    if not isinstance(terms, list) or not terms:
        raise Exception("SEARCH_TERMS_JSON must be a non-empty JSON array")

    # Clean and validate each term
    cleaned = []
    for t in terms:
        t = clamp(t, 140)
        if t:
            cleaned.append(t)
    
    if not cleaned:
        raise Exception("No valid search terms found in SEARCH_TERMS_JSON")

    return cleaned


def search_brave(query: str, api_key: str = None, count: int = 10) -> list:
    """
    Search Brave News API for articles matching query.
    
    Makes a request to Brave Search API and returns formatted results.
    
    Args:
        query (str): Search query string
        api_key (str, optional): Brave API key (uses env if not provided)
        count (int): Number of results to fetch (default: 10)
    
    Returns:
        list: List of article dictionaries with title, description, url, etc.
    """
    if not api_key:
        api_key = get_brave_api_key()
    
    if not api_key:
        print("Warning: No Brave API key provided")
        return []

    headers = {
        "X-Subscription-Token": api_key,
        "Accept": "application/json"
    }
    
    params = {
        "q": query,
        "count": count,
        "search_lang": "en"
    }

    try:
        resp = requests.get(BRAVE_URL, headers=headers, params=params, timeout=30)
        
        if resp.status_code != 200:
            print(f"Brave API error: {resp.status_code}")
            return []
        
        data = resp.json()
        results = data.get("results", [])
        
        articles = []
        for item in results:
            article = {
                "title": clamp(item.get("title", ""), 200),
                "description": clamp(item.get("description", ""), 500),
                "url": item.get("url", ""),
                "domain": item.get("domain", ""),
                "age": item.get("age", ""),
                "image": pick_image(item)
            }
            articles.append(article)
        
        return articles

    except Exception as e:
        print(f"Brave search error: {e}")
        return []


def fetch_all_news(terms: list = None, articles_per_term: int = 10) -> list:
    """
    Fetch news for multiple search terms.
    
    Args:
        terms (list, optional): List of search terms (loads from env if not provided)
        articles_per_term (int): Number of articles per term
    
    Returns:
        list: Combined list of all articles
    """
    if not terms:
        terms = load_terms()
    
    all_articles = []
    api_key = get_brave_api_key()
    
    for term in terms:
        print(f"Searching: {term}")
        articles = search_brave(term, api_key, articles_per_term)
        all_articles.extend(articles)
    
    return all_articles


# Main entry point for standalone execution
if __name__ == "__main__":
    # Try to load .env file if python-dotenv is available
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass
    
    articles = fetch_all_news()
    print(f"Fetched {len(articles)} articles")
    
    # Print sample
    for i, article in enumerate(articles[:3]):
        print(f"\n--- Article {i+1} ---")
        print(f"Title: {article.get('title', '')}")
        print(f"URL: {article.get('url', '')}")
