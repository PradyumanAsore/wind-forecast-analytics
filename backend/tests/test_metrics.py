"""
Unit tests for forecast error metrics calculations.
Tests:
- MAE, RMSE, Mean Error (bias)
- Sign conventions: e_t = Forecast - Actual
- MAPE behavior when actuals are zero or near-zero
- 95th percentile error
- Plain English bias explanation
- Empty and single-element inputs
"""
import pytest
from app.services.metrics import calculate_metrics


def test_standard_metrics_calculation():
    # Errors: [100, -200, 300, -100] -> abs: [100, 200, 300, 100]
    # MAE = (100 + 200 + 300 + 100) / 4 = 175.0
    # RMSE = sqrt((10000 + 40000 + 90000 + 10000) / 4) = sqrt(37500) = 193.65
    # ME = (100 - 200 + 300 - 100) / 4 = 25.0 (Overforecast bias)
    actuals = [1000.0, 2000.0, 1500.0, 1200.0]
    forecasts = [1100.0, 1800.0, 1800.0, 1100.0]
    errors = [100.0, -200.0, 300.0, -100.0]

    result = calculate_metrics(
        errors=errors,
        actuals=actuals,
        forecasts=forecasts,
        expected_intervals=4,
        mape_min_threshold_mw=50.0
    )

    assert result.totalEvaluatedIntervals == 4
    assert result.maeMw == 175.0
    assert result.rmseMw == 193.65
    assert result.meanErrorMw == 25.0
    assert result.biasDirection == "OVERFORECAST"
    assert "systematically overestimated" in result.biasDescription
    assert result.overforecastCount == 2
    assert result.underforecastCount == 2
    assert result.exactMatchCount == 0
    assert result.coveragePercent == 100.0

    # Aggregated Energy in MWh: Power * 0.5h
    # Total actual = (1000 + 2000 + 1500 + 1200) * 0.5 = 5700 * 0.5 = 2850 MWh
    # Total forecast = (1100 + 1800 + 1800 + 1100) * 0.5 = 5800 * 0.5 = 2900 MWh
    assert result.totalActualMwh == 2850.0
    assert result.totalForecastMwh == 2900.0


def test_underforecast_bias():
    actuals = [1500.0, 2000.0]
    forecasts = [1400.0, 1800.0]
    errors = [-100.0, -200.0]

    result = calculate_metrics(
        errors=errors,
        actuals=actuals,
        forecasts=forecasts,
        expected_intervals=2
    )

    assert result.meanErrorMw == -150.0
    assert result.biasDirection == "UNDERFORECAST"
    assert "systematically underestimated" in result.biasDescription


def test_mape_zero_and_near_zero_handling():
    # When actuals are zero or below threshold (50 MW), they must be excluded from MAPE
    actuals = [0.0, 10.0, 200.0, 500.0]
    forecasts = [50.0, 40.0, 220.0, 450.0]
    errors = [50.0, 30.0, 20.0, -50.0]

    result = calculate_metrics(
        errors=errors,
        actuals=actuals,
        forecasts=forecasts,
        expected_intervals=4,
        mape_min_threshold_mw=50.0
    )

    # Only 200.0 and 500.0 meet the >= 50.0 threshold
    assert result.mapeSampleCount == 2
    # Errors for these two: |20| and |-50|
    # Percentages: (20/200)*100 = 10%, (50/500)*100 = 10% -> Average = 10.0%
    assert result.mapePercent == 10.0
    assert "Calculated on 2 of 4 intervals" in result.mapePolicyDescription


def test_mape_when_all_actuals_are_zero():
    actuals = [0.0, 0.0]
    forecasts = [10.0, 20.0]
    errors = [10.0, 20.0]

    result = calculate_metrics(
        errors=errors,
        actuals=actuals,
        forecasts=forecasts,
        expected_intervals=2,
        mape_min_threshold_mw=50.0
    )

    assert result.mapePercent is None
    assert result.mapeSampleCount == 0
    assert "MAPE unavailable" in result.mapePolicyDescription


def test_empty_metrics():
    result = calculate_metrics(
        errors=[],
        actuals=[],
        forecasts=[],
        expected_intervals=48
    )

    assert result.totalEvaluatedIntervals == 0
    assert result.maeMw is None
    assert result.rmseMw is None
    assert result.meanErrorMw is None
    assert result.biasDirection == "N/A"
    assert result.coveragePercent == 0.0
