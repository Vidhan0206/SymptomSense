import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url=os.getenv("GROQ_BASE_URL"),
)

try:
    response = client.chat.completions.create(
        model=os.getenv("LLM_MODEL"),
        messages=[{"role": "user", "content": "test"}],
        max_tokens=10
    )
    print("Success:")
    print(response.choices[0].message.content)
except Exception as e:
    print(f"Error: {e}")
