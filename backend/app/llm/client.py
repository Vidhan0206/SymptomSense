from openai import OpenAI
from app.config import settings

# Initialize the OpenAI client using the Groq endpoint
groq_llm_client = OpenAI(
    api_key=settings.groq_api_key,
    base_url=settings.groq_base_url,
    timeout=30.0
)

def get_llm_model():
    return settings.llm_model
