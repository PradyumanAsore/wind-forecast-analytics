import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { KpiCards } from '../components/KpiCards';
import { MetricSummary } from '../types';

const mockMetrics: MetricSummary = {
  maeMw: 345.5,
  rmseMw: 420.2,
  meanErrorMw: 125.0,
  biasDirection: 'OVERFORECAST',
  biasDescription: 'Forecasts systematically overestimated wind generation by an average of 125.0 MW.',
  mapePercent: 8.5,
  mapeSampleCount: 90,
  mapePolicyDescription: 'Calculated on actuals >= 50 MW',
  p95AbsErrorMw: 680.0,
  totalActualMwh: 125000.0,
  totalForecastMwh: 131000.0,
  overforecastCount: 60,
  underforecastCount: 36,
  exactMatchCount: 0,
  totalEvaluatedIntervals: 96,
  expectedIntervals: 96,
  coveragePercent: 100.0
};

describe('KpiCards Component', () => {
  it('renders all 6 KPI cards with formatted values and units', () => {
    render(<KpiCards metrics={mockMetrics} loading={false} />);

    // Total actual generation MWh
    expect(screen.getByText('125,000 MWh')).toBeDefined();
    // Day-ahead forecast generation MWh
    expect(screen.getByText('131,000 MWh')).toBeDefined();
    // MAE MW
    expect(screen.getByText('346 MW')).toBeDefined();
    // RMSE MW
    expect(screen.getByText('420 MW')).toBeDefined();
    // Bias direction badge
    expect(screen.getByText(/Overforecast/i)).toBeDefined();
    // Coverage %
    expect(screen.getByText('100%')).toBeDefined();
  });

  it('renders loading indicators when loading is true', () => {
    render(<KpiCards metrics={null} loading={true} />);
    const loadingDots = screen.getAllByText('...');
    expect(loadingDots.length).toBeGreaterThan(0);
  });
});
