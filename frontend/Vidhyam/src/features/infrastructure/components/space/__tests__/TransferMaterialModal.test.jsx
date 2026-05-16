import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TransferMaterialModal from '../TransferMaterialModal';

const mockSpaces = [
  { spaceId: 'c1a', spaceName: 'Class 1-A' },
  { spaceId: 'c1b', spaceName: 'Class 1-B' },
];

const mockMaterial = { materialName: 'Ceiling Fan', quantity: 3, unit: 'pcs', unitPrice: 2500 };

describe('TransferMaterialModal', () => {
  it('renders source space and material info', () => {
    render(<TransferMaterialModal schoolId="test" spaces={mockSpaces} material={mockMaterial} fromSpace={mockSpaces[0]} onClose={() => {}} onTransfer={() => {}} />);
    expect(screen.getByText('FROM')).toBeInTheDocument();
    expect(screen.getByText('Class 1-A')).toBeInTheDocument();
    expect(screen.getByText('Ceiling Fan')).toBeInTheDocument();
  });

  it('renders target space selector', () => {
    render(<TransferMaterialModal schoolId="test" spaces={mockSpaces} material={mockMaterial} fromSpace={mockSpaces[0]} onClose={() => {}} onTransfer={() => {}} />);
    expect(screen.getByText('TARGET_SPACE')).toBeInTheDocument();
  });

  it('renders quantity input with max value', () => {
    render(<TransferMaterialModal schoolId="test" spaces={mockSpaces} material={mockMaterial} fromSpace={mockSpaces[0]} onClose={() => {}} onTransfer={() => {}} />);
    const input = document.querySelector('input[type="number"]');
    expect(input).toBeInTheDocument();
    expect(input.getAttribute('max')).toBe('3');
  });

  it('renders TRANSFER and CANCEL buttons', () => {
    render(<TransferMaterialModal schoolId="test" spaces={mockSpaces} material={mockMaterial} fromSpace={mockSpaces[0]} onClose={() => {}} onTransfer={() => {}} />);
    const buttons = document.querySelectorAll('button');
    expect(Array.from(buttons).some(b => b.getAttribute('label') === 'TRANSFER')).toBe(true);
    expect(Array.from(buttons).some(b => b.getAttribute('label') === 'CANCEL')).toBe(true);
  });

  it('calls onClose when cancel clicked', () => {
    const onClose = jest.fn();
    render(<TransferMaterialModal schoolId="test" spaces={mockSpaces} material={mockMaterial} fromSpace={mockSpaces[0]} onClose={onClose} onTransfer={() => {}} />);
    const buttons = document.querySelectorAll('button');
    const cancelBtn = Array.from(buttons).find(b => b.getAttribute('label') === 'CANCEL');
    if (cancelBtn) fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
