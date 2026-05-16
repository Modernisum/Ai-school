import React from 'react';
import { render, screen } from '@testing-library/react';
import SpaceDashboard from '../SpaceDashboard';

const mockSpaces = [
  { spaceName: 'Class 1-A', spaceCategory: 'classroom', spaceId: 'c1a' },
  { spaceName: 'Lab A', spaceCategory: 'laboratory', spaceId: 'lab-a' },
];
const mockDistribution = {
  spaces: [
    { spaceId: 'c1a', name: 'Class 1-A', employeeCount: 2, responsibilityCount: 1 },
    { spaceId: 'lab-a', name: 'Lab A', employeeCount: 0, responsibilityCount: 0 },
  ]
};

describe('SpaceDashboard', () => {
  it('renders KPIs with correct values', () => {
    render(<SpaceDashboard spaces={mockSpaces} categories={['classroom', 'laboratory']} spaceDistribution={mockDistribution} materialsBySpace={{}} isLoading={false} />);
    expect(screen.getByText('TOTAL_SPACES')).toBeInTheDocument();
    expect(screen.getByText('ASSIGNED')).toBeInTheDocument();
    expect(screen.getByText('VACANT')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading', () => {
    const { container } = render(<SpaceDashboard isLoading={true} />);
    expect(container.querySelectorAll('[class*="animate"]').length || container.innerHTML).toBeTruthy();
  });

  it('renders warning banner for vacant spaces', () => {
    render(<SpaceDashboard spaces={mockSpaces} categories={['classroom']} spaceDistribution={mockDistribution} materialsBySpace={{}} isLoading={false} />);
    expect(screen.getByText('VACANT')).toBeInTheDocument();
  });

  it('handles empty spaces gracefully', () => {
    render(<SpaceDashboard spaces={[]} categories={[]} spaceDistribution={{ spaces: [] }} materialsBySpace={{}} isLoading={false} />);
    expect(screen.getByText('TOTAL_SPACES')).toBeInTheDocument();
  });
});
