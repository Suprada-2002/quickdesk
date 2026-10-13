from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "QuickDesk"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Database
    DATABASE_URL: str = "postgresql://quickdesk:quickdesk@localhost:5433/quickdesk"

    # Security & JWT
    JWT_SECRET_KEY: str = "quickdesk_super_secret_jwt_key_2026_dev_env_32chars!"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # AI & LLM Settings
    AI_PROVIDER: str = "mock"  # "huggingface", "groq", or "mock"
    HUGGINGFACE_API_KEY: str = ""
    HUGGINGFACE_MODEL: str = "meta-llama/Llama-3.2-3B-Instruct"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"

    # Server & CORS
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
