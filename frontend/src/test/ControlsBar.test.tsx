import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ControlsBar } from '../components/ControlsBar';

describe('ControlsBar Component', () => {
  it('renders January 2026 presets and triggers date changes', () => {
    const handleStartChange = vi.fn();
    const handleEndChange = vi.fn();
    const handleCutoffChange = vi.fn();
    const handleAlignmentChange = vi.fn();
    const handleRefresh = vi.fn();

    render(
      <ControlsBar
        startDate="2026-01-01"
        endDate="2026-01-07"
        cutoffTime="11:00"
        alignmentMethod="hourly_block"
        loading={false}
        onStartDateChange={handleStartChange}
        onEndDateChange={handleEndChange}
        onCutoffTimeChange={handleCutoffChange}
        onAlignmentMethodChange={handleAlignmentChange}
        onRefresh={handleRefresh}
      />
    );

    // Verify preset buttons exist
    const week2Button = screen.getByText('Jan 8 – 14');
    expect(week2Button).toBeDefined();

    // Click preset
    fireEvent.click(week2Button);
    expect(handleStartChange).toHaveBeenCalledWith('2026-01-08');
    expect(handleEndChange).toHaveBeenCalledWith('2026-01-14');

    // Click Update / Refresh
    const updateBtn = screen.getByText('Update');
    fireEvent.click(updateBtn);
    expect(handleRefresh).toHaveBeenCalled();
  });
});
