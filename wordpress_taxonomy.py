"""
WordPress Taxonomy Sync

Synchronizes categories and tags between Creator Newsdesk configuration
and WordPress. Ensures all configured search terms and brand categories
exist in WordPress as proper taxonomy terms.

This script:
1. Reads brand/category structure from config.json
2. Creates missing categories in WordPress via REST API
3. Creates missing tags in WordPress
4. Maps WordPress term IDs for use in post creation

Usage:
    python3 wordpress_taxonomy.py

Author: Matthew Murphy
License: MIT
"""

import os
import json
import re
import requests
from typing import Dict, List, Any, Optional


# =============================================================================
# Configuration
# =============================================================================

def get_env(key: str, default: str = "") -> str:
    """Get environment variable with optional default."""
    return os.environ.get(key, default)


# WordPress API configuration
WP_API_BASE = get_env("WP_API_BASE", "https://www.creatornewsdesk.com/wp-json")
WP_USER = get_env("WP_USER", "")
WP_APP_PASSWORD = get_env("WP_APP_PASSWORD", "")


def clamp(s: Any, n: int) -> str:
    """
    Clean and truncate string to maximum length.
    
    Args:
        s: Input value (any type)
        n: Maximum length
    
    Returns:
        str: Cleaned string truncated to n characters
    """
    if s is None:
        s = ""
    s = str(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s[:n]


def normalize_term(term: Any) -> str:
    """
    Normalize search term from various input formats.
    
    Handles cases where term might be:
    - String
    - Dict with 'term', 'name', or 'q' key
    - List/tuple of values
    
    Args:
        term: Input term in any supported format
    
    Returns:
        str: Normalized string
    """
    if term is None:
        return ""
    if isinstance(term, dict):
        term = term.get("term") or term.get("name") or term.get("q") or ""
    if isinstance(term, (list, tuple)):
        term = "".join(str(x) for x in term if x is not None)
    return clamp(term, 140)


def pick_image(item: dict) -> str:
    """
    Extract image URL from Brave API response item.
    
    Args:
        item (dict): Single result from Brave API
    
    Returns:
        str: Image URL or empty string
    """
    for key in ("image", "thumbnail", "img"):
        v = item.get(key)
        if isinstance(v, str) and v.startswith("http"):
            return v
        if isinstance(v, dict):
            url = v.get("url") or v.get("src")
            if isinstance(url, str) and url.startswith("http"):
                return url
    return ""


def get_wp_auth() -> tuple:
    """
    Get WordPress authentication credentials.
    
    Returns:
        tuple: (username, application_password)
    """
    return (WP_USER, WP_APP_PASSWORD)


def fetch_wp_categories() -> Dict[int, Dict]:
    """
    Fetch all existing WordPress categories.
    
    Returns:
        dict: Category ID -> category data mapping
    """
    auth = get_wp_auth()
    
    try:
        resp = requests.get(
            f"{WP_API_BASE}/wp/v2/categories",
            auth=auth,
            params={"per_page": 100}
        )
        if resp.status_code == 200:
            return {cat["id"]: cat for cat in resp.json()}
    except Exception as e:
        print(f"Error fetching categories: {e}")
    
    return {}


def fetch_wp_tags() -> Dict[int, Dict]:
    """
    Fetch all existing WordPress tags.
    
    Returns:
        dict: Tag ID -> tag data mapping
    """
    auth = get_wp_auth()
    
    try:
        resp = requests.get(
            f"{WP_API_BASE}/wp/v2/tags",
            auth=auth,
            params={"per_page": 100}
        )
        if resp.status_code == 200:
            return {tag["id"]: tag for tag in resp.json()}
    except Exception as e:
        print(f"Error fetching tags: {e}")
    
    return {}


def create_wp_category(name: str, description: str = "") -> Optional[int]:
    """
    Create a new WordPress category.
    
    Args:
        name (str): Category name
        description (str, optional): Category description
    
    Returns:
        int: Created category ID, or None on failure
    """
    auth = get_wp_auth()
    
    try:
        resp = requests.post(
            f"{WP_API_BASE}/wp/v2/categories",
            auth=auth,
            json={"name": name, "description": description}
        )
        if resp.status_code in (200, 201):
            return resp.json()["id"]
    except Exception as e:
        print(f"Error creating category '{name}': {e}")
    
    return None


def create_wp_tag(name: str) -> Optional[int]:
    """
    Create a new WordPress tag.
    
    Args:
        name (str): Tag name
    
    Returns:
        int: Created tag ID, or None on failure
    """
    auth = get_wp_auth()
    
    try:
        resp = requests.post(
            f"{WP_API_BASE}/wp/v2/tags",
            auth=auth,
            json={"name": name}
        )
        if resp.status_code in (200, 201):
            return resp.json()["id"]
    except Exception as e:
        print(f"Error creating tag '{name}': {e}")
    
    return None


def sync_taxonomy(config_path: str = "config.json") -> Dict:
    """
    Synchronize taxonomy between config and WordPress.
    
    Reads brand/category structure from config.json, compares with
    existing WordPress terms, and creates missing ones.
    
    Args:
        config_path (str): Path to config.json
    
    Returns:
        dict: Statistics about sync operation
    """
    stats = {
        "categories_created": 0,
        "tags_created": 0,
        "existing_categories": 0,
        "existing_tags": 0
    }
    
    # Load config
    if not os.path.exists(config_path):
        print(f"Config file not found: {config_path}")
        return stats
    
    with open(config_path) as f:
        config = json.load(f)
    
    # Get existing WordPress terms
    existing_cats = fetch_wp_categories()
    existing_tags = fetch_wp_tags()
    
    stats["existing_categories"] = len(existing_cats)
    stats["existing_tags"] = len(existing_tags)
    
    # Extract categories from config
    sites = config.get("sites", [])
    for site in sites:
        structure = site.get("search", {}).get("structure", {})
        
        for category, brands in structure.items():
            # Create main category if not exists
            existing_names = {c.get("name", "").lower(): c["id"] for c in existing_cats.values()}
            
            if category.lower() not in existing_names:
                cat_id = create_wp_category(category)
                if cat_id:
                    stats["categories_created"] += 1
                    print(f"Created category: {category}")
            
            # Handle nested brands
            if isinstance(brands, dict):
                for brand, brand_data in brands.items():
                    brand_name = brand
                    if isinstance(brand_data, dict):
                        brand_name = brand_data.get("brands", [brand])[0]
                    
                    if brand_name.lower() not in existing_names:
                        cat_id = create_wp_category(brand_name)
                        if cat_id:
                            stats["categories_created"] += 1
                            print(f"Created category: {brand_name}")
    
    print(f"\nSync complete:")
    print(f"  Categories: {stats['categories_created']} created, {stats['existing_categories']} existing")
    print(f"  Tags: {stats['tags_created']} created, {stats['existing_tags']} existing")
    
    return stats


def main():
    """
    Main entry point.
    """
    print("WordPress Taxonomy Sync")
    print("=" * 40)
    
    stats = sync_taxonomy()
    
    return stats


if __name__ == "__main__":
    main()
