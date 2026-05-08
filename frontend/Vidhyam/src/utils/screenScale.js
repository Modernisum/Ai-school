/**
 * Screen Scale Utility Functions
 * Provides functions to manage screen scale across the application with persistence
 */

export const DENSITY_PRESETS = {
  ULTRA: 0.75,
  DENSE: 0.85,
  STANDARD: 1.0,
  RELAXED: 1.15
};

const STORAGE_KEY = 'vidhyam_ui_scale';

/**
 * Initialize font scale based on stored preference or screen width
 */
export const initializeScreenScale = () => {
  try {
    const calculateAutoScale = () => {
      const screenWidth = window.innerWidth;
      if (screenWidth < 640) return 0.85; 
      if (screenWidth < 768) return 0.9;  
      if (screenWidth < 1024) return 0.95; 
      if (screenWidth < 1280) return 1.0;  
      if (screenWidth < 1536) return 1.05; 
      return 1.1; 
    };

    const applyScale = () => {
      const savedScale = localStorage.getItem(STORAGE_KEY);
      const scale = savedScale ? parseFloat(savedScale) : calculateAutoScale();
      
      const root = document.documentElement;
      root.style.setProperty('--scale-factor', scale.toString());
      root.style.setProperty('--ui-scale', scale.toString());
      
      // Dispatch event to notify listeners
      window.dispatchEvent(new CustomEvent('screenScaleChanged', { detail: { scale } }));
    };

    applyScale(); // Initial call

    const handleResize = () => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyScale();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);

  } catch (error) {
    console.error('Failed to initialize screen scale:', error);
  }
};

/**
 * Update font scale across the application and persist
 * @param {number} scale - Scale factor (0.5 to 2.0)
 */
export const updateScreenScale = (scale) => {
  try {
    const validScale = Math.min(Math.max(parseFloat(scale), 0.5), 2.0);
    
    // Persist
    localStorage.setItem(STORAGE_KEY, validScale.toString());
    
    // Update CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--scale-factor', validScale.toString());
    root.style.setProperty('--ui-scale', validScale.toString());
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('screenScaleChanged', { detail: { scale: validScale } }));
    
    return validScale;
  } catch (error) {
    console.error('Failed to update screen scale:', error);
    return 1.0;
  }
};

/**
 * Get current font scale from root style or localStorage
 * @returns {number} Current scale factor
 */
export const getCurrentScreenScale = () => {
  try {
    const savedScale = localStorage.getItem(STORAGE_KEY);
    if (savedScale) return parseFloat(savedScale);
    
    const root = document.documentElement;
    const scale = parseFloat(root.style.getPropertyValue('--scale-factor') || '1');
    return isNaN(scale) ? 1.0 : scale;
  } catch (error) {
    return 1.0;
  }
};

/**
 * Listener for screen scale changes
 * @param {Function} callback - Function to call when scale changes
 * @returns {Function} Cleanup function to remove listener
 */
export const onScreenScaleChange = (callback) => {
  const handler = (event) => {
    callback(event.detail.scale);
  };
  
  window.addEventListener('screenScaleChanged', handler);
  return () => window.removeEventListener('screenScaleChanged', handler);
};

export const resetScreenScale = () => {
  localStorage.removeItem(STORAGE_KEY);
  return initializeScreenScale();
};