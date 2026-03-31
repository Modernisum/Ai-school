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

const getInitialScreenScale = () => {
  try {
    const saved = localStorage.getItem('screenScale');
    return saved ? parseFloat(saved) : 1.0;
  } catch (e) {
    return 1.0;
  }
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    pollingInterval: parseInt(localStorage.getItem('pollingInterval')) || 10000,
    theme: getInitialTheme(),
    screenScale: getInitialScreenScale(),
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
    },
    setScreenScale: (state, action) => {
      const scale = Math.min(Math.max(parseFloat(action.payload), 0.5), 2.0);
      state.screenScale = scale;
      localStorage.setItem('screenScale', scale.toString());
    },
    resetScreenScale: (state) => {
      state.screenScale = 1.0;
      localStorage.setItem('screenScale', '1.0');
    }
  },
});

export const { setPollingInterval, setTheme, resetTheme, setScreenScale, resetScreenScale } = settingsSlice.actions;
export default settingsSlice.reducer;

export const selectPollingInterval = (state) => state.settings.pollingInterval;
export const selectTheme = (state) => state.settings.theme;
export const selectScreenScale = (state) => state.settings.screenScale;
