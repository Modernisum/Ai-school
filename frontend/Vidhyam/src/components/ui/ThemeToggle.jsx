import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Palette, Check } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleTheme, selectTheme } from '../../features/settings/settingsSlice';
import { getThemeOptions, changeThemePreset, getCurrentThemeInfo } from '../../utils/themeEnhanced';
import { Button, Card } from './DesignSystem';

export const ThemeToggleButton = () => {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [currentThemeInfo, setCurrentThemeInfo] = useState(getCurrentThemeInfo());
  const themeOptions = getThemeOptions();

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
    setIsThemeMenuOpen(false);
  };

  const handleThemePresetChange = (presetId) => {
    changeThemePreset(presetId);
    setIsThemeMenuOpen(false);
  };

  useEffect(() => {
    const updateThemeInfo = () => {
      setCurrentThemeInfo(getCurrentThemeInfo());
    };

    // Update theme info when theme changes
    const observer = new MutationObserver(updateThemeInfo);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['data-theme', 'style'] 
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
        className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--card-bg)] border border-[var(--glass-border)] hover:bg-[var(--primary-glow)] transition-all group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="Theme settings"
        aria-expanded={isThemeMenuOpen}
        aria-controls="theme-menu"
      >
        {currentThemeInfo.isDark ? (
          <Moon size={18} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
        ) : (
          <Sun size={18} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
        )}
      </button>

      <AnimatePresence>
        {isThemeMenuOpen && (
          <motion.div
            id="theme-menu"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-72 bg-[var(--bg-secondary)] backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl shadow-2xl overflow-hidden z-50"
            role="dialog"
            aria-label="Theme settings"
          >
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[var(--text-main)]">Theme Settings</h3>
                <button
                  onClick={handleToggleTheme}
                  className="p-2 rounded-lg bg-[var(--card-bg)] border border-[var(--glass-border)] hover:bg-[var(--primary-glow)] transition-colors"
                  aria-label={`Switch to ${currentThemeInfo.isDark ? 'light' : 'dark'} theme`}
                >
                  {currentThemeInfo.isDark ? (
                    <Sun size={16} className="text-yellow-500" />
                  ) : (
                    <Moon size={16} className="text-blue-400" />
                  )}
                </button>
              </div>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Current: {currentThemeInfo.isDark ? 'Dark' : 'Light'} mode
              </p>
            </div>

            <div className="p-4">
              <h4 className="text-sm font-semibold text-[var(--text-main)] mb-3 flex items-center gap-2">
                <Palette size={14} />
                Color Presets
              </h4>
              
              <div className="grid grid-cols-2 gap-2">
                {themeOptions.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleThemePresetChange(preset.id)}
                    className={`theme-preview-card p-3 rounded-xl border text-left transition-all ${
                      preset.mode === currentThemeInfo.mode && 
                      preset.colors.primary === currentThemeInfo.primary
                        ? 'active border-[var(--primary-color)]'
                        : 'border-white/10'
                    }`}
                    style={preset.previewStyle}
                    aria-label={`Select ${preset.name} theme`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-main)]">
                          {preset.name}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">
                          {preset.mode === 'dark' ? 'Dark' : 'Light'}
                        </div>
                      </div>
                      {preset.mode === currentThemeInfo.mode && 
                       preset.colors.primary === currentThemeInfo.primary && (
                        <Check size={14} className="text-[var(--primary-color)]" />
                      )}
                    </div>
                    
                    {/* Color indicators */}
                    <div className="flex gap-1 mt-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.colors.primary }}
                        title="Primary color"
                      />
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.colors.secondary }}
                        title="Secondary color"
                      />
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.colors.accent }}
                        title="Accent color"
                      />
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Current primary color:</span>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: currentThemeInfo.primary }}
                    />
                    <span className="font-mono text-xs">{currentThemeInfo.primary}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-[var(--card-bg)]">
              <button
                onClick={() => setIsThemeMenuOpen(false)}
                className="w-full py-2 text-center text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Simple theme toggle for TopBar
export const SimpleThemeToggle = () => {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);

  return (
    <button
      onClick={() => dispatch(toggleTheme())}
      className="p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--glass-border)] hover:bg-[var(--primary-glow)] transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      aria-label={`Switch to ${theme.mode === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme.mode === 'dark' ? (
        <Sun size={18} className="text-yellow-300" />
      ) : (
        <Moon size={18} className="text-slate-700" />
      )}
    </button>
  );
};

export default ThemeToggleButton;