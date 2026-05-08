import React from 'react';
import { motion } from 'framer-motion';
import StandardButton from './StandardButton';

/**
 * SwitchButton Component
 * A premium tab/switch widget with sliding animations.
 * 
 * @param {Array} tabs - Array of { id, label, icon: IconComponent }
 * @param {string} activeTab - The currently active tab ID
 * @param {function} onChange - Callback function when a tab is clicked
 * @param {string} className - Optional container className
 */
const SwitchButton = ({ tabs = [], activeTab, onChange, className = "" }) => {
  return (
    <div className={`relative flex items-center p-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onChange?.(tab.id)}
            className={`relative flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all z-10
              ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            {tab.icon && <tab.icon size={14} className={isActive ? 'text-primary' : ''} />}
            {tab.label}
            
            {isActive && (
              <motion.div
                layoutId="switch-bg"
                className="absolute inset-0 bg-primary/20 border border-primary/20 rounded-xl -z-10 shadow-[0_0_15px_-3px_rgba(var(--primary-rgb),0.3)]"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
            
            {/* Subtle glow effect for active tab */}
            {isActive && (
              <div className="absolute inset-0 rounded-xl bg-primary/5 blur-md -z-20" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SwitchButton;
