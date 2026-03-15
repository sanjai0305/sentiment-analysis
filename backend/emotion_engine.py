"""
emotion_engine.py
-----------------
Lazy-loads the HuggingFace emotion detection model on first use.
Model: j-hartmann/emotion-english-distilroberta-base
Detects: anger, disgust, fear, joy, neutral, sadness, surprise
"""

from __future__ import annotations
import threading

_pipeline = None
_lock = threading.Lock()

EMOTION_META = {
    "joy":      {"emoji": "😄", "color": "#f59e0b", "group": "positive"},
    "surprise": {"emoji": "😲", "color": "#06b6d4", "group": "positive"},
    "neutral":  {"emoji": "😐", "color": "#6b7280", "group": "neutral"},
    "sadness":  {"emoji": "😢", "color": "#3b82f6", "group": "negative"},
    "fear":     {"emoji": "😨", "color": "#8b5cf6", "group": "negative"},
    "disgust":  {"emoji": "🤢", "color": "#10b981", "group": "negative"},
    "anger":    {"emoji": "😠", "color": "#ef4444", "group": "negative"},
}


def _load_pipeline():
    global _pipeline
    if _pipeline is None:
        with _lock:
            if _pipeline is None:
                from transformers import pipeline
                _pipeline = pipeline(
                    "text-classification",
                    model="j-hartmann/emotion-english-distilroberta-base",
                    return_all_scores=True,
                    device=-1  # CPU
                )
    return _pipeline


def detect_emotion(text: str) -> dict:
    """
    Returns:
        {
          "dominant": "joy",
          "scores": [{"label": "joy", "score": 0.9, "emoji": "😄", "color": ...}, ...],
        }
    """
    try:
        pipe = _load_pipeline()
        # Truncate to avoid model length errors
        truncated = text[:512]
        raw = pipe(truncated)[0]

        scores = []
        for item in sorted(raw, key=lambda x: x["score"], reverse=True):
            label = item["label"].lower()
            meta = EMOTION_META.get(label, {"emoji": "❓", "color": "#6b7280", "group": "neutral"})
            scores.append({
                "label": label,
                "score": round(item["score"], 4),
                "emoji": meta["emoji"],
                "color": meta["color"],
                "group": meta["group"],
            })

        dominant = scores[0]["label"] if scores else "neutral"
        return {"dominant": dominant, "scores": scores}

    except Exception as e:
        print(f"Emotion detection error: {e}")
        return {
            "dominant": "neutral",
            "scores": [
                {"label": "neutral", "score": 1.0,
                 "emoji": "😐", "color": "#6b7280", "group": "neutral"}
            ]
        }
