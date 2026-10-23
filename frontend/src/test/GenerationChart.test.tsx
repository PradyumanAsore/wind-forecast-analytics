import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GenerationChart } from '../components/GenerationChart';
import { AlignedInterval } from '../types';

describe('GenerationChart Component', () => {
  it('renders empty state when no observations exist', () => {
    const handleSelect = vi.fn();
    render(
      <GenerationChart
        intervals={[]}
        loading={false}
        onSelectInterval={handleSelect}
      />
    );

    expect(screen.getByText(/No generation observations available/i)).toBeDefined();
  });

  it('renders loading state when loading is true', () => {
    const handleSelect = vi.fn();
    render(
      <GenerationChart
        intervals={[]}
        loading={true}
        onSelectInterval={handleSelect}
      />
    );

    expect(screen.getByText(/Loading generation time series/i)).toBeDefined();
  });

  it('renders chart and legend with aligned intervals', () => {
    const handleSelect = vi.fn();
    const mockIntervals: AlignedInterval[] = [
      {
        deliveryDate: '2026-01-01',
        settlementPeriod: 1,
        startTime: '2026-01-01T00:00:00Z',
        startTimeLocal: '2026-01-01 00:00',
        actualGenerationMw: 8500.0,
        forecastGenerationMw: 8200.0,
        forecastPublishTime: '2025-12-31T10:00:00Z',
        forecastCutoffTime: '2025-12-31T11:00:00Z',
        errorMw: -300.0,
        absErrorMw: 300.0,
        percentageError: -3.5,
        hasActual: true,
        hasForecast: true,
        isValidComparison: true,
        status: 'valid',
        alignmentNote: 'Exact timestamp match'
      }
    ];

    render(
      <GenerationChart
        intervals={mockIntervals}
        loading={false}
        onSelectInterval={handleSelect}
      />
    );

    expect(screen.getByText(/Actual Outturn \(FUELHH\)/i)).toBeDefined();
    expect(screen.getByText(/Day-Ahead Forecast \(WINDFOR\)/i)).toBeDefined();
  });
});
