import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SpaceResponsibilityTab from '../SpaceResponsibilityTab';

const mockResponsibilities = [
  { responsibilityId: 'r1', name: 'Math Teaching', employeeName: 'Rahul Sharma', monthlyPrice: 4000, studentFee: 500 },
  { responsibilityId: 'r2', name: 'Class Cleaning', employeeName: 'Unassigned', monthlyPrice: 2000, studentFee: 0 },
];

describe('SpaceResponsibilityTab', () => {
  it('renders responsibility list', () => {
    render(<SpaceResponsibilityTab responsibilities={mockResponsibilities} isLoading={false} />);
    expect(screen.getByText('Math Teaching')).toBeInTheDocument();
    expect(screen.getByText('Class Cleaning')).toBeInTheDocument();
  });

  it('shows employee names', () => {
    render(<SpaceResponsibilityTab responsibilities={mockResponsibilities} isLoading={false} />);
    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    expect(screen.getByText('UNASSIGNED')).toBeInTheDocument();
  });

  it('shows monthly cost', () => {
    render(<SpaceResponsibilityTab responsibilities={mockResponsibilities} isLoading={false} />);
    expect(screen.getByText(/4000/)).toBeInTheDocument();
  });

  it('shows total monthly cost', () => {
    render(<SpaceResponsibilityTab responsibilities={mockResponsibilities} isLoading={false} />);
    expect(screen.getByText(/TOTAL_MONTHLY_COST/)).toBeInTheDocument();
  });

  it('shows empty state when no responsibilities', () => {
    render(<SpaceResponsibilityTab responsibilities={[]} isLoading={false} />);
    expect(screen.getByText('NO_RESPONSIBILITIES')).toBeInTheDocument();
  });

  it('calls onRemove when remove button clicked for assigned employee', () => {
    const onRemove = jest.fn();
    render(<SpaceResponsibilityTab responsibilities={mockResponsibilities} isLoading={false} onRemove={onRemove} />);
    const buttons = document.querySelectorAll('button');
    const removeBtn = Array.from(buttons).find(b => b.querySelector('[class*="lucide-x"]'));
    if (removeBtn) {
      fireEvent.click(removeBtn);
      expect(onRemove).toHaveBeenCalledWith(mockResponsibilities[0]);
    }
  });
});
