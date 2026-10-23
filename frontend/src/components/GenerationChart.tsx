import React, { useState, useRef } from 'react';
import { AlignedInterval } from '../types';
import { formatMw, formatMwh, formatErrorMw, formatPercent } from '../utils/formatters';
import { Eye, AlertTriangle } from 'lucide-react';

interface GenerationChartProps {
  intervals: AlignedInterval[];
  loading: boolean;
  onSelectInterval: (interval: AlignedInterval) => void;
}

export const GenerationChart: React.FC<GenerationChartProps> = ({
  intervals,
  loading,
  onSelectInterval
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: 40, textAlign: 'center', marginBottom: 24 }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading generation time series...</p>
      </div>
    );
  }

  if (!intervals || intervals.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: 40, textAlign: 'center', marginBottom: 24 }}>
        <p style={{ color: 'var(--text-muted)' }}>No generation observations available for this date range.</p>
      </div>
    );
  }

  // Chart dimensions
  const height = 360;
  const padding = { top: 30, right: 30, bottom: 45, left: 65 };

  // Calculate scales
  let maxGen = 1000;
  intervals.forEach((it) => {
    if (it.actualGenerationMw && it.actualGenerationMw > maxGen) maxGen = it.actualGenerationMw;
    if (it.forecastGenerationMw && it.forecastGenerationMw > maxGen) maxGen = it.forecastGenerationMw;
  });
  // Round maxGen up to next 2500 or 5000 MW
  const yMax = Math.ceil(maxGen / 2500) * 2500;
  const numPoints = intervals.length;

  const getX = (idx: number, width: number) => {
    const usableWidth = width - padding.left - padding.right;
    return padding.left + (idx / Math.max(1, numPoints - 1)) * usableWidth;
  };

  const getY = (val: number | null) => {
    if (val === null || isNaN(val)) return height - padding.bottom;
    const usableHeight = height - padding.top - padding.bottom;
    const clamped = Math.max(0, Math.min(yMax, val));
    return height - padding.bottom - (clamped / yMax) * usableHeight;
  };

  // Build SVG path strings
  const buildLinePath = (key: 'actualGenerationMw' | 'forecastGenerationMw', width: number) => {
    let path = '';
    let inSegment = false;
    intervals.forEach((it, idx) => {
      const val = it[key];
      if (val !== null && val !== undefined) {
        const x = getX(idx, width);
        const y = getY(val);
        if (!inSegment) {
          path += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
          inSegment = true;
        } else {
          path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        }
      } else {
        inSegment = false;
      }
    });
    return path;
  };

  // Build Area path for Actual
  const buildAreaPath = (width: number) => {
    let path = '';
    let startX = 0;
    let inSegment = false;
    const baseline = height - padding.bottom;

    intervals.forEach((it, idx) => {
      const val = it.actualGenerationMw;
      if (val !== null && val !== undefined) {
        const x = getX(idx, width);
        const y = getY(val);
        if (!inSegment) {
          path += `M ${x.toFixed(1)} ${baseline.toFixed(1)} L ${x.toFixed(1)} ${y.toFixed(1)}`;
          startX = x;
          inSegment = true;
        } else {
          path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        }
      } else if (inSegment) {
        const prevX = getX(idx - 1, width);
        path += ` L ${prevX.toFixed(1)} ${baseline.toFixed(1)} Z`;
        inSegment = false;
      }
    });
    if (inSegment) {
      const lastX = getX(numPoints - 1, width);
      path += ` L ${lastX.toFixed(1)} ${baseline.toFixed(1)} Z`;
    }
    return path;
  };

  // Grid steps (4 horizontal gridlines)
  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  // X ticks: pick interval labels (e.g., at 00:00, 06:00, 12:00, 18:00 or per day)
  const xTickIndices: number[] = [];
  const step = Math.max(1, Math.floor(numPoints / 8));
  for (let i = 0; i < numPoints; i += step) {
    xTickIndices.push(i);
  }
  if (!xTickIndices.includes(numPoints - 1)) {
    xTickIndices.push(numPoints - 1);
  }

  const activeInterval = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < numPoints ? intervals[hoverIndex] : null;

  return (
    <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: 24, position: 'relative' }}>
      {/* Title & Legend Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F3F4F6' }}>
            Wind Generation: Actual Outturn vs Day-Ahead Decision Forecast
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Half-hour settlement intervals (MW rate) • Click any point on the chart to inspect forecast publication versions
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 3, background: 'var(--color-actual)', borderRadius: 2 }} />
            <span style={{ color: '#E5E7EB', fontWeight: 600 }}>Actual Outturn (FUELHH)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 3, background: 'var(--color-forecast)', borderRadius: 2 }} />
            <span style={{ color: '#E5E7EB', fontWeight: 600 }}>Day-Ahead Forecast (WINDFOR)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, background: 'rgba(239, 68, 68, 0.25)', border: '1px dashed #EF4444', borderRadius: 2 }} />
            <span style={{ color: 'var(--text-muted)' }}>Missing Period</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div
        ref={containerRef}
        style={{ width: '100%', height, position: 'relative', overflow: 'hidden' }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg
          viewBox={`0 0 1000 ${height}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', display: 'block' }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const usableWidth = rect.width * (1 - (padding.left + padding.right) / 1000);
            const relativeX = (mouseX / rect.width) * 1000 - padding.left;
            const idx = Math.round((relativeX / (1000 - padding.left - padding.right)) * (numPoints - 1));
            if (idx >= 0 && idx < numPoints) {
              setHoverIndex(idx);
            }
          }}
          onClick={() => {
            if (activeInterval) {
              onSelectInterval(activeInterval);
            }
          }}
        >
          <defs>
            <linearGradient id="actualAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-actual)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-actual)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          {yTicks.map((tickVal) => {
            const y = getY(tickVal);
            return (
              <g key={tickVal}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={1000 - padding.right}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  fill="var(--text-faint)"
                  fontSize="11"
                  textAnchor="end"
                  className="mono"
                >
                  {tickVal >= 1000 ? `${(tickVal / 1000).toFixed(1)}k` : tickVal} MW
                </text>
              </g>
            );
          })}

          {/* Missing interval indicator bands */}
          {intervals.map((it, idx) => {
            if (!it.isValidComparison) {
              const x = getX(idx, 1000);
              const barWidth = Math.max(3, 1000 / numPoints);
              return (
                <rect
                  key={`missing-${idx}`}
                  x={x - barWidth / 2}
                  y={padding.top}
                  width={barWidth}
                  height={height - padding.top - padding.bottom}
                  fill="rgba(244, 63, 94, 0.08)"
                  stroke="rgba(244, 63, 94, 0.2)"
                  strokeWidth="0.5"
                />
              );
            }
            return null;
          })}

          {/* Actual Area */}
          <path d={buildAreaPath(1000)} fill="url(#actualAreaGrad)" />

          {/* Actual Line */}
          <path
            d={buildLinePath('actualGenerationMw', 1000)}
            fill="none"
            stroke="var(--color-actual)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Forecast Line */}
          <path
            d={buildLinePath('forecastGenerationMw', 1000)}
            fill="none"
            stroke="var(--color-forecast)"
            strokeWidth="2.2"
            strokeDasharray="5 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* X Axis Labels */}
          {xTickIndices.map((idx) => {
            const it = intervals[idx];
            if (!it) return null;
            const x = getX(idx, 1000);
            return (
              <g key={`xtick-${idx}`}>
                <line
                  x1={x}
                  y1={height - padding.bottom}
                  x2={x}
                  y2={height - padding.bottom + 5}
                  stroke="var(--border-subtle)"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 18}
                  fill="var(--text-muted)"
                  fontSize="10"
                  textAnchor="middle"
                  className="mono"
                >
                  {it.startTimeLocal.slice(5)}
                </text>
              </g>
            );
          })}

          {/* Hover Crosshair */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex, 1000)}
                y1={padding.top}
                x2={getX(hoverIndex, 1000)}
                y2={height - padding.bottom}
                stroke="#38BDF8"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              {/* Actual Marker Dot */}
              {intervals[hoverIndex]?.actualGenerationMw !== null && (
                <circle
                  cx={getX(hoverIndex, 1000)}
                  cy={getY(intervals[hoverIndex].actualGenerationMw)}
                  r="5"
                  fill="var(--color-actual)"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              )}
              {/* Forecast Marker Dot */}
              {intervals[hoverIndex]?.forecastGenerationMw !== null && (
                <circle
                  cx={getX(hoverIndex, 1000)}
                  cy={getY(intervals[hoverIndex].forecastGenerationMw)}
                  r="5"
                  fill="var(--color-forecast)"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )}
        </svg>

        {/* Floating Tooltip Card */}
        {activeInterval && (
          <div
            style={{
              position: 'absolute',
              top: 15,
              right: 15,
              background: 'rgba(15, 20, 32, 0.95)',
              border: '1px solid var(--border-accent)',
              borderRadius: 10,
              padding: '12px 16px',
              minWidth: 260,
              boxShadow: 'var(--shadow-card)',
              pointerEvents: 'none',
              zIndex: 30
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong style={{ fontSize: '0.85rem', color: '#F3F4F6' }}>
                SP {activeInterval.settlementPeriod} • {activeInterval.startTimeLocal}
              </strong>
              {activeInterval.isValidComparison ? (
                <span className="badge badge-unbiased" style={{ fontSize: '0.65rem' }}>Matched</span>
              ) : (
                <span className="badge badge-overforecast" style={{ fontSize: '0.65rem' }}>
                  {activeInterval.status.replace('_', ' ')}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Actual Wind:</span>
                <div className="mono" style={{ color: 'var(--color-actual)', fontWeight: 700 }}>
                  {formatMw(activeInterval.actualGenerationMw)}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>
                  {formatMwh(activeInterval.actualGenerationMw ? activeInterval.actualGenerationMw * 0.5 : null)}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>Day-Ahead Forecast:</span>
                <div className="mono" style={{ color: 'var(--color-forecast)', fontWeight: 700 }}>
                  {formatMw(activeInterval.forecastGenerationMw)}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>
                  {formatMwh(activeInterval.forecastGenerationMw ? activeInterval.forecastGenerationMw * 0.5 : null)}
                </div>
              </div>
            </div>

            {activeInterval.isValidComparison && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Forecast Error (e_t):</span>
                <span className="mono" style={{
                  fontWeight: 700,
                  color: (activeInterval.errorMw || 0) > 0 ? 'var(--color-overforecast)' : 'var(--color-underforecast)'
                }}>
                  {formatErrorMw(activeInterval.errorMw)} ({formatPercent(activeInterval.percentageError)})
                </span>
              </div>
            )}

            <div style={{ marginTop: 8, fontSize: '0.7rem', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Eye size={12} />
              <span>Click point to view forecast publication versions</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
