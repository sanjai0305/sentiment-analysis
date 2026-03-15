import re

def clean_text(text: str) -> str:
    """
    Cleans text data for NLP by removing URLs, handles, and special characters,
    while preserving alphanumeric context (letters AND numbers).
    """
    # Ensure the input is a string
    text = str(text).lower()

    # 1. Remove URLs (http, https, www)
    text = re.sub(r"http\S+|www\S+|https\S+", "", text, flags=re.MULTILINE)

    # 2. Remove Twitter/X handles (e.g., @user)
    text = re.sub(r"\@\w+", "", text)

    # 3. Remove HTML tags (just in case web scraping left some behind)
    text = re.sub(r"<.*?>", "", text)

    # 4. Remove special characters, but KEEP letters AND numbers (a-z, A-Z, 0-9)
    # This ensures "10/10" becomes "10 10" instead of disappearing.
    text = re.sub(r"[^a-zA-Z0-9 ]", "", text)

    # 5. Remove extra whitespace
    text = re.sub(r"\s+", " ", text)

    return text.strip()

# Quick test to see the difference!
if __name__ == "__main__":
    sample = "OMG! 😱 @support The new update is 10/10! Check it out: https://link.com"
    print(f"Cleaned: '{clean_text(sample)}'")