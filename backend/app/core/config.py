"""
Application configuration module.
Loads settings from environment variables or .env file with validated types.
"""
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    app_name: str = "UK Wind Generation Forecast Analysis Platform"
    environment: str = "development"
    port: int = 8000
    host: str = "0.0.0.0"

    # Elexon BMRS API
    elexon_api_base_url: str = "https://data.elexon.co.uk/bmrs/api/v1"
    elexon_request_timeout_seconds: int = 30
    elexon_max_retries: int = 3

    # Day-Ahead Decision Logic:
    # 11:00 London time on D-1 (EPEX SPOT / Nord Pool UK Day-Ahead power market auction gate closure)
    default_decision_cutoff_time: str = "11:00"
    timezone: str = "Europe/London"

    # Interval alignment policy:
    # 'hourly_block': Elexon WINDFOR forecasts are published at hourly resolution (:00).
    #                 Since UK settlement runs half-hourly (48 periods/day), 'hourly_block'
    #                 maps the hourly forecast MW to both half-hour intervals of that clock hour.
    # 'exact_timestamp': Matches only intervals sharing the identical startTime (:00).
    alignment_method: str = "hourly_block"

    # MAPE policy: Ignore intervals where actual generation is below this threshold (in MW)
    # to avoid division by near-zero leading to astronomical, meaningless percentage errors.
    mape_min_actual_mw: float = 50.0

    # Local Caching & Offline fallback
    enable_local_cache: bool = True
    cache_dir: str = "data/cache"
    fixtures_dir: str = "data/fixtures"

    # CORS
    cors_origins: Union[str, List[str]] = ["*"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = Settings()
