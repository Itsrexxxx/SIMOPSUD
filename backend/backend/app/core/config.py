from typing import Optional
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Aplikasi SIMKO"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "dev-only-change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: str = "http://localhost:5173"
    ENVIRONMENT: str = "development"
    SECURE_COOKIES: bool = False
    LOGIN_RATE_LIMIT: int = 5
    LOGIN_RATE_WINDOW_SECONDS: int = 300

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    # access token short-lived; refresh token stored in httpOnly cookie
    AUDIT_RETENTION_DAYS: int = 365
    DEFAULT_KLASIFIKASI: str = "Terbuka"  # Terbuka/Terbatas/Rahasia
    
    # Database configuration
    MYSQL_SERVER: str = "localhost"
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    MYSQL_DB: str = "probe_ops_db"
    MYSQL_PORT: int = 3306
    
    SQLALCHEMY_DATABASE_URI: Optional[str] = None
    ADSB_LOL_API_KEY: Optional[str] = None
    ADSB_RADIUS_NM: int = 250
    
    @property
    def get_database_url(self) -> str:
        if self.SQLALCHEMY_DATABASE_URI:
            return self.SQLALCHEMY_DATABASE_URI
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_SERVER}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
