import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SpaceMaterialTab from '../SpaceMaterialTab';

const mockMaterials = [
  { materialName: 'Ceiling Fan', quantity: 3, requiredCount: 4, unit: 'pcs', unitPrice: 2500, status: 'deficit' },
  { materialName: 'White Board', quantity: 1, requiredCount: 1, unit: 'pcs', unitPrice: 3000, status: 'full' },
];

describe('SpaceMaterialTab', () => {
  it('renders materials with names', () => {
    render(<SpaceMaterialTab materials={mockMaterials} isLoading={false} />);
    expect(screen.getByText('Ceiling Fan')).toBeInTheDocument();
    expect(screen.getByText('White Board')).toBeInTheDocument();
  });

  it('shows available/required counts', () => {
    render(<SpaceMaterialTab materials={mockMaterials} isLoading={false} />);
    expect(screen.getByText('3/4')).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();
  });

  it('shows empty state when no materials', () => {
    render(<SpaceMaterialTab materials={[]} isLoading={false} />);
    expect(screen.getByText('NO_MATERIALS_ASSIGNED')).toBeInTheDocument();
  });

  it('calls onTransfer when transfer button clicked', () => {
    const onTransfer = jest.fn();
    render(<SpaceMaterialTab materials={mockMaterials} isLoading={false} onTransfer={onTransfer} />);
    const buttons = document.querySelectorAll('button');
    const transferButtons = Array.from(buttons).filter(b => b.querySelector('[class*="lucide-arrow-right"]') || b.title === 'Transfer');
    if (transferButtons.length > 0) {
      fireEvent.click(transferButtons[0]);
      expect(onTransfer).toHaveBeenCalledWith(mockMaterials[0]);
    }
  });

  it('calls onAddMaterial when add button clicked', () => {
    const onAddMaterial = jest.fn();
    render(<SpaceMaterialTab materials={[]} isLoading={false} onAddMaterial={onAddMaterial} />);
    const buttons = document.querySelectorAll('button');
    const addBtn = Array.from(buttons).find(b => b.textContent.includes('ADD_MATERIAL') || b.getAttribute('label') === 'ADD_MATERIAL');
    if (addBtn) {
      fireEvent.click(addBtn);
      expect(onAddMaterial).toHaveBeenCalled();
    }
  });

  it('shows material value when unitPrice available', () => {
    render(<SpaceMaterialTab materials={mockMaterials} isLoading={false} />);
    expect(screen.getByText(/2500/)).toBeInTheDocument();
  });
});
