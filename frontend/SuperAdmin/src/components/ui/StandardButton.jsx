import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const StandardButton = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  rightIcon: RightIcon,
  className = '',
  type = 'button',
  as: Component = 'button',
  ...props
}) => {
  const MotionComponent = motion[Component] || motion.button;

  return (
    <MotionComponent
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      type={Component === 'button' ? type : undefined}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`btn btn-${variant} btn-${size} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
          {children}
          {RightIcon && <RightIcon size={size === 'sm' ? 14 : 16} />}
        </>
      )}
    </MotionComponent>
  );
};

export default StandardButton;
