import React from 'react';
import { Wind, TrendingUp, TrendingDown, CheckCircle2, Activity, Zap } from 'lucide-react';
import { MetricSummary } from '../types';
import { formatMwh, formatMw, formatErrorMw, formatPercent } from '../utils/formatters';

interface KpiCardsProps {
  metrics: MetricSummary | null;
  loading: boolean;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ metrics, loading }) => {
  if (!metrics && !loading) return null;

  const biasBadge = () => {
    if (!metrics) return null;
    switch (metrics.biasDirection) {
      case 'OVERFORECAST':
        return (
          <span className="badge badge-overforecast">
            <TrendingUp size={12} /> Overforecast (+{(metrics.meanErrorMw || 0).toFixed(0)} MW)
          </span>
        );
      case 'UNDERFORECAST':
        return (
          <span className="badge badge-underforecast">
            <TrendingDown size={12} /> Underforecast ({(metrics.meanErrorMw || 0).toFixed(0)} MW)
          </span>
        );
      case 'UNBIASED':
        return (
          <span className="badge badge-unbiased">
            <CheckCircle2 size={12} /> Unbiased (~0 MW)
          </span>
        );
      default:
        return <span className="badge" style={{ background: '#374151', color: '#9CA3AF' }}>N/A</span>;
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
      gap: 16,
      marginBottom: 24
    }}>
      {/* 1. Total Actual Wind Generation */}
      <div className="glass-panel" style={{ padding: '18px 20px', borderLeft: '3px solid var(--color-actual)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Actual Generation
          </span>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: 6, borderRadius: 6 }}>
            <Wind size={16} color="var(--color-actual)" />
          </div>
        </div>
        <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 700, color: '#F9FAFB' }}>
          {loading ? '...' : formatMwh(metrics?.totalActualMwh)}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Aggregated energy (MWh) across {metrics?.totalEvaluatedIntervals || 0} valid periods
        </div>
      </div>

      {/* 2. Corresponding Forecast Generation */}
      <div className="glass-panel" style={{ padding: '18px 20px', borderLeft: '3px solid var(--color-forecast)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Day-Ahead Forecast
          </span>
          <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: 6, borderRadius: 6 }}>
            <Zap size={16} color="var(--color-forecast)" />
          </div>
        </div>
        <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 700, color: '#F9FAFB' }}>
          {loading ? '...' : formatMwh(metrics?.totalForecastMwh)}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Energy expected at purchasing cutoff
        </div>
      </div>

      {/* 3. Mean Absolute Error (MAE) */}
      <div className="glass-panel" style={{ padding: '18px 20px', borderLeft: '3px solid #38BDF8' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Mean Absolute Error (MAE)
          </span>
          <div style={{ background: 'rgba(56, 189, 248, 0.15)', padding: 6, borderRadius: 6 }}>
            <Activity size={16} color="#38BDF8" />
          </div>
        </div>
        <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 700, color: '#F9FAFB' }}>
          {loading ? '...' : formatMw(metrics?.maeMw)}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Average interval absolute divergence
        </div>
      </div>

      {/* 4. Root Mean Squared Error (RMSE) */}
      <div className="glass-panel" style={{ padding: '18px 20px', borderLeft: '3px solid #818CF8' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Root Mean Sq Error (RMSE)
          </span>
          <div style={{ background: 'rgba(129, 140, 248, 0.15)', padding: 6, borderRadius: 6 }}>
            <Activity size={16} color="#818CF8" />
          </div>
        </div>
        <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 700, color: '#F9FAFB' }}>
          {loading ? '...' : formatMw(metrics?.rmseMw)}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Penalizes large outlier forecast errors
        </div>
      </div>

      {/* 5. Mean Forecast Bias (ME) */}
      <div className="glass-panel" style={{ padding: '18px 20px', borderLeft: '3px solid #F43F5E' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Mean Forecast Bias
          </span>
          {biasBadge()}
        </div>
        <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 700, color: '#F9FAFB' }}>
          {loading ? '...' : formatErrorMw(metrics?.meanErrorMw)}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
          {metrics?.biasDescription.slice(0, 52)}...
        </div>
      </div>

      {/* 6. Sample Size & Coverage */}
      <div className="glass-panel" style={{ padding: '18px 20px', borderLeft: '3px solid #10B981' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Evaluated Coverage
          </span>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: 6, borderRadius: 6 }}>
            <CheckCircle2 size={16} color="#10B981" />
          </div>
        </div>
        <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 700, color: '#F9FAFB' }}>
          {loading ? '...' : `${metrics?.coveragePercent || 0}%`}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
          {metrics?.totalEvaluatedIntervals || 0} of {metrics?.expectedIntervals || 0} periods matched
        </div>
      </div>
    </div>
  );
};
