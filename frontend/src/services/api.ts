/**
 * Backend API service client for UK Wind Generation Forecast Analysis Platform.
 */
import {
  DataQualityInfo,
  ForecastErrorsResponse,
  ForecastHistoryResponse,
  GenerationSeriesResponse,
  HealthResponse,
  OverviewResponse
} from '../types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://wind-forecast-analytics-7lbt.vercel.app';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errorJson = await res.json();
      if (errorJson.detail) {
        errorDetail = errorJson.detail;
      } else if (errorJson.message) {
        errorDetail = errorJson.message;
      }
    } catch {
      // Fallback to text
    }
    throw new Error(errorDetail);
  }
  return res.json() as Promise<T>;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/health`);
  return handleResponse<HealthResponse>(res);
}

export async function fetchOverview(
  startDate: string,
  endDate: string,
  cutoffTime: string = '11:00',
  alignmentMethod: string = 'hourly_block'
): Promise<OverviewResponse> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    cutoff_time: cutoffTime,
    alignment_method: alignmentMethod
  });
  const res = await fetch(`${API_BASE_URL}/api/overview?${params.toString()}`);
  return handleResponse<OverviewResponse>(res);
}

export async function fetchGeneration(
  startDate: string,
  endDate: string,
  cutoffTime: string = '11:00',
  alignmentMethod: string = 'hourly_block'
): Promise<GenerationSeriesResponse> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    cutoff_time: cutoffTime,
    alignment_method: alignmentMethod
  });
  const res = await fetch(`${API_BASE_URL}/api/generation?${params.toString()}`);
  return handleResponse<GenerationSeriesResponse>(res);
}

export async function fetchForecastErrors(
  startDate: string,
  endDate: string,
  cutoffTime: string = '11:00',
  alignmentMethod: string = 'hourly_block'
): Promise<ForecastErrorsResponse> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    cutoff_time: cutoffTime,
    alignment_method: alignmentMethod
  });
  const res = await fetch(`${API_BASE_URL}/api/forecast-errors?${params.toString()}`);
  return handleResponse<ForecastErrorsResponse>(res);
}

export async function fetchForecastHistory(
  intervalTime: string,
  cutoffTime: string = '11:00',
  alignmentMethod: string = 'hourly_block'
): Promise<ForecastHistoryResponse> {
  const params = new URLSearchParams({
    interval_time: intervalTime,
    cutoff_time: cutoffTime,
    alignment_method: alignmentMethod
  });
  const res = await fetch(`${API_BASE_URL}/api/forecast-history?${params.toString()}`);
  return handleResponse<ForecastHistoryResponse>(res);
}

export async function fetchDataQuality(
  startDate: string,
  endDate: string,
  cutoffTime: string = '11:00',
  alignmentMethod: string = 'hourly_block'
): Promise<DataQualityInfo> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    cutoff_time: cutoffTime,
    alignment_method: alignmentMethod
  });
  const res = await fetch(`${API_BASE_URL}/api/data-quality?${params.toString()}`);
  return handleResponse<DataQualityInfo>(res);
}
