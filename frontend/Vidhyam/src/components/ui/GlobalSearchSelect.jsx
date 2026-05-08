import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AsyncSelect from 'react-select/async';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, User, GraduationCap, School, 
  Loader2 
} from 'lucide-react';

const customStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: state.isFocused ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '0 4px',
    minHeight: '34px',
    height: '34px',
    boxShadow: state.isFocused ? '0 0 15px rgba(59, 130, 246, 0.1)' : 'none',
    '&:hover': {
      borderColor: 'rgba(255, 255, 255, 0.2)',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '0 8px 0 32px',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    marginTop: '8px',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
    zIndex: 9999,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
    color: 'white',
    padding: '10px 14px',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
    },
  }),
  input: (provided) => ({
    ...provided,
    color: 'white',
    fontSize: '0.875rem',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'rgba(148, 163, 184, 0.5)',
    fontSize: '0.875rem',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'white',
  }),
};

const CustomOption = ({ innerProps, label, data }) => {
  const Icon = data.type === 'student' ? GraduationCap : 
               data.type === 'employee' ? User : School;
  
  const iconColor = data.type === 'student' ? 'text-emerald-400' :
                    data.type === 'employee' ? 'text-amber-400' : 'text-blue-400';

  return (
    <div {...innerProps} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-none">
      <div className={`p-1.5 rounded-lg bg-white/5 ${iconColor}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm text-slate-100 truncate">{label}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 px-1.5 py-0.5 bg-slate-800/50 rounded">
            {data.type}
          </span>
        </div>
        {data.subtitle && <p className="text-[11px] text-slate-500 truncate">{data.subtitle}</p>}
      </div>
    </div>
  );
};

export default function GlobalSearchSelect({ onExpandChange }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const selectRef = useRef(null);

  const isOpen = isHovered || isFocused;

  useEffect(() => {
    onExpandChange?.(isOpen);
  }, [isOpen, onExpandChange]);
  const navigate = useNavigate();
  const schoolId = localStorage.getItem('schoolId');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        selectRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadOptions = async (inputValue) => {
    if (!inputValue || inputValue.length < 2) return [];
    try {
      const url = `/api/search/global?q=${inputValue}${schoolId ? `&school_id=${schoolId}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        return data.data.map(item => ({
          value: item.url,
          label: item.title,
          type: item.type,
          subtitle: item.subtitle,
          url: item.url
        }));
      }
      return [];
    } catch (error) {
      return [];
    }
  };

  const handleChange = (selectedOption) => {
    if (selectedOption) {
      navigate(selectedOption.url);
      selectRef.current?.blur();
      setIsFocused(false);
    }
  };

  return (
    <motion.div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={false}
      animate={{ width: isOpen ? 280 : 38 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <Search 
          className={`transition-colors duration-300 ${isOpen ? 'text-primary' : 'text-slate-400'}`} 
          size={18} 
        />
      </div>
      
      <AsyncSelect
        ref={selectRef}
        cacheOptions
        loadOptions={loadOptions}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        styles={customStyles}
        components={{ 
          Option: CustomOption,
          DropdownIndicator: () => null,
          IndicatorSeparator: () => null,
          LoadingIndicator: () => <Loader2 className="animate-spin text-primary mr-2" size={16} />
        }}
        placeholder={isOpen ? "Search... (Ctrl+K)" : ""}
        noOptionsMessage={() => "No results found"}
        loadingMessage={() => "Searching..."}
        classNamePrefix="global-search"
        controlShouldRenderValue={isFocused}
      />
    </motion.div>
  );
}
