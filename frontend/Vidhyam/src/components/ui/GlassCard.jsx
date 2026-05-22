import React from 'react';
import { motion } from 'framer-motion';

const GLOW_STYLES = {
  primary: { border: 'border-[var(--glass-border)] hover:border-[var(--primary-color)]/20', shadow: 'hover:shadow-[var(--card-glow-hover)]' },
  success: { border: 'border-[var(--glass-border)] hover:border-emerald-500/20', shadow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.05)]' },
  accent:  { border: 'border-[var(--glass-border)] hover:border-[var(--accent-color)]/20', shadow: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.05)]' },
  warning: { border: 'border-[var(--glass-border)] hover:border-amber-500/20', shadow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.05)]' },
};

const GlassCard = ({
  children,
  className = "",
  glowColor = "primary",
  dense = false,
  hover = true,
}) => {
  const glow = GLOW_STYLES[glowColor] || GLOW_STYLES.primary;

  return (
    <motion.div
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ duration: 0.2 }}
      className={`glass-card ${dense ? 'rounded-xl' : 'rounded-2xl'} ${glow.shadow} ${glow.border} ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
