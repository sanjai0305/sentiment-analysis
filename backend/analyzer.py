try:
    from transformers import pipeline
except ImportError:
    raise ImportError("🚨 The 'transformers' library is missing! Please run: pip install transformers torch")

class SentimentEngine:
    def __init__(self):
        # We use a model fine-tuned for social media (Twitter)
        model_path = "cardiffnlp/twitter-roberta-base-sentiment-latest"
        
        # UPGRADE: Added truncation=True and max_length=512 so the model safely 
        # ignores extra words without crashing, counting TOKENS instead of characters.
        self.sentiment_task = pipeline(
            "sentiment-analysis", 
            model=model_path, 
            tokenizer=model_path,
            truncation=True,
            max_length=512
        )

    def analyze(self, text: str):
        """Returns label and confidence score"""
        # The pipeline now handles the token limits automatically!
        result = self.sentiment_task(text)[0]
        
        return {
            "sentiment": result['label'],
            "confidence": round(result['score'], 4),
            "text": text
        }

# Quick Test
if __name__ == "__main__":
    engine = SentimentEngine()
    print("Testing the engine...")
    print(engine.analyze("The new interface is fire, but the battery life is mid. 💀"))