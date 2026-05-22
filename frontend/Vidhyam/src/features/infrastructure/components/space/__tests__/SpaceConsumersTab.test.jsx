import React from 'react';
import { render, screen } from '@testing-library/react';
import SpaceConsumersTab from '../SpaceConsumersTab';

const mockStudents = [
  { studentId: 's1', name: 'Aryan Singh', class: '1', section: 'B', totalFees: 2500 },
  { studentId: 's2', name: 'Priya Patel', class: '1', section: 'B', totalFees: 2500 },
];

describe('SpaceConsumersTab', () => {
  it('renders student list', () => {
    render(<SpaceConsumersTab students={mockStudents} isLoading={false} />);
    expect(screen.getByText('Aryan Singh')).toBeInTheDocument();
    expect(screen.getByText('Priya Patel')).toBeInTheDocument();
  });

  it('shows total students count', () => {
    render(<SpaceConsumersTab students={mockStudents} isLoading={false} />);
    expect(screen.getByText('Total Students')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows total fee revenue', () => {
    render(<SpaceConsumersTab students={mockStudents} isLoading={false} />);
    expect(screen.getByText(/Fee Revenue/)).toBeInTheDocument();
    expect(screen.getByText(/5,000/)).toBeInTheDocument(); // 2500 * 2
  });

  it('shows empty state when no students', () => {
    render(<SpaceConsumersTab students={[]} isLoading={false} />);
    expect(screen.getByText('No consumers assigned')).toBeInTheDocument();
  });

  it('shows student fee per student', () => {
    render(<SpaceConsumersTab students={mockStudents} isLoading={false} />);
    const feeElements = screen.getAllByText(/2,500/);
    expect(feeElements.length).toBeGreaterThanOrEqual(2);
  });
});
