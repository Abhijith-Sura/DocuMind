from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # Application
    app_name: str = "DocuMind AI"
    app_version: str = "1.0.0"
    debug: bool = False
    secret_key: str = "change-me-in-production"

    # Database (SQLite by default — no setup needed!)
    database_url: str = "sqlite+aiosqlite:///./documind.db"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # LLM & Auth
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    google_client_id: Optional[str] = None

    # Reranker
    cohere_api_key: Optional[str] = None

    # Vector DB
    chroma_persist_dir: str = "./chroma_db"
    pinecone_api_key: Optional[str] = None

    # Embeddings
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_device: str = "cpu"

    # Chunking
    chunk_size: int = 512
    chunk_overlap: int = 50

    # Retrieval
    top_k_retrieval: int = 20
    top_k_rerank: int = 5

    # MLflow
    mlflow_tracking_uri: str = "http://localhost:5000"

    # File Storage
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 50

    # CORS
    allowed_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
