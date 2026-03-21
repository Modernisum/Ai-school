import { createSlice } from '@reduxjs/toolkit';
import { DEFAULT_THEME } from '../../utils/theme';

const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem('theme');
    return saved ? JSON.parse(saved) : DEFAULT_THEME;
  } catch (e) {
    return DEFAULT_THEME;
  }
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    pollingInterval: parseInt(localStorage.getItem('pollingInterval')) || 10000,
    theme: getInitialTheme(),
  },
  reducers: {
    setPollingInterval: (state, action) => {
      state.pollingInterval = action.payload;
      localStorage.setItem('pollingInterval', action.payload);
    },
    setTheme: (state, action) => {
      state.theme = { ...state.theme, ...action.payload };
      localStorage.setItem('theme', JSON.stringify(state.theme));
    },
    resetTheme: (state) => {
      state.theme = DEFAULT_THEME;
      localStorage.setItem('theme', JSON.stringify(DEFAULT_THEME));
    }
  },
});

export const { setPollingInterval, setTheme, resetTheme } = settingsSlice.actions;
export default settingsSlice.reducer;

export const selectPollingInterval = (state) => state.settings.pollingInterval;
export const selectTheme = (state) => state.settings.theme;
