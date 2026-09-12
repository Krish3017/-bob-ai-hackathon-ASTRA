from typing import List, Optional
import os
import re
import urllib.parse
from pydantic_settings import BaseSettings, SettingsConfigDict


def sanitize_database_url(url: str) -> str:
    """Safely urlencode password if it contains special characters like @"""
    if not url:
        return ""
    url = url.strip()
    pattern = r'^(postgresql(?:\+\w+)?://)([^:]+):(.*)@([^@]+:\d+/[^?]+)(.*)$'
    match = re.match(pattern, url)
    if match:
        prefix, user, password, host_db, rest = match.groups()
        encoded_pwd = urllib.parse.quote(urllib.parse.unquote(password))
        return f"{prefix}{user}:{encoded_pwd}@{host_db}{rest}"
    return url


class Settings(BaseSettings):
    APP_NAME: str = "NaviOps Port Operations Optimizer"
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Direct PostgreSQL / Supabase connection
    DATABASE_URL: str = ""
    DIRECT_URL: str = ""
    
    # Supabase connection
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    
    # JWT / Auth
    JWT_SECRET: str = "naviops-port-secret-key-2026-astra-bob"
    JWT_SECRET_KEY: str = ""
    SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def effective_jwt_secret(self) -> str:
        return self.JWT_SECRET or self.JWT_SECRET_KEY or self.SECRET_KEY or "naviops-port-secret-key-2026-astra-bob"


    @property
    def clean_database_url(self) -> str:
        raw_url = self.DATABASE_URL or self.DIRECT_URL
        if not raw_url and os.path.exists(".env"):
            # Check if there is a raw postgresql:// connection line without variable name
            try:
                with open(".env", "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("postgresql://"):
                            raw_url = line
                            break
            except Exception:
                pass
        return sanitize_database_url(raw_url)


settings = Settings()

