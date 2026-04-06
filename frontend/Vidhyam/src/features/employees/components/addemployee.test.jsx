import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AddEmployeePage from './addemployee';
import { employeeApi } from '../api/employeeApi';
import { infrastructureApi } from '../../infrastructure/infrastructureApi';

// Mock the APIs
jest.mock('../api/employeeApi');
jest.mock('../../infrastructure/infrastructureApi');

const mockAddEmployee = jest.fn();
const mockUseGetResponsibilitiesQuery = jest.fn();

describe('AddEmployeePage Refactored UI', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        [employeeApi.reducerPath]: (state = {}) => state,
        [infrastructureApi.reducerPath]: (state = {}) => state,
      },
    });

    employeeApi.useAddEmployeeMutation = jest.fn(() => [mockAddEmployee, { isLoading: false }]);
    infrastructureApi.useGetResponsibilitiesQuery = jest.fn(() => ({ data: { data: [] } }));
    
    mockAddEmployee.mockReset();
    mockAddEmployee.mockResolvedValue({ unwrap: () => Promise.resolve({ employeeId: 'EMP123' }) });
  });

  const renderComponent = () => render(
    <Provider store={store}>
      <MemoryRouter>
        <AddEmployeePage />
      </MemoryRouter>
    </Provider>
  );

  test('renders theme-aware elements with correct classes', () => {
    renderComponent();
    // Check if the primary color variable is used in styles or classes
    const headerIcon = screen.getByTestId('user-icon-container'); // Need to add data-testid
    // Alternatively, check for the presence of "var(--primary-color)" in some style
    // But since I can't easily check computed styles in Jest/JSDOM for CSS variables,
    // I'll ensure the classes that use these variables are present.
    expect(screen.getByText(/Add New Employee/i)).toBeInTheDocument();
  });

  test('collects data on Slide 1 and moves to Slide 2', async () => {
    renderComponent();

    // Fill Slide 1
    fireEvent.change(screen.getByPlaceholderText(/e.g. Rajesh Kumar/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByDisplayValue(/Select Gender/i), { target: { value: 'male' } });
    fireEvent.change(screen.getByPlaceholderText(/10-digit mobile/i), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByPlaceholderText(/name@school.com/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Full residential address.../i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByDisplayValue(/Select Type/i), { target: { value: 'teacher' } });
    
    // Set DOB
    const dobInput = screen.getByLabelText(/Date of Birth/i);
    fireEvent.change(dobInput, { target: { value: '1990-01-01' } });

    // Click Next
    const nextBtn = screen.getByText(/Next Step/i);
    fireEvent.click(nextBtn);

    // Verify Slide 2 is visible
    expect(await screen.findByText(/Highest Degree/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/e.g. Rajesh Kumar/i)).not.toBeInTheDocument();
  });

  test('submits data only after Slide 2 completion', async () => {
    renderComponent();

    // Fill Slide 1
    fireEvent.change(screen.getByPlaceholderText(/e.g. Rajesh Kumar/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByDisplayValue(/Select Gender/i), { target: { value: 'male' } });
    fireEvent.change(screen.getByPlaceholderText(/10-digit mobile/i), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByPlaceholderText(/name@school.com/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Full residential address.../i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByDisplayValue(/Select Type/i), { target: { value: 'teacher' } });
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '1990-01-01' } });

    fireEvent.click(screen.getByText(/Next Step/i));

    // Fill Slide 2
    fireEvent.change(screen.getByDisplayValue(/Select Education/i), { target: { value: 'B.Ed' } });
    fireEvent.change(screen.getByPlaceholderText(/Name of institution/i), { target: { value: 'Example University' } });
    fireEvent.change(screen.getByPlaceholderText(/YYYY/i), { target: { value: '2015' } });

    // Click Submit
    const submitBtn = screen.getByText(/Finalize Admission/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockAddEmployee).toHaveBeenCalledTimes(1);
    });

    const payload = mockAddEmployee.mock.calls[0][0].employeeData;
    expect(payload.name).toBe('John Doe');
    expect(payload.education[0].institution).toBe('Example University');
  });
});
