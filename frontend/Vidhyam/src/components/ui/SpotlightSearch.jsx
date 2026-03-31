import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, GraduationCap, School, Command, X, Loader2 } from 'lucide-react';

export default function SpotlightSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const schoolId = localStorage.getItem('schoolId');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleToggle = () => setIsOpen(prev => !prev);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('toggle-spotlight', handleToggle);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('toggle-spotlight', handleToggle);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSelectedIndex(0);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `/api/search/global?q=${query}${schoolId ? `&school_id=${schoolId}` : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
          setResults(data.data);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, schoolId]);

  const handleSelect = (result) => {
    navigate(result.url);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-24 sm:pt-40 px-4 group">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden"
          >
            {/* Search Header */}
            <div className="flex items-center px-4 py-3 border-b border-slate-800">
              <Search className="text-slate-500 mr-3" size={20} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search students, staff, or settings... (Cmd + K)"
                className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder-slate-500 text-lg py-1"
              />
              <div className="flex items-center gap-2">
                {loading && <Loader2 className="animate-spin text-primary" size={18} />}
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded-md text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Results Area */}
            <div className="max-h-[400px] overflow-y-auto p-2">
              {!query && (
                <div className="p-8 text-center">
                  <div className="inline-flex p-3 bg-primary/10 rounded-xl text-primary mb-3">
                    <Command size={24} />
                  </div>
                  <p className="text-slate-400 text-sm">Type to search for students, staff, or schools.</p>
                </div>
              )}

              {query && results.length === 0 && !loading && (
                <p className="p-8 text-center text-slate-500 text-sm">No results found for "{query}"</p>
              )}

              {results.length > 0 && (
                <div className="grid gap-1">
                  {results.map((result, index) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 text-left w-full gap-4 ${
                        selectedIndex === index 
                        ? 'bg-primary/10 border-primary/20' 
                        : 'hover:bg-slate-800/50 border-transparent'
                      } border`}
                    >
                      <div className={`p-2 rounded-lg ${
                        result.type === 'student' ? 'bg-success/10 text-success' :
                        result.type === 'employee' ? 'bg-warning/10 text-warning' :
                        'bg-secondary/10 text-secondary'
                      }`}>
                        {result.type === 'student' && <GraduationCap size={18} />}
                        {result.type === 'employee' && <User size={18} />}
                        {result.type === 'school' && <School size={18} />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-100 truncate">{result.title}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 py-0.5 bg-slate-800 rounded">
                            {result.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{result.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-medium">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><code className="px-1 py-0.5 bg-slate-800 rounded">Enter</code> to select</span>
                <span className="flex items-center gap-1.5"><code className="px-1 py-0.5 bg-slate-800 rounded">↑↓</code> to navigate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <code className="px-1 py-0.5 bg-slate-800 rounded">Esc</code> to close
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
