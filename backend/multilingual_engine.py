"""
multilingual_engine.py
----------------------
Cross-lingual sentiment analysis using XLM-RoBERTa.
Supports English, Tamil, Thanglish, Hinglish, Hindi, and 100+ more languages.
Model: cardiffnlp/twitter-xlm-roberta-base-sentiment
"""
from __future__ import annotations
import threading

_pipeline = None
_lock = threading.Lock()

LANG_LABELS = {
    "LABEL_0": "Negative",
    "LABEL_1": "Neutral",
    "LABEL_2": "Positive",
    "Negative": "Negative",
    "Neutral":  "Neutral",
    "Positive": "Positive",
}


def _load_pipeline():
    global _pipeline
    if _pipeline is None:
        with _lock:
            if _pipeline is None:
                from transformers import pipeline
                _pipeline = pipeline(
                    "text-classification",
                    model="cardiffnlp/twitter-xlm-roberta-base-sentiment",
                    return_all_scores=True,
                    device=-1,
                )
    return _pipeline


def detect_language_hint(text: str) -> str:
    """Basic heuristic to detect script/language from text."""
    tamil_range = range(0x0B80, 0x0BFF)
    hindi_range = range(0x0900, 0x097F)
    has_tamil = any(ord(c) in tamil_range for c in text)
    has_hindi = any(ord(c) in hindi_range for c in text)
    if has_tamil:
        return "Tamil"
    if has_hindi:
        return "Hindi"
    # Thanglish/Hinglish - mixed ASCII with Tamil/Hindi words
    common_thanglish = ["romba", "super", "illa", "irukku", "paaru", "nalla", "seri", "da", "na", "tha"]
    common_hinglish = ["bahut", "achha", "kya", "nahi", "theek", "zyada", "thoda", "aur", "bhi", "hai"]
    lower = text.lower()
    if any(w in lower for w in common_thanglish):
        return "Thanglish"
    if any(w in lower for w in common_hinglish):
        return "Hinglish"
    return "English"


def analyze_multilingual(text: str) -> dict:
    """
    Returns:
        {
          "sentiment": "Positive" | "Negative" | "Neutral",
          "confidence": 0.92,
          "language": "Thanglish",
          "scores": [{"label": ..., "score": ...}, ...],
        }
    """
    try:
        pipe = _load_pipeline()
        raw = pipe(text[:512])[0]
        lang = detect_language_hint(text)

        scores = []
        for item in sorted(raw, key=lambda x: x["score"], reverse=True):
            label = LANG_LABELS.get(item["label"], item["label"])
            scores.append({"label": label, "score": round(item["score"], 4)})

        dominant = scores[0]["label"]
        confidence = scores[0]["score"]

        return {
            "sentiment":  dominant,
            "confidence": confidence,
            "language":   lang,
            "scores":     scores,
        }
    except Exception as e:
        print(f"Multilingual engine error: {e}")
        return {"sentiment": "Neutral", "confidence": 0.5, "language": "Unknown", "scores": []}
