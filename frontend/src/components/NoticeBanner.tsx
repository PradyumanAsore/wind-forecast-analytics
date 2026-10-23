import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

export const NoticeBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.6)',
      border: '1px solid rgba(56, 189, 248, 0.25)',
      borderRadius: 10,
      padding: '12px 16px',
      marginBottom: 20,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Info size={18} color="#38BDF8" style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: '0.82rem', color: '#CBD5E1', lineHeight: 1.45 }}>
          <strong style={{ color: '#F1F5F9' }}>Wholesale Procurement Decision Framework: </strong>
          The wind generation forecasts displayed represent the information available at the Day-Ahead purchasing decision cutoff (D-1 at gate closure).
          Wind forecast variance (e_t = Forecast - Actual) is one key driver of net residual procurement.
          Total procurement volume and financial exposure additionally depend on customer demand, portfolio position, and market imbalance cash-out prices.
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'transparent', border: 'none', color: '#94A3B8', padding: 2 }}
        title="Dismiss notice"
      >
        <X size={16} />
      </button>
    </div>
  );
};
