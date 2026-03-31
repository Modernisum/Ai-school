import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectScreenScale, setScreenScale } from '../features/settings/settingsSlice';
import { updateScreenScale, onScreenScaleChange } from '../utils/screenScale';

/**
 * Custom hook to manage screen scale across the application
 * Initializes scale on mount and provides scale state
 */
export const useScreenScale = () => {
  const dispatch = useDispatch();
  const scale = useSelector(selectScreenScale);

  // Initialize scale on mount
  useEffect(() => {
    try {
      // Apply the current scale from Redux store
      updateScreenScale(scale);
      
      // Listen for scale changes from other components
      const cleanup = onScreenScaleChange((newScale) => {
        dispatch(setScreenScale(newScale));
      });
      
      return cleanup;
    } catch (error) {
      console.error('Failed to initialize screen scale:', error);
    }
  }, [dispatch, scale]);

  // Apply scale to document when scale changes
  useEffect(() => {
    try {
      updateScreenScale(scale);
    } catch (error) {
      console.error('Failed to apply screen scale:', error);
    }
  }, [scale]);

  return {
    scale,
    setScale: (newScale) => dispatch(setScreenScale(newScale)),
    resetScale: () => dispatch(setScreenScale(1.0))
  };
};

/**
 * Hook to apply screen scale to specific components
 * @param {Object} options - Configuration options
 * @param {boolean} options.applyTransform - Whether to apply transform scaling
 * @param {boolean} options.applyFontScaling - Whether to apply font scaling
 * @param {boolean} options.applySpacing - Whether to apply spacing scaling
 */
export const useComponentScale = (options = {}) => {
  const { 
    applyTransform = true, 
    applyFontScaling = false, 
    applySpacing = false 
  } = options;
  
  const { scale } = useScreenScale();

  const getScaleStyles = () => {
    const styles = {};
    
    if (applyTransform) {
      styles.transform = `scale(${scale})`;
      styles.transformOrigin = 'top left';
      styles.transition = 'transform 0.3s ease';
    }
    
    if (applyFontScaling) {
      styles.fontSize = `calc(1rem * ${scale})`;
    }
    
    if (applySpacing) {
      styles.padding = `calc(1rem * ${scale})`;
      styles.margin = `calc(1rem * ${scale})`;
    }
    
    return styles;
  };

  const getScaleClass = () => {
    const classes = [];
    
    if (applyTransform) {
      classes.push(`scale-${getScaleSizeClass(scale)}`);
    }
    
    if (applyFontScaling) {
      classes.push(`text-scale-${getFontSizeClass(scale)}`);
    }
    
    return classes.join(' ');
  };

  return {
    scale,
    scaleStyles: getScaleStyles(),
    scaleClass: getScaleClass(),
    scaleFactor: scale
  };
};

/**
 * Helper function to get scale size class
 */
const getScaleSizeClass = (scale) => {
  if (scale <= 0.75) return 'xs';
  if (scale <= 0.875) return 'sm';
  if (scale <= 1.125) return 'md';
  if (scale <= 1.25) return 'lg';
  if (scale <= 1.5) return 'xl';
  return '2xl';
};

/**
 * Helper function to get font size class
 */
const getFontSizeClass = (scale) => {
  if (scale <= 0.75) return 'xs';
  if (scale <= 0.875) return 'sm';
  if (scale <= 1.125) return 'base';
  if (scale <= 1.25) return 'lg';
  if (scale <= 1.5) return 'xl';
  if (scale <= 1.875) return '2xl';
  return '3xl';
};

/**
 * Hook for responsive scale adjustments
 */
export const useResponsiveScale = () => {
  const { scale } = useScreenScale();

  const getResponsiveScale = () => {
    const width = window.innerWidth;
    
    // Adjust scale based on screen width
    if (width < 640) { // Mobile
      return Math.min(scale, 1.5); // Cap at 1.5x on mobile
    } else if (width < 1024) { // Tablet
      return Math.min(scale, 1.75); // Cap at 1.75x on tablet
    }
    
    return scale; // Full scale on desktop
  };

  return {
    scale,
    responsiveScale: getResponsiveScale(),
    isMobile: window.innerWidth < 640,
    isTablet: window.innerWidth >= 640 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024
  };
};