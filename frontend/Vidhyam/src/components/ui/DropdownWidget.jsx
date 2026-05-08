import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search } from 'lucide-react';

/**
 * Premium Dropdown Widget
 * Features: Searchable, Smooth Animations, Glassmorphism, Keyboard support
 */
const DropdownWidget = ({
  options = [],
  value,
  onChange,
  placeholder = "Select Option",
  label,
  error,
  disabled = false,
  icon: Icon,
  className = "",
  searchable = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  // Filter options based on search
  const filteredOptions = options.filter(opt => {
    const labelStr = (opt?.label || opt || "").toString().toLowerCase();
    return labelStr.includes(searchTerm.toLowerCase());
  });

  const selectedOption = options.find(opt => (opt?.value !== undefined ? opt.value : opt) === value);
  const displayLabel = selectedOption?.label || selectedOption || value || placeholder;

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt) => {
    const val = opt?.value !== undefined ? opt.value : opt;
    onChange?.(val);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">
          {label}
        </label>
      )}

      {/* Trigger */}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border transition-all duration-300 cursor-pointer
          ${isOpen ? 'border-primary/50 bg-white/[0.08] shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'border-white/10 bg-white/5 hover:bg-white/[0.07]'}
          ${error ? 'border-accent/50' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {Icon && <Icon size={16} className={`${isOpen ? 'text-primary' : 'text-slate-500'} transition-colors`} />}
        <span className={`flex-1 text-xs font-medium ${!value ? 'text-slate-500' : 'text-white'}`}>
          {displayLabel}
        </span>
        <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
      </div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="absolute z-[100] w-full mt-2 bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
          >
            {searchable && options.length > 5 && (
              <div className="p-2 border-b border-white/5">
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    autoFocus
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search options..."
                    className="w-full bg-white/5 border border-white/5 rounded-lg py-1.5 pl-8 pr-4 text-[10px] text-white focus:outline-none focus:border-primary/30 transition-all font-medium"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, i) => {
                  const val = opt?.label || opt;
                  const isSelected = (opt?.value !== undefined ? opt.value : opt) === value;
                  
                  return (
                    <div
                      key={i}
                      onClick={(e) => { e.stopPropagation(); handleSelect(opt); }}
                      className={`
                        flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer mb-0.5
                        ${isSelected ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                      `}
                    >
                      <span>{val}</span>
                      {isSelected && <Check size={12} />}
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-[9px] font-black uppercase tracking-widest text-slate-600">
                  No matches found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {error && (
        <p className="text-[9px] font-semibold text-red-400 mt-2 ml-1 animate-pulse">
          {error}
        </p>
      )}
    </div>
  );
};

export default DropdownWidget;
