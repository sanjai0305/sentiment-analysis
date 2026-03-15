import joblib
from utils import clean_text

# Load model files
model = joblib.load("sentiment_model.pkl")
vectorizer = joblib.load("vectorizer.pkl")
encoder = joblib.load("label_encoder.pkl")

while True:
    text = input("Enter sentence (type 'exit' to quit): ")

    if text.lower() == "exit":
        break

    cleaned = clean_text(text)

    vector = vectorizer.transform([cleaned])

    prediction = model.predict(vector)

    result = encoder.inverse_transform(prediction)

    print("Sentiment:", result[0])