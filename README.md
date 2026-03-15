# 🧠 Binary Brains: Advanced Sentiment & Emotion Intelligence Platform

An enterprise-grade, real-time Social Listening and Sentiment Analysis platform. This system ingests text, audio, and live data streams from various sources (Reddit, YouTube, Amazon), and processes them through an ensemble of Classical Machine Learning algorithms and cutting-edge Deep Learning Transformer models.

## 🚀 The 11 Features Currently Working

Here is a complete breakdown of every feature currently built into the platform and how it works under the hood.

---

### 1. 📝 Single Review Analysis (Ensemble ML)
- **What it does:** Type or paste any text review.
- **How it works:** The text is cleaned and passed into an ensemble of 4 Classical Machine Learning models (Logistic Regression, Naive Bayes, SVM, Random Forest) trained on a massive Twitter sentiment dataset (TF-IDF vectorization).
- **Output:** A combined majority-vote Sentiment Prediction (Positive, Negative, Neutral, Irrelevant).

### 2. 📊 Reddit Live Stream
- **What it does:** Scrapes live, real-time posts from specified Reddit communities (Subreddits).
- **How it works:** The backend connects to Reddit, processes new posts instantly, passes them through the ML Ensemble, and pushes them to the frontend using Server-Sent Events (SSE) for zero-latency streaming.
- **Output:** A flowing stream of live posts wrapped in sentiment-colored borders.

### 3. 🎥 YouTube Product Report Card
- **What it does:** Analyzes public opinion of a product based on YouTube video comments.
- **How it works:** You search for a product (e.g., "iPhone 15 Review"). The system uses the official **YouTube Data API v3** to find the top video, extract all its comments, analyze their sentiment, and calculate a total percentage of positivity.
- **Output:** A beautiful "AI Verdict" card (e.g., "Highly Recommended"), a breakdown donut chart, and a scrolling feed of the top comments.

### 4. 🔴 Live Dashboard (Pulse & Trending)
- **What it does:** Provides a high-level "control room" view of what people are feeling *right now*.
- **How it works:** Tracks multiple sources simultaneously. It features an animated bar chart showing the fluctuating sentiment volume over the last 60 seconds.
- **Output:** Includes a Keyword Cloud showing the most frequently used words in negative/positive reviews, and a "Trending Subreddits" leaderboard.

### 5. 🛒 Amazon Scraper & Intelligence
- **What it does:** Pulls direct e-commerce feedback from Amazon product pages.
- **How it works:** Uses `BeautifulSoup4` and rotating user-agents to scrape actual product reviews, titles, and star ratings based on a product search. All reviews are mapped to our sentiment engine.
- **Output:** Displays the product image, star rating, an AI verdict, and an interactive Keyword Cloud, plus the raw review feed.

### 6. 🧠 Emotion Detection Engine (Transformer AI)
- **What it does:** Goes beyond simple "Good or Bad" and detects actual human *emotions*: **Joy, Anger, Sadness, Fear, Surprise, Disgust, and Neutral**.
- **How it works:** Uses a pre-trained Deep Learning Transformer model (`distilroberta-base`) from HuggingFace.
- **Output:** A massive glowing emoji of the dominant emotion, plus a progress-bar breakdown of confidence scores for all 7 emotions.

### 7. 🔍 Aspect-Based Sentiment Analysis (ABSA)
- **What it does:** Instead of rating a whole review, it rates *specific features* (e.g., "Screen is good, but Battery is terrible").
- **How it works:** Uses NLP rule-based entity extraction coupled with targeted sentence-level sentiment models. It automatically finds aspects like *Screen, Camera, Price, Battery, Design, Performance*.
- **Output:** Separates the review into "Positive Aspects", "Negative Aspects", and "Neutral Aspects" visually.

### 8. 🌍 Multilingual & Code-Mixed NLP
- **What it does:** Understands reviews written in regional languages or mixed scripts (e.g., Thanglish, Hinglish, Tamil, Hindi, English).
- **How it works:** Utilizes massive cross-lingual base models (`XLM-RoBERTa`). It detects the language heuristic (e.g., classifying "Intha phone romba nalla irukku" as Thanglish) and accurately predicts sentiment despite the lack of formal grammar.
- **Output:** The detected Language/Dialect and the Multilingual Sentiment Score.

### 9. 🤨 Sarcasm & Irony Detection
- **What it does:** Detects false positives. If a user says "Great phone, broke in 20 minutes!", standard models say "Positive", but this engine says "Negative".
- **How it works:** Uses a RoBERTa-based classification model specifically fine-tuned on sarcastic datasets, coupled with a regex/rule-based heuristic fallback.
- **Output:** If sarcasm is detected, it visually "flips" the base sentiment (e.g., Positive → Negative) and displays the recalibrated truth.

### 10. 📈 AI Topic Modeling & Trends 
- **What it does:** Automatically discovers the hidden themes floating around in all the data you've analyzed today.
- **How it works:** Scans the internal Time-Series database (storing every analysis you've made), cleans the text, and runs Latent Dirichlet Allocation (LDA) via `scikit-learn` to cluster documents into mathematical "Topics".
- **Output:** Shows the top 5 trending clusters, their dominant keywords, and what percentage of the conversation they control.

### 11. 🎙️ Voice-to-Sentiment (Multimodal)
- **What it does:** Analyzes sentiment directly from your spoken voice.
- **How it works:** Captures audio through the browser's WebRTC API, creates a WebM blob, sends it to the server, and processes it using **OpenAI's Whisper (Tiny)** model for blazing-fast Speech-to-Text transcription. The transcript is then passed to our ensemble ML.
- **Output:** An audio playback element, the exact transcribed text, and the vocal sentiment.

---

## 🛠️ Technology Stack & Architecture

### Frontend (User Interface)
- **React.js + Vite:** Blazing fast modern component framework.
- **Tailwind CSS:** For all the glassmorphism, neon borders, and futuristic animations.
- **Recharts & D3:** Used for the Pie charts, Bar charts, and animated gauges.
- **Lucide React:** Iconography.

### Backend (The AI Engine)
- **FastAPI (Python):** High-performance async web framework handling all AI routing and streaming endpoints.
- **Scikit-Learn (Classical ML):** Powers the core Ensemble classifiers, TF-IDF vectorizers, and LDA topic clustering.
- **HuggingFace Transformers (Deep Learning):** PyTorch-backed instances of RoBERTa, XLM-RoBERTa, and Whisper running completely locally (no terrible API costs, total data privacy).
- **Pandas:** Data manipulation and dataset handling.
- **BeautifulSoup4 / YouTube API / Web Scrapers:** The massive data ingestion layer.

---

## 💻 How to Run This Project Locally

**Step 1. Start the Backend (FastAPI)**
It is absolutely critical that you run this using the **Virtual Environment** so you have all the AI models!
Open PowerShell in the `binary_brains` root folder and run:
```powershell
.venv\Scripts\uvicorn main:app --reload
```
*(The server will start at http://127.0.0.1:8000)*

**Step 2. Start the Frontend (React)**
Open a *new* separate PowerShell tab, navigate to the `frontend` folder, and run:
```powershell
cd frontend
npm run dev
```
*(The UI will open at http://localhost:5173)*

---

*Built for advanced natural language processing and deep learning portfolio presentations.*
