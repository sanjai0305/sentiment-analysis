from googleapiclient.discovery import build
import pandas as pd
import os

# Set up the YouTube Data API v3
API_KEY = "AIzaSyAnEKoDiVUfqv3tBdiHmEFkDo4YCwSGrrU"
youtube = build('youtube', 'v3', developerKey=API_KEY)

def search_youtube_and_get_comments(query: str, limit: int = 50):
    """
    Searches YouTube for a product, finds the top video, and extracts its comments
    using the official YouTube Data API.
    """
    try:
        # Step 1: Search YouTube for the video
        search_request = youtube.search().list(
            part="snippet",
            q=query,
            maxResults=1,
            type="video"
        )
        search_response = search_request.execute()
        
        if not search_response.get("items"):
            return None, pd.DataFrame() # No video found
            
        top_video = search_response["items"][0]
        video_id = top_video["id"]["videoId"]
        snippet = top_video["snippet"]
        
        video_title = snippet["title"]
        video_description = snippet["description"]
        channel_title = snippet["channelTitle"]
        thumbnail_url = snippet["thumbnails"]["high"]["url"]
        video_link = f"https://www.youtube.com/watch?v={video_id}"
        
        # Step 1.5: Get video statistics (View count)
        stats_request = youtube.videos().list(
            part="statistics",
            id=video_id
        )
        stats_response = stats_request.execute()
        view_count = 0
        if stats_response.get("items"):
            view_count = stats_response["items"][0]["statistics"].get("viewCount", "0")

        # Step 2: Fetch the comments for that specific video
        posts = []
        next_page_token = None
        
        # Keep fetching until we hit the user's limit
        while len(posts) < limit:
            # Note: Trying to fetch 100 at a time to minimize API calls
            request = youtube.commentThreads().list(
                part="snippet",
                videoId=video_id,
                maxResults=min(100, limit - len(posts)), 
                pageToken=next_page_token,
                textFormat="plainText"
            )
            
            try:
                response = request.execute()
            except Exception as e:
                # If comments are disabled on the video
                print(f"Failed to fetch comments (might be disabled): {e}")
                break
                
            for item in response.get("items", []):
                comment_text = item["snippet"]["topLevelComment"]["snippet"]["textDisplay"]
                if comment_text.strip():
                    posts.append({"Text": comment_text.strip()})
                    
                if len(posts) >= limit:
                    break
                    
            next_page_token = response.get("nextPageToken")
            if not next_page_token:
                break # No more comments
                
        df = pd.DataFrame(posts)
        
        # Return rich video info to populate the Dashboard UI beautifully
        video_info = {
            "title": video_title, 
            "link": video_link,
            "description": video_description,
            "channel": channel_title,
            "thumbnail": thumbnail_url,
            "views": view_count
        }
        
        return video_info, df
        
    except Exception as e:
        print(f"Error fetching YouTube data via API: {e}")
        return None, pd.DataFrame()