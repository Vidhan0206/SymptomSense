from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    project_name: str = "SymptomSense"
    environment: str = "development"
    
    groq_api_key: str = Field(..., env="GROQ_API_KEY")
    groq_base_url: str = Field("https://api.groq.com/openai/v1", env="GROQ_BASE_URL")
    llm_model: str = Field("llama-3.3-70b-versatile", env="LLM_MODEL")
    
    chroma_db_dir: str = Field("data/chroma_db", env="CHROMA_DB_DIR")
    chunks_json_path: str = Field("data/chunks/chunks.json", env="CHUNKS_JSON_PATH")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
