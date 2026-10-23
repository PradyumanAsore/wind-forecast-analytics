"""
Unit tests for Day-Ahead forecast selection and cutoff logic.
Ensures look-ahead bias is prevented and latest eligible version is reliably chosen.
"""
from datetime import datetime, timezone
import pytest
from app.models.schemas import ForecastRecord
from app.services.forecast_selector import ForecastSelector

UTC = timezone.utc


def test_select_latest_eligible_forecast():
    delivery_time = datetime(2026, 1, 5, 14, 0, tzinfo=UTC)
    cutoff = datetime(2026, 1, 4, 11, 0, tzinfo=UTC)

    records = [
        # Version 1: published 2 days prior (eligible)
        ForecastRecord(
            startTime=delivery_time,
            publishTime=datetime(2026, 1, 3, 10, 0, tzinfo=UTC),
            generation=4200.0
        ),
        # Version 2: published morning of D-1 before 11:00 cutoff (eligible and newest)
        ForecastRecord(
            startTime=delivery_time,
            publishTime=datetime(2026, 1, 4, 9, 30, tzinfo=UTC),
            generation=4500.0
        ),
        # Version 3: published afternoon of D-1 after 11:00 cutoff (INELIGIBLE)
        ForecastRecord(
            startTime=delivery_time,
            publishTime=datetime(2026, 1, 4, 15, 0, tzinfo=UTC),
            generation=5100.0
        ),
        # Version 4: published on delivery day D (INELIGIBLE)
        ForecastRecord(
            startTime=delivery_time,
            publishTime=datetime(2026, 1, 5, 6, 0, tzinfo=UTC),
            generation=5300.0
        )
    ]

    selected = ForecastSelector.select_decision_forecasts(records, cutoff)

    assert delivery_time in selected
    chosen = selected[delivery_time]
    # Must select Version 2 (4500.0 MW)
    assert chosen.generation == 4500.0
    assert chosen.publishTime == datetime(2026, 1, 4, 9, 30, tzinfo=UTC)


def test_no_forecasts_before_cutoff():
    delivery_time = datetime(2026, 1, 5, 14, 0, tzinfo=UTC)
    cutoff = datetime(2026, 1, 4, 11, 0, tzinfo=UTC)

    # Only post-cutoff forecasts exist
    records = [
        ForecastRecord(
            startTime=delivery_time,
            publishTime=datetime(2026, 1, 4, 13, 0, tzinfo=UTC),
            generation=5000.0
        )
    ]

    selected = ForecastSelector.select_decision_forecasts(records, cutoff)
    assert delivery_time not in selected


def test_forecast_history_tracking():
    delivery_time = datetime(2026, 1, 5, 14, 0, tzinfo=UTC)
    cutoff = datetime(2026, 1, 4, 11, 0, tzinfo=UTC)
    actual_mw = 4600.0

    records = [
        ForecastRecord(
            startTime=delivery_time,
            publishTime=datetime(2026, 1, 4, 8, 0, tzinfo=UTC),
            generation=4400.0
        ),
        ForecastRecord(
            startTime=delivery_time,
            publishTime=datetime(2026, 1, 4, 10, 30, tzinfo=UTC),
            generation=4500.0
        ),
        ForecastRecord(
            startTime=delivery_time,
            publishTime=datetime(2026, 1, 4, 16, 0, tzinfo=UTC),
            generation=4900.0
        )
    ]

    history = ForecastSelector.get_forecast_history_for_interval(
        interval_start_utc=delivery_time,
        all_forecast_records=records,
        cutoff_utc=cutoff,
        actual_generation_mw=actual_mw,
        settlement_period=29
    )

    assert len(history) == 3
    # Check eligibility flags
    assert history[0].isEligible is True
    assert history[0].isSelected is False
    assert history[0].forecastErrorMw == -200.0  # 4400 - 4600

    assert history[1].isEligible is True
    assert history[1].isSelected is True
    assert history[1].forecastErrorMw == -100.0  # 4500 - 4600

    assert history[2].isEligible is False
    assert history[2].isSelected is False
    assert history[2].forecastErrorMw == 300.0   # 4900 - 4600
