import React from 'react';
import { DataQualityInfo } from '../types';
import { Database, ShieldCheck, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

interface DataQualitySectionProps {
  dataQuality: DataQualityInfo | null;
  loading: boolean;
}

export const DataQualitySection: React.FC<DataQualitySectionProps> = ({ dataQuality, loading }) => {
  if (loading || !dataQuality) return null;

  return (
    <div className="glass-panel" style={{ padding: '24px 28px', marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.15)', padding: 8, borderRadius: 8 }}>
            <Database size={18} color="#38BDF8" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F9FAFB' }}>
              Data Provenance & Quality Audit
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Source verification, interval reconciliation, and governance logs
            </p>
          </div>
        </div>

        <div>
          <span className={`badge ${dataQuality.dataSourceMode === 'live_api' ? 'badge-live' : dataQuality.dataSourceMode === 'cached' ? 'badge-cached' : 'badge-fixture'}`}>
            Data Mode: {dataQuality.dataSourceMode.toUpperCase().replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Grid of Audit Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 20
      }}>
        <div style={{ background: '#111827', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Source Datasets
          </span>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E5E7EB', marginTop: 4 }}>
            FUELHH (Actuals) & WINDFOR (Forecasts)
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 2 }}>
            Official Elexon BMRS streams
          </div>
        </div>

        <div style={{ background: '#111827', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Decision Cutoff Setting
          </span>
          <div className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38BDF8', marginTop: 4 }}>
            {dataQuality.decisionCutoffSetting}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 2 }}>
            {dataQuality.timezone}
          </div>
        </div>

        <div style={{ background: '#111827', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Expected vs Matched
          </span>
          <div className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F9FAFB', marginTop: 4 }}>
            {dataQuality.matchedComparisonsCount} / {dataQuality.expectedIntervals} intervals
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-actual)', marginTop: 2 }}>
            {((dataQuality.matchedComparisonsCount / Math.max(1, dataQuality.expectedIntervals)) * 100).toFixed(1)}% coverage
          </div>
        </div>

        <div style={{ background: '#111827', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Missing Observations
          </span>
          <div className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: dataQuality.missingActualsCount + dataQuality.missingForecastsCount > 0 ? '#FCA5A5' : '#34D399', marginTop: 4 }}>
            {dataQuality.missingActualsCount} actuals • {dataQuality.missingForecastsCount} forecasts
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 2 }}>
            {dataQuality.duplicateRecordsFiltered} duplicates filtered
          </div>
        </div>
      </div>

      {/* Audit Notes */}
      <div style={{ background: '#0B0F19', padding: '14px 18px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
        <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#E5E7EB', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={14} color="#38BDF8" /> Analytical Rigor & Governance Notes:
        </h4>
        <ul style={{ paddingLeft: 18, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {dataQuality.notes.map((note, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>{note}</li>
          ))}
          <li>
            Last data retrieval timestamp: <span className="mono">{dataQuality.lastRetrievalTime}</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
