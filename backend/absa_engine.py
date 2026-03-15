"""
absa_engine.py
--------------
Aspect-Based Sentiment Analysis (ABSA)
Uses a rule-based approach:
  1. Split text into sentences
  2. Detect aspect keywords in each sentence
  3. Run fast Logistic Regression sentiment on that sentence
  4. Return per-aspect sentiment map
"""

from __future__ import annotations
import re

# ── Aspect taxonomy ──────────────────────────────────────────────────────────
ASPECTS = {
    "Screen / Display": [
        "screen", "display", "resolution", "brightness", "amoled", "oled",
        "lcd", "hdr", "refresh rate", "120hz", "90hz", "panel", "bezel", "notch"
    ],
    "Battery": [
        "battery", "charging", "charge", "mah", "fast charge", "wireless charge",
        "power", "drain", "backup", "standby", "fuel"
    ],
    "Camera": [
        "camera", "photo", "picture", "video", "selfie", "lens", "zoom", "mp",
        "megapixel", "night mode", "portrait", "bokeh", "autofocus", "flash"
    ],
    "Performance": [
        "performance", "speed", "fast", "slow", "lag", "smooth", "processor",
        "chip", "snapdragon", "exynos", "ram", "memory", "cpu", "gpu", "benchmark"
    ],
    "Design / Build": [
        "design", "build", "quality", "premium", "plastic", "metal", "glass",
        "weight", "feel", "grip", "compact", "slim", "thin", "heavy", "bulky"
    ],
    "Price / Value": [
        "price", "cost", "value", "expensive", "cheap", "worth", "money",
        "affordable", "overpriced", "budget", "deal", "discount"
    ],
    "Software / OS": [
        "software", "os", "android", "ios", "ui", "ux", "interface", "update",
        "bloatware", "feature", "app", "settings", "smooth", "buggy", "bug", "crash"
    ],
    "Audio / Speaker": [
        "speaker", "sound", "audio", "music", "volume", "bass", "treble",
        "microphone", "mic", "stereo", "headphone", "jack", "noise"
    ],
    "Connectivity": [
        "wifi", "wi-fi", "network", "signal", "5g", "4g", "lte", "bluetooth",
        "nfc", "gps", "hotspot", "connectivity", "carrier", "sim"
    ],
    "Delivery / Service": [
        "delivery", "shipping", "packaging", "box", "seller", "amazon",
        "flipkart", "service", "return", "refund", "support", "customer"
    ],
}


def _split_sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r'[.!?;]', text) if len(s.strip()) > 10]


def analyze_aspects(text: str, predict_fn) -> dict:
    """
    Args:
        text: raw review text
        predict_fn: callable (str) -> "Positive" | "Negative" | "Neutral" | "Irrelevant"
    Returns:
        dict of {aspect_name: {"sentiment": str, "sentences": [...]}}
    """
    sentences = _split_sentences(text)
    if not sentences:
        sentences = [text]

    aspect_results: dict[str, dict] = {}

    for sentence in sentences:
        lower = sentence.lower()
        for aspect_name, keywords in ASPECTS.items():
            matched = any(kw in lower for kw in keywords)
            if matched:
                sentiment = predict_fn(sentence)
                if aspect_name not in aspect_results:
                    aspect_results[aspect_name] = {"sentiment": sentiment, "sentences": [], "count": 0}
                aspect_results[aspect_name]["sentences"].append({"text": sentence.strip(), "sentiment": sentiment})
                aspect_results[aspect_name]["count"] += 1

                # Re-evaluate dominant sentiment (majority vote across sentences)
                sents_list = [s["sentiment"] for s in aspect_results[aspect_name]["sentences"]]
                from collections import Counter
                dominant = Counter(sents_list).most_common(1)[0][0]
                aspect_results[aspect_name]["sentiment"] = dominant

    return aspect_results
