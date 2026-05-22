import React from 'react';
import { render, screen } from '@testing-library/react';
import FinancialOverviewWidget from '../FinancialOverviewWidget';

const mockData = {
  totalMonthlySalaryCost: 12000,
  totalStudentFees: 25000,
  netRevenue: 13000,
  employeeCount: 3,
  studentCount: 45,
};

describe('FinancialOverviewWidget', () => {
  it('shows loading skeletons when isLoading', () => {
    const { container } = render(<FinancialOverviewWidget isLoading={true} />);
    const skeletons = container.querySelectorAll('[class*="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no data', () => {
    render(<FinancialOverviewWidget data={null} isLoading={false} />);
    expect(screen.getByText('No financial data available')).toBeInTheDocument();
  });

  it('renders salary cost', () => {
    render(<FinancialOverviewWidget data={mockData} isLoading={false} />);
    expect(screen.getByText(/12,000/)).toBeInTheDocument();
    expect(screen.getByText(/Salary Cost/)).toBeInTheDocument();
  });

  it('renders student fees', () => {
    render(<FinancialOverviewWidget data={mockData} isLoading={false} />);
    expect(screen.getByText(/25,000/)).toBeInTheDocument();
    expect(screen.getByText(/Student Fees/)).toBeInTheDocument();
  });

  it('renders net revenue as positive when profitable', () => {
    render(<FinancialOverviewWidget data={mockData} isLoading={false} />);
    expect(screen.getByText(/13,000/)).toBeInTheDocument();
    expect(screen.getByText(/Net Revenue/)).toBeInTheDocument();
  });

  it('renders net revenue as negative when unprofitable', () => {
    const lossData = { ...mockData, netRevenue: -5000 };
    render(<FinancialOverviewWidget data={lossData} isLoading={false} />);
    expect(screen.getByText(/-5,000/)).toBeInTheDocument();
  });

  it('renders staff to student ratio', () => {
    render(<FinancialOverviewWidget data={mockData} isLoading={false} />);
    expect(screen.getByText(/3 : 45/)).toBeInTheDocument();
  });
});
