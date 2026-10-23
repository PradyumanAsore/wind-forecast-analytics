"""
Day-Ahead forecast selection service.
Implements the core decision-time logic:
Selects the latest eligible forecast published no later than the decision cutoff for each interval,
preventing look-ahead bias. Also extracts all historical forecast versions for transparency.
"""
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from app.models.schemas import ForecastHistoryItem, ForecastRecord


class ForecastSelector:
    """
    Selects eligible forecasts published prior to the day-ahead purchasing decision cutoff.
    """

    @staticmethod
    def select_decision_forecasts(
        forecast_records: List[ForecastRecord],
        cutoff_utc: datetime,
        alignment_method: str = "hourly_block"
    ) -> Dict[datetime, ForecastRecord]:
        """
        For each delivery interval start time, selects the forecast with the greatest
        publishTime <= cutoff_utc.
        
        Args:
            forecast_records: Raw or deduplicated forecast records from WINDFOR.
            cutoff_utc: The decision cutoff timestamp in UTC.
            alignment_method: 'hourly_block' or 'exact_timestamp'.
            
        Returns:
            Dictionary mapping interval start time (UTC) -> selected eligible ForecastRecord.
        """
        # Step 1: Filter to eligible forecasts only (publishTime <= cutoff_utc)
        eligible = [f for f in forecast_records if f.publishTime <= cutoff_utc]

        # Step 2: Sort by publishTime ascending so later publications overwrite earlier ones
        eligible.sort(key=lambda x: x.publishTime)

        selected_map: Dict[datetime, ForecastRecord] = {}
        for rec in eligible:
            # When using hourly_block, the forecast for HH:00 applies to HH:00
            # If alignment is requested later, we preserve the exact forecast startTime here
            selected_map[rec.startTime] = rec

        return selected_map

    @staticmethod
    def get_forecast_history_for_interval(
        interval_start_utc: datetime,
        all_forecast_records: List[ForecastRecord],
        cutoff_utc: datetime,
        actual_generation_mw: Optional[float] = None,
        settlement_period: int = 1,
        alignment_method: str = "hourly_block"
    ) -> List[ForecastHistoryItem]:
        """
        Retrieves all forecast publications targeting a specific delivery interval.
        Marks eligibility relative to the cutoff, identifies the selected version,
        and computes version-specific forecast errors against actual outturn.
        """
        from app.services.time_utils import format_uk_local

        # Target interval or hourly block
        matching: List[ForecastRecord] = []
        for rec in all_forecast_records:
            if rec.startTime == interval_start_utc:
                matching.append(rec)
            elif alignment_method == "hourly_block":
                # Check if rec.startTime is the top of the hour for this interval
                # e.g. interval 14:30 belongs to hour 14:00
                if (rec.startTime.year == interval_start_utc.year and
                    rec.startTime.month == interval_start_utc.month and
                    rec.startTime.day == interval_start_utc.day and
                    rec.startTime.hour == interval_start_utc.hour and
                    rec.startTime.minute == 0):
                    matching.append(rec)

        # Sort by publication time ascending
        matching.sort(key=lambda x: x.publishTime)

        # Determine the selected forecast (latest with publishTime <= cutoff_utc)
        eligible_records = [r for r in matching if r.publishTime <= cutoff_utc]
        selected_rec = eligible_records[-1] if eligible_records else None

        items: List[ForecastHistoryItem] = []
        for rec in matching:
            is_elig = rec.publishTime <= cutoff_utc
            is_sel = (selected_rec is not None and 
                      rec.publishTime == selected_rec.publishTime and 
                      rec.generation == selected_rec.generation)
            
            err = round(rec.generation - actual_generation_mw, 2) if actual_generation_mw is not None else None

            items.append(
                ForecastHistoryItem(
                    publishTime=rec.publishTime,
                    publishTimeLocal=format_uk_local(rec.publishTime),
                    generationMw=round(rec.generation, 1),
                    isEligible=is_elig,
                    isSelected=is_sel,
                    decisionCutoff=cutoff_utc,
                    deliveryStartTime=interval_start_utc,
                    settlementPeriod=settlement_period,
                    actualGenerationMw=round(actual_generation_mw, 1) if actual_generation_mw is not None else None,
                    forecastErrorMw=err
                )
            )

        return items
