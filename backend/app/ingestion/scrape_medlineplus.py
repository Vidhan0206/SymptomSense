import os
import json
import time
import uuid
import requests
from bs4 import BeautifulSoup

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
            chunks[-1] += " " + " ".join(current_chunk)
        else:
            chunks.append(" ".join(current_chunk))
            
    return chunks

def scrape_medlineplus_url(url: str) -> dict:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            return None
            
        soup = BeautifulSoup(response.content, 'html.parser')
        
        title_element = soup.find('h1')
        condition_name = title_element.text.strip() if title_element else "Unknown Condition"
        
        content_div = soup.find('div', id='mplus-content') or soup.find('article') or soup.find('div', class_='page-content')
        
        if not content_div:
            paragraphs = soup.find_all('p')
            text = " ".join([p.text.strip() for p in paragraphs if p.text.strip()])
        else:
            text = content_div.text.strip()
            
        text = " ".join(text.split())
        
        # Filter out thin pages
        if len(text.split()) < 50:
            return None

        return {
            "condition_name": condition_name,
            "source_url": url,
            "text": text
        }
    except Exception as e:
        print(f"Error scraping {url}: {e}")
        return None

def fetch_dynamic_urls(limit=100):
    print("Crawling MedlinePlus A-Z index for URLs...")
    urls = []
    # Just crawl the 'A', 'B', and 'C' pages for a massive dataset
    letters = ['a', 'b', 'c']
    for letter in letters:
        if len(urls) >= limit: break
        r = requests.get(f'https://medlineplus.gov/healthtopics_{letter}.html')
        s = BeautifulSoup(r.content, 'html.parser')
        links = s.find_all('a')
        for l in links:
            href = l.get('href')
            if href and href.endswith('.html') and 'healthtopics' not in href and 'encyclopedia' not in href:
                # Ensure absolute URL
                if href.startswith('/'):
                    href = f"https://medlineplus.gov{href}"
                if href not in urls:
                    urls.append(href)
            if len(urls) >= limit:
                break
    return urls

def run_ingestion():
    urls = fetch_dynamic_urls(limit=150)
    print(f"Found {len(urls)} MedlinePlus URLs to scrape.")
    
    all_chunks = []
    
    # Load existing chunks if present so we don't overwrite NHS data if run later
    from app.config import settings
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    output_path = os.path.join(base_dir, settings.chunks_json_path)
    
    if os.path.exists(output_path):
        with open(output_path, 'r', encoding='utf-8') as f:
            try:
                all_chunks = json.load(f)
            except:
                pass
                
    # Track existing URLs so we don't duplicate
    existing_urls = set(c.get('source_url') for c in all_chunks)
    
    added_count = 0
    for i, url in enumerate(urls):
        if url in existing_urls:
            continue
            
        print(f"[{i+1}/{len(urls)}] Scraping: {url}")
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
            added_count += 1
        time.sleep(0.5) 
        
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_chunks, f, indent=2)
        
    print(f"Successfully scraped {added_count} MedlinePlus pages.")
    print(f"Total embedded chunks in database: {len(all_chunks)}")

if __name__ == "__main__":
    run_ingestion()
