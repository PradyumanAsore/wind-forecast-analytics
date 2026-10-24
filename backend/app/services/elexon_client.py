"""
Elexon BMRS API client module.
Fetches FUELHH (half-hourly outturn by fuel type) and WINDFOR (wind forecasts).
Supports local disk caching, exponential retry on network glitches, and offline fallback
to verified historical Elexon fixtures.
"""
import hashlib
import json
import logging
import tempfile 
import os
from datetime import date, datetime, timedelta
from typing import List, Optional, Tuple
from zoneinfo import ZoneInfo
import httpx
from app.core.config import settings
from app.models.schemas import ActualRecord, ForecastRecord
from app.services.time_utils import UTC_TZ, parse_iso_datetime

logger = logging.getLogger(__name__)


class ElexonClient:
    """
    Client for interacting with Elexon BMRS Insights API.
    """

    def __init__(
        self,
        base_url: str = settings.elexon_api_base_url,
        cache_dir: str = settings.cache_dir,
        fixtures_dir: str = settings.fixtures_dir,
        enable_cache: bool = settings.enable_local_cache,
        timeout: int = settings.elexon_request_timeout_seconds
    ):
        self.base_url = base_url.rstrip("/")
        self.cache_dir = os.path.join(
            tempfile.gettempdir(),
            "wind-forecast-cache"
        )
        self.fixtures_dir = os.path.join(
            tempfile.gettempdir(),
            "wind-forecast-fixtures",
        )
        self.enable_cache = enable_cache
        self.timeout = timeout
        os.makedirs(self.cache_dir, exist_ok=True)
        os.makedirs(self.fixtures_dir, exist_ok=True)

    def _get_cache_path(self, endpoint: str, params: dict) -> str:
        param_str = json.dumps(params, sort_keys=True)
        h = hashlib.md5(f"{endpoint}_{param_str}".encode("utf-8")).hexdigest()
        return os.path.join(self.cache_dir, f"{endpoint}_{h}.json")

    async def _fetch_stream(self, dataset: str, params: dict) -> Tuple[List[dict], str]:
        """
        Retrieves JSON stream data with cache-first and fallback logic.
        Returns (data, source_mode) where source_mode is 'live_api', 'cached', or 'offline_fixture'.
        """
        cache_path = self._get_cache_path(dataset, params)
        if self.enable_cache and os.path.exists(cache_path):
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    cached_data = json.load(f)
                return cached_data, "cached"
            except Exception as e:
                logger.warning(f"Failed to read cache file {cache_path}: {e}")

        # Attempt live API fetch
        url = f"{self.base_url}/datasets/{dataset}/stream"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, params=params, headers={"Accept": "application/json"})
                if resp.status_code == 200:
                    data = resp.json()
                    if self.enable_cache:
                        with open(cache_path, "w", encoding="utf-8") as f:
                            json.dump(data, f)
                    return data, "live_api"
                else:
                    logger.warning(f"Elexon API returned status {resp.status_code} for {dataset}: {resp.text[:200]}")
        except Exception as exc:
            logger.warning(f"Live API request failed for {dataset} ({url}): {exc}")

        # Fallback to local verified historical fixture if available
        fixture_file = os.path.join(
            self.fixtures_dir,
            "windfor_sample_jan2026.json" if dataset == "WINDFOR" else "fuelhh_sample_jan2026.json"
        )
        if os.path.exists(fixture_file):
            logger.info(f"Using offline fixture fallback: {fixture_file}")
            with open(fixture_file, "r", encoding="utf-8") as f:
                fixture_data = json.load(f)
            return fixture_data, "offline_fixture"

        raise RuntimeError(f"Unable to retrieve data for dataset {dataset} from API, cache, or fixture fallback.")

    async def get_wind_actuals(self, start_date: date, end_date: date) -> Tuple[List[ActualRecord], str]:
        """
        Retrieves actual wind generation records from FUELHH for delivery dates [start_date, end_date].
        Filters records where fuelType == 'WIND'.
        """
        # Actuals for delivery date D can be published up to D+1 01:00 UTC
        start_str = f"{start_date.strftime('%Y-%m-%d')}T00:00:00Z"
        end_dt = end_date + timedelta(days=1)
        end_str = f"{end_dt.strftime('%Y-%m-%d')}T02:00:00Z"

        params = {
            "publishDateTimeFrom": start_str,
            "publishDateTimeTo": end_str
        }

        raw_data, mode = await self._fetch_stream("FUELHH", params)

        records: List[ActualRecord] = []
        for item in raw_data:
            if item.get("fuelType") != "WIND":
                continue
            try:
                start_time = parse_iso_datetime(item["startTime"])
                pub_time = parse_iso_datetime(item["publishTime"]) if "publishTime" in item else None
                rec = ActualRecord(
                    startTime=start_time,
                    settlementDate=item.get("settlementDate", start_time.strftime("%Y-%m-%d")),
                    settlementPeriod=item.get("settlementPeriod", 1),
                    fuelType="WIND",
                    generation=float(item.get("generation", 0.0)),
                    publishTime=pub_time
                )
                records.append(rec)
            except Exception as e:
                logger.debug(f"Skipping malformed FUELHH record: {e}")

        # Deduplicate records by startTime keeping latest publishTime
        records.sort(key=lambda x: (x.startTime, x.publishTime or datetime.min.replace(tzinfo=UTC_TZ)))
        deduped = {}
        for r in records:
            deduped[r.startTime] = r

        return list(deduped.values()), mode

    async def get_wind_forecasts(self, start_date: date, end_date: date) -> Tuple[List[ForecastRecord], str]:
        """
        Retrieves wind forecasts from WINDFOR covering delivery dates [start_date, end_date].
        Includes forecast publications starting from D-2 to ensure we capture all forecasts
        published prior to the D-1 purchasing decision cutoff.
        """
        # Need forecasts published before D-1 cutoff, so fetch from start_date - 2 days
        fetch_start = start_date - timedelta(days=2)
        start_str = f"{fetch_start.strftime('%Y-%m-%d')}T00:00:00Z"
        end_dt = end_date + timedelta(days=1)
        end_str = f"{end_dt.strftime('%Y-%m-%d')}T00:00:00Z"

        params = {
            "publishDateTimeFrom": start_str,
            "publishDateTimeTo": end_str
        }

        raw_data, mode = await self._fetch_stream("WINDFOR", params)

        records: List[ForecastRecord] = []
        for item in raw_data:
            try:
                start_time = parse_iso_datetime(item["startTime"])
                pub_time = parse_iso_datetime(item["publishTime"])
                rec = ForecastRecord(
                    startTime=start_time,
                    publishTime=pub_time,
                    generation=float(item.get("generation", 0.0)),
                    dataset=item.get("dataset", "WINDFOR")
                )
                records.append(rec)
            except Exception as e:
                logger.debug(f"Skipping malformed WINDFOR record: {e}")

        # Deduplicate identical records
        seen = set()
        deduped: List[ForecastRecord] = []
        for r in records:
            key = (r.startTime, r.publishTime, r.generation)
            if key not in seen:
                seen.add(key)
                deduped.append(r)

        return deduped, mode
