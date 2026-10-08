import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    APP_NAME = os.getenv(
        "APP_NAME",
        "AUREX AI"
    )

    SECRET_KEY = os.getenv(
        "SECRET_KEY",
        "aurex-development-secret-key-change-this"
    )

    GROQ_API_KEY = os.getenv(
        "GROQ_API_KEY",
        ""
    )

    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "sqlite:///./aurex.db"
    )

    ACCESS_TOKEN_EXPIRE_MINUTES = int(
        os.getenv(
            "ACCESS_TOKEN_EXPIRE_MINUTES",
            "60"
        )
    )

    REFRESH_TOKEN_EXPIRE_DAYS = int(
        os.getenv(
            "REFRESH_TOKEN_EXPIRE_DAYS",
            "30"
        )
    )

    FRONTEND_URL = os.getenv(
        "FRONTEND_URL",
        "http://localhost:5173"
    )


settings = Settings()