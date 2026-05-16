import React from 'react';
import { render, screen } from '@testing-library/react';
import SpaceAlertBanner from '../SpaceAlertBanner';

describe('SpaceAlertBanner', () => {
  it('does not render when no alerts', () => {
    const { container } = render(<SpaceAlertBanner alerts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders critical alert banner', () => {
    const alerts = [{ severity: 'critical', message: 'Test critical alert' }];
    render(<SpaceAlertBanner alerts={alerts} />);
    expect(screen.getByText('CRITICAL ALERTS')).toBeInTheDocument();
    expect(screen.getByText('Test critical alert')).toBeInTheDocument();
  });

  it('renders warning alert banner', () => {
    const alerts = [{ severity: 'warning', message: 'Test warning alert' }];
    render(<SpaceAlertBanner alerts={alerts} />);
    expect(screen.getByText('WARNINGS')).toBeInTheDocument();
    expect(screen.getByText('Test warning alert')).toBeInTheDocument();
  });

  it('renders multiple alerts', () => {
    const alerts = [
      { severity: 'critical', message: 'Alert 1' },
      { severity: 'warning', message: 'Alert 2' },
    ];
    render(<SpaceAlertBanner alerts={alerts} />);
    expect(screen.getByText('CRITICAL ALERTS')).toBeInTheDocument();
    expect(screen.getByText('WARNINGS')).toBeInTheDocument();
    expect(screen.getByText('Alert 1')).toBeInTheDocument();
    expect(screen.getByText('Alert 2')).toBeInTheDocument();
  });

  it('shows dismiss button when onDismiss provided', () => {
    const alerts = [{ severity: 'critical', message: 'Test' }];
    render(<SpaceAlertBanner alerts={alerts} onDismiss={() => {}} />);
    const dismissBtn = document.querySelector('button');
    expect(dismissBtn).toBeInTheDocument();
  });
});
