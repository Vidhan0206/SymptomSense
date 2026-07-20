import os
from dotenv import load_dotenv
import httpx
import json

load_dotenv()

api_key = os.getenv("NVIDIA_API_KEY")
base_url = os.getenv("NVIDIA_BASE_URL")
model = os.getenv("LLM_MODEL")

print(f"Base URL: {base_url}")
print(f"Model: {model}")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}
data = {
    "model": model,
    "messages": [{"role": "user", "content": "test"}],
    "max_tokens": 10
}

url = f"{base_url}/chat/completions"
print(f"Sending POST to {url}...")

response = httpx.post(url, headers=headers, json=data)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
