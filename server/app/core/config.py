from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Medi-Care API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Tavily API
    TAVILY_API_KEY: str = ""
    
    # Trusted medical domains for Tavily search queries
    TRUSTED_DOMAINS: List[str] = [
        "medlineplus.gov",
        "nih.gov",
        "fda.gov",
        "nhs.uk",
        "who.int",
        "cdsco.gov.in"
    ]
    
    # CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
