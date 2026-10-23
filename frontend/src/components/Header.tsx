import React from 'react';
import { Wind, Clock, ShieldCheck, Database, Zap } from 'lucide-react';
import { DataQualityInfo } from '../types';

interface HeaderProps {
  dataQuality: DataQualityInfo | null;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ dataQuality, loading }) => {
  const mode = dataQuality?.dataSourceMode || 'live_api';

  const getModeBadge = () => {
    switch (mode) {
      case 'live_api':
        return <span className="badge badge-live"><span className="pulse-indicator">●</span> Elexon BMRS Live</span>;
      case 'cached':
        return <span className="badge badge-cached">● Local Cache</span>;
      case 'offline_fixture':
        return <span className="badge badge-fixture">● Verified Historical Fixture</span>;
      default:
        return null;
    }
  };

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(11, 15, 25, 0.95)',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      padding: '16px 24px'
    }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        {/* Brand & Context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            background: 'linear-gradient(135deg, #06B6D4 0%, #10B981 100%)',
            padding: 10,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)'
          }}>
            <Wind size={22} color="#07090E" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#F9FAFB' }}>
                UK Wind Generation Forecast Analysis Platform
              </h1>
              <span style={{
                background: 'rgba(56, 189, 248, 0.1)',
                color: '#38BDF8',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
                letterSpacing: '0.04em'
              }}>
                DAY-AHEAD PILOT
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Wholesale Market Wind Uncertainty & Procurement Evaluation • Scope: January 2026
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(21, 28, 44, 0.6)',
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem'
          }}>
            <Clock size={14} color="#38BDF8" />
            <span style={{ color: 'var(--text-muted)' }}>Timezone:</span>
            <strong style={{ color: '#E5E7EB' }}>Europe/London (GMT)</strong>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(21, 28, 44, 0.6)',
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem'
          }}>
            <Database size={14} color="#10B981" />
            <span style={{ color: 'var(--text-muted)' }}>Data Mode:</span>
            {getModeBadge()}
          </div>
        </div>
      </div>
    </header>
  );
};
