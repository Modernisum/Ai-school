export const COLORS = {
    primary: {
        gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
        start: '#667eea',
        end: '#764ba2',
    },
    success: {
        gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)',
        start: '#4facfe',
        end: '#00f2fe',
    },
    warning: {
        gradient: 'linear-gradient(135deg, #fa709a, #fee140)',
        start: '#fa709a',
        end: '#fee140',
    },
    danger: {
        gradient: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
        start: '#ff6b6b',
        end: '#ee5a24',
    },
    background: {
        main: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        light: '#f9f9f9',
        white: '#ffffff',
    },
    border: {
        light: '#e0e0e0',
        focus: 'rgba(102, 126, 234, 0.1)'
    },
    text: {
        dark: '#333333',
        medium: '#444444',
        light: '#666666',
        white: '#ffffff',
        primary: '#667eea'
    }
};

export const DEFAULT_THEME = {
    primary: '#6366f1', // indigo-500
    secondary: '#8b5cf6', // violet-600
    accent: '#f43f5e', // rose-500
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    backgroundVia: '#1e1b4b', // indigo-950
};

export const THEME_PRESETS = [
    {
        id: 'vidhyam-default',
        name: 'Vidhyam Default',
        colors: {
            primary: '#6366f1',
            secondary: '#8b5cf6',
            accent: '#f43f5e',
            success: '#10b981',
            warning: '#f59e0b',
            backgroundVia: '#1e1b4b',
        }
    },
    {
        id: 'ocean-dark',
        name: 'Ocean Dark',
        colors: {
            primary: '#0ea5e9',
            secondary: '#3b82f6',
            accent: '#06b6d4',
            success: '#10b981',
            warning: '#f59e0b',
            backgroundVia: '#082f49',
        }
    },
    {
        id: 'forest-glow',
        name: 'Forest Glow',
        colors: {
            primary: '#10b981',
            secondary: '#14b8a6',
            accent: '#84cc16',
            success: '#22c55e',
            warning: '#eab308',
            backgroundVia: '#064e3b',
        }
    },
    {
        id: 'sunset-horizon',
        name: 'Sunset Horizon',
        colors: {
            primary: '#f97316',
            secondary: '#ef4444',
            accent: '#f43f5e',
            success: '#10b981',
            warning: '#eab308',
            backgroundVia: '#7c2d12',
        }
    },
    {
        id: 'midnight-purple',
        name: 'Midnight Purple',
        colors: {
            primary: '#d946ef',
            secondary: '#a855f7',
            accent: '#ec4899',
            success: '#10b981',
            warning: '#f59e0b',
            backgroundVia: '#4a044e',
        }
    },
    {
        id: 'slate-monochrome',
        name: 'Slate Monochrome',
        colors: {
            primary: '#64748b',
            secondary: '#475569',
            accent: '#94a3b8',
            success: '#10b981',
            warning: '#f59e0b',
            backgroundVia: '#0f172a',
        }
    }
];

export const applyTheme = (theme) => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', theme.primary);
    root.style.setProperty('--secondary-color', theme.secondary);
    root.style.setProperty('--accent-color', theme.accent);
    root.style.setProperty('--success-color', theme.success);
    root.style.setProperty('--warning-color', theme.warning || '#f59e0b');
    root.style.setProperty('--bg-via', theme.backgroundVia);
    
    // Derived values
    root.style.setProperty('--primary-glow', `${theme.primary}66`); // 40% opacity
};
