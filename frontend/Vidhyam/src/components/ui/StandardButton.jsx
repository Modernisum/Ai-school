import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * StandardButton - A premium glassmorphism button component for the Vidhyam ecosystem.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button label or content
 * @param {'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline'} props.variant - Visual style
 * @param {'sm' | 'md' | 'lg'} props.size - Button size
 * @param {boolean} props.isLoading - Shows a spinner and disables the button
 * @param {boolean} props.disabled - Disables the button
 * @param {React.ReactNode} props.icon - Lucide icon (left side)
 * @param {React.ReactNode} props.rightIcon - Lucide icon (right side)
 * @param {string} props.className - Extra CSS classes
 * @param {string} props.type - HTML button type
 */
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
  const MotionComponent = motion[Component];
  
  // Base classes with glassmorphism constants
  const baseClasses = "relative flex items-center justify-center font-bold tracking-tight rounded-xl transition-all duration-300 active:scale-95 disabled:opacity-40 disabled:pointer-events-none overflow-hidden group cursor-pointer";
  
  // Size variations
  const sizes = {
    xs: "px-2 py-1 text-[9px] gap-1",
    sm: "px-4 py-1.5 text-[10px] gap-1.5",
    md: "px-6 py-2.5 text-xs gap-2",
    lg: "px-8 py-3.5 text-sm gap-2.5",
  };

  // Modern Glassmorphism Variants
  const variants = {
    primary: "bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:brightness-110",
    secondary: "bg-slate-500/5 dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-500/10 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20",
    danger: "bg-rose-500/5 dark:bg-rose-500/10 backdrop-blur-md border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 hover:border-rose-500/30",
    success: "bg-emerald-500/5 dark:bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 hover:border-emerald-500/30",
    outline: "bg-transparent border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white hover:bg-slate-500/5 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-white/20",
    ghost: "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-500/5 dark:hover:bg-white/5",
  };

  return (
    <MotionComponent
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      type={Component === 'button' ? type : undefined}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        ${baseClasses} 
        ${sizes[size] || sizes.md} 
        ${variants[variant] || variants.primary} 
        ${className}
      `}
      {...props}
    >
      {/* Background Glow Effect for Primary */}
      {variant === 'primary' && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      )}

      {/* Loading Overlay */}
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span className="opacity-80">Processing...</span>
        </div>
      ) : (
        <>
          {Icon && (
            <span className={variant === 'ghost' ? 'text-slate-500 group-hover:text-primary transition-colors' : ''}>
               {React.isValidElement(Icon) ? Icon : <Icon size={size === 'sm' ? 14 : 16} />}
            </span>
          )}
          
          <span className="relative z-10">{children}</span>

          {RightIcon && (
            <span>
              {React.isValidElement(RightIcon) ? RightIcon : <RightIcon size={size === 'sm' ? 14 : 16} />}
            </span>
          )}
        </>
      )}
    </MotionComponent>
  );
};

export default StandardButton;
