import React from 'react';
import { AlignedInterval, DailyErrorSummary, ErrorDistributionBin, MetricSummary } from '../types';
import { formatMw, formatErrorMw, formatMwh } from '../utils/formatters';
import { BarChart3, TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';

interface ErrorAnalysisSectionProps {
  intervals: AlignedInterval[];
  dailySummaries: DailyErrorSummary[];
  errorDistribution: ErrorDistributionBin[];
  metrics: MetricSummary | null;
  loading: boolean;
}

export const ErrorAnalysisSection: React.FC<ErrorAnalysisSectionProps> = ({
  intervals,
  dailySummaries,
  errorDistribution,
  metrics,
  loading
}) => {
  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: 30, textAlign: 'center', marginBottom: 24 }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading forecast error analytics...</p>
      </div>
    );
  }

  // Find max absolute error for scaling the error time-series bar chart
  let maxAbsError = 500;
  intervals.forEach((it) => {
    if (it.absErrorMw && it.absErrorMw > maxAbsError) {
      maxAbsError = it.absErrorMw;
    }
  });
  const yErrorMax = Math.ceil(maxAbsError / 500) * 500;
  const chartHeight = 180;
  const numPoints = intervals.length;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* 1. Error Time Series & Distribution Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 20, marginBottom: 20 }}>
        {/* Error Time Series (e_t with 0 baseline) */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F3F4F6' }}>
                Forecast Error Time Series (e_t = Forecast - Actual)
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Positive = Overforecast • Negative = Underforecast
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-overforecast)' }}>
                ● Overforecast ({metrics?.overforecastCount || 0})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-underforecast)' }}>
                ● Underforecast ({metrics?.underforecastCount || 0})
              </span>
            </div>
          </div>

          {/* Error Bars SVG */}
          <div style={{ width: '100%', height: chartHeight, position: 'relative' }}>
            <svg viewBox={`0 0 1000 ${chartHeight}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
              {/* Zero baseline */}
              <line x1="0" y1={chartHeight / 2} x2="1000" y2={chartHeight / 2} stroke="#4B5563" strokeWidth="1.2" />

              {/* Reference Gridlines */}
              <line x1="0" y1={chartHeight * 0.1} x2="1000" y2={chartHeight * 0.1} stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <line x1="0" y1={chartHeight * 0.9} x2="1000" y2={chartHeight * 0.9} stroke="var(--border-subtle)" strokeDasharray="3 3" />

              {/* Error Bars */}
              {intervals.map((it, idx) => {
                if (it.errorMw === null) return null;
                const x = (idx / Math.max(1, numPoints - 1)) * 1000;
                const barWidth = Math.max(2, 1000 / numPoints - 1);
                const halfH = chartHeight / 2;
                const normalizedH = Math.min(1, Math.abs(it.errorMw) / yErrorMax) * (halfH - 10);
                const isOver = it.errorMw > 0;
                const y = isOver ? halfH - normalizedH : halfH;

                return (
                  <rect
                    key={idx}
                    x={x - barWidth / 2}
                    y={y}
                    width={barWidth}
                    height={normalizedH}
                    fill={isOver ? 'var(--color-overforecast)' : 'var(--color-underforecast)'}
                    opacity="0.85"
                  >
                    <title>{`${it.startTimeLocal}: ${formatErrorMw(it.errorMw)}`}</title>
                  </rect>
                );
              })}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 4 }}>
              <span>+{(yErrorMax).toLocaleString()} MW</span>
              <span className="mono">0 MW Reference Baseline</span>
              <span>-{(yErrorMax).toLocaleString()} MW</span>
            </div>
          </div>
        </div>

        {/* Error Distribution Histogram */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F3F4F6' }}>
              Forecast Error Distribution
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Frequency histogram of half-hour interval errors (Sample: {metrics?.totalEvaluatedIntervals || 0} valid intervals)
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: chartHeight, overflowY: 'auto', paddingRight: 4 }}>
            {errorDistribution && errorDistribution.length > 0 ? (
              errorDistribution.map((bin) => {
                const maxCount = Math.max(...errorDistribution.map((b) => b.count), 1);
                const pct = (bin.count / maxCount) * 100;
                const isOver = bin.binMin >= 0;
                return (
                  <div key={bin.binLabel} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.75rem' }}>
                    <span className="mono" style={{ width: 130, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                      {bin.binLabel}
                    </span>
                    <div style={{ flex: 1, background: '#111827', height: 16, borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: isOver ? 'var(--color-overforecast)' : 'var(--color-underforecast)',
                          borderRadius: 4,
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                    <span className="mono" style={{ width: 36, color: '#F3F4F6', fontWeight: 600 }}>
                      {bin.count}
                    </span>
                  </div>
                );
              })
            ) : (
              <p style={{ color: 'var(--text-faint)', fontSize: '0.8rem', textAlign: 'center', margin: 'auto' }}>
                Insufficient data points to build distribution.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Plain English Market Implication Guide */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: 20, background: 'rgba(15, 20, 32, 0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <HelpCircle size={18} color="#38BDF8" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: '0.8rem', color: '#CBD5E1', lineHeight: 1.5 }}>
            <strong style={{ color: '#F9FAFB' }}>Energy Market Significance of Forecast Error Direction:</strong>
            <ul style={{ marginTop: 6, paddingLeft: 18 }}>
              <li>
                <strong style={{ color: 'var(--color-overforecast)' }}>Overforecast (e_t &gt; 0): </strong>
                Actual wind is lower than anticipated. In day-ahead procurement, the utility under-purchases electricity, leaving a short physical position that must be covered at potentially expensive spot/cash-out prices or balancing actions.
              </li>
              <li style={{ marginTop: 4 }}>
                <strong style={{ color: 'var(--color-underforecast)' }}>Underforecast (e_t &lt; 0): </strong>
                Actual wind generation exceeds the forecast. The utility over-purchases day-ahead power, creating a long position where excess energy must be spilled or sold back into the balancing mechanism, often at discounted cash-out prices.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3. Daily Error Breakdown Table */}
      <div className="glass-panel" style={{ padding: '20px 24px', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F3F4F6', marginBottom: 12 }}>
          Daily Forecast Performance Breakdown
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px 12px' }}>Delivery Date</th>
              <th style={{ padding: '10px 12px' }}>Valid Periods</th>
              <th style={{ padding: '10px 12px' }}>MAE</th>
              <th style={{ padding: '10px 12px' }}>RMSE</th>
              <th style={{ padding: '10px 12px' }}>Mean Bias</th>
              <th style={{ padding: '10px 12px' }}>Direction</th>
              <th style={{ padding: '10px 12px' }}>Actual Energy</th>
              <th style={{ padding: '10px 12px' }}>Forecast Energy</th>
            </tr>
          </thead>
          <tbody>
            {dailySummaries.map((day) => (
              <tr key={day.date} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td className="mono" style={{ padding: '10px 12px', fontWeight: 600, color: '#F3F4F6' }}>
                  {day.date}
                </td>
                <td className="mono" style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                  {day.evaluatedIntervals} / {day.expectedIntervals}
                </td>
                <td className="mono" style={{ padding: '10px 12px', color: '#F3F4F6' }}>
                  {formatMw(day.maeMw)}
                </td>
                <td className="mono" style={{ padding: '10px 12px', color: '#F3F4F6' }}>
                  {formatMw(day.rmseMw)}
                </td>
                <td className="mono" style={{ padding: '10px 12px', fontWeight: 600, color: (day.meanErrorMw || 0) > 0 ? 'var(--color-overforecast)' : 'var(--color-underforecast)' }}>
                  {formatErrorMw(day.meanErrorMw)}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span className={`badge ${day.biasDirection === 'OVERFORECAST' ? 'badge-overforecast' : (day.biasDirection === 'UNDERFORECAST' ? 'badge-underforecast' : 'badge-unbiased')}`}>
                    {day.biasDirection}
                  </span>
                </td>
                <td className="mono" style={{ padding: '10px 12px', color: 'var(--color-actual)' }}>
                  {formatMwh(day.totalActualMwh)}
                </td>
                <td className="mono" style={{ padding: '10px 12px', color: 'var(--color-forecast)' }}>
                  {formatMwh(day.totalForecastMwh)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
