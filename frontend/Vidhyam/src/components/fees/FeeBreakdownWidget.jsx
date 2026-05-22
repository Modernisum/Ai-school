import React, { useMemo, useState } from 'react';
import { CreditCard, CheckCircle, Bus, Home, Utensils } from 'lucide-react';

export default function FeeBreakdownWidget({
  mandatoryFees,
  optionalFees,
  selectedOptionals,
  onToggleOptional,
}) {
  const [viewMode, setViewMode] = useState('monthly');

  const totalMandatory = useMemo(
    () => (mandatoryFees || []).reduce((sum, f) => sum + (parseFloat(f.studentFee || f.student_fee || 0) || 0), 0),
    [mandatoryFees]
  );

  const totalOptional = useMemo(
    () => (selectedOptionals || []).reduce((sum, id) => {
      const fee = (optionalFees || []).find(f => (f.responsibilityId || f.id) === id);
      return sum + (parseFloat(fee?.studentFee || fee?.student_fee || 0) || 0);
    }, 0),
    [selectedOptionals, optionalFees]
  );

  const multiplier = viewMode === 'yearly' ? 12 : 1;
  const grandTotal = (totalMandatory + totalOptional) * multiplier;

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(val);

  const feeIcon = (name) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('transport') || lower.includes('bus')) return <Bus size={12} />;
    if (lower.includes('hostel')) return <Home size={12} />;
    if (lower.includes('lunch') || lower.includes('meal') || lower.includes('food')) return <Utensils size={12} />;
    return <CreditCard size={12} />;
  };

  return (
    <div className="border border-[var(--glass-border)] rounded-xl bg-[var(--bg-secondary)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard size={14} className="text-primary" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]">
            Fee Breakdown
          </h4>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setViewMode('monthly')}
            className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded transition-colors ${
              viewMode === 'monthly' ? 'bg-primary/20 text-primary' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setViewMode('yearly')}
            className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded transition-colors ${
              viewMode === 'yearly' ? 'bg-primary/20 text-primary' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {/* Mandatory Fees */}
        {mandatoryFees?.length > 0 && (
          <div>
            <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mb-1">Mandatory</p>
            {mandatoryFees.map((f) => {
              const fee = parseFloat(f.studentFee || f.student_fee || 0) || 0;
              return (
                <div key={f.responsibilityId || f.id} className="flex items-center justify-between py-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    {feeIcon(f.name)}
                    <span className="text-[var(--text-main)]">{f.name}</span>
                  </div>
                  <span className="text-amber-500">{formatCurrency(fee)}/{viewMode === 'yearly' ? 'yr' : 'mo'}</span>
                </div>
              );
            })}
            <div className="flex justify-between py-1 text-xs font-bold border-t border-amber-500/20 mt-0.5">
              <span className="text-amber-500">Subtotal (Mandatory)</span>
              <span className="text-amber-500">{formatCurrency(totalMandatory * multiplier)}</span>
            </div>
          </div>
        )}

        {/* Optional Fees */}
        {optionalFees?.length > 0 && (
          <div className="border-t border-[var(--glass-border)] pt-2 mt-1">
            <p className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1">Optional Services</p>
            {optionalFees.map((f) => {
              const rId = f.responsibilityId || f.id;
              const fee = parseFloat(f.studentFee || f.student_fee || 0) || 0;
              const isSelected = selectedOptionals?.includes(rId);
              return (
                <label
                  key={rId}
                  className={`flex items-center gap-2 py-1.5 px-1 rounded cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary/10' : 'hover:bg-[var(--bg-main)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleOptional?.(rId)}
                    className="w-3.5 h-3.5 rounded accent-primary"
                  />
                  <div className="flex items-center gap-1.5 flex-1">
                    {feeIcon(f.name)}
                    <span className="text-xs text-[var(--text-main)]">{f.name}</span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    +{formatCurrency(fee)}/{viewMode === 'yearly' ? 'yr' : 'mo'}
                  </span>
                </label>
              );
            })}
            {totalOptional > 0 && (
              <div className="flex justify-between py-1 text-xs font-bold border-t border-primary/20 mt-0.5">
                <span className="text-primary">Subtotal (Optional)</span>
                <span className="text-primary">+{formatCurrency(totalOptional * multiplier)}</span>
              </div>
            )}
          </div>
        )}

        {/* Grand Total */}
        <div className="flex justify-between items-center border-t border-[var(--glass-border)] pt-2 mt-1">
          <span className="text-xs font-bold text-[var(--text-main)]">
            Total Estimated Fee ({viewMode === 'yearly' ? 'Yearly' : 'Monthly'})
          </span>
          <span className="text-sm font-black text-emerald-500">{formatCurrency(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
