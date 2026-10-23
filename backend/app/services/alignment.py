"""
Interval alignment module.
Aligns half-hour settlement periods between FUELHH actual wind outturns
and WINDFOR forecasts chosen at the Day-Ahead purchasing decision cutoff.
Handles data hygiene: deduplication, missing observations, and timezone formatting.
"""
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Tuple
from app.models.schemas import ActualRecord, AlignedInterval, ForecastRecord
from app.services.forecast_selector import ForecastSelector
from app.services.time_utils import (
    format_uk_local,
    get_decision_cutoff_utc,
    get_expected_settlement_intervals,
    to_uk_local
)


def align_intervals(
    start_date: date,
    end_date: date,
    actual_records: List[ActualRecord],
    forecast_records: List[ForecastRecord],
    cutoff_time_str: str = "11:00",
    alignment_method: str = "hourly_block"
) -> Tuple[List[AlignedInterval], Dict[str, int]]:
    """
    Constructs aligned time series of half-hour settlement intervals across the given date range.
    
    Returns:
        Tuple of (aligned_intervals, audit_counters)
    """
    # 1. Index actuals by interval start time (UTC)
    actual_map: Dict[datetime, ActualRecord] = {}
    duplicate_actuals = 0
    for act in actual_records:
        if act.startTime in actual_map:
            duplicate_actuals += 1
            # Keep newest publishTime if duplicates exist
            existing = actual_map[act.startTime]
            if act.publishTime and existing.publishTime and act.publishTime > existing.publishTime:
                actual_map[act.startTime] = act
        else:
            actual_map[act.startTime] = act

    # 2. Iterate through each delivery date and align
    aligned_series: List[AlignedInterval] = []
    current_date = start_date
    total_duplicates = duplicate_actuals

    while current_date <= end_date:
        # Determine day-ahead purchasing decision cutoff for this delivery date (D-1 at 11:00 UK local)
        cutoff_utc = get_decision_cutoff_utc(current_date, cutoff_time_str)

        # Select decision-time forecasts for this date's cutoff
        selected_forecasts = ForecastSelector.select_decision_forecasts(
            forecast_records=forecast_records,
            cutoff_utc=cutoff_utc,
            alignment_method=alignment_method
        )

        # Expected settlement periods for this day (48 in January)
        intervals = get_expected_settlement_intervals(current_date)
        date_str = current_date.strftime("%Y-%m-%d")

        for period_num, interval_utc, local_str in intervals:
            # 1. Lookup Actual
            act_rec = actual_map.get(interval_utc)
            actual_mw = act_rec.generation if act_rec is not None else None
            has_act = actual_mw is not None

            # 2. Lookup Forecast
            fc_rec: Optional[ForecastRecord] = None
            alignment_note = None

            if interval_utc in selected_forecasts:
                fc_rec = selected_forecasts[interval_utc]
                alignment_note = "Exact timestamp match"
            elif alignment_method == "hourly_block":
                # Check top-of-the-hour forecast (e.g. for 14:30 interval, lookup 14:00 forecast)
                hour_start = interval_utc.replace(minute=0, second=0, microsecond=0)
                if hour_start in selected_forecasts:
                    fc_rec = selected_forecasts[hour_start]
                    alignment_note = f"Hourly block match from {hour_start.strftime('%H:%M')} forecast"

            fc_mw = fc_rec.generation if fc_rec is not None else None
            has_fc = fc_mw is not None
            fc_publish_time = fc_rec.publishTime if fc_rec is not None else None

            # 3. Validation and error calculation: e_t = Forecast - Actual
            is_valid = has_act and has_fc
            error_mw = None
            abs_error_mw = None
            pct_error = None

            if is_valid:
                error_mw = round(fc_mw - actual_mw, 2)
                abs_error_mw = round(abs(error_mw), 2)
                if actual_mw > 0:
                    pct_error = round((error_mw / actual_mw) * 100.0, 2)
                status = "valid"
            elif not has_fc and not has_act:
                status = "missing_both"
            elif not has_fc:
                status = "missing_forecast"
            else:
                status = "missing_actual"

            aligned_series.append(
                AlignedInterval(
                    deliveryDate=date_str,
                    settlementPeriod=period_num,
                    startTime=interval_utc,
                    startTimeLocal=local_str,
                    actualGenerationMw=round(actual_mw, 1) if actual_mw is not None else None,
                    forecastGenerationMw=round(fc_mw, 1) if fc_mw is not None else None,
                    forecastPublishTime=fc_publish_time,
                    forecastCutoffTime=cutoff_utc,
                    errorMw=error_mw,
                    absErrorMw=abs_error_mw,
                    percentageError=pct_error,
                    hasActual=has_act,
                    hasForecast=has_fc,
                    isValidComparison=is_valid,
                    status=status,
                    alignmentNote=alignment_note
                )
            )

        current_date += timedelta(days=1)

    counters = {
        "duplicateRecordsFiltered": total_duplicates,
        "totalIntervals": len(aligned_series),
        "validComparisons": sum(1 for x in aligned_series if x.isValidComparison),
        "missingActuals": sum(1 for x in aligned_series if not x.hasActual),
        "missingForecasts": sum(1 for x in aligned_series if not x.hasForecast),
    }

    return aligned_series, counters
