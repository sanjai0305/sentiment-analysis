import streamlit as st
import joblib
import os
import pandas as pd
import plotly.express as px

# Custom imports from your project files
from utils import clean_text
from fetch_reviews import fetch_reddit_posts
from analyzer import SentimentEngine

# Import your new YouTube search function
from fetch_youtube import search_youtube_and_get_comments

# -----------------------------
# 1. Page Configuration
# -----------------------------
st.set_page_config(page_title="Sentiment Analyzer Pro", page_icon="📈", layout="wide")

# -----------------------------
# 2. Safely Load Models (Cached!)
# -----------------------------
@st.cache_resource
def load_classical_models():
    """Loads the classical Scikit-Learn models and vectorizers."""
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    MODELS_DIR = os.path.join(BASE_DIR, "models")
    try:
        models = {
            "Logistic Regression": joblib.load(os.path.join(MODELS_DIR, "logistic.pkl")),
            "Naive Bayes": joblib.load(os.path.join(MODELS_DIR, "naive_bayes.pkl")),
            "SVM": joblib.load(os.path.join(MODELS_DIR, "svm.pkl")),
            "Random Forest": joblib.load(os.path.join(MODELS_DIR, "random_forest.pkl"))
        }
        vectorizer = joblib.load(os.path.join(MODELS_DIR, "vectorizer.pkl"))
        encoder = joblib.load(os.path.join(MODELS_DIR, "encoder.pkl"))
        return models, vectorizer, encoder
    except FileNotFoundError:
        return None, None, None

@st.cache_resource
def load_deep_learning_model():
    """Loads the Hugging Face RoBERTa model."""
    try:
        return SentimentEngine()
    except Exception as e:
        return None

# Load everything into memory
models_dict, vectorizer, encoder = load_classical_models()
dl_engine = load_deep_learning_model()

# Stop execution if models aren't trained yet
if not models_dict or vectorizer is None or encoder is None:
    st.error("🚨 Model files not found! Please run `python train_models.py` in your terminal first.")
    st.stop()

# Fix for Pylance strict type checking
assert vectorizer is not None
assert encoder is not None

# -----------------------------
# 3. Streamlit App Interface
# -----------------------------
st.title("📈 Pro Sentiment Analysis Platform")
st.markdown("Analyze customer sentiment using an ensemble of Classical ML and Deep Learning models.")

# ==========================================
# THIS FIXES THE ERROR: All 4 tabs are defined right here!
# ==========================================
tab1, tab2, tab3, tab4 = st.tabs([
    "💬 Single Review", 
    "📁 Batch CSV", 
    "🌐 Reddit Live", 
    "🔍 YouTube Search"
])

# ==========================================
# TAB 1: SINGLE REVIEW ANALYSIS
# ==========================================
with tab1:
    with st.form(key='analyze_form'):
        review = st.text_area("Enter product review or tweet:", placeholder="e.g., The build quality is excellent...")
        submit_button = st.form_submit_button(label='Analyze Sentiment')

    if submit_button and review.strip():
        with st.spinner("Running ensemble models..."):
            cleaned = clean_text(review)
            vec = vectorizer.transform([cleaned])
            results = []

            st.subheader("🤖 Model Predictions")
            cols = st.columns(5)
            
            for idx, (name, model) in enumerate(models_dict.items()):
                pred = model.predict(vec)
                label = encoder.inverse_transform(pred)[0]
                label_formatted = str(label).capitalize()
                results.append(label_formatted)
                
                with cols[idx]:
                    st.metric(label=name, value=label_formatted)

            if dl_engine:
                dl_result = dl_engine.analyze(review)
                dl_label = str(dl_result['sentiment']).capitalize() 
                results.append(dl_label)
                with cols[4]:
                    st.metric(label="RoBERTa", value=dl_label, delta=f"{dl_result['confidence']*100:.1f}% Conf")

            st.divider()
            st.subheader("🎯 Overall Consensus")
            
            sentiment_counts = {
                "Positive": results.count("Positive"),
                "Negative": results.count("Negative"),
                "Neutral": results.count("Neutral"),
                "Irrelevant": results.count("Irrelevant")
            }
            
            df_plot = pd.DataFrame([{"Sentiment": k, "Votes": v} for k, v in sentiment_counts.items() if v > 0])

            if not df_plot.empty:
                colA, colB = st.columns([1, 2])
                with colA:
                    majority_vote = df_plot.loc[df_plot['Votes'].idxmax()]['Sentiment']
                    st.info(f"**Final Verdict:** The ensemble leans towards **{majority_vote}**.")
                    st.dataframe(df_plot, hide_index=True)

                with colB:
                    fig = px.pie(
                        df_plot, names='Sentiment', values='Votes', hole=0.4,
                        color='Sentiment',
                        color_discrete_map={"Positive": "#28a745", "Negative": "#dc3545", "Neutral": "#6c757d", "Irrelevant": "#ffc107"}
                    )
                    fig.update_traces(textposition='inside', textinfo='percent+label')
                    fig.update_layout(margin=dict(t=10, b=10, l=10, r=10), height=300)
                    st.plotly_chart(fig, use_container_width=True)

# ==========================================
# TAB 2: BATCH CSV PROCESSING
# ==========================================
with tab2:
    st.subheader("📁 Upload a CSV for Bulk Analysis")
    uploaded_file = st.file_uploader("Choose a CSV file", type="csv")
    
    if uploaded_file is not None:
        df = pd.read_csv(uploaded_file)
        st.write("Data Preview:", df.head(3))
        
        text_column = st.selectbox("Which column contains the text to analyze?", df.columns)
        
        if st.button("Run Batch Analysis"):
            with st.spinner(f"Analyzing {len(df)} rows..."):
                cleaned_texts = df[text_column].astype(str).apply(clean_text)
                vec_texts = vectorizer.transform(cleaned_texts)
                
                preds = models_dict["Logistic Regression"].predict(vec_texts)
                df["Predicted_Sentiment"] = encoder.inverse_transform(preds)
                
                st.success("Batch Analysis Complete!")
                
                batch_counts = df["Predicted_Sentiment"].value_counts().reset_index()
                batch_counts.columns = ["Sentiment", "Count"]
                
                fig2 = px.bar(
                    batch_counts, x="Sentiment", y="Count", color="Sentiment",
                    color_discrete_map={"Positive": "#28a745", "Negative": "#dc3545", "Neutral": "#6c757d", "Irrelevant": "#ffc107"}
                )
                st.plotly_chart(fig2, use_container_width=True)
                
                csv_output = df.to_csv(index=False).encode('utf-8')
                st.download_button(label="Download Annotated CSV", data=csv_output, file_name="sentiment_results.csv", mime="text/csv")

# ==========================================
# TAB 3: LIVE WEB SCRAPING (REDDIT)
# ==========================================
with tab3:
    st.subheader("🌐 Live Social Media Ingestion")
    
    col1, col2 = st.columns([2, 1])
    with col1:
        subreddit_input = st.text_input("Subreddit Name:", placeholder="e.g., Python")
    with col2:
        post_limit = st.slider("Number of posts to scrape:", min_value=10, max_value=100, value=50, step=10)
        
    if st.button("Scrape & Analyze Live Data"):
        if subreddit_input.strip():
            with st.spinner(f"Scraping r/{subreddit_input}..."):
                live_df = fetch_reddit_posts(subreddit_input, limit=post_limit)
                
                if live_df.empty:
                    st.error(f"Could not fetch data for r/{subreddit_input}. Check the spelling!")
                else:
                    st.success(f"Successfully scraped {len(live_df)} posts!")
                    
                    with st.spinner("Running fast batch analysis..."):
                        cleaned_texts = live_df["Text"].astype(str).apply(clean_text)
                        vec_texts = vectorizer.transform(cleaned_texts)
                        
                        preds = models_dict["Logistic Regression"].predict(vec_texts)
                        live_df["Predicted_Sentiment"] = encoder.inverse_transform(preds)
                        
                        live_counts = live_df["Predicted_Sentiment"].value_counts().reset_index()
                        live_counts.columns = ["Sentiment", "Count"]
                        
                        fig3 = px.pie(
                            live_counts, names="Sentiment", values="Count", hole=0.3,
                            title=f"Current Mood in r/{subreddit_input}",
                            color="Sentiment",
                            color_discrete_map={"Positive": "#28a745", "Negative": "#dc3545", "Neutral": "#6c757d", "Irrelevant": "#ffc107"}
                        )
                        st.plotly_chart(fig3, use_container_width=True)
                        st.dataframe(live_df, use_container_width=True)
        else:
            st.warning("Please enter a subreddit name first.")

# ==========================================
# TAB 4: AUTO YOUTUBE PRODUCT SEARCH
# ==========================================
with tab4:
    st.subheader("🔍 Auto YouTube Product Sentiment")
    st.markdown("Type a product name. The AI will find the top video on YouTube, read the comments, and analyze the sentiment!")
    
    col1, col2 = st.columns([2, 1])
    with col1:
        search_query = st.text_input("Product to Search:", placeholder="e.g., iPhone 15 review")
    with col2:
        yt_limit = st.slider("Number of comments to read:", min_value=10, max_value=200, value=50, step=10, key="yt_limit_slider")
        
    if st.button("Search YouTube & Analyze"):
        if search_query.strip():
            with st.spinner(f"Searching YouTube for '{search_query}'..."):
                video_info, yt_df = search_youtube_and_get_comments(search_query, limit=yt_limit)
                
                if yt_df.empty or video_info is None:
                    st.error("Could not find a video or comments for that search. Try another product.")
                else:
                    st.success(f"📺 **Found Video:** {video_info['title']}")
                    st.markdown(f"🔗 [Click here to watch the original video]({video_info['link']})")
                    
                    with st.spinner("Analyzing what the viewers think..."):
                        cleaned_texts = yt_df["Text"].astype(str).apply(clean_text)
                        vec_texts = vectorizer.transform(cleaned_texts)
                        
                        preds = models_dict["Logistic Regression"].predict(vec_texts)
                        yt_df["Predicted_Sentiment"] = encoder.inverse_transform(preds)
                        
                        yt_counts = yt_df["Predicted_Sentiment"].value_counts().reset_index()
                        yt_counts.columns = ["Sentiment", "Count"]
                        
                        fig4 = px.pie(
                            yt_counts, names="Sentiment", values="Count", hole=0.3,
                            title="Viewer Sentiment in Comments",
                            color="Sentiment",
                            color_discrete_map={"Positive": "#28a745", "Negative": "#dc3545", "Neutral": "#6c757d", "Irrelevant": "#ffc107"}
                        )
                        st.plotly_chart(fig4, use_container_width=True)
                        st.write("Live Comment Feed:")
                        st.dataframe(yt_df, use_container_width=True)
        else:
            st.warning("Please enter a product name first.")