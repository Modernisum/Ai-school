import { useState, useEffect } from 'react';

/**
 * Hook to detect mobile devices and screen size changes
 * Provides responsive breakpoints for mobile-first design
 */

// Breakpoints matching Tailwind CSS
export const BREAKPOINTS = {
  sm: 640,    // Small screens
  md: 768,    // Tablets
  lg: 1024,   // Laptops
  xl: 1280,   // Desktops
  '2xl': 1536 // Large desktops
};

export const useMobile = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const [isMobile, setIsMobile] = useState(false);
  const [breakpoint, setBreakpoint] = useState('');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setWindowSize({ width, height });
      
      // Determine breakpoint
      let currentBreakpoint = '';
      if (width < BREAKPOINTS.sm) {
        currentBreakpoint = 'xs';
        setIsMobile(true);
      } else if (width < BREAKPOINTS.md) {
        currentBreakpoint = 'sm';
        setIsMobile(true);
      } else if (width < BREAKPOINTS.lg) {
        currentBreakpoint = 'md';
        setIsMobile(false);
      } else if (width < BREAKPOINTS.xl) {
        currentBreakpoint = 'lg';
        setIsMobile(false);
      } else if (width < BREAKPOINTS['2xl']) {
        currentBreakpoint = 'xl';
        setIsMobile(false);
      } else {
        currentBreakpoint = '2xl';
        setIsMobile(false);
      }
      
      setBreakpoint(currentBreakpoint);
    };

    // Initial call
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    ...windowSize,
    isMobile,
    breakpoint,
    isSmallScreen: windowSize.width < BREAKPOINTS.md,
    isMediumScreen: windowSize.width >= BREAKPOINTS.md && windowSize.width < BREAKPOINTS.lg,
    isLargeScreen: windowSize.width >= BREAKPOINTS.lg,
    isPortrait: windowSize.height > windowSize.width,
    isLandscape: windowSize.width > windowSize.height,
  };
};

// Hook for conditional rendering based on screen size
export const useResponsive = (config = {}) => {
  const mobile = useMobile();
  
  return {
    showMobile: config.mobile === true || (config.mobile === 'auto' && mobile.isMobile),
    showDesktop: config.desktop === true || (config.desktop === 'auto' && !mobile.isMobile),
    showOn: (breakpoint) => {
      const breakpoints = Array.isArray(breakpoint) ? breakpoint : [breakpoint];
      return breakpoints.includes(mobile.breakpoint);
    },
    hideOn: (breakpoint) => {
      const breakpoints = Array.isArray(breakpoint) ? breakpoint : [breakpoint];
      return !breakpoints.includes(mobile.breakpoint);
    },
    ...mobile
  };
};

// Utility function to conditionally apply classes based on screen size
export const responsiveClass = (classes, breakpoint) => {
  if (typeof classes === 'string') {
    return classes;
  }
  
  // Return class for current breakpoint or default
  return classes[breakpoint] || classes.default || '';
};

export default useMobile;