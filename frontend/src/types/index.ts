/**
 * TypeScript type definitions for UK Wind Generation Forecast Analysis Platform.
 */

export interface AlignedInterval {
  deliveryDate: string;
  settlementPeriod: number;
  startTime: string; // ISO string UTC
  startTimeLocal: string; // UK local time string (YYYY-MM-DD HH:MM)
  actualGenerationMw: number | null;
  forecastGenerationMw: number | null;
  forecastPublishTime: string | null;
  forecastCutoffTime: string;
  errorMw: number | null; // Forecast - Actual
  absErrorMw: number | null;
  percentageError: number | null;
  hasActual: boolean;
  hasForecast: boolean;
  isValidComparison: boolean;
  status: 'valid' | 'missing_forecast' | 'missing_actual' | 'missing_both';
  alignmentNote: string | null;
}

export interface MetricSummary {
  maeMw: number | null;
  rmseMw: number | null;
  meanErrorMw: number | null;
  biasDirection: 'OVERFORECAST' | 'UNDERFORECAST' | 'UNBIASED' | 'N/A';
  biasDescription: string;
  mapePercent: number | null;
  mapeSampleCount: number;
  mapePolicyDescription: string;
  p95AbsErrorMw: number | null;
  totalActualMwh: number | null;
  totalForecastMwh: number | null;
  overforecastCount: number;
  underforecastCount: number;
  exactMatchCount: number;
  totalEvaluatedIntervals: number;
  expectedIntervals: number;
  coveragePercent: number;
}

export interface DailyErrorSummary {
  date: string;
  evaluatedIntervals: number;
  expectedIntervals: number;
  maeMw: number | null;
  rmseMw: number | null;
  meanErrorMw: number | null;
  biasDirection: string;
  totalActualMwh: number | null;
  totalForecastMwh: number | null;
}

export interface ForecastHistoryItem {
  publishTime: string;
  publishTimeLocal: string;
  generationMw: number;
  isEligible: boolean;
  isSelected: boolean;
  decisionCutoff: string;
  deliveryStartTime: string;
  settlementPeriod: number;
  actualGenerationMw: number | null;
  forecastErrorMw: number | null;
}

export interface ForecastHistoryResponse {
  deliveryDate: string;
  settlementPeriod: number;
  intervalStartTime: string;
  intervalStartTimeLocal: string;
  decisionCutoff: string;
  decisionCutoffLocal: string;
  actualGenerationMw: number | null;
  selectedForecastGenerationMw: number | null;
  selectedForecastErrorMw: number | null;
  versions: ForecastHistoryItem[];
  selectionReason: string;
}

export interface DataQualityInfo {
  dataSourceActuals: string;
  dataSourceForecasts: string;
  selectedDateRange: string;
  decisionCutoffSetting: string;
  timezone: string;
  lastRetrievalTime: string;
  dataSourceMode: 'live_api' | 'cached' | 'offline_fixture';
  expectedIntervals: number;
  actualObservationsCount: number;
  forecastObservationsCount: number;
  matchedComparisonsCount: number;
  missingActualsCount: number;
  missingForecastsCount: number;
  duplicateRecordsFiltered: number;
  alignmentMethod: string;
  notes: string[];
}

export interface OverviewResponse {
  startDate: string;
  endDate: string;
  cutoffTime: string;
  alignmentMethod: string;
  metrics: MetricSummary;
  dataQuality: DataQualityInfo;
}

export interface GenerationSeriesResponse {
  startDate: string;
  endDate: string;
  intervals: AlignedInterval[];
  expectedCount: number;
  validCount: number;
}

export interface ErrorDistributionBin {
  binLabel: string;
  binMin: number;
  binMax: number;
  count: number;
}

export interface ForecastErrorsResponse {
  startDate: string;
  endDate: string;
  metrics: MetricSummary;
  dailySummaries: DailyErrorSummary[];
  intervals: AlignedInterval[];
  errorDistribution: ErrorDistributionBin[];
}

export interface HealthResponse {
  status: string;
  service: string;
  environment: string;
  timestampUtc: string;
  defaultDecisionCutoff: string;
  alignmentMethod: string;
  elexonBaseUrl: string;
  localCacheEnabled: boolean;
}
