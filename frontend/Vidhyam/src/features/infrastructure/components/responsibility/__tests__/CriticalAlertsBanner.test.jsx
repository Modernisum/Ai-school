import React from 'react';
import { render, screen } from '@testing-library/react';
import CriticalAlertsBanner from '../CriticalAlertsBanner';

const mockAlerts = [
  { spaceId: 's1', spaceName: 'Class 1-A', responsibilityId: 'r1', responsibilityName: 'Math Teaching', severity: 'critical' },
  { spaceId: 's2', spaceName: 'Lab B', responsibilityId: 'r2', responsibilityName: 'Science Lab', severity: 'critical' },
];

describe('CriticalAlertsBanner', () => {
  it('does not render when alerts array is empty', () => {
    const { container } = render(<CriticalAlertsBanner alerts={[]} isLoading={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when alerts is null', () => {
    const { container } = render(<CriticalAlertsBanner alerts={null} isLoading={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders alert items with space and responsibility names', () => {
    render(<CriticalAlertsBanner alerts={mockAlerts} isLoading={false} />);
    expect(screen.getByText(/Class 1-A/)).toBeInTheDocument();
    expect(screen.getByText(/Math Teaching/)).toBeInTheDocument();
    expect(screen.getByText(/Lab B/)).toBeInTheDocument();
    expect(screen.getByText(/Science Lab/)).toBeInTheDocument();
  });

  it('shows CRITICAL label for severity', () => {
    render(<CriticalAlertsBanner alerts={mockAlerts} isLoading={false} />);
    const criticalElements = screen.getAllByText(/CRITICAL/);
    expect(criticalElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows ASSIGN button when onNavigate provided', () => {
    const onNavigate = jest.fn();
    render(<CriticalAlertsBanner alerts={mockAlerts.slice(0, 1)} isLoading={false} onNavigate={onNavigate} />);
    expect(screen.getByText('ASSIGN')).toBeInTheDocument();
  });

  it('shows dismiss button when onDismiss provided', () => {
    const onDismiss = jest.fn();
    render(<CriticalAlertsBanner alerts={mockAlerts.slice(0, 1)} isLoading={false} onDismiss={onDismiss} />);
    const buttons = document.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('limits visible alerts to 3', () => {
    const manyAlerts = [
      ...mockAlerts,
      { spaceId: 's3', spaceName: 'Class 2-A', responsibilityId: 'r3', responsibilityName: 'English', severity: 'critical' },
      { spaceId: 's4', spaceName: 'Class 3-A', responsibilityId: 'r4', responsibilityName: 'History', severity: 'critical' },
    ];
    render(<CriticalAlertsBanner alerts={manyAlerts} isLoading={false} />);
    expect(screen.getByText(/\+1 more critical alerts/)).toBeInTheDocument();
  });
});
