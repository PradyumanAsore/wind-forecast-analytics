"""
Forecast accuracy analysis module.
Computes standard energy-market forecast verification metrics:
- MAE, RMSE, Mean Error (bias)
- MAPE with zero/near-zero threshold handling
- 95th percentile absolute error
- Overforecast / Underforecast distribution
- Aggregated energy in MWh

Sign convention:
e_t = Forecast - Actual (G_hat_t - G_t)
e_t > 0: Overforecast (Forecast was higher than actual outturn)
e_t < 0: Underforecast (Forecast was lower than actual outturn)
"""
import math
from typing import List, Optional
import numpy as np
from app.models.schemas import MetricSummary


def calculate_metrics(
    errors: List[float],
    actuals: List[float],
    forecasts: List[float],
    expected_intervals: int,
    mape_min_threshold_mw: float = 50.0
) -> MetricSummary:
    """
    Accepts aligned arrays of errors, actuals, and forecasts.
    Excludes missing/null observations and returns standard verification metrics.
    
    Args:
        errors: List of e_t = Forecast - Actual (MW) for valid comparisons
        actuals: List of actual generation values (MW) for valid comparisons
        forecasts: List of forecast generation values (MW) for valid comparisons
        expected_intervals: Total settlement periods expected in the evaluation window
        mape_min_threshold_mw: Minimum actual MW required to include in MAPE calculation
    """
    valid_count = len(errors)
    coverage_pct = round((valid_count / expected_intervals * 100.0), 2) if expected_intervals > 0 else 0.0

    if valid_count == 0:
        return MetricSummary(
            maeMw=None,
            rmseMw=None,
            meanErrorMw=None,
            biasDirection="N/A",
            biasDescription="No valid aligned forecast and actual observations available for this period.",
            mapePercent=None,
            mapeSampleCount=0,
            mapePolicyDescription=(
                f"MAPE excluded: No valid observations. (Policy: actuals < {mape_min_threshold_mw} MW filtered "
                "to prevent division by near-zero)."
            ),
            p95AbsErrorMw=None,
            totalActualMwh=None,
            totalForecastMwh=None,
            overforecastCount=0,
            underforecastCount=0,
            exactMatchCount=0,
            totalEvaluatedIntervals=0,
            expectedIntervals=expected_intervals,
            coveragePercent=coverage_pct
        )

    errors_arr = np.array(errors, dtype=float)
    actuals_arr = np.array(actuals, dtype=float)
    forecasts_arr = np.array(forecasts, dtype=float)
    abs_errors_arr = np.abs(errors_arr)

    # 1. Mean Absolute Error (MAE)
    mae = float(np.mean(abs_errors_arr))

    # 2. Root Mean Squared Error (RMSE)
    rmse = float(np.sqrt(np.mean(errors_arr ** 2)))

    # 3. Mean Error (ME / Bias)
    me = float(np.mean(errors_arr))

    # Plain English Bias interpretation
    # Threshold for statistical neutrality (e.g., within 5 MW)
    if me > 5.0:
        bias_dir = "OVERFORECAST"
        bias_desc = (
            f"Forecasts systematically overestimated wind generation by an average of {me:.1f} MW per interval. "
            "In market operations, overforecasting may lead to under-procurement in day-ahead markets, "
            "requiring costly upward balancing actions."
        )
    elif me < -5.0:
        bias_dir = "UNDERFORECAST"
        bias_desc = (
            f"Forecasts systematically underestimated wind generation by an average of {abs(me):.1f} MW per interval. "
            "In market operations, underforecasting may lead to over-procurement day-ahead, "
            "requiring power to be sold back at potentially depressed cash-out prices."
        )
    else:
        bias_dir = "UNBIASED"
        bias_desc = (
            f"Forecast bias is minimal ({me:.1f} MW), indicating an approximately balanced distribution between "
            "over- and under-forecasted intervals."
        )

    # 4. MAPE with zero/near-zero threshold policy
    # Limitations of percentage metrics for wind:
    # Wind generation can be close to zero during calm conditions or curtailment.
    # Dividing by near-zero creates astronomical percentages that distort the true error scale.
    valid_mape_mask = actuals_arr >= mape_min_threshold_mw
    mape_sample_count = int(np.sum(valid_mape_mask))
    
    if mape_sample_count > 0:
        mape_errors = abs_errors_arr[valid_mape_mask]
        mape_actuals = actuals_arr[valid_mape_mask]
        mape_val = float(np.mean((mape_errors / mape_actuals) * 100.0))
        mape_policy_desc = (
            f"Calculated on {mape_sample_count} of {valid_count} intervals where actual generation >= "
            f"{mape_min_threshold_mw:.0f} MW. Intervals below this threshold are excluded because near-zero denominators "
            "produce mathematically unstable percentage errors."
        )
    else:
        mape_val = None
        mape_policy_desc = (
            f"MAPE unavailable: All {valid_count} intervals had actual generation below the "
            f"{mape_min_threshold_mw:.0f} MW threshold."
        )

    # 5. 95th Percentile of Absolute Error
    p95 = float(np.percentile(abs_errors_arr, 95))

    # 6. Aggregated Energy in MWh: Power (MW) * 0.5 hours
    total_actual_mwh = float(np.sum(actuals_arr) * 0.5)
    total_forecast_mwh = float(np.sum(forecasts_arr) * 0.5)

    # 7. Distribution counts
    over_count = int(np.sum(errors_arr > 0.0))
    under_count = int(np.sum(errors_arr < 0.0))
    exact_count = int(np.sum(errors_arr == 0.0))

    return MetricSummary(
        maeMw=round(mae, 2),
        rmseMw=round(rmse, 2),
        meanErrorMw=round(me, 2),
        biasDirection=bias_dir,
        biasDescription=bias_desc,
        mapePercent=round(mape_val, 2) if mape_val is not None else None,
        mapeSampleCount=mape_sample_count,
        mapePolicyDescription=mape_policy_desc,
        p95AbsErrorMw=round(p95, 2),
        totalActualMwh=round(total_actual_mwh, 1),
        totalForecastMwh=round(total_forecast_mwh, 1),
        overforecastCount=over_count,
        underforecastCount=under_count,
        exactMatchCount=exact_count,
        totalEvaluatedIntervals=valid_count,
        expectedIntervals=expected_intervals,
        coveragePercent=coverage_pct
    )
