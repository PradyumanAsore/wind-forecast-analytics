"""
Unit tests for interval generation, deduplication, and alignment across settlement periods.
"""
from datetime import date, datetime, timedelta, timezone
import pytest
from app.models.schemas import ActualRecord, ForecastRecord
from app.services.alignment import align_intervals
from app.services.time_utils import get_expected_settlement_intervals

UTC = timezone.utc


def test_january_48_intervals():
    # January 1, 2026 has 48 half-hour settlement periods
    target_date = date(2026, 1, 1)
    intervals = get_expected_settlement_intervals(target_date)

    assert len(intervals) == 48
    # Period 1 starts at 00:00:00Z
    assert intervals[0][0] == 1
    assert intervals[0][1] == datetime(2026, 1, 1, 0, 0, tzinfo=UTC)
    # Period 48 starts at 23:30:00Z
    assert intervals[-1][0] == 48
    assert intervals[-1][1] == datetime(2026, 1, 1, 23, 30, tzinfo=UTC)


def test_clock_change_day_intervals():
    # Spring forward in UK (e.g., 2026-03-29) has 46 half-hour periods
    spring_date = date(2026, 3, 29)
    spring_intervals = get_expected_settlement_intervals(spring_date)
    assert len(spring_intervals) == 46

    # Fall back in UK (e.g., 2026-10-25) has 50 half-hour periods
    fall_date = date(2026, 10, 25)
    fall_intervals = get_expected_settlement_intervals(fall_date)
    assert len(fall_intervals) == 50


def test_hourly_block_alignment():
    # Test that an hourly WINDFOR forecast at 14:00 maps to both 14:00 and 14:30 intervals
    delivery_date = date(2026, 1, 5)
    t14_00 = datetime(2026, 1, 5, 14, 0, tzinfo=UTC)
    t14_30 = datetime(2026, 1, 5, 14, 30, tzinfo=UTC)

    actuals = [
        ActualRecord(startTime=t14_00, settlementDate="2026-01-05", settlementPeriod=29, generation=3000.0),
        ActualRecord(startTime=t14_30, settlementDate="2026-01-05", settlementPeriod=30, generation=3100.0)
    ]

    forecasts = [
        ForecastRecord(
            startTime=t14_00,
            publishTime=datetime(2026, 1, 4, 10, 0, tzinfo=UTC),  # Before cutoff
            generation=3200.0
        )
    ]

    aligned, counters = align_intervals(
        start_date=delivery_date,
        end_date=delivery_date,
        actual_records=actuals,
        forecast_records=forecasts,
        cutoff_time_str="11:00",
        alignment_method="hourly_block"
    )

    p29 = next(x for x in aligned if x.settlementPeriod == 29)
    p30 = next(x for x in aligned if x.settlementPeriod == 30)

    # Both must match the 3200.0 MW forecast
    assert p29.forecastGenerationMw == 3200.0
    assert p29.errorMw == 200.0  # 3200 - 3000
    assert p29.isValidComparison is True

    assert p30.forecastGenerationMw == 3200.0
    assert p30.errorMw == 100.0  # 3200 - 3100
    assert p30.isValidComparison is True
    assert "Hourly block match" in p30.alignmentNote


def test_missing_data_flags():
    delivery_date = date(2026, 1, 5)
    t10_00 = datetime(2026, 1, 5, 10, 0, tzinfo=UTC)

    # Has forecast but missing actual
    forecasts = [
        ForecastRecord(
            startTime=t10_00,
            publishTime=datetime(2026, 1, 4, 9, 0, tzinfo=UTC),
            generation=2500.0
        )
    ]

    aligned, counters = align_intervals(
        start_date=delivery_date,
        end_date=delivery_date,
        actual_records=[],
        forecast_records=forecasts,
        cutoff_time_str="11:00"
    )

    p21 = next(x for x in aligned if x.startTime == t10_00)
    assert p21.hasForecast is True
    assert p21.hasActual is False
    assert p21.isValidComparison is False
    assert p21.status == "missing_actual"
    assert p21.errorMw is None
