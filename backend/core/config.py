from pydantic_settings import BaseSettings
from typing import list


class Settings(BaseSettings):
    OPENAI_API_KEY: str
    SECRET_KEY: str
    DATABASE_URL: str = "sqlite:///./data/sber.db"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]
    OPENAI_MODEL: str = "gpt-4o"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    class Config:
        env_file = ".env"


settings = Settings()
