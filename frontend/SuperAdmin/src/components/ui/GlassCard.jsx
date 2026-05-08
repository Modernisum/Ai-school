import React from 'react';
import { motion } from 'framer-motion';

const GlassCard = ({ children, className = "", glowColor = "primary", dense = false, hover = true, style = {} }) => {
  const glowStyles = {
    primary: "var(--color-primary-glow)",
    success: "color-mix(in srgb, var(--color-success) 10%, transparent)",
    accent: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
    warning: "color-mix(in srgb, var(--color-warning) 10%, transparent)",
  };

  return (
    <motion.div
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ duration: 0.2 }}
      className={`glass-card ${dense ? 'dense' : ''} ${className}`}
      style={{
        ...style
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at top left, ${glowStyles[glowColor] || glowStyles.primary}, transparent 70%)`,
          pointerEvents: 'none',
          opacity: 0.5
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </motion.div>
  );
};

export default GlassCard;
