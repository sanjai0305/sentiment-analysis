import pandas as pd
import joblib
import os

from sklearn.preprocessing import LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score

from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC
from sklearn.ensemble import RandomForestClassifier

from utils import clean_text

# -----------------------------
# 1. Create models folder
# -----------------------------
# exist_ok=True cleanly creates the folder only if it doesn't already exist
os.makedirs("models", exist_ok=True) 

print("Loading datasets...")

# -----------------------------
# 2. Load datasets
# -----------------------------
# You can assign column names directly while reading the CSV
df_train = pd.read_csv("twitter_training.csv", header=None, names=["id", "topic", "sentiment", "text"])
df_train = df_train.dropna()

df_val = pd.read_csv("twitter_validation.csv", header=None, names=["id", "topic", "sentiment", "text"])
df_val = df_val.dropna()

print(f"Training Dataset size: {len(df_train)}")
print(f"Validation Dataset size: {len(df_val)}")

# -----------------------------
# 3. Text Cleaning
# -----------------------------
print("Cleaning text (this might take a moment)...")

df_train["clean_text"] = df_train["text"].astype(str).apply(clean_text)
df_val["clean_text"] = df_val["text"].astype(str).apply(clean_text)

# -----------------------------
# 4. Encode labels
# -----------------------------
encoder = LabelEncoder()

# Wrapping the output in pd.Series satisfies strict type checking (fixes Pylance error)
df_train["label"] = pd.Series(encoder.fit_transform(df_train["sentiment"].astype(str)), index=df_train.index)
df_val["label"] = pd.Series(encoder.transform(df_val["sentiment"].astype(str)), index=df_val.index)

# -----------------------------
# 5. TF-IDF Vectorization
# -----------------------------
print("Vectorizing text...")

vectorizer = TfidfVectorizer(max_features=5000)

X_train = vectorizer.fit_transform(df_train["clean_text"])
y_train = df_train["label"]

X_test = vectorizer.transform(df_val["clean_text"])
y_test = df_val["label"]

# -----------------------------
# 6. Initialize models
# -----------------------------
logistic = LogisticRegression(max_iter=500)
naive = MultinomialNB()

# FIX: Changed "auto" to False. This satisfies Pylance (it wants a boolean) 
# AND is the optimal setting since we have more rows than features!
svm = LinearSVC(dual=False) 

rf = RandomForestClassifier(n_jobs=-1) # n_jobs=-1 uses all CPU cores for faster training

# -----------------------------
# 7. Train & Evaluate models
# -----------------------------
models = {
    "Logistic Regression": logistic,
    "Naive Bayes": naive,
    "SVM": svm,
    "Random Forest": rf
}

print("\nTraining models... (Random Forest may take a bit)")
print("\n📊 Model Accuracy (on Validation Set):\n")

for name, model in models.items():
    # Train the model
    model.fit(X_train, y_train)
    
    # Predict and evaluate
    pred = model.predict(X_test)
    acc = accuracy_score(y_test, pred)
    print(f"{name}: {round(acc, 3)}")

# -----------------------------
# 8. Save models
# -----------------------------
joblib.dump(logistic, "models/logistic.pkl")
joblib.dump(naive, "models/naive_bayes.pkl")
joblib.dump(svm, "models/svm.pkl")
joblib.dump(rf, "models/random_forest.pkl")

joblib.dump(vectorizer, "models/vectorizer.pkl")
joblib.dump(encoder, "models/encoder.pkl")

print("\n✅ All models trained and saved successfully.")