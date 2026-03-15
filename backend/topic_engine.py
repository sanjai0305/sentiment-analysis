"""
topic_engine.py
---------------
Topic modelling and trend forecasting using LDA (sklearn).
Extracts meaningful topics from a collection of texts and
predicts which topics are trending vs declining.
"""
from __future__ import annotations
import re
from collections import Counter
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.decomposition import LatentDirichletAllocation

STOPWORDS = {
    'the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and',
    'or', 'but', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'can', 'this', 'that', 'with', 'from', 'by', 'as', 'not', 'no', 'i',
    'you', 'he', 'she', 'we', 'they', 'my', 'your', 'his', 'her', 'our',
    'their', 'if', 'so', 'just', 'about', 'what', 'which', 'who', 'how',
    'when', 'where', 'why', 'am', 'me', 'him', 'us', 'them', 'its', 'all',
    'more', 'very', 'really', 'also', 'then', 'than', 'here', 'there', 'get',
    'got', 'dont', 'cant', 'isnt', 'wasnt', 'im', 'ive', 'product', 'item',
    'one', 'use', 'using', 'used', 'buy', 'bought', 'received', 'would', 'like',
}


def _clean(text: str) -> str:
    text = re.sub(r'[^a-zA-Z\s]', ' ', text.lower())
    words = [w for w in text.split() if w not in STOPWORDS and len(w) > 3]
    return ' '.join(words)


def _top_words(model, vectorizer, topic_idx: int, n: int = 6) -> list[str]:
    feature_names = vectorizer.get_feature_names_out()
    top_indices = model.components_[topic_idx].argsort()[-n:][::-1]
    return [feature_names[i] for i in top_indices]


def extract_topics(texts: list[str], n_topics: int = 5) -> list[dict]:
    """
    Run LDA topic modeling on a list of texts.
    Returns list of topics with keywords and document distribution.
    """
    if not texts or len(texts) < 3:
        return []

    cleaned = [_clean(t) for t in texts]
    cleaned = [t for t in cleaned if len(t.strip()) > 10]
    if len(cleaned) < 3:
        return []

    try:
        n_topics = min(n_topics, len(cleaned))
        vectorizer = CountVectorizer(
            max_df=0.90, min_df=1,
            max_features=300, stop_words='english'
        )
        dtm = vectorizer.fit_transform(cleaned)

        lda = LatentDirichletAllocation(
            n_components=n_topics,
            random_state=42,
            max_iter=15,
        )
        lda.fit(dtm)

        # Assign each doc to its dominant topic
        doc_topics = lda.transform(dtm).argmax(axis=1)
        topic_counts = Counter(doc_topics.tolist())
        total_docs = len(cleaned)

        topics = []
        for i in range(n_topics):
            keywords = _top_words(lda, vectorizer, i)
            count = topic_counts.get(i, 0)
            topics.append({
                "id":         i,
                "label":      f"Topic {i + 1}: {', '.join(keywords[:3])}",
                "keywords":   keywords,
                "doc_count":  count,
                "percentage": round((count / total_docs) * 100) if total_docs else 0,
            })

        # Sort by most dominant
        topics.sort(key=lambda x: x["doc_count"], reverse=True)
        return topics

    except Exception as e:
        print(f"Topic modeling error: {e}")
        return []


def forecast_trend(timeseries_data: list[dict]) -> list[dict]:
    """
    Simple linear trend forecasting on sentiment timeseries.
    Each entry: {"timestamp": int, "Positive": int, "Negative": int, ...}
    Returns the same with a "trend" field: "rising" | "falling" | "stable"
    """
    if len(timeseries_data) < 2:
        return timeseries_data

    result = []
    for i, entry in enumerate(timeseries_data):
        if i == 0:
            entry["trend"] = "stable"
        else:
            prev = timeseries_data[i - 1]
            cur_pos = entry.get("Positive", 0)
            prv_pos = prev.get("Positive", 0)
            cur_neg = entry.get("Negative", 0)
            prv_neg = prev.get("Negative", 0)
            net_change = (cur_pos - cur_neg) - (prv_pos - prv_neg)
            if net_change > 1:
                entry["trend"] = "rising"
            elif net_change < -1:
                entry["trend"] = "falling"
            else:
                entry["trend"] = "stable"
        result.append(entry)

    return result
