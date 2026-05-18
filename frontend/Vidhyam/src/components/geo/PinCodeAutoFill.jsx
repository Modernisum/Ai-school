import React, { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const getSchoolId = () => {
  try {
    return localStorage.getItem('schoolId') || '';
  } catch { return ''; }
};

export default function PinCodeAutoFill({ onAddressFilled, disabled }) {
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePincodeChange = useCallback(async (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(value);
    setError('');

    if (value.length === 6) {
      setLoading(true);
      try {
        const schoolId = getSchoolId();
        const res = await fetch(`${API_BASE}/geo/location/${schoolId}?pincode=${value}`);
        if (!res.ok) throw new Error('Location lookup failed');
        const json = await res.json();
        if (json.success && json.data) {
          onAddressFilled({
            city: json.data.city || json.data.district || '',
            state: json.data.state || '',
            district: json.data.district || '',
          });
        } else {
          setError('Pincode not found');
        }
      } catch (err) {
        setError('Could not auto-fill address');
      } finally {
        setLoading(false);
      }
    }
  }, [onAddressFilled]);

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">
        PIN Code (Auto-fill Address)
      </label>
      <div className="relative">
        <input
          type="text"
          value={pincode}
          onChange={handlePincodeChange}
          maxLength={6}
          placeholder="Enter 6-digit PIN code"
          disabled={disabled}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 disabled:opacity-50"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-primary animate-pulse">
            Loading...
          </span>
        )}
      </div>
      {error && (
        <p className="text-[10px] text-red-400 ml-1">{error}</p>
      )}
    </div>
  );
}
