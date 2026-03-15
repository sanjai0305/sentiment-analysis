import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
import joblib

from utils import clean_text


# Load dataset
df = pd.read_csv("twitter_training.csv", header=None)

# Rename columns
df.columns = ["id", "topic", "sentiment", "text"]

# Remove missing values
df = df.dropna(subset=["text", "sentiment"])

# Clean text
df["clean_text"] = df["text"].astype(str).apply(clean_text)

# Encode sentiment labels
encoder = LabelEncoder()
df["label"] = encoder.fit_transform(df["sentiment"].astype(str))

# TF-IDF Vectorization
vectorizer = TfidfVectorizer(max_features=5000)

X = vectorizer.fit_transform(df["clean_text"])
y = df["label"]

# Train test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train model
model = LogisticRegression(max_iter=200)

model.fit(X_train, y_train)

# Test model
y_pred = model.predict(X_test)

# Accuracy
acc = accuracy_score(y_test, y_pred)
print("Model Accuracy:", acc)

# Save trained objects
joblib.dump(model, "sentiment_model.pkl")
joblib.dump(vectorizer, "vectorizer.pkl")
joblib.dump(encoder, "label_encoder.pkl")

print("Model saved successfully")