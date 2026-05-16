import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CloneSpaceModal from '../CloneSpaceModal';

const mockSpaces = [
  { spaceId: 'c1a', spaceName: 'Class 1-A', spaceCategory: 'classroom' },
  { spaceId: 'lab-a', spaceName: 'Lab A', spaceCategory: 'laboratory' },
];

describe('CloneSpaceModal', () => {
  it('renders source space selector', () => {
    render(<CloneSpaceModal schoolId="test" spaces={mockSpaces} onClose={() => {}} onClone={() => {}} />);
    expect(screen.getByText('SOURCE_SPACE')).toBeInTheDocument();
    expect(screen.getByText('NEW_SPACE_NAME')).toBeInTheDocument();
  });

  it('renders CLONE button', () => {
    render(<CloneSpaceModal schoolId="test" spaces={mockSpaces} onClose={() => {}} onClone={() => {}} />);
    const buttons = document.querySelectorAll('button');
    const cloneBtn = Array.from(buttons).find(b => b.getAttribute('label') === 'CLONE');
    expect(cloneBtn).toBeTruthy();
  });

  it('renders CANCEL button', () => {
    render(<CloneSpaceModal schoolId="test" spaces={mockSpaces} onClose={() => {}} onClone={() => {}} />);
    const buttons = document.querySelectorAll('button');
    const cancelBtn = Array.from(buttons).find(b => b.getAttribute('label') === 'CANCEL');
    expect(cancelBtn).toBeTruthy();
  });

  it('calls onClose when cancel clicked', () => {
    const onClose = jest.fn();
    render(<CloneSpaceModal schoolId="test" spaces={mockSpaces} onClose={onClose} onClone={() => {}} />);
    const buttons = document.querySelectorAll('button');
    const cancelBtn = Array.from(buttons).find(b => b.getAttribute('label') === 'CANCEL');
    if (cancelBtn) fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows spaces in dropdown', () => {
    render(<CloneSpaceModal schoolId="test" spaces={mockSpaces} onClose={() => {}} onClone={() => {}} />);
    const select = document.querySelector('select');
    expect(select?.options.length).toBe(3);
  });
});
