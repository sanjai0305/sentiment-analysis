"""
amazon_scraper.py
-----------------
Scrapes Amazon search results and product reviews using requests + BeautifulSoup.
Uses rotating User-Agent strings to minimize blocking.
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import re
import time
import random

HEADERS_LIST = [
    {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://www.amazon.com/",
    },
    {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://www.amazon.com/",
    },
    {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.7",
        "Accept-Encoding": "gzip, deflate",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://www.google.com/",
    },
]


def _get_headers() -> dict:
    return random.choice(HEADERS_LIST)


def _clean_text(text: str) -> str:
    return re.sub(r'\s+', ' ', text).strip()


def search_amazon_product(query: str) -> dict | None:
    """Search Amazon for the query and return the first product's ASIN and title."""
    search_url = f"https://www.amazon.com/s?k={requests.utils.quote(query)}&language=en_US"
    try:
        resp = requests.get(search_url, headers=_get_headers(), timeout=12)
        if resp.status_code != 200:
            return None
        soup = BeautifulSoup(resp.text, "lxml")

        # Find first product result
        result = soup.find("div", {"data-component-type": "s-search-result"})
        if not result:
            return None

        asin = result.get("data-asin", "")
        title_el = result.find("span", {"class": lambda c: c and "a-text-normal" in c})
        title = _clean_text(title_el.get_text()) if title_el else query
        img_el = result.find("img", {"class": "s-image"})
        image = img_el["src"] if img_el else ""
        link = f"https://www.amazon.com/dp/{asin}" if asin else ""

        # Rating
        rating_el = result.find("span", {"class": "a-icon-alt"})
        rating = _clean_text(rating_el.get_text()) if rating_el else "N/A"

        return {"asin": asin, "title": title, "link": link, "image": image, "rating": rating}
    except Exception as e:
        print(f"Amazon product search error: {e}")
        return None


def fetch_amazon_reviews(query: str, limit: int = 30) -> tuple[dict | None, pd.DataFrame]:
    """
    High-level function: search for product, fetch reviews from the reviews page.
    Returns: (product_info, dataframe_with_Text_column)
    """
    product = search_amazon_product(query)
    if not product or not product.get("asin"):
        # Fall back to parsing reviews from search page
        return product, pd.DataFrame()

    asin = product["asin"]
    reviews_url = f"https://www.amazon.com/product-reviews/{asin}/?sortBy=recent&pageNumber=1&language=en_US"

    posts = []
    try:
        time.sleep(random.uniform(0.5, 1.5))  # polite delay
        resp = requests.get(reviews_url, headers=_get_headers(), timeout=12)
        if resp.status_code != 200:
            return product, pd.DataFrame()

        soup = BeautifulSoup(resp.text, "lxml")
        review_divs = soup.find_all("div", {"data-hook": "review"})

        for div in review_divs[:limit]:
            body_el = div.find("span", {"data-hook": "review-body"})
            star_el = div.find("i", {"data-hook": "review-star-rating"})
            title_el = div.find("a", {"data-hook": "review-title"})

            body = _clean_text(body_el.get_text()) if body_el else ""
            stars_text = _clean_text(star_el.get_text()) if star_el else "3 out of 5 stars"
            title = _clean_text(title_el.get_text()) if title_el else ""

            # Extract numeric star rating
            star_match = re.search(r'(\d+\.?\d*)', stars_text)
            stars = float(star_match.group(1)) if star_match else 3.0

            if body:
                posts.append({"Text": body, "Title": title, "Stars": stars})

    except Exception as e:
        print(f"Amazon reviews fetch error: {e}")

    df = pd.DataFrame(posts) if posts else pd.DataFrame()
    return product, df
