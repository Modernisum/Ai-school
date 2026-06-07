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
    const saved = localStorage.getItem('screenScale_v2');
    return saved ? parseFloat(saved) : 0.9;
  } catch (e) {
    return 0.9;
  }
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    pollingInterval: parseInt(localStorage.getItem('pollingInterval')) || 10000,
    theme: getInitialTheme(),
    screenScale: getInitialScreenScale(),
    isOnline: true,
  },
  reducers: {
    setPollingInterval: (state, action) => {
      state.pollingInterval = action.payload;
      localStorage.setItem('pollingInterval', action.payload);
    },
    setOnline: (state, action) => {
      state.isOnline = action.payload;
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
      localStorage.setItem('screenScale_v2', scale.toString());
    },
    toggleTheme: (state) => {
      state.theme = {
        ...state.theme,
        mode: state.theme.mode === 'dark' ? 'light' : 'dark'
      };
      localStorage.setItem('theme', JSON.stringify(state.theme));
    },
    resetScreenScale: (state) => {
      state.screenScale = 0.9;
      localStorage.setItem('screenScale_v2', '0.9');
    }
  },
});

export const { setPollingInterval, setOnline, setTheme, resetTheme, setScreenScale, resetScreenScale, toggleTheme } = settingsSlice.actions;
export default settingsSlice.reducer;

export const selectPollingInterval = (state) => state.settings.isOnline ? state.settings.pollingInterval : 0;
export const selectIsOnline = (state) => state.settings.isOnline;
export const selectTheme = (state) => state.settings.theme;
export const selectScreenScale = (state) => state.settings.screenScale;
