/**
 * Enhanced Theme System — smooth transitions, persistence, system preference detection.
 */
import { DEFAULT_THEME, THEME_PRESETS } from './theme.js';

const THEME_STORAGE_KEY = 'vidhyam-theme-v3';

export const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return { ...DEFAULT_THEME, mode: prefersDark ? 'dark' : 'light' };
};

export const saveTheme = (theme) => {
  try { localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme)); } catch { /* ignore */ }
};

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '59, 130, 246';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
};

export const applyThemeEnhanced = (theme) => {
  const root = document.documentElement;
  root.classList.add('theme-transitioning');

  root.setAttribute('data-theme', theme.mode || 'dark');
  root.style.setProperty('--primary-color', theme.primary);
  root.style.setProperty('--secondary-color', theme.secondary);
  root.style.setProperty('--accent-color', theme.accent);
  root.style.setProperty('--success-color', theme.success);
  root.style.setProperty('--warning-color', theme.warning || '#f59e0b');
  root.style.setProperty('--bg-via', theme.backgroundVia);

  const pr = hexToRgb(theme.primary);
  root.style.setProperty('--primary-glow', `rgba(${pr}, 0.35)`);
  root.style.setProperty('--primary-glow-light', `rgba(${pr}, 0.12)`);
  root.style.setProperty('--primary-glow-dark', `rgba(${pr}, 0.5)`);
  root.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`);
  root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${theme.accent}, ${theme.warning})`);

  // Interactive gradient variables
  root.style.setProperty('--orb-1', `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(${pr}, 0.15), transparent)`);
  root.style.setProperty('--orb-2', `radial-gradient(ellipse 40% 40% at 80% 90%, rgba(6,182,212,0.08), transparent)`);
  root.style.setProperty('--orb-3', `radial-gradient(ellipse 50% 30% at 30% 100%, rgba(37,99,235,0.06), transparent)`);
  root.style.setProperty('--hover-glow', `0 0 20px rgba(${pr}, 0.15), 0 0 40px rgba(${pr}, 0.05)`);
  root.style.setProperty('--card-glow-hover', `0 8px 32px rgba(${pr}, 0.12)`);

  setTimeout(() => root.classList.remove('theme-transitioning'), 400);
  saveTheme(theme);
};

export const toggleThemeMode = (currentTheme) => {
  const newMode = currentTheme.mode === 'dark' ? 'light' : 'dark';
  const preset = THEME_PRESETS.find(p => p.mode === newMode) || THEME_PRESETS[5];
  const newTheme = {
    ...currentTheme,
    mode: newMode,
    primary: preset.colors.primary,
    secondary: preset.colors.secondary,
    accent: preset.colors.accent,
    success: preset.colors.success,
    warning: preset.colors.warning,
    backgroundVia: preset.colors.backgroundVia,
  };
  applyThemeEnhanced(newTheme);
  return newTheme;
};

export const changeThemePreset = (presetId) => {
  const preset = THEME_PRESETS.find(p => p.id === presetId) || THEME_PRESETS[0];
  const newTheme = {
    mode: preset.mode,
    primary: preset.colors.primary,
    secondary: preset.colors.secondary,
    accent: preset.colors.accent,
    success: preset.colors.success,
    warning: preset.colors.warning,
    backgroundVia: preset.colors.backgroundVia,
  };
  applyThemeEnhanced(newTheme);
  return newTheme;
};

export const initializeTheme = () => {
  applyThemeEnhanced(getInitialTheme());
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e) => {
    if (!localStorage.getItem(THEME_STORAGE_KEY)) {
      applyThemeEnhanced({ ...getInitialTheme(), mode: e.matches ? 'dark' : 'light' });
    }
  };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
};

export const getThemeOptions = () =>
  THEME_PRESETS.map(p => ({
    id: p.id,
    name: p.name,
    mode: p.mode,
    colors: p.colors,
    previewStyle: {
      background: p.mode === 'dark'
        ? `linear-gradient(135deg, ${p.colors.backgroundVia}, #0f172a)`
        : `linear-gradient(135deg, ${p.colors.backgroundVia}, #ffffff)`,
      borderColor: p.colors.primary,
    },
  }));

export const getCurrentThemeInfo = () => {
  const root = document.documentElement;
  const mode = root.getAttribute('data-theme') || 'dark';
  return {
    mode,
    primary: getComputedStyle(root).getPropertyValue('--primary-color').trim(),
    isDark: mode === 'dark',
    isLight: mode === 'light',
  };
};
