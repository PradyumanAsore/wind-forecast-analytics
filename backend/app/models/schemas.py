"""
Pydantic schemas for data validation and API responses.
All datetimes are timezone-aware and units are explicitly documented in field names.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class ActualRecord(BaseModel):
    startTime: datetime = Field(..., description="Interval start time (UTC)")
    settlementDate: str = Field(..., description="Settlement date (YYYY-MM-DD)")
    settlementPeriod: int = Field(..., description="Settlement period (1-48, 46, or 50)")
    fuelType: str = Field("WIND", description="Fuel type category from FUELHH")
    generation: float = Field(..., description="Actual wind generation outturn in MW")
    publishTime: Optional[datetime] = Field(None, description="Time outturn was published (UTC)")


class ForecastRecord(BaseModel):
    startTime: datetime = Field(..., description="Delivery interval start time (UTC)")
    publishTime: datetime = Field(..., description="Forecast publication time (UTC)")
    generation: float = Field(..., description="Forecast wind generation in MW")
    dataset: str = Field("WINDFOR", description="Elexon dataset name")


class AlignedInterval(BaseModel):
    deliveryDate: str = Field(..., description="Delivery date in Europe/London (YYYY-MM-DD)")
    settlementPeriod: int = Field(..., description="Settlement period number (1-48)")
    startTime: datetime = Field(..., description="Interval start time in UTC")
    startTimeLocal: str = Field(..., description="Interval start time formatted in UK local time")
    actualGenerationMw: Optional[float] = Field(None, description="Actual wind generation in MW (None if missing)")
    forecastGenerationMw: Optional[float] = Field(None, description="Forecast wind generation in MW (None if missing)")
    forecastPublishTime: Optional[datetime] = Field(None, description="Publication timestamp of chosen forecast (UTC)")
    forecastCutoffTime: datetime = Field(..., description="Purchasing decision cutoff timestamp used (UTC)")
    errorMw: Optional[float] = Field(None, description="Forecast error e_t = Forecast - Actual in MW")
    absErrorMw: Optional[float] = Field(None, description="Absolute forecast error |e_t| in MW")
    percentageError: Optional[float] = Field(None, description="Percentage error (e_t / Actual) * 100")
    hasActual: bool = Field(..., description="True if valid actual outturn observation exists")
    hasForecast: bool = Field(..., description="True if valid eligible forecast exists")
    isValidComparison: bool = Field(..., description="True if both forecast and actual are present")
    status: str = Field(..., description="'valid', 'missing_forecast', 'missing_actual', or 'missing_both'")
    alignmentNote: Optional[str] = Field(None, description="Provenance or alignment note")


class MetricSummary(BaseModel):
    maeMw: Optional[float] = Field(None, description="Mean Absolute Error in MW: sum(|e_t|) / N")
    rmseMw: Optional[float] = Field(None, description="Root Mean Squared Error in MW: sqrt(sum(e_t^2) / N)")
    meanErrorMw: Optional[float] = Field(None, description="Mean Error (Bias) in MW: sum(e_t) / N")
    biasDirection: str = Field(..., description="'OVERFORECAST', 'UNDERFORECAST', 'UNBIASED', or 'N/A'")
    biasDescription: str = Field(..., description="Plain-English explanation of forecast bias direction")
    mapePercent: Optional[float] = Field(None, description="Mean Absolute Percentage Error for actuals >= threshold")
    mapeSampleCount: int = Field(0, description="Sample size of intervals meeting MAPE threshold")
    mapePolicyDescription: str = Field(..., description="Documentation of zero/near-zero handling policy")
    p95AbsErrorMw: Optional[float] = Field(None, description="95th percentile absolute error in MW")
    totalActualMwh: Optional[float] = Field(None, description="Total actual energy in MWh (sum(MW * 0.5h))")
    totalForecastMwh: Optional[float] = Field(None, description="Total forecast energy in MWh (sum(MW * 0.5h))")
    overforecastCount: int = Field(0, description="Number of intervals with e_t > 0")
    underforecastCount: int = Field(0, description="Number of intervals with e_t < 0")
    exactMatchCount: int = Field(0, description="Number of intervals with e_t == 0")
    totalEvaluatedIntervals: int = Field(..., description="Number of valid aligned pairs evaluated")
    expectedIntervals: int = Field(..., description="Total expected settlement intervals for period")
    coveragePercent: float = Field(..., description="Coverage percentage: (evaluated / expected) * 100")


class DailyErrorSummary(BaseModel):
    date: str = Field(..., description="Date (YYYY-MM-DD)")
    evaluatedIntervals: int = Field(...)
    expectedIntervals: int = Field(...)
    maeMw: Optional[float] = Field(None)
    rmseMw: Optional[float] = Field(None)
    meanErrorMw: Optional[float] = Field(None)
    biasDirection: str = Field(...)
    totalActualMwh: Optional[float] = Field(None)
    totalForecastMwh: Optional[float] = Field(None)


class ForecastHistoryItem(BaseModel):
    publishTime: datetime = Field(..., description="Publication timestamp of this forecast version (UTC)")
    publishTimeLocal: str = Field(..., description="Publication time formatted in UK local time")
    generationMw: float = Field(..., description="Forecast wind generation in MW")
    isEligible: bool = Field(..., description="True if publishTime <= decision cutoff")
    isSelected: bool = Field(..., description="True if this version was chosen for day-ahead decision")
    decisionCutoff: datetime = Field(..., description="Decision cutoff timestamp used (UTC)")
    deliveryStartTime: datetime = Field(..., description="Delivery interval start time (UTC)")
    settlementPeriod: int = Field(..., description="Settlement period number")
    actualGenerationMw: Optional[float] = Field(None, description="Actual outturn for this interval if available")
    forecastErrorMw: Optional[float] = Field(None, description="Forecast error for this version (Forecast - Actual)")


class ForecastHistoryResponse(BaseModel):
    deliveryDate: str
    settlementPeriod: int
    intervalStartTime: datetime
    intervalStartTimeLocal: str
    decisionCutoff: datetime
    decisionCutoffLocal: str
    actualGenerationMw: Optional[float] = None
    selectedForecastGenerationMw: Optional[float] = None
    selectedForecastErrorMw: Optional[float] = None
    versions: List[ForecastHistoryItem]
    selectionReason: str


class DataQualityInfo(BaseModel):
    dataSourceActuals: str = "Elexon BMRS FUELHH (fuelType=WIND)"
    dataSourceForecasts: str = "Elexon BMRS WINDFOR"
    selectedDateRange: str
    decisionCutoffSetting: str
    timezone: str = "Europe/London (UK Local Time)"
    lastRetrievalTime: datetime
    dataSourceMode: str = Field(..., description="'live_api', 'cached', or 'offline_fixture'")
    expectedIntervals: int
    actualObservationsCount: int
    forecastObservationsCount: int
    matchedComparisonsCount: int
    missingActualsCount: int
    missingForecastsCount: int
    duplicateRecordsFiltered: int
    alignmentMethod: str
    notes: List[str]


class OverviewResponse(BaseModel):
    startDate: str
    endDate: str
    cutoffTime: str
    alignmentMethod: str
    metrics: MetricSummary
    dataQuality: DataQualityInfo


class GenerationSeriesResponse(BaseModel):
    startDate: str
    endDate: str
    intervals: List[AlignedInterval]
    expectedCount: int
    validCount: int


class ForecastErrorsResponse(BaseModel):
    startDate: str
    endDate: str
    metrics: MetricSummary
    dailySummaries: List[DailyErrorSummary]
    intervals: List[AlignedInterval]
    errorDistribution: List[dict]
