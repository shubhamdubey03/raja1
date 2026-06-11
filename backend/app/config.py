"""
Application configuration via pydantic-settings.

All values sourced from .env — never hardcoded.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralised settings — loaded once, cached via lru_cache."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────
    app_name: str = "AMB-DMP-2026"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"
    allowed_origins: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    # ── Database ─────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/amb_dmp_db"
    db_pool_size: int = 20
    db_max_overflow: int = 10
    db_echo: bool = False

    # ── JWT ──────────────────────────────────────────────────
    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # ── OTP ──────────────────────────────────────────────────
    otp_length: int = 6
    otp_expire_minutes: int = 5
    otp_max_attempts: int = 3
    otp_resend_cooldown_seconds: int = 60

    # ── SMS Provider ─────────────────────────────────────────
    sms_provider: str = "msg91"
    msg91_auth_key: str = ""
    msg91_sender_id: str = "AMBDMP"
    msg91_template_id: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    # ── Payment Gateway ──────────────────────────────────────
    payment_gateway: str = "razorpay"
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""

    # ── Firebase ─────────────────────────────────────────────
    fcm_server_key: str = ""
    fcm_credentials_path: str = "./firebase-credentials.json"

    # ── WhatsApp ─────────────────────────────────────────────
    whatsapp_provider: str = "interakt"
    whatsapp_api_key: str = ""
    whatsapp_api_url: str = "https://api.interakt.ai/v1"

    # ── File Storage ─────────────────────────────────────────
    storage_provider: str = "s3"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = "amb-dmp-uploads"
    aws_s3_region: str = "ap-south-1"

    # ── Redis ────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── Super Admin Seed ─────────────────────────────────────
    super_admin_email: str = "admin@ambdmp.com"
    super_admin_password: str = "change-me"
    super_admin_mobile: str = "+919999999999"

    # ── Backup ───────────────────────────────────────────────
    backup_s3_bucket: str = "amb-dmp-backups"
    backup_retention_days: int = 7

    # ── Server ───────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4


@lru_cache()
def get_settings() -> Settings:
    """Return cached settings singleton."""
    return Settings()
