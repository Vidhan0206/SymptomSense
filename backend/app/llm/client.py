from openai import OpenAI
from app.config import settings

# Initialize the OpenAI client using the NVIDIA NIM endpoint
nvidia_llm_client = OpenAI(
    api_key=settings.nvidia_api_key,
    base_url=settings.nvidia_base_url
)

def get_llm_model():
    return settings.llm_model
