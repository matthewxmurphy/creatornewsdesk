"""
LLM Post Generator

Generates AI-written news posts using local LLM (llama.cpp) or external AI providers.
This module provides functions to rewrite fetched articles into engaging content
suitable for the Creator Newsdesk WordPress site.

Supports:
- Local LLM via llama.cpp (OpenAI-compatible API)
- xAI (Grok)
- OpenAI
- MiniMax

Usage:
    python3 llm_generate_post.py --article "Article title and content..."

Author: Matthew Murphy
License: MIT
"""

import os
import json
import re
import requests
from datetime import datetime
from typing import Dict, Optional

# =============================================================================
# Configuration
# =============================================================================

# Get configuration from environment variables
# See .env.example for all available options

def get_env(key: str, default=None, required: bool = False):
    """
    Get environment variable with optional default and required check.
    
    Args:
        key (str): Environment variable name
        default: Default value if not found
        required (bool): Raise exception if not found and no default
    
    Returns:
        Environment variable value or default
    """
    value = os.environ.get(key, default)
    if required and not value:
        raise Exception(f"Required environment variable not set: {key}")
    return value


def clamp(s: str, n: int) -> str:
    """
    Clean and truncate string to maximum length.
    
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


def extract_json(text: str) -> dict:
    """
    Extract JSON from LLM response text.
    
    LLM responses may include code fences or extra text.
    This function extracts just the JSON portion.
    
    Args:
        text (str): Raw LLM response
    
    Returns:
        dict: Parsed JSON or empty dict on failure
    """
    text = (text or "").strip()
    # Remove code fences if any
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {}


def generate_with_local_llm(prompt: str, model: str = None) -> str:
    """
    Generate text using local LLM (llama.cpp via OpenAI-compatible API).
    
    Sends prompt to local LLM server and returns generated text.
    
    Args:
        prompt (str): Input prompt
        model (str, optional): Model name override
    
    Returns:
        str: Generated text or empty string on failure
    """
    base_url = get_env("LOCAL_LLM_BASE_URL", "http://172.17.0.1:1240")
    model_name = model or get_env("LOCAL_LLM_MODEL", "Mistral-7B-Instruct-v0.3-Q4_K_M.gguf")
    
    try:
        resp = requests.post(
            f"{base_url}/v1/chat/completions",
            json={
                "model": model_name,
                "messages": [
                    {"role": "system", "content": "You are a professional tech news writer for a creator-focused news site."},
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
        print(f"Local LLM error: {e}")
    
    return ""


def generate_with_xai(prompt: str, model: str = "grok-2-1212") -> str:
    """
    Generate text using xAI (Grok) API.
    
    Args:
        prompt (str): Input prompt
        model (str): Model name (default: grok-2-1212)
    
    Returns:
        str: Generated text or empty string on failure
    """
    api_key = get_env("XAI_API_KEY", "")
    
    if not api_key:
        print("xAI API key not set")
        return ""
    
    try:
        resp = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": "You are a professional tech news writer."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7
            },
            timeout=60
        )
        
        if resp.status_code == 200:
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    
    except Exception as e:
        print(f"xAI error: {e}")
    
    return ""


def generate_with_openai(prompt: str, model: str = "gpt-4o") -> str:
    """
    Generate text using OpenAI API.
    
    Args:
        prompt (str): Input prompt
        model (str): Model name (default: gpt-4o)
    
    Returns:
        str: Generated text or empty string on failure
    """
    api_key = get_env("OPENAI_API_KEY", "")
    
    if not api_key:
        print("OpenAI API key not set")
        return ""
    
    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": "You are a professional tech news writer."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7
            },
            timeout=60
        )
        
        if resp.status_code == 200:
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    
    except Exception as e:
        print(f"OpenAI error: {e}")
    
    return ""


def generate_article(article: Dict, provider: str = "local") -> Dict:
    """
    Generate a rewritten news article using specified AI provider.
    
    Takes an article from Brave API and rewrites it using the configured
    AI provider into engaging content for Creator Newsdesk.
    
    Args:
        article (dict): Article with 'title', 'description', 'url', 'domain'
        provider (str): AI provider to use ('local', 'xai', 'openai')
    
    Returns:
        dict: Generated article with 'title', 'content', 'excerpt', 'tags'
    """
    # Build prompt for rewriting
    prompt = f"""Rewrite this news article for a tech news website targeting content creators.
Keep it informative, engaging, and suitable for a professional audience.

Title: {article.get('title', '')}
Source: {article.get('domain', '')}
Description: {article.get('description', '')}

Write a new article with:
1. An engaging title
2. 3-4 paragraphs of content
3. A brief excerpt (2 sentences)

Format your response as JSON:
{{
    "title": "New engaging title",
    "content": "Full article content in HTML with <p> tags",
    "excerpt": "Brief excerpt",
    "tags": ["tag1", "tag2", "tag3"]
}}

Write the article now:"""
    
    # Generate based on provider
    if provider == "xai":
        result = generate_with_xai(prompt)
    elif provider == "openai":
        result = generate_with_openai(prompt)
    else:
        # Default to local LLM
        result = generate_with_local_llm(prompt)
    
    if not result:
        return {
            "title": article.get("title", ""),
            "content": article.get("description", ""),
            "excerpt": "",
            "tags": []
        }
    
    # Extract JSON from response
    generated = extract_json(result)
    
    return {
        "title": generated.get("title", article.get("title", "")),
        "content": generated.get("content", article.get("description", "")),
        "excerpt": generated.get("excerpt", ""),
        "tags": generated.get("tags", [])
    }


def generate_batch(articles: list, provider: str = "local") -> list:
    """
    Generate rewritten articles for a list of articles.
    
    Args:
        articles (list): List of article dictionaries
        provider (str): AI provider to use
    
    Returns:
        list: List of generated article dictionaries
    """
    results = []
    
    for i, article in enumerate(articles):
        print(f"Processing article {i+1}/{len(articles)}: {article.get('title', '')[:50]}...")
        
        generated = generate_article(article, provider)
        results.append(generated)
    
    return results


# Main entry point
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate AI-written news posts")
    parser.add_argument("--article", help="Article title/content to rewrite")
    parser.add_argument("--provider", default="local", choices=["local", "xai", "openai"], help="AI provider")
    parser.add_argument("--model", help="Model name (provider-specific)")
    
    args = parser.parse_args()
    
    if args.article:
        # Generate single article
        article = {"title": "Sample", "description": args.article, "domain": "example.com"}
        result = generate_article(article, args.provider)
        
        print("\n=== Generated Article ===")
        print(f"Title: {result['title']}")
        print(f"Content: {result['content']}")
        print(f"Tags: {result['tags']}")
    else:
        print("Usage: python3 llm_generate_post.py --article 'Your article text here'")
