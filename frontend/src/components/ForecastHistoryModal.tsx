import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { AlignedInterval, ForecastHistoryResponse } from '../types';
import { fetchForecastHistory } from '../services/api';
import { formatMw, formatErrorMw } from '../utils/formatters';

interface ForecastHistoryModalProps {
  interval: AlignedInterval | null;
  cutoffTime: string;
  alignmentMethod: string;
  onClose: () => void;
}

export const ForecastHistoryModal: React.FC<ForecastHistoryModalProps> = ({
  interval,
  cutoffTime,
  alignmentMethod,
  onClose
}) => {
  const [data, setData] = useState<ForecastHistoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!interval) return;
    setLoading(true);
    setError(null);
    fetchForecastHistory(interval.startTime, cutoffTime, alignmentMethod)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch publication history');
        setLoading(false);
      });
  }, [interval, cutoffTime, alignmentMethod]);

  if (!interval) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(3, 7, 18, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: 20
    }}>
      <div style={{
        background: '#0F1420',
        border: '1px solid var(--border-accent)',
        borderRadius: 14,
        width: '100%',
        maxWidth: 880,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(21, 28, 44, 0.6)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F9FAFB' }}>
                Forecast Publication Audit History
              </h3>
              <span className="badge badge-cached" style={{ fontSize: '0.7rem' }}>
                SP {interval.settlementPeriod}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Delivery Interval: <strong style={{ color: '#F3F4F6' }}>{interval.startTimeLocal}</strong> ({interval.startTime})
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#151C2C',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: 8,
              color: 'var(--text-muted)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              Loading publication versions from Elexon WINDFOR...
            </div>
          )}

          {error && (
            <div style={{ padding: 16, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: 8, color: '#FCA5A5' }}>
              {error}
            </div>
          )}

          {data && (
            <>
              {/* Decision Gate Closure Cutoff Banner */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: 10,
                padding: '14px 18px',
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ShieldCheck size={20} color="#38BDF8" />
                    <div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Purchasing Decision Cutoff (D-1):
                      </div>
                      <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38BDF8' }}>
                        {data.decisionCutoffLocal} UK Local Time
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Actual Outturn:</div>
                      <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-actual)' }}>
                        {formatMw(data.actualGenerationMw)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chosen Forecast:</div>
                      <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-forecast)' }}>
                        {formatMw(data.selectedForecastGenerationMw)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Final Error ($e_t$):</div>
                      <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: (data.selectedForecastErrorMw || 0) > 0 ? 'var(--color-overforecast)' : 'var(--color-underforecast)' }}>
                        {formatErrorMw(data.selectedForecastErrorMw)}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: '#CBD5E1' }}>
                  <strong>Decision Rationale: </strong> {data.selectionReason}
                </div>
              </div>

              {/* Version History Table */}
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F3F4F6', marginBottom: 12 }}>
                Published Forecast Versions ({data.versions.length} publications recorded)
              </h4>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 10px' }}>#</th>
                    <th style={{ padding: '8px 10px' }}>Publication Time (UK)</th>
                    <th style={{ padding: '8px 10px' }}>Forecast (MW)</th>
                    <th style={{ padding: '8px 10px' }}>Cutoff Eligibility</th>
                    <th style={{ padding: '8px 10px' }}>Selection Status</th>
                    <th style={{ padding: '8px 10px' }}>Error ($e_t$)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.versions.map((ver, idx) => {
                    const rowBg = ver.isSelected
                      ? 'rgba(245, 158, 11, 0.08)'
                      : !ver.isEligible
                      ? 'rgba(255, 255, 255, 0.01)'
                      : 'transparent';

                    return (
                      <tr
                        key={idx}
                        style={{
                          background: rowBg,
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
                        }}
                      >
                        <td className="mono" style={{ padding: '10px 10px', color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td className="mono" style={{ padding: '10px 10px', color: '#F3F4F6' }}>
                          {ver.publishTimeLocal}
                        </td>
                        <td className="mono" style={{ padding: '10px 10px', fontWeight: 700, color: ver.isSelected ? 'var(--color-forecast)' : '#E5E7EB' }}>
                          {formatMw(ver.generationMw)}
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          {ver.isEligible ? (
                            <span className="badge badge-unbiased" style={{ fontSize: '0.68rem' }}>
                              Eligible (Pre-cutoff)
                            </span>
                          ) : (
                            <span className="badge badge-overforecast" style={{ fontSize: '0.68rem', opacity: 0.7 }}>
                              Ineligible (Post-cutoff)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          {ver.isSelected ? (
                            <span style={{
                              background: 'rgba(245, 158, 11, 0.2)',
                              color: '#F59E0B',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontWeight: 700,
                              fontSize: '0.7rem'
                            }}>
                              ★ CHOSEN FOR TRADING
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-faint)' }}>—</span>
                          )}
                        </td>
                        <td className="mono" style={{ padding: '10px 10px', color: (ver.forecastErrorMw || 0) > 0 ? 'var(--color-overforecast)' : 'var(--color-underforecast)' }}>
                          {formatErrorMw(ver.forecastErrorMw)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ marginTop: 16, fontSize: '0.72rem', color: 'var(--text-faint)', lineHeight: 1.45 }}>
                * Look-ahead bias prevention: Forecast versions published after the day-ahead purchasing decision cutoff are shown above strictly for retrospective verification. They were not available at auction gate closure and are strictly excluded from decision-time forecast error calculations.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
