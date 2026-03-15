import joblib

from utils import clean_text


# Load models
logistic = joblib.load("models/logistic.pkl")
naive = joblib.load("models/naive_bayes.pkl")
svm = joblib.load("models/svm.pkl")
rf = joblib.load("models/random_forest.pkl")

vectorizer = joblib.load("models/vectorizer.pkl")
encoder = joblib.load("models/encoder.pkl")


text = input("Enter review: ")

cleaned = clean_text(text)

vec = vectorizer.transform([cleaned])


models = {
    "Logistic": logistic,
    "NaiveBayes": naive,
    "SVM": svm,
    "RandomForest": rf
}


for name,model in models.items():

    pred = model.predict(vec)

    result = encoder.inverse_transform(pred)

    print(name,"prediction:",result[0])