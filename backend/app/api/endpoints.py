"""
FastAPI HTTP endpoints for the UK Wind Generation Forecast Analysis Platform.
Validates dates, cutoffs, and provides transparent energy analytics.
"""
from datetime import date, datetime, timedelta
import math
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
import numpy as np

from app.core.config import settings
from app.models.schemas import (
    AlignedInterval,
    DailyErrorSummary,
    DataQualityInfo,
    ForecastErrorsResponse,
    ForecastHistoryItem,
    ForecastHistoryResponse,
    GenerationSeriesResponse,
    MetricSummary,
    OverviewResponse
)
from app.services.alignment import align_intervals
from app.services.elexon_client import ElexonClient
from app.services.forecast_selector import ForecastSelector
from app.services.metrics import calculate_metrics
from app.services.time_utils import (
    UTC_TZ,
    format_uk_local,
    get_decision_cutoff_utc,
    parse_iso_datetime,
    to_uk_local
)

router = APIRouter()
elexon_client = ElexonClient()


def parse_date_param(date_str: str, default: date) -> date:
    """Helper to parse YYYY-MM-DD date parameter safely."""
    try:
        return date.fromisoformat(date_str)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid date format '{date_str}'. Expected YYYY-MM-DD.")


async def _get_aligned_data(
    start_d: date,
    end_d: date,
    cutoff_time: str,
    alignment_method: str
):
    if start_d > end_d:
        raise HTTPException(status_code=400, detail="start_date must be earlier than or equal to end_date.")
    
    # Cap maximum query range to 60 days to prevent excessive load
    if (end_d - start_d).days > 60:
        raise HTTPException(status_code=400, detail="Maximum supported query range is 60 days.")

    actuals, act_mode = await elexon_client.get_wind_actuals(start_d, end_d)
    forecasts, fc_mode = await elexon_client.get_wind_forecasts(start_d, end_d)

    aligned, counters = align_intervals(
        start_date=start_d,
        end_date=end_d,
        actual_records=actuals,
        forecast_records=forecasts,
        cutoff_time_str=cutoff_time,
        alignment_method=alignment_method
    )

    data_mode = "cached" if (act_mode == "cached" and fc_mode == "cached") else (
        "offline_fixture" if (act_mode == "offline_fixture" or fc_mode == "offline_fixture") else "live_api"
    )

    return aligned, actuals, forecasts, counters, data_mode


def _build_quality_info(
    start_d: date,
    end_d: date,
    cutoff_time: str,
    alignment_method: str,
    actuals: list,
    forecasts: list,
    aligned: list,
    counters: dict,
    data_mode: str
) -> DataQualityInfo:
    notes = [
        f"Actuals extracted from Elexon FUELHH (fuelType=WIND) in half-hour intervals.",
        f"Forecasts retrieved from Elexon WINDFOR and filtered by Day-Ahead cutoff ({cutoff_time} UK local time on D-1).",
        f"Alignment method: {alignment_method}. " + (
            "Hourly WINDFOR forecasts mapped to both settlement periods of each clock hour."
            if alignment_method == "hourly_block" else "Exact start-time match (:00 intervals only)."
        ),
        f"Look-ahead bias prevention: Forecast versions published after the {cutoff_time} D-1 cutoff were strictly excluded from purchasing decision metrics."
    ]

    expected = len(aligned)
    valid_count = counters["validComparisons"]

    return DataQualityInfo(
        dataSourceActuals="Elexon BMRS FUELHH (fuelType=WIND)",
        dataSourceForecasts="Elexon BMRS WINDFOR",
        selectedDateRange=f"{start_d.isoformat()} to {end_d.isoformat()}",
        decisionCutoffSetting=f"D-1 at {cutoff_time} ({settings.timezone})",
        timezone=f"{settings.timezone} (UTC+0 in January)",
        lastRetrievalTime=datetime.now(UTC_TZ),
        dataSourceMode=data_mode,
        expectedIntervals=expected,
        actualObservationsCount=len(actuals),
        forecastObservationsCount=len(forecasts),
        matchedComparisonsCount=valid_count,
        missingActualsCount=counters["missingActuals"],
        missingForecastsCount=counters["missingForecasts"],
        duplicateRecordsFiltered=counters["duplicateRecordsFiltered"],
        alignmentMethod=alignment_method,
        notes=notes
    )


@router.get("/overview", response_model=OverviewResponse)
async def get_overview(
    start_date: str = Query("2026-01-01", description="Start date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-07", description="End date (YYYY-MM-DD)"),
    cutoff_time: str = Query(settings.default_decision_cutoff_time, description="Decision cutoff on D-1 (HH:MM)"),
    alignment_method: str = Query(settings.alignment_method, description="'hourly_block' or 'exact_timestamp'")
):
    """
    Returns summary KPIs, overall forecast verification metrics, and data quality indicators.
    """
    start_d = parse_date_param(start_date, date(2026, 1, 1))
    end_d = parse_date_param(end_date, date(2026, 1, 7))

    aligned, actuals, forecasts, counters, data_mode = await _get_aligned_data(
        start_d, end_d, cutoff_time, alignment_method
    )

    valid_intervals = [x for x in aligned if x.isValidComparison]
    errors = [x.errorMw for x in valid_intervals]
    actual_vals = [x.actualGenerationMw for x in valid_intervals]
    fc_vals = [x.forecastGenerationMw for x in valid_intervals]

    metrics = calculate_metrics(
        errors=errors,
        actuals=actual_vals,
        forecasts=fc_vals,
        expected_intervals=len(aligned),
        mape_min_threshold_mw=settings.mape_min_actual_mw
    )

    quality = _build_quality_info(
        start_d, end_d, cutoff_time, alignment_method, actuals, forecasts, aligned, counters, data_mode
    )

    return OverviewResponse(
        startDate=start_d.isoformat(),
        endDate=end_d.isoformat(),
        cutoffTime=cutoff_time,
        alignmentMethod=alignment_method,
        metrics=metrics,
        dataQuality=quality
    )


@router.get("/generation", response_model=GenerationSeriesResponse)
async def get_generation_series(
    start_date: str = Query("2026-01-01", description="Start date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-07", description="End date (YYYY-MM-DD)"),
    cutoff_time: str = Query(settings.default_decision_cutoff_time, description="Decision cutoff on D-1 (HH:MM)"),
    alignment_method: str = Query(settings.alignment_method, description="'hourly_block' or 'exact_timestamp'")
):
    """
    Returns the time series of half-hour generation intervals (actual vs decision-time forecast).
    """
    start_d = parse_date_param(start_date, date(2026, 1, 1))
    end_d = parse_date_param(end_date, date(2026, 1, 7))

    aligned, _, _, counters, _ = await _get_aligned_data(
        start_d, end_d, cutoff_time, alignment_method
    )

    return GenerationSeriesResponse(
        startDate=start_d.isoformat(),
        endDate=end_d.isoformat(),
        intervals=aligned,
        expectedCount=len(aligned),
        validCount=counters["validComparisons"]
    )


@router.get("/forecast-errors", response_model=ForecastErrorsResponse)
async def get_forecast_errors(
    start_date: str = Query("2026-01-01", description="Start date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-07", description="End date (YYYY-MM-DD)"),
    cutoff_time: str = Query(settings.default_decision_cutoff_time, description="Decision cutoff on D-1 (HH:MM)"),
    alignment_method: str = Query(settings.alignment_method, description="'hourly_block' or 'exact_timestamp'")
):
    """
    Returns forecast error breakdown, daily error summaries, and error distribution histogram data.
    """
    start_d = parse_date_param(start_date, date(2026, 1, 1))
    end_d = parse_date_param(end_date, date(2026, 1, 7))

    aligned, _, _, counters, _ = await _get_aligned_data(
        start_d, end_d, cutoff_time, alignment_method
    )

    valid_intervals = [x for x in aligned if x.isValidComparison]
    errors = [x.errorMw for x in valid_intervals]
    actual_vals = [x.actualGenerationMw for x in valid_intervals]
    fc_vals = [x.forecastGenerationMw for x in valid_intervals]

    metrics = calculate_metrics(
        errors=errors,
        actuals=actual_vals,
        forecasts=fc_vals,
        expected_intervals=len(aligned),
        mape_min_threshold_mw=settings.mape_min_actual_mw
    )

    # 1. Daily summaries
    daily_groups = {}
    for item in aligned:
        d = item.deliveryDate
        if d not in daily_groups:
            daily_groups[d] = []
        daily_groups[d].append(item)

    daily_summaries: List[DailyErrorSummary] = []
    for d, items in sorted(daily_groups.items()):
        v_items = [it for it in items if it.isValidComparison]
        d_err = [it.errorMw for it in v_items]
        d_act = [it.actualGenerationMw for it in v_items]
        d_fc = [it.forecastGenerationMw for it in v_items]

        d_metrics = calculate_metrics(
            errors=d_err,
            actuals=d_act,
            forecasts=d_fc,
            expected_intervals=len(items),
            mape_min_threshold_mw=settings.mape_min_actual_mw
        )

        daily_summaries.append(
            DailyErrorSummary(
                date=d,
                evaluatedIntervals=d_metrics.totalEvaluatedIntervals,
                expectedIntervals=d_metrics.expectedIntervals,
                maeMw=d_metrics.maeMw,
                rmseMw=d_metrics.rmseMw,
                meanErrorMw=d_metrics.meanErrorMw,
                biasDirection=d_metrics.biasDirection,
                totalActualMwh=d_metrics.totalActualMwh,
                totalForecastMwh=d_metrics.totalForecastMwh
            )
        )

    # 2. Error distribution histogram (e.g., bins of 500 MW or dynamic bins)
    error_dist = []
    if errors:
        min_err = math.floor(min(errors) / 500.0) * 500
        max_err = math.ceil(max(errors) / 500.0) * 500
        bins = np.arange(min_err, max_err + 500, 500)
        counts, edges = np.histogram(errors, bins=bins)
        for i in range(len(counts)):
            bin_label = f"{int(edges[i])} to {int(edges[i+1])} MW"
            error_dist.append({
                "binLabel": bin_label,
                "binMin": int(edges[i]),
                "binMax": int(edges[i+1]),
                "count": int(counts[i])
            })

    return ForecastErrorsResponse(
        startDate=start_d.isoformat(),
        endDate=end_d.isoformat(),
        metrics=metrics,
        dailySummaries=daily_summaries,
        intervals=aligned,
        errorDistribution=error_dist
    )


@router.get("/forecast-history", response_model=ForecastHistoryResponse)
async def get_forecast_history(
    interval_time: str = Query(..., description="Target delivery interval UTC timestamp (ISO) or UK local time string"),
    cutoff_time: str = Query(settings.default_decision_cutoff_time, description="Decision cutoff on D-1 (HH:MM)"),
    alignment_method: str = Query(settings.alignment_method, description="'hourly_block' or 'exact_timestamp'")
):
    """
    Examines all forecast versions published for a specific delivery interval.
    Clearly marks eligible vs post-cutoff forecasts and highlights the version chosen for Day-Ahead trading.
    """
    try:
        # Try ISO parse
        interval_utc = parse_iso_datetime(interval_time)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interval_time format. Please use ISO format e.g. 2026-01-01T14:00:00Z")

    delivery_date = to_uk_local(interval_utc).date()
    cutoff_utc = get_decision_cutoff_utc(delivery_date, cutoff_time)

    # Retrieve all forecasts around this interval (D-2 to D+1)
    fetch_start = delivery_date - timedelta(days=2)
    fetch_end = delivery_date + timedelta(days=1)
    forecasts, _ = await elexon_client.get_wind_forecasts(fetch_start, fetch_end)
    actuals, _ = await elexon_client.get_wind_actuals(delivery_date, delivery_date)

    # Find actual outturn for this exact interval
    act_match = next((a for a in actuals if a.startTime == interval_utc), None)
    actual_mw = act_match.generation if act_match else None
    settlement_period = act_match.settlementPeriod if act_match else 1

    # Extract all versions targeting this interval
    versions = ForecastSelector.get_forecast_history_for_interval(
        interval_start_utc=interval_utc,
        all_forecast_records=forecasts,
        cutoff_utc=cutoff_utc,
        actual_generation_mw=actual_mw,
        settlement_period=settlement_period,
        alignment_method=alignment_method
    )

    selected_ver = next((v for v in versions if v.isSelected), None)
    reason = (
        f"Selected the latest eligible forecast published at {selected_ver.publishTimeLocal} "
        f"prior to the day-ahead purchasing decision cutoff ({format_uk_local(cutoff_utc)})."
        if selected_ver else f"No eligible forecast was published prior to cutoff ({format_uk_local(cutoff_utc)})."
    )

    return ForecastHistoryResponse(
        deliveryDate=delivery_date.isoformat(),
        settlementPeriod=settlement_period,
        intervalStartTime=interval_utc,
        intervalStartTimeLocal=format_uk_local(interval_utc),
        decisionCutoff=cutoff_utc,
        decisionCutoffLocal=format_uk_local(cutoff_utc),
        actualGenerationMw=round(actual_mw, 1) if actual_mw is not None else None,
        selectedForecastGenerationMw=selected_ver.generationMw if selected_ver else None,
        selectedForecastErrorMw=selected_ver.forecastErrorMw if selected_ver else None,
        versions=versions,
        selectionReason=reason
    )


@router.get("/data-quality", response_model=DataQualityInfo)
async def get_data_quality(
    start_date: str = Query("2026-01-01", description="Start date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-07", description="End date (YYYY-MM-DD)"),
    cutoff_time: str = Query(settings.default_decision_cutoff_time, description="Decision cutoff on D-1 (HH:MM)"),
    alignment_method: str = Query(settings.alignment_method, description="'hourly_block' or 'exact_timestamp'")
):
    """
    Returns transparent audit metadata: data sources, retrieval timestamps, coverage, and missing/duplicate counts.
    """
    start_d = parse_date_param(start_date, date(2026, 1, 1))
    end_d = parse_date_param(end_date, date(2026, 1, 7))

    aligned, actuals, forecasts, counters, data_mode = await _get_aligned_data(
        start_d, end_d, cutoff_time, alignment_method
    )

    return _build_quality_info(
        start_d, end_d, cutoff_time, alignment_method, actuals, forecasts, aligned, counters, data_mode
    )
