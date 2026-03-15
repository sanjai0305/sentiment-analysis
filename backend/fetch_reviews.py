import requests
import pandas as pd

def fetch_reddit_posts(subreddit: str, limit: int = 50) -> pd.DataFrame:
    """
    Fetches live posts from a given Reddit community.
    Using a custom User-Agent prevents Reddit from blocking the request.
    """
    url = f"https://www.reddit.com/r/{subreddit.strip()}/hot.json?limit={limit}"
    
    # Reddit requires a custom User-Agent, otherwise it returns a 429 Error
    headers = {'User-agent': 'SentimentAnalyzerBot/1.0'}
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status() # Check for errors (like typos in subreddit name)
        
        data = response.json()
        posts = []
        
        # Dig into the JSON structure to pull out the text
        for child in data.get('data', {}).get('children', []):
            post = child['data']
            
            # Combine the post title and the body text
            title = post.get('title', '')
            body = post.get('selftext', '')
            full_text = f"{title} {body}".strip()
            
            if full_text:
                posts.append({"Text": full_text})
                
        return pd.DataFrame(posts)

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        return pd.DataFrame() # Return empty dataframe on failure

# Quick Test
if __name__ == "__main__":
    print("Fetching live data from r/technology...")
    df = fetch_reddit_posts("technology", limit=5)
    print(df.head())