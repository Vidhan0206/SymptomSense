from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    project_name: str = "SymptomSense"
    environment: str = "development"
    
    nvidia_api_key: str = Field(..., env="NVIDIA_API_KEY")
    nvidia_base_url: str = Field("https://integrate.api.nvidia.com/v1", env="NVIDIA_BASE_URL")
    llm_model: str = Field("meta/llama3-70b-instruct", env="LLM_MODEL")
    
    chroma_db_dir: str = Field("data/chroma_db", env="CHROMA_DB_DIR")
    chunks_json_path: str = Field("data/chunks/chunks.json", env="CHUNKS_JSON_PATH")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
