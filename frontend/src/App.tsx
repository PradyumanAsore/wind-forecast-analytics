import React, { useEffect, useState, useCallback } from 'react';
import {
  AlignedInterval,
  DailyErrorSummary,
  DataQualityInfo,
  ErrorDistributionBin,
  MetricSummary
} from './types';
import { fetchForecastErrors, fetchGeneration, fetchOverview } from './services/api';
import { Header } from './components/Header';
import { ControlsBar } from './components/ControlsBar';
import { NoticeBanner } from './components/NoticeBanner';
import { KpiCards } from './components/KpiCards';
import { GenerationChart } from './components/GenerationChart';
import { ErrorAnalysisSection } from './components/ErrorAnalysisSection';
import { ForecastHistoryModal } from './components/ForecastHistoryModal';
import { DataQualitySection } from './components/DataQualitySection';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-01-07');
  const [cutoffTime, setCutoffTime] = useState<string>('11:00');
  const [alignmentMethod, setAlignmentMethod] = useState<string>('hourly_block');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<MetricSummary | null>(null);
  const [dataQuality, setDataQuality] = useState<DataQualityInfo | null>(null);
  const [intervals, setIntervals] = useState<AlignedInterval[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailyErrorSummary[]>([]);
  const [errorDistribution, setErrorDistribution] = useState<ErrorDistributionBin[]>([]);

  // Selected interval for Forecast Publication History modal inspection
  const [selectedInterval, setSelectedInterval] = useState<AlignedInterval | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Concurrently fetch Overview, Generation, and Errors
      const [overviewRes, genRes, errorsRes] = await Promise.all([
        fetchOverview(startDate, endDate, cutoffTime, alignmentMethod),
        fetchGeneration(startDate, endDate, cutoffTime, alignmentMethod),
        fetchForecastErrors(startDate, endDate, cutoffTime, alignmentMethod)
      ]);

      setMetrics(overviewRes.metrics);
      setDataQuality(overviewRes.dataQuality);
      setIntervals(genRes.intervals);
      setDailySummaries(errorsRes.dailySummaries);
      setErrorDistribution(errorsRes.errorDistribution);
    } catch (err: any) {
      console.error('Error fetching analytics data:', err);
      setError(err.message || 'Failed to communicate with energy analytics backend.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, cutoffTime, alignmentMethod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Header Navigation */}
      <Header dataQuality={dataQuality} loading={loading} />

      {/* Main Container */}
      <main style={{ maxWidth: 1440, width: '100%', margin: '0 auto', padding: '24px 24px', flex: 1 }}>
        {/* Trading Scope & Controls */}
        <ControlsBar
          startDate={startDate}
          endDate={endDate}
          cutoffTime={cutoffTime}
          alignmentMethod={alignmentMethod}
          loading={loading}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onCutoffTimeChange={setCutoffTime}
          onAlignmentMethodChange={setAlignmentMethod}
          onRefresh={loadData}
        />

        {/* Energy Market Decision Framework Banner */}
        <NoticeBanner />

        {/* Error Alert Display */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid #EF4444',
            borderRadius: 10,
            padding: '16px 20px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={20} color="#F87171" />
              <div>
                <strong style={{ color: '#FCA5A5', fontSize: '0.9rem' }}>Data Retrieval Notice: </strong>
                <span style={{ color: '#E5E7EB', fontSize: '0.85rem' }}>{error}</span>
              </div>
            </div>
            <button
              onClick={loadData}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#EF4444',
                color: '#FFFFFF',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {/* 2. Overview Dashboard: Key Performance Metrics */}
        <KpiCards metrics={metrics} loading={loading} />

        {/* 3. Forecast versus Actual Interactive Time Series */}
        <GenerationChart
          intervals={intervals}
          loading={loading}
          onSelectInterval={(it) => setSelectedInterval(it)}
        />

        {/* 4. Forecast Error Analysis & Distribution */}
        <ErrorAnalysisSection
          intervals={intervals}
          dailySummaries={dailySummaries}
          errorDistribution={errorDistribution}
          metrics={metrics}
          loading={loading}
        />

        {/* 5. Data Provenance & Governance Audit */}
        <DataQualitySection dataQuality={dataQuality} loading={loading} />

        {/* 6. Forecast Publication History Modal (on interval selection) */}
        {selectedInterval && (
          <ForecastHistoryModal
            interval={selectedInterval}
            cutoffTime={cutoffTime}
            alignmentMethod={alignmentMethod}
            onClose={() => setSelectedInterval(null)}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '20px 24px',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: 'var(--text-faint)',
        background: '#07090E'
      }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            UK Wind Generation Forecast Analysis Platform • Data Source: Elexon BMRS (FUELHH & WINDFOR)
          </div>
          <div style={{ color: 'var(--text-muted)' }}>
            Day-Ahead Wholesale Power Market Trading Evaluation • January 2026
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
