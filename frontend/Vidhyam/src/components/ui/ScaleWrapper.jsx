import React from 'react';
import { useComponentScale } from '../../hooks/useScreenScale';

/**
 * ScaleWrapper Component
 * Wraps children with screen scale support
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {boolean} props.applyTransform - Apply transform scaling
 * @param {boolean} props.applyFontScaling - Apply font scaling
 * @param {boolean} props.applySpacing - Apply spacing scaling
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional styles
 */
const ScaleWrapper = ({ 
  children, 
  applyTransform = true,
  applyFontScaling = false,
  applySpacing = false,
  className = '',
  style = {},
  ...props 
}) => {
  const { scaleStyles, scaleClass } = useComponentScale({
    applyTransform,
    applyFontScaling,
    applySpacing
  });

  const combinedClassName = `${scaleClass} ${className}`.trim();
  const combinedStyle = { ...scaleStyles, ...style };

  return (
    <div 
      className={combinedClassName || undefined}
      style={Object.keys(combinedStyle).length > 0 ? combinedStyle : undefined}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * ScaleAwareContainer Component
 * Container that adjusts padding and margins based on screen scale
 */
export const ScaleAwareContainer = ({ children, className = '', ...props }) => {
  const { scale } = useComponentScale();

  const containerStyle = {
    padding: `calc(1rem * ${scale})`,
    margin: `calc(0.5rem * ${scale})`,
    transition: 'padding 0.3s ease, margin 0.3s ease'
  };

  return (
    <div 
      className={`scale-aware-container ${className}`}
      style={containerStyle}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * ScaleAwareText Component
 * Text component that scales font size based on screen scale
 */
export const ScaleAwareText = ({ 
  children, 
  size = 'base',
  className = '',
  as: Component = 'p',
  ...props 
}) => {
  const { scale } = useComponentScale();

  const sizeMap = {
    xs: 0.75,
    sm: 0.875,
    base: 1,
    lg: 1.125,
    xl: 1.25,
    '2xl': 1.5,
    '3xl': 1.875,
    '4xl': 2.25
  };

  const baseSize = sizeMap[size] || 1;
  const fontSize = `calc(${baseSize}rem * ${scale})`;

  return (
    <Component 
      className={`scale-aware-text ${className}`}
      style={{ fontSize, transition: 'font-size 0.3s ease' }}
      {...props}
    >
      {children}
    </Component>
  );
};

/**
 * ScaleAwareButton Component
 * Button component that scales based on screen scale
 */
export const ScaleAwareButton = ({ 
  children, 
  size = 'md',
  className = '',
  ...props 
}) => {
  const { scale } = useComponentScale();

  const sizeMap = {
    xs: { padding: '0.25rem 0.5rem', fontSize: '0.75rem' },
    sm: { padding: '0.375rem 0.75rem', fontSize: '0.875rem' },
    md: { padding: '0.5rem 1rem', fontSize: '1rem' },
    lg: { padding: '0.75rem 1.5rem', fontSize: '1.125rem' },
    xl: { padding: '1rem 2rem', fontSize: '1.25rem' }
  };

  const baseStyle = sizeMap[size] || sizeMap.md;
  const buttonStyle = {
    padding: `calc(${baseStyle.padding.split(' ')[0]} * ${scale}) calc(${baseStyle.padding.split(' ')[1]} * ${scale})`,
    fontSize: `calc(${baseStyle.fontSize} * ${scale})`,
    transition: 'all 0.3s ease'
  };

  return (
    <button 
      className={`scale-aware-button ${className}`}
      style={buttonStyle}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * ScaleAwareCard Component
 * Card component that scales based on screen scale
 */
export const ScaleAwareCard = ({ 
  children, 
  padding = 'md',
  className = '',
  ...props 
}) => {
  const { scale } = useComponentScale();

  const paddingMap = {
    none: '0',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  };

  const basePadding = paddingMap[padding] || paddingMap.md;
  const cardStyle = {
    padding: `calc(${basePadding} * ${scale})`,
    borderRadius: `calc(0.5rem * ${scale})`,
    transition: 'all 0.3s ease'
  };

  return (
    <div 
      className={`scale-aware-card glass-card ${className}`}
      style={cardStyle}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * ScaleAwareGrid Component
 * Grid component that scales gap based on screen scale
 */
export const ScaleAwareGrid = ({ 
  children, 
  gap = 'md',
  className = '',
  ...props 
}) => {
  const { scale } = useComponentScale();

  const gapMap = {
    none: '0',
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  };

  const baseGap = gapMap[gap] || gapMap.md;
  const gridStyle = {
    gap: `calc(${baseGap} * ${scale})`,
    transition: 'gap 0.3s ease'
  };

  return (
    <div 
      className={`scale-aware-grid grid ${className}`}
      style={gridStyle}
      {...props}
    >
      {children}
    </div>
  );
};

export default ScaleWrapper;