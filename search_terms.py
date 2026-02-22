"""
Search Terms Manager

Manages search terms for the Creator Newsdesk pipeline.
Loads search terms from environment variables, validates them,
and returns a cleaned list for use in Brave API queries.

Usage:
    python3 search_terms.py

Author: Matthew Murphy
License: MIT
"""

import os
import json
from typing import Dict, List


def load_search_terms() -> Dict[str, any]:
    """
    Load and validate search terms from environment variable.
    
    Reads SEARCH_TERMS_JSON from environment, validates it's a list
    of strings, removes duplicates (case-insensitive), and returns
    cleaned list.
    
    Returns:
        dict: Object with 'terms' (list) and 'count' (int)
    
    Raises:
        Exception: If SEARCH_TERMS_JSON is missing or invalid
    """
    # Try to get from environment
    raw = os.environ.get("SEARCH_TERMS_JSON", "")
    
    # Try loading .env file if available
    if not raw or not str(raw).strip():
        try:
            from dotenv import load_dotenv
            load_dotenv()
            raw = os.environ.get("SEARCH_TERMS_JSON", "")
        except ImportError:
            pass
    
    if not raw or not str(raw).strip():
        raise Exception("Missing environment variable: SEARCH_TERMS_JSON")

    # Parse JSON
    try:
        terms = json.loads(raw) if isinstance(raw, str) else raw
    except Exception as e:
        raise Exception(f"SEARCH_TERMS_JSON is not valid JSON: {e}")

    # Validate it's a list of strings
    if not isinstance(terms, list) or not all(isinstance(x, str) for x in terms):
        raise Exception("SEARCH_TERMS_JSON must be a JSON array of strings")

    # Clean and filter
    terms = [t.strip() for t in terms if t and t.strip()]

    # Deduplicate while preserving order (case-insensitive)
    seen = set()
    out = []
    for t in terms:
        key = t.lower()
        if key not in seen:
            seen.add(key)
            out.append(t)

    return {"terms": out, "count": len(out)}


def main():
    """
    Main entry point for CLI usage.
    
    Loads search terms and prints JSON output.
    """
    result = load_search_terms()
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
