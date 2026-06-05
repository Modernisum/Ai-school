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

  const mode = theme.mode || 'dark';
  root.setAttribute('data-theme', mode);
  root.style.setProperty('--primary-color', theme.primary);
  root.style.setProperty('--secondary-color', theme.secondary);
  root.style.setProperty('--accent-color', theme.accent);
  root.style.setProperty('--success-color', theme.success);
  root.style.setProperty('--warning-color', theme.warning || '#f59e0b');
  
  // Set premium ultra-dark backgrounds vs light theme settings
  if (mode === 'light') {
    root.style.setProperty('--bg-main', '#e2e8f0');
    root.style.setProperty('--bg-via', theme.backgroundVia || '#e2e8f0');
    root.style.setProperty('--bg-secondary', '#ffffff');
    root.style.setProperty('--bg-sidebar', '#ffffff');
    root.style.setProperty('--bg-topbar', 'rgba(226, 232, 240, 0.85)');
    root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.65)');
    root.style.setProperty('--card-bg-hover', 'rgba(255, 255, 255, 0.85)');
    root.style.setProperty('--glass-border', 'rgba(0, 0, 0, 0.055)');
    root.style.setProperty('--text-main', '#09090b');
    root.style.setProperty('--text-muted', '#71717a');
    root.style.setProperty('--panel-shadow', '0 4px 20px rgba(0, 0, 0, 0.02)');
    root.style.setProperty('--glass-blur', '20px');
    root.style.setProperty('--bg-glow-1', 'rgba(99, 102, 241, 0.02)');
    root.style.setProperty('--bg-glow-2', 'rgba(6, 182, 212, 0.01)');
    root.style.setProperty('--bg-glow-3', 'rgba(37, 99, 235, 0.01)');
  } else {
    // Ultra-dark premium SaaS (darkness-jadha)
    const baseBg = theme.backgroundVia && theme.backgroundVia !== '#0a1628' ? theme.backgroundVia : '#050507';
    root.style.setProperty('--bg-main', baseBg);
    root.style.setProperty('--bg-via', baseBg);
    root.style.setProperty('--bg-secondary', '#0b0c0e');
    root.style.setProperty('--bg-sidebar', '#09090b');
    root.style.setProperty('--bg-topbar', baseBg === '#000000' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(7, 8, 10, 0.8)');
    root.style.setProperty('--card-bg', 'rgba(15, 16, 20, 0.5)');
    root.style.setProperty('--card-bg-hover', 'rgba(22, 23, 28, 0.7)');
    root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.05)');
    root.style.setProperty('--text-main', '#fafafa');
    root.style.setProperty('--text-muted', '#a1a1aa');
    root.style.setProperty('--panel-shadow', '0 12px 40px rgba(0, 0, 0, 0.75)');
    root.style.setProperty('--glass-blur', '24px');
    root.style.setProperty('--bg-glow-1', 'rgba(255, 255, 255, 0.005)');
    root.style.setProperty('--bg-glow-2', 'rgba(255, 255, 255, 0.003)');
    root.style.setProperty('--bg-glow-3', 'rgba(255, 255, 255, 0.003)');
  }

  const pr = hexToRgb(theme.primary);
  root.style.setProperty('--primary-glow', `rgba(${pr}, 0.25)`);
  root.style.setProperty('--primary-glow-light', `rgba(${pr}, 0.08)`);
  root.style.setProperty('--primary-glow-dark', `rgba(${pr}, 0.4)`);
  root.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`);
  root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${theme.accent}, ${theme.warning})`);

  // Interactive gradient variables
  root.style.setProperty('--orb-1', `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(${pr}, 0.08), transparent)`);
  root.style.setProperty('--orb-2', `radial-gradient(ellipse 40% 40% at 80% 90%, rgba(6,182,212,0.04), transparent)`);
  root.style.setProperty('--orb-3', `radial-gradient(ellipse 50% 30% at 30% 100%, rgba(37,99,235,0.03), transparent)`);
  root.style.setProperty('--hover-glow', `0 0 20px rgba(${pr}, 0.08), 0 0 40px rgba(${pr}, 0.03)`);
  root.style.setProperty('--card-glow-hover', `0 8px 32px rgba(${pr}, 0.06)`);

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
