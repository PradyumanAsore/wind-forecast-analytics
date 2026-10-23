import React from 'react';
import { Calendar, Filter, RefreshCw, SlidersHorizontal, Info } from 'lucide-react';

interface ControlsBarProps {
  startDate: string;
  endDate: string;
  cutoffTime: string;
  alignmentMethod: string;
  loading: boolean;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onCutoffTimeChange: (time: string) => void;
  onAlignmentMethodChange: (method: string) => void;
  onRefresh: () => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  startDate,
  endDate,
  cutoffTime,
  alignmentMethod,
  loading,
  onStartDateChange,
  onEndDateChange,
  onCutoffTimeChange,
  onAlignmentMethodChange,
  onRefresh
}) => {
  const presets = [
    { label: 'Jan 1 – 7', start: '2026-01-01', end: '2026-01-07' },
    { label: 'Jan 8 – 14', start: '2026-01-08', end: '2026-01-14' },
    { label: 'Jan 15 – 21', start: '2026-01-15', end: '2026-01-21' },
    { label: 'Jan 22 – 31', start: '2026-01-22', end: '2026-01-31' },
    { label: 'Full Jan 2026', start: '2026-01-01', end: '2026-01-31' },
  ];

  const isPresetActive = (start: string, end: string) => startDate === start && endDate === end;

  return (
    <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        {/* Left: Date Presets & Custom inputs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Calendar size={16} color="#38BDF8" />
            <span>Delivery Scope:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0B0F19', padding: 4, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            {presets.map((p) => {
              const active = isPresetActive(p.start, p.end);
              return (
                <button
                  key={p.label}
                  onClick={() => {
                    onStartDateChange(p.start);
                    onEndDateChange(p.end);
                  }}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    background: active ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    color: active ? '#38BDF8' : 'var(--text-muted)'
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="date"
              value={startDate}
              min="2026-01-01"
              max="2026-01-31"
              onChange={(e) => onStartDateChange(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '5px 8px' }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
            <input
              type="date"
              value={endDate}
              min="2026-01-01"
              max="2026-01-31"
              onChange={(e) => onEndDateChange(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '5px 8px' }}
            />
          </div>
        </div>

        {/* Right: Decision Cutoff & Alignment Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {/* Purchasing Cutoff */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Decision Cutoff (D-1):</span>
            <select
              value={cutoffTime}
              onChange={(e) => onCutoffTimeChange(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              title="UK Wholesale Day-Ahead auction order books close at 11:00 UK local time on D-1"
            >
              <option value="11:00">11:00 London (EPEX SPOT Auction)</option>
              <option value="12:00">12:00 London (Alternative Auction)</option>
              <option value="09:00">09:00 London (Early Morning Cutoff)</option>
              <option value="17:00">17:00 London (Late Day-Ahead Notification)</option>
            </select>
          </div>

          {/* Alignment Policy */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Alignment:</span>
            <select
              value={alignmentMethod}
              onChange={(e) => onAlignmentMethodChange(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              title="WINDFOR is published hourly. Hourly block maps HH:00 forecast to both half-hours."
            >
              <option value="hourly_block">Hourly Block (Recommended)</option>
              <option value="exact_timestamp">Exact Timestamp (:00 only)</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              padding: '7px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
            }}
          >
            <RefreshCw size={14} className={loading ? 'pulse-indicator' : ''} />
            <span>{loading ? 'Updating...' : 'Update'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
