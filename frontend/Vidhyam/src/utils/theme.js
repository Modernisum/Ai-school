export const COLORS = {
  primary: {
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    start: '#3b82f6',
    end: '#2563eb',
  },
  success: {
    gradient: 'linear-gradient(135deg, #10b981, #34d399)',
    start: '#10b981',
    end: '#34d399',
  },
  warning: {
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    start: '#f59e0b',
    end: '#fbbf24',
  },
  danger: {
    gradient: 'linear-gradient(135deg, #ef4444, #f87171)',
    start: '#ef4444',
    end: '#f87171',
  },
};

export const DEFAULT_THEME = {
  mode: 'dark',
  primary: '#3b82f6',
  secondary: '#2563eb',
  accent: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  backgroundVia: '#0a1628',
};

export const THEME_PRESETS = [
  {
    id: 'ocean-azure',
    name: 'Ocean Azure',
    mode: 'dark',
    colors: {
      primary: '#3b82f6',
      secondary: '#2563eb',
      accent: '#06b6d4',
      success: '#10b981',
      warning: '#f59e0b',
      backgroundVia: '#0a1628',
    },
  },
  {
    id: 'deep-navy',
    name: 'Deep Navy',
    mode: 'dark',
    colors: {
      primary: '#1d4ed8',
      secondary: '#3b82f6',
      accent: '#0891b2',
      success: '#10b981',
      warning: '#f59e0b',
      backgroundVia: '#070d1f',
    },
  },
  {
    id: 'sky-blue',
    name: 'Sky Blue',
    mode: 'dark',
    colors: {
      primary: '#0ea5e9',
      secondary: '#38bdf8',
      accent: '#22d3ee',
      success: '#10b981',
      warning: '#f59e0b',
      backgroundVia: '#0c1929',
    },
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    mode: 'dark',
    colors: {
      primary: '#2563eb',
      secondary: '#4f46e5',
      accent: '#06b6d4',
      success: '#10b981',
      warning: '#f59e0b',
      backgroundVia: '#0a0f1f',
    },
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    mode: 'dark',
    colors: {
      primary: '#4338ca',
      secondary: '#3b82f6',
      accent: '#0e7490',
      success: '#10b981',
      warning: '#f59e0b',
      backgroundVia: '#080c1a',
    },
  },
  {
    id: 'azure-light',
    name: 'Azure Light',
    mode: 'light',
    colors: {
      primary: '#2563eb',
      secondary: '#3b82f6',
      accent: '#06b6d4',
      success: '#059669',
      warning: '#d97706',
      backgroundVia: '#e0e7ff',
    },
  },
  {
    id: 'sky-light',
    name: 'Sky Light',
    mode: 'light',
    colors: {
      primary: '#0ea5e9',
      secondary: '#38bdf8',
      accent: '#0284c7',
      success: '#059669',
      warning: '#d97706',
      backgroundVia: '#f0f9ff',
    },
  },
  {
    id: 'ice-blue',
    name: 'Ice Blue',
    mode: 'light',
    colors: {
      primary: '#4338ca',
      secondary: '#6366f1',
      accent: '#0891b2',
      success: '#059669',
      warning: '#d97706',
      backgroundVia: '#eef2ff',
    },
  },
];

export const applyTheme = (theme) => {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme.mode || 'dark');
  root.style.setProperty('--primary-color', theme.primary);
  root.style.setProperty('--secondary-color', theme.secondary);
  root.style.setProperty('--accent-color', theme.accent);
  root.style.setProperty('--success-color', theme.success);
  root.style.setProperty('--warning-color', theme.warning || '#f59e0b');
  root.style.setProperty('--bg-via', theme.backgroundVia);
  root.style.setProperty('--primary-glow', `${theme.primary}66`);
};
