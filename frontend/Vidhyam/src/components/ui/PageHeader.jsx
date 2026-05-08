import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import StandardButton from './StandardButton';

/**
 * Premium Page Header for Vidhyam
 * Supports integrated icon, title, subtitle (with accent), and trailing actions
 */
const PageHeader = ({ 
  title, 
  accentTitle, 
  subtitle, 
  icon: Icon, 
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  iconBorder = "border-primary/20",
  actions = [], // Array of { label, onClick, variant, icon, isLoading, color }
  children, // For custom action layouts
  className = "" 
}) => {
  return (
    <div className={`flex flex-col md:flex-row items-center justify-between gap-3 px-1 py-1 ${className}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-10 h-10 rounded-2xl ${iconBg} flex items-center justify-center border ${iconBorder} shadow-lg shadow-blue-500/5`}
          >
            <Icon size={20} className={iconColor} />
          </motion.div>
        )}
        <div>
          <h1 className="text-xl font-black text-white tracking-tighter italic uppercase leading-none">
            {title} {accentTitle && <span className={iconColor}>{accentTitle}</span>}
          </h1>
          {subtitle && (
            <p className="text-micro font-black text-slate-500 uppercase tracking-[0.2em] mt-0.5 flex items-center gap-2">
              <Zap size={8} className="text-blue-500 animate-pulse" /> {subtitle}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex gap-2 items-center">
        {actions.map((action, idx) => (
          <StandardButton
            key={idx}
            onClick={action.onClick}
            variant={action.variant || "secondary"}
            size={action.size || "sm"}
            icon={action.icon}
            isLoading={action.isLoading}
            color={action.color}
            className={action.className}
            disabled={action.disabled}
          >
            {action.label}
          </StandardButton>
        ))}
        {children}
      </div>
    </div>
  );
};

export default PageHeader;
