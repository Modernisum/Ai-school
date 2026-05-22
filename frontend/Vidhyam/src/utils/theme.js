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
  mode: 'light',
  primary: '#4338ca',
  secondary: '#6366f1',
  accent: '#0891b2',
  success: '#059669',
  warning: '#d97706',
  backgroundVia: '#eef2ff',
};

export const THEME_PRESETS = [
  {
    id: 'ocean-azure',
    name: 'Ocean Azure',
    mode: 'dark',
    colors: {
      primary: '#6366f1',
      secondary: '#4f46e5',
      accent: '#06b6d4',
      success: '#10b981',
      warning: '#f59e0b',
      backgroundVia: '#050507',
    },
  },
  {
    id: 'deep-navy',
    name: 'Deep Charcoal',
    mode: 'dark',
    colors: {
      primary: '#3f3f46',
      secondary: '#18181b',
      accent: '#a1a1aa',
      success: '#10b981',
      warning: '#f59e0b',
      backgroundVia: '#09090b',
    },
  },
  {
    id: 'sky-blue',
    name: 'Pure Black',
    mode: 'dark',
    colors: {
      primary: '#6366f1',
      secondary: '#a5b4fc',
      accent: '#e0e7ff',
      success: '#10b981',
      warning: '#f59e0b',
      backgroundVia: '#000000',
    },
  },
  {
    id: 'cobalt',
    name: 'Cobalt Night',
    mode: 'dark',
    colors: {
      primary: '#2563eb',
      secondary: '#4f46e5',
      accent: '#06b6d4',
      success: '#10b981',
      warning: '#f59e0b',
      backgroundVia: '#050608',
    },
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Purple',
    mode: 'dark',
    colors: {
      primary: '#4f46e5',
      secondary: '#818cf8',
      accent: '#c7d2fe',
      success: '#10b981',
      warning: '#f59e0b',
      backgroundVia: '#060509',
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
      backgroundVia: '#f4f5f7',
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
