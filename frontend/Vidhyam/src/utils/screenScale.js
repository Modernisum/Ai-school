/**
 * Screen Scale Utility Functions
 * Provides functions to manage screen scale across the application
 */

/**
 * Initialize font scale from stored value
 */
export const initializeScreenScale = () => {
  try {
    // Get stored scale from localStorage or use default
    const storedScale = localStorage.getItem('screenScale');
    const scale = storedScale ? parseFloat(storedScale) : 1.0;
    const validScale = Math.min(Math.max(scale, 0.5), 2.0);
    
    // Update CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--scale-factor', validScale.toString());
    
    console.log('Font scale initialized to:', validScale);
    return validScale;
  } catch (error) {
    console.error('Failed to initialize font scale:', error);
    return 1.0;
  }
};

/**
 * Update font scale across the application
 * @param {number} scale - Scale factor (0.5 to 2.0)
 */
export const updateScreenScale = (scale) => {
  try {
    // Validate scale
    const validScale = Math.min(Math.max(parseFloat(scale), 0.5), 2.0);
    
    // Update CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--scale-factor', validScale.toString());
    
    // Dispatch custom event for other components
    const event = new CustomEvent('screenScaleChange', { detail: { scale: validScale } });
    window.dispatchEvent(event);
    
    console.log('Font scale updated to:', validScale);
    return validScale;
  } catch (error) {
    console.error('Failed to update font scale:', error);
    return 1.0;
  }
};

/**
 * Make an element scale-aware
 * @param {HTMLElement} element - The element to make scale-aware
 * @param {Object} dimensions - Base dimensions
 */
export const makeScaleAware = (element, dimensions = {}) => {
  if (!element) return;
  
  element.setAttribute('data-scale-aware', 'true');
  
  if (dimensions.width) {
    element.dataset.baseWidth = dimensions.width;
  }
  
  if (dimensions.height) {
    element.dataset.baseHeight = dimensions.height;
  }
  
  // Apply current scale
  const currentScale = getCurrentScreenScale();
  if (dimensions.width) {
    element.style.width = `calc(${dimensions.width} * ${currentScale})`;
    element.style.transition = 'width 0.3s ease';
  }
  
  if (dimensions.height) {
    element.style.height = `calc(${dimensions.height} * ${currentScale})`;
    element.style.transition = 'height 0.3s ease';
  }
};

/**
 * Get current font scale
 * @returns {number} Current scale factor
 */
export const getCurrentScreenScale = () => {
  try {
    const root = document.documentElement;
    const scale = parseFloat(root.style.getPropertyValue('--font-scale') || '1');
    return isNaN(scale) ? 1.0 : scale;
  } catch (error) {
    console.error('Failed to get current font scale:', error);
    return 1.0;
  }
};

/**
 * Resets screen scale to default (1.0)
 */
export const resetScreenScale = () => {
  return updateScreenScale(1.0);
};

/**
 * Applies scale to a specific element
 * @param {HTMLElement} element - The element to scale
 * @param {number} scale - The scale factor
 * @param {string} origin - Transform origin (default: 'top left')
 */
export const applyScaleToElement = (element, scale, origin = 'top left') => {
  if (!element) return;
  
  element.style.transform = `scale(${scale})`;
  element.style.transformOrigin = origin;
  element.style.transition = 'transform 0.3s ease';
};

/**
 * Removes scale from a specific element
 * @param {HTMLElement} element - The element to reset
 */
export const removeScaleFromElement = (element) => {
  if (!element) return;
  
  element.style.transform = '';
  element.style.transformOrigin = '';
  element.style.transition = '';
};

/**
 * Checks if screen scale is within valid range
 * @param {number} scale - The scale to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidScale = (scale) => {
  return !isNaN(scale) && scale >= 0.5 && scale <= 2.0;
};

/**
 * Formats scale for display
 * @param {number} scale - The scale factor
 * @returns {string} Formatted scale (e.g., "1.25x" or "125%")
 */
export const formatScale = (scale, format = 'x') => {
  if (!isValidScale(scale)) return '1.0x';
  
  if (format === 'percent') {
    return `${(scale * 100).toFixed(0)}%`;
  }
  return `${scale.toFixed(2)}x`;
};

/**
 * Gets recommended scale based on screen size
 * @returns {number} Recommended scale factor
 */
export const getRecommendedScale = () => {
  try {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const diagonal = Math.sqrt(width * width + height * height);
    
    // Simple heuristic based on screen size
    if (diagonal < 800) return 1.25; // Small screens
    if (diagonal < 1200) return 1.0; // Medium screens
    if (diagonal < 1600) return 0.9; // Large screens
    return 0.8; // Very large screens
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
  
  return () => {
    window.removeEventListener('screenScaleChanged', handler);
  };
};

/**
 * Scale-aware spacing utility
 * @param {number} baseValue - Base spacing value in rem
 * @returns {string} Scaled CSS value
 */
export const scaledSpacing = (baseValue) => {
  const scale = getCurrentScreenScale();
  return `calc(${baseValue}rem * ${scale})`;
};

/**
 * Scale-aware font size utility
 * @param {number} baseSize - Base font size in rem
 * @returns {string} Scaled CSS value
 */
export const scaledFontSize = (baseSize) => {
  const scale = getCurrentScreenScale();
  return `calc(${baseSize}rem * ${scale})`;
};

/**
 * Error handler for scale operations
 * @param {Error} error - The error that occurred
 * @param {string} operation - The operation that failed
 */
export const handleScaleError = (error, operation = 'scale operation') => {
  console.error(`Scale ${operation} failed:`, error);
  
  // You could dispatch an error event or show a toast here
  const errorEvent = new CustomEvent('screenScaleError', { 
    detail: { error: error.message, operation } 
  });
  window.dispatchEvent(errorEvent);
  
  return {
    success: false,
    error: error.message,
    operation
  };
};