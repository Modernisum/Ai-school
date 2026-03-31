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
        const HOST = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
        const url = `http://${HOST}:8080/api/search/global?q=${query}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('sa_token')}`
            }
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
    // Correct URL mapping for Super Admin
    let url = result.url;
    if (result.type === 'school') {
        url = `/schools/${result.id}`;
    }
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
    <div className="spotlight-overlay" style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'start',
        justifyContent: 'center',
        paddingTop: '100px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)'
    }} onClick={() => setIsOpen(false)}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="spotlight-content"
        style={{
            width: '100%',
            maxWidth: '600px',
            background: 'var(--bg2)',
            borderRadius: '16px',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--glass-border)' }}>
            <Search size={20} color="var(--text3)" />
            <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search across all schools..."
                style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text1)',
                    fontSize: '16px'
                }}
            />
            {loading && <Loader2 className="animate-spin" size={18} color="var(--accent)" />}
        </div>
        
        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px' }}>
            {results.map((result, index) => (
                <div
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        background: selectedIndex === index ? 'var(--bg3)' : 'transparent',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                >
                    <div style={{
                        padding: '8px',
                        background: result.type === 'school' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        color: result.type === 'school' ? '#6366f1' : 'var(--text2)'
                    }}>
                        <School size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{result.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{result.subtitle}</div>
                    </div>
                </div>
            ))}
        </div>
      </motion.div>
    </div>
  );
}
