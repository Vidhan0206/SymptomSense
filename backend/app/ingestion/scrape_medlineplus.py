import os
import json
import time
import uuid
import requests
from bs4 import BeautifulSoup

# Define chunking function based on word count to approximate tokens (1 token ~ 0.75 words)
def chunk_text(text: str, min_words: int = 150, max_words: int = 300) -> list[str]:
    words = text.split()
    chunks = []
    current_chunk = []
    
    for word in words:
        current_chunk.append(word)
        if len(current_chunk) >= max_words:
            chunks.append(" ".join(current_chunk))
            current_chunk = []
            
    if current_chunk:
        if len(current_chunk) < min_words and chunks:
            # Append small trailing chunk to the previous chunk
            chunks[-1] += " " + " ".join(current_chunk)
        else:
            chunks.append(" ".join(current_chunk))
            
    return chunks

def scrape_medlineplus_url(url: str) -> dict:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    print(f"Scraping: {url}")
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Failed to fetch {url}: {response.status_code}")
        return None
        
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Extract condition name
    title_element = soup.find('h1')
    condition_name = title_element.text.strip() if title_element else "Unknown Condition"
    
    # MedlinePlus health topics main content is typically in a specific div
    content_div = soup.find('div', id='mplus-content') or soup.find('article') or soup.find('div', class_='page-content')
    
    if not content_div:
        # Fallback to general paragraph extraction
        paragraphs = soup.find_all('p')
        text = " ".join([p.text.strip() for p in paragraphs if p.text.strip()])
    else:
        text = content_div.text.strip()
        
    # Clean up excessive whitespace
    text = " ".join(text.split())
    
    return {
        "condition_name": condition_name,
        "source_url": url,
        "text": text
    }

def run_ingestion():
    # A curated list of common conditions for the prototype
    urls = [
        "https://medlineplus.gov/flu.html",
        "https://medlineplus.gov/commoncold.html",
        "https://medlineplus.gov/migraine.html",
        "https://medlineplus.gov/foodborneillnesses.html",
        "https://medlineplus.gov/appendicitis.html",
        "https://medlineplus.gov/asthma.html",
        "https://medlineplus.gov/diabetes.html",
        "https://medlineplus.gov/highbloodpressure.html",
        "https://medlineplus.gov/heartattack.html",
        "https://medlineplus.gov/stroke.html",
        "https://medlineplus.gov/gerd.html",
        "https://medlineplus.gov/kidneystones.html",
        "https://medlineplus.gov/pneumonia.html",
        "https://medlineplus.gov/strepthroat.html",
        "https://medlineplus.gov/covid19.html"
    ]
    
    all_chunks = []
    
    for url in urls:
        data = scrape_medlineplus_url(url)
        if data and data['text']:
            chunks = chunk_text(data['text'])
            for chunk_text_content in chunks:
                all_chunks.append({
                    "chunk_id": str(uuid.uuid4()),
                    "condition_name": data['condition_name'],
                    "source_url": data['source_url'],
                    "text": chunk_text_content
                })
        time.sleep(1) # Be respectful to the server
        
    # Ensure data directory exists
    from app.config import settings
    # The script might be run from backend dir, so use absolute or relative path properly
    # Get base directory
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    output_path = os.path.join(base_dir, settings.chunks_json_path)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_chunks, f, indent=2)
        
    print(f"Successfully scraped and chunked {len(all_chunks)} pieces of medical data.")
    print(f"Data saved to {output_path}")

if __name__ == "__main__":
    run_ingestion()
