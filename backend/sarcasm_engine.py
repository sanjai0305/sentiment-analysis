"""
sarcasm_engine.py
-----------------
Detects sarcasm and irony in text using a transformer classifier.
Falls back to a rule-based heuristic when model is unavailable.

Model: jkhan447/sarcasm-detection-RoBerta-base-CR
"""
from __future__ import annotations
import re
import threading

_pipeline = None
_lock = threading.Lock()

# Sarcasm indicators: caps + positive words, punctuation patterns, etc.
SARCASM_PATTERNS = [
    r'\b(oh sure|yeah right|totally|absolutely|great job|wow amazing|so helpful|love that)\b',
    r'[A-Z]{3,}',           # shouting / caps lock
    r'\.{3,}',              # ellipsis trailing off
    r'(!{2,})',             # multiple exclamation marks
    r'(\?\!|\!\?)',         # mixed !?
]

IRONY_WORDS = [
    "obviously", "clearly", "of course", "definitely", "certainly",
    "brilliant", "genius", "wonderful", "fantastic", "love how",
    "great job", "good luck with that", "yeah right", "totally",
    "as if", "sure", "whatever you say", "oh wow"
]


def _load_pipeline():
    global _pipeline
    if _pipeline is None:
        with _lock:
            if _pipeline is None:
                try:
                    from transformers import pipeline
                    _pipeline = pipeline(
                        "text-classification",
                        model="jkhan447/sarcasm-detection-RoBerta-base-CR",
                        device=-1,
                    )
                except Exception as e:
                    print(f"Sarcasm model load failed, using heuristic: {e}")
                    _pipeline = "heuristic"
    return _pipeline


def _heuristic_sarcasm(text: str) -> tuple[bool, float]:
    """Rule-based sarcasm scoring."""
    lower = text.lower()
    score = 0.0

    for pat in SARCASM_PATTERNS:
        if re.search(pat, text, re.IGNORECASE):
            score += 0.2

    for word in IRONY_WORDS:
        if word in lower:
            score += 0.15

    # Sentiment contradiction: positive words + negative context
    positive_words = ["great", "amazing", "love", "best", "excellent", "fantastic", "wonderful"]
    negative_words = ["not", "never", "worst", "terrible", "awful", "horrible", "bad", "waste"]
    has_pos = any(w in lower for w in positive_words)
    has_neg = any(w in lower for w in negative_words)
    if has_pos and has_neg:
        score += 0.3

    is_sarcastic = score >= 0.3
    confidence = min(0.95, score)
    return is_sarcastic, confidence


def detect_sarcasm(text: str) -> dict:
    """
    Returns:
        {
          "is_sarcastic": True/False,
          "confidence": 0.87,
          "adjusted_sentiment": "Negative",  # flipped if sarcastic
          "original_sentiment": "Positive",
          "method": "model" | "heuristic",
        }
    """
    pipe = _load_pipeline()
    is_sarcastic = False
    confidence = 0.0
    method = "heuristic"

    if pipe != "heuristic" and pipe is not None:
        try:
            result = pipe(text[:512])[0]
            label = result.get("label", "").lower()
            score = result.get("score", 0.5)
            is_sarcastic = "sarc" in label or label == "1" or label == "label_1"
            confidence = round(score, 4)
            method = "model"
        except Exception:
            is_sarcastic, confidence = _heuristic_sarcasm(text)
    else:
        is_sarcastic, confidence = _heuristic_sarcasm(text)

    # Flip sentiment if sarcastic
    flip_map = {"Positive": "Negative", "Negative": "Positive", "Neutral": "Neutral"}
    original = "Positive"  # placeholder — caller should pass actual sentiment
    adjusted = flip_map.get(original, original) if is_sarcastic else original

    return {
        "is_sarcastic":        is_sarcastic,
        "confidence":          confidence,
        "adjusted_sentiment":  adjusted,
        "method":              method,
    }


def analyze_with_sarcasm(text: str, base_sentiment: str) -> dict:
    """
    Takes the base sentiment from existing model and recalibrates based on sarcasm.
    """
    result = detect_sarcasm(text)
    flip_map = {"Positive": "Negative", "Negative": "Positive", "Neutral": "Neutral"}
    adjusted = flip_map.get(base_sentiment, base_sentiment) if result["is_sarcastic"] else base_sentiment

    return {
        "is_sarcastic":        result["is_sarcastic"],
        "sarcasm_confidence":  result["confidence"],
        "original_sentiment":  base_sentiment,
        "adjusted_sentiment":  adjusted,
        "method":              result["method"],
        "explanation": (
            f"⚠️ Sarcasm detected! The text appears to use ironic/sarcastic language. "
            f"Sentiment recalibrated from '{base_sentiment}' → '{adjusted}'."
            if result["is_sarcastic"]
            else f"✅ No sarcasm detected. Sentiment '{base_sentiment}' stands."
        ),
    }
