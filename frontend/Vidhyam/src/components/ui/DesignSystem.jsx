import React from 'react';

/**
 * Unified Design System — premium theme-aware components for the Vidhyam ecosystem.
 */

/* ═══════════════════════════════════════ BUTTONS ═══════════════════════════════════════ */

export const Button = ({
  children, variant = 'primary', size = 'medium',
  isLoading = false, disabled = false, className = '', ...props
}) => {
  const variants = {
    primary: "btn-primary hover:-translate-y-0.5 active:translate-y-0",
    secondary: "btn-secondary",
    danger: "btn-danger",
    success: "btn-success",
    ghost: "bg-transparent border border-white/10 hover:bg-white/5 text-slate-200",
    link: "bg-transparent text-[var(--primary-color)] hover:underline",
  };
  const sizes = {
    small: "px-3 py-1.5 text-sm",
    medium: "px-4 py-2.5 text-sm",
    large: "px-6 py-3.5 text-base",
  };

  return (
    <button
      className={`font-semibold rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />}
      {children}
    </button>
  );
};

/* ═══════════════════════════════════════ CARDS ═══════════════════════════════════════ */

export const Card = ({ children, className = '', hoverable = false, glow = false, ...props }) => (
  <div className={`glass-card p-5 rounded-2xl ${hoverable ? 'hover:-translate-y-1 cursor-pointer' : ''} ${glow ? 'hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]' : ''} ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = '' }) => (
  <div className={`mb-4 pb-3 border-b border-white/[0.06] ${className}`}>{children}</div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-base font-bold text-white ${className}`}>{children}</h3>
);

export const CardContent = ({ children, className = '' }) => <div className={className}>{children}</div>;

export const CardFooter = ({ children, className = '' }) => (
  <div className={`mt-4 pt-3 border-t border-white/[0.06] ${className}`}>{children}</div>
);

/* ═══════════════════════════════════════ FORMS ═══════════════════════════════════════ */

export const FormGroup = ({ children, className = '' }) => <div className={`mb-4 ${className}`}>{children}</div>;

export const Label = ({ children, htmlFor, required = false, className = '' }) => (
  <label htmlFor={htmlFor} className={`field-label flex items-center gap-1 ${className}`}>
    {children}
    {required && <span className="text-red-400">*</span>}
  </label>
);

export const Input = ({ label, error, touched, required = false, className = '', ...props }) => {
  const id = props.id || `input-${Math.random().toString(36).slice(2, 9)}`;
  const hasError = error && touched;
  return (
    <FormGroup>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}
      <input id={id} className={`input-standard ${hasError ? 'border-red-500/50 focus:border-red-500' : ''} ${className}`} aria-invalid={hasError} {...props} />
      {hasError && <div className="text-red-400 text-xs mt-1">{error}</div>}
    </FormGroup>
  );
};

export const Select = ({ label, error, touched, required = false, children, className = '', ...props }) => {
  const id = props.id || `select-${Math.random().toString(36).slice(2, 9)}`;
  const hasError = error && touched;
  return (
    <FormGroup>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}
      <select id={id} className={`input-standard ${hasError ? 'border-red-500/50' : ''} ${className}`} aria-invalid={hasError} {...props}>{children}</select>
      {hasError && <div className="text-red-400 text-xs mt-1">{error}</div>}
    </FormGroup>
  );
};

/* ═══════════════════════════════════════ FEEDBACK ═══════════════════════════════════════ */

export const Alert = ({ children, variant = 'info', className = '' }) => {
  const variants = {
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    danger: 'bg-red-500/10 border-red-500/20 text-red-400',
  };
  return <div className={`p-4 rounded-xl border ${variants[variant]} ${className}`} role="alert">{children}</div>;
};

/* ═══════════════════════════════════════ SKELETON ═══════════════════════════════════════ */

export const Skeleton = ({ width = 'full', height = '20px', className = '' }) => (
  <div className={`skeleton ${className}`} style={{ width: width === 'full' ? '100%' : width, height }} aria-hidden="true" />
);

/* ═══════════════════════════════════════ BADGE ═══════════════════════════════════════ */

export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-white/10 text-slate-300 border-white/10',
    primary: 'bg-primary/15 text-[var(--primary-color)] border-primary/20',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/15 text-red-400 border-red-500/20',
  };
  return <span className={`badge ${variants[variant]} ${className}`}>{children}</span>;
};

/* ═══════════════════════════════════════ EMPTY STATE ═══════════════════════════════════════ */

export const EmptyState = ({ icon: Icon, title, description, action, className = '' }) => (
  <div className={`text-center py-10 ${className}`}>
    {Icon && (
      <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
        <Icon className="w-7 h-7 text-slate-600" />
      </div>
    )}
    <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
    {description && <p className="text-xs text-slate-500 mb-4 max-w-md mx-auto">{description}</p>}
    {action}
  </div>
);
