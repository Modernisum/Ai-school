import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, GraduationCap, School, Command, X, Loader2 } from 'lucide-react';
import { API_BASE } from '../config.js';

export default function SpotlightSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const navigate = useNavigate();
  const inputRef = useRef(null);

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
        const url = `${API_BASE}/api/search/global?q=${query}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('sa_token')}` }
        });
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
  }, [query]);

  const handleSelect = (result) => {
    let url = result.url;
    if (result.type === 'school') url = `/schools/${result.id}`;
    navigate(url);
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

  if (!isOpen) return null;

  return (
    <div className="spotlight-overlay" onClick={() => setIsOpen(false)}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="spotlight-content"
        onClick={e => e.stopPropagation()}
      >
        <div className="spotlight-input-row">
            <Search size={20} className="text-tertiary" />
            <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search across all schools..."
                className="spotlight-input"
            />
            {loading && <Loader2 className="animate-spin text-primary" size={18} />}
        </div>
        
        <div className="spotlight-results">
            {results.map((result, index) => (
                <div
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className={`spotlight-result-item ${selectedIndex === index ? 'selected' : ''}`}
                    onMouseEnter={() => setSelectedIndex(index)}
                >
                    <div className={`spotlight-result-icon ${result.type === 'school' ? 'school' : ''}`}>
                        <School size={16} />
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-semibold">{result.title}</div>
                        <div className="text-xs text-tertiary">{result.subtitle}</div>
                    </div>
                </div>
            ))}
        </div>
      </motion.div>
    </div>
  );
}
