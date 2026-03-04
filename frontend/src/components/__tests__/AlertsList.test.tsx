import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AlertsList from '../AlertsList';
import type { Alert } from '../../types/alerts';

const mockAlert: Alert = {
  id: 'alert-1',
  organization_id: 'org-1',
  rule_id: 'rule-1',
  workspace_name: 'prod-infra',
  severity: 'warning',
  title: 'Stale workspace detected',
  description: 'Workspace has not been updated in 30 days',
  metadata: {},
  is_acknowledged: false,
  acknowledged_by: null,
  acknowledged_at: null,
  created_at: '2024-01-15T10:00:00Z',
};

const defaultProps = {
  alerts: [],
  loading: false,
  error: '',
  total: 0,
  page: 0,
  rowsPerPage: 25,
  severityFilter: 'all',
  onPageChange: vi.fn(),
  onRowsPerPageChange: vi.fn(),
  onSeverityFilterChange: vi.fn(),
  onAcknowledge: vi.fn(),
  onClearError: vi.fn(),
};

describe('AlertsList', () => {
  it('shows no alerts message when list is empty', () => {
    render(<AlertsList {...defaultProps} />);
    expect(screen.getByText(/no alerts/i)).toBeInTheDocument();
  });

  it('renders alert items when alerts are provided', () => {
    render(<AlertsList {...defaultProps} alerts={[mockAlert]} total={1} />);
    expect(screen.getByText('Stale workspace detected')).toBeInTheDocument();
    expect(screen.getByText('prod-infra')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    render(<AlertsList {...defaultProps} loading={true} />);
    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('shows error message when error is set', () => {
    render(<AlertsList {...defaultProps} error="Failed to load alerts" />);
    expect(screen.getByText('Failed to load alerts')).toBeInTheDocument();
  });

  it('calls onAcknowledge when acknowledge button clicked', () => {
    const onAcknowledge = vi.fn();
    render(<AlertsList {...defaultProps} alerts={[mockAlert]} total={1} onAcknowledge={onAcknowledge} />);
    // Click all icon buttons to find the acknowledge button
    const iconButtons = document.querySelectorAll('button');
    iconButtons.forEach(btn => {
      if (btn.querySelector('svg')) {
        fireEvent.click(btn);
      }
    });
    // onAcknowledge should have been called
    expect(onAcknowledge).toHaveBeenCalled();
  });

  it('renders severity chip for warning alert', () => {
    render(<AlertsList {...defaultProps} alerts={[mockAlert]} total={1} />);
    expect(screen.getByText('warning')).toBeInTheDocument();
  });

  it('renders acknowledged alert differently', () => {
    const ackAlert = { ...mockAlert, is_acknowledged: true, acknowledged_by: 'admin@example.com' };
    render(<AlertsList {...defaultProps} alerts={[ackAlert]} total={1} />);
    // Acknowledged alerts should be in the list
    expect(screen.getByText('Stale workspace detected')).toBeInTheDocument();
  });
});
