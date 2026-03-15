import os
import json
import time
import asyncio
import joblib
import pandas as pd
from collections import Counter
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Custom imports
from utils import clean_text
from fetch_reviews import fetch_reddit_posts
from analyzer import SentimentEngine
from fetch_youtube import search_youtube_and_get_comments
from absa_engine import analyze_aspects
from amazon_scraper import fetch_amazon_reviews
from emotion_engine import detect_emotion
from time_series_store import record_analysis, get_timeseries
from multilingual_engine import analyze_multilingual
from sarcasm_engine import analyze_with_sarcasm
from topic_engine import extract_topics, forecast_trend
from voice_engine import analyze_voice_sentiment

app = FastAPI(title="Advanced Sentiment & Emotion API")

class TextRequest(BaseModel):
    text: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

models_dict = {}
vectorizer = None
encoder = None
dl_engine = None

@app.on_event("startup")
def load_models():
    global models_dict, vectorizer, encoder, dl_engine
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    MODELS_DIR = os.path.join(BASE_DIR, "models")
    try:
        models_dict = {
            "Logistic Regression": joblib.load(os.path.join(MODELS_DIR, "logistic.pkl")),
            "Naive Bayes":         joblib.load(os.path.join(MODELS_DIR, "naive_bayes.pkl")),
            "SVM":                 joblib.load(os.path.join(MODELS_DIR, "svm.pkl")),
            "Random Forest":       joblib.load(os.path.join(MODELS_DIR, "random_forest.pkl")),
        }
        vectorizer = joblib.load(os.path.join(MODELS_DIR, "vectorizer.pkl"))
        encoder    = joblib.load(os.path.join(MODELS_DIR, "encoder.pkl"))
    except FileNotFoundError:
        print("Classical models not found. Run train_model.py first.")
    try:
        dl_engine = SentimentEngine()
    except Exception as e:
        print(f"Deep learning engine failed: {e}")

# ── Helpers ──────────────────────────────────────────────────────────────────

def predict_sentiment(text: str) -> str:
    cleaned = clean_text(text)
    vec = vectorizer.transform([cleaned])
    pred = models_dict["Logistic Regression"].predict(vec)
    return str(encoder.inverse_transform(pred)[0]).capitalize()


def extract_keywords(texts: list, top_n: int = 20) -> list:
    import re
    stopwords = {
        'the','a','an','is','it','in','on','at','to','for','of','and','or',
        'but','are','was','were','be','been','have','has','had','do','does',
        'did','will','would','could','should','may','might','can','this','that',
        'with','from','by','as','not','no','i','you','he','she','we','they',
        'my','your','his','her','our','their','if','so','just','about','what',
        'which','who','how','when','where','why','am','me','him','us','them',
        'its','all','more','very','really','also','then','than','here','there',
        'get','got','dont','cant','isnt','wasnt','im','its'
    }
    words = []
    for text in texts:
        cleaned = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
        words.extend([w for w in cleaned if w not in stopwords])
    counts = Counter(words)
    return [{"word": word, "count": count} for word, count in counts.most_common(top_n)]

# ── Request Models ────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    text: str

# ── Core Endpoints ────────────────────────────────────────────────────────────

@app.post("/analyze")
def analyze_review(req: AnalyzeRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Empty text")
    if not models_dict or vectorizer is None:
        raise HTTPException(status_code=500, detail="Models not loaded")

    cleaned = clean_text(req.text)
    vec = vectorizer.transform([cleaned])
    results = {}
    for name, model in models_dict.items():
        pred = model.predict(vec)
        results[name] = str(encoder.inverse_transform(pred)[0]).capitalize()

    if dl_engine:
        dl = dl_engine.analyze(req.text)
        results["RoBERTa"] = str(dl['sentiment']).capitalize()
        results["RoBERTa_Confidence"] = dl['confidence']

    all_labels = [v for k, v in results.items() if k != "RoBERTa_Confidence"]
    sentiment_counts = {
        "Positive": all_labels.count("Positive"),
        "Negative": all_labels.count("Negative"),
        "Neutral":  all_labels.count("Neutral"),
        "Irrelevant": all_labels.count("Irrelevant"),
    }
    majority = max(sentiment_counts, key=sentiment_counts.get)
    record_analysis(req.text, majority, source="single")

    return {"results": results, "sentiment_counts": sentiment_counts, "consensus": majority}


@app.post("/emotion")
def analyze_emotion(req: AnalyzeRequest):
    """Detect human emotion in text (anger, joy, sadness, fear, disgust, surprise, neutral)."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Empty text")
    result = detect_emotion(req.text)
    return result


@app.post("/absa")
def analyze_absa(req: AnalyzeRequest):
    """Aspect-Based Sentiment Analysis — returns per-aspect sentiment breakdown."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Empty text")
    if not models_dict or vectorizer is None:
        raise HTTPException(status_code=500, detail="Models not loaded")

    aspects = analyze_aspects(req.text, predict_fn=predict_sentiment)
    return {
        "aspects": aspects,
        "total_aspects": len(aspects),
        "text_preview": req.text[:200],
    }


@app.get("/reddit")
def analyze_reddit(subreddit: str, limit: int = 50):
    if not subreddit.strip():
        raise HTTPException(status_code=400, detail="Subreddit name required")
    df = fetch_reddit_posts(subreddit, limit=limit)
    if df.empty:
        raise HTTPException(status_code=404, detail="No posts found")

    cleaned = df["Text"].astype(str).apply(clean_text)
    vec = vectorizer.transform(cleaned)
    preds = models_dict["Logistic Regression"].predict(vec)
    df["Predicted_Sentiment"] = [str(s).capitalize() for s in encoder.inverse_transform(preds)]

    counts = df["Predicted_Sentiment"].value_counts().to_dict()
    keywords = extract_keywords(df["Text"].tolist())

    for _, row in df.iterrows():
        record_analysis(row["Text"], row["Predicted_Sentiment"], source="reddit")

    return {"subreddit": subreddit, "counts": counts, "posts": df.to_dict(orient="records"), "keywords": keywords}


@app.get("/youtube")
def analyze_youtube(query: str, limit: int = 50):
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query required")
    video_info, df = search_youtube_and_get_comments(query, limit=limit)
    if df.empty or video_info is None:
        raise HTTPException(status_code=404, detail="No video or comments found")

    cleaned = df["Text"].astype(str).apply(clean_text)
    vec = vectorizer.transform(cleaned)
    preds = models_dict["Logistic Regression"].predict(vec)
    df["Predicted_Sentiment"] = [str(s).capitalize() for s in encoder.inverse_transform(preds)]
    counts = df["Predicted_Sentiment"].value_counts().to_dict()

    for _, row in df.iterrows():
        record_analysis(row["Text"], row["Predicted_Sentiment"], source="youtube")

    return {"video_info": video_info, "counts": counts, "comments": df.to_dict(orient="records")}


@app.get("/scrape/amazon")
def analyze_amazon(query: str, limit: int = 30):
    """Scrape Amazon reviews for a product and analyze sentiment."""
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query required")
    if not models_dict or vectorizer is None:
        raise HTTPException(status_code=500, detail="Models not loaded")

    product, df = fetch_amazon_reviews(query, limit=limit)
    if df.empty:
        raise HTTPException(status_code=404, detail="No Amazon reviews found. Try a different product name.")

    cleaned = df["Text"].astype(str).apply(clean_text)
    vec = vectorizer.transform(cleaned)
    preds = models_dict["Logistic Regression"].predict(vec)
    df["Predicted_Sentiment"] = [str(s).capitalize() for s in encoder.inverse_transform(preds)]

    counts = df["Predicted_Sentiment"].value_counts().to_dict()
    keywords = extract_keywords(df["Text"].tolist())

    # Avg star rating
    avg_stars = round(df["Stars"].mean(), 1) if "Stars" in df.columns and not df["Stars"].isna().all() else None

    for _, row in df.iterrows():
        record_analysis(row["Text"], row["Predicted_Sentiment"], source="amazon")

    return {
        "product": product,
        "counts": counts,
        "reviews": df.to_dict(orient="records"),
        "keywords": keywords,
        "avg_stars": avg_stars,
        "total_reviews": len(df),
    }


@app.get("/history")
def get_history_chart():
    """Retrieve aggregations for the time-series chart."""
    return {"timeseries": get_timeseries()}


@app.post("/multilingual")
def analyze_multilingual_endpoint(req: TextRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text required")
    res = analyze_multilingual(req.text)
    record_analysis(req.text, res["sentiment"], source="multilingual")
    return res


@app.post("/sarcasm")
def analyze_sarcasm_endpoint(req: TextRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text required")
    # Get base sentiment first
    cleaned = clean_text(req.text)
    vec = vectorizer.transform([cleaned])
    pred = models_dict["Logistic Regression"].predict(vec)[0]
    base_sent = str(encoder.inverse_transform([pred])[0]).capitalize()
    
    res = analyze_with_sarcasm(req.text, base_sent)
    record_analysis(req.text, res["adjusted_sentiment"], source="sarcasm")
    return res


@app.get("/topics")
def analyze_topics_endpoint(limit: int = 200):
    # Grab recent texts from history
    from time_series_store import history_store
    recent_texts = [item["full_text"] for item in reversed(list(history_store))][:limit]
    topics = extract_topics(recent_texts, n_topics=5)
    return {"topics": topics, "source_count": len(recent_texts)}


@app.post("/voice")
async def analyze_voice_endpoint(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    
    def predict_sentiment(text: str) -> str:
        cleaned = clean_text(text)
        vec = vectorizer.transform([cleaned])
        pred = models_dict["Logistic Regression"].predict(vec)[0]
        return str(encoder.inverse_transform([pred])[0]).capitalize()
        
    res = analyze_voice_sentiment(audio_bytes, predict_sentiment)
    if res["transcript"] and res["sentiment"] != "Unknown":
        record_analysis(res["transcript"], res["sentiment"], source="voice")
    return res


@app.get("/trending")
def get_trending_sentiment():
    TRENDING_SUBREDDITS = [
        "worldnews", "technology", "science", "gaming", "movies",
        "stocks", "politics", "entertainment", "sports", "ArtificialIntell"
    ]
    if not models_dict or vectorizer is None:
        raise HTTPException(status_code=500, detail="Models not loaded")

    results = []
    for sub in TRENDING_SUBREDDITS:
        try:
            df = fetch_reddit_posts(sub, limit=20)
            if df.empty:
                continue
            cleaned = df["Text"].astype(str).apply(clean_text)
            vec = vectorizer.transform(cleaned)
            preds = models_dict["Logistic Regression"].predict(vec)
            sentiments = [str(s).capitalize() for s in encoder.inverse_transform(preds)]
            counts = {
                "Positive":   sentiments.count("Positive"),
                "Negative":   sentiments.count("Negative"),
                "Neutral":    sentiments.count("Neutral"),
                "Irrelevant": sentiments.count("Irrelevant"),
            }
            total = len(sentiments)
            score = max(0, min(100, round(((counts["Positive"] - counts["Negative"] * 0.5) / total) * 100))) if total else 0
            results.append({
                "subreddit": sub,
                "score": score,
                "positive_pct": round((counts["Positive"] / total) * 100) if total else 0,
                "counts": counts,
                "total": total,
                "top_post": df["Text"].iloc[0][:200] if len(df) > 0 else "",
            })
        except Exception as e:
            print(f"Error r/{sub}: {e}")

    results.sort(key=lambda x: x["score"], reverse=True)
    return {"topics": results, "timestamp": time.time()}


@app.get("/stream/reddit")
async def stream_reddit(subreddit: str = "worldnews", interval: int = 20):
    if not models_dict or vectorizer is None:
        raise HTTPException(status_code=500, detail="Models not loaded")

    seen_texts: set = set()

    async def event_generator():
        yield f"data: {json.dumps({'type': 'connected', 'subreddit': subreddit})}\n\n"
        while True:
            try:
                df = fetch_reddit_posts(subreddit, limit=30)
                if not df.empty:
                    new_posts = []
                    for _, row in df.iterrows():
                        text = row["Text"]
                        key = text[:80]
                        if key not in seen_texts:
                            seen_texts.add(key)
                            sentiment = predict_sentiment(text)
                            new_posts.append({"text": text[:300], "sentiment": sentiment, "timestamp": time.time()})

                    for post in new_posts:
                        yield f"data: {json.dumps({'type': 'post', **post})}\n\n"
                        await asyncio.sleep(0.3)

                    yield f"data: {json.dumps({'type': 'stats', 'total_analyzed': len(seen_texts), 'subreddit': subreddit})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            await asyncio.sleep(interval)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
