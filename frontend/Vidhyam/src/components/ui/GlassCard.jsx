import React from 'react';
import { motion } from 'framer-motion';

const GLOW_STYLES = {
  primary: { border: 'border-primary/20', shadow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.12)]' },
  success: { border: 'border-emerald-500/20', shadow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.12)]' },
  accent:  { border: 'border-primary/20', shadow: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.12)]' },
  warning: { border: 'border-amber-500/20', shadow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]' },
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
