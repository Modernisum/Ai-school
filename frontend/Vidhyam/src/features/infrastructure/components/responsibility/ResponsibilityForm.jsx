import React from 'react';
import { Info, Plus, Trash2, X, Save, RotateCcw } from 'lucide-react';

function ResponsibilityForm({
  formData,
  setFormData,
  spaces,
  handleCreateResponsibility,
  handleUpdateResponsibility,
  isEditing,
  resetForm
}) {
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSpaceId = (spaceId) => {
    const currentIds = [...(formData.spaceIds || [])];
    const index = currentIds.indexOf(spaceId);
    if (index > -1) {
      currentIds.splice(index, 1);
    } else {
      currentIds.push(spaceId);
    }
    updateField('spaceIds', currentIds);
  };

  return (
    <div className="space-y-6 sticky top-24">
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-all" />
        
        <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
            {isEditing ? 'Re-authorize Mission Protocol' : 'Establish Mission Protocol'}
          </p>
          {isEditing && (
            <button 
              onClick={resetForm}
              className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all"
              title="Cancel Editing"
            >
              <RotateCcw size={12} />
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block">Protocol Name</label>
            <input 
              className="input-dark py-3 text-xs font-bold" 
              placeholder="e.g. Mathematics - Class 10" 
              value={formData.name} 
              onChange={e => updateField('name', e.target.value)} 
            />
          </div>

          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block">Description</label>
            <textarea 
              className="input-dark py-3 text-xs min-h-[80px]" 
              placeholder="Define core duties and jurisdictions..." 
              value={formData.description}
              onChange={e => updateField('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block">Space Category</label>
              <select 
                className="input-dark py-3 text-[10px]"
                value={formData.spaceCategory}
                onChange={e => updateField('spaceCategory', e.target.value)}
              >
                {['classroom', 'lab', 'office', 'library', 'sports', 'canteen', 'other'].map(cat => (
                  <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block">Personnel Type</label>
              <select 
                className="input-dark py-3 text-[10px]"
                value={formData.employeeType}
                onChange={e => updateField('employeeType', e.target.value)}
              >
                {['teaching', 'admin', 'management', 'operational', 'housekeeping'].map(type => (
                  <option key={type} value={type}>{type.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block">Work Level</label>
              <select 
                className="input-dark py-3 text-[10px]"
                value={formData.workLevel}
                onChange={e => updateField('workLevel', e.target.value)}
              >
                {['junior', 'senior', 'lead', 'expert'].map(level => (
                  <option key={level} value={level}>{level.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block">Work Period</label>
              <select 
                className="input-dark py-3 text-[10px]"
                value={formData.workPeriod}
                onChange={e => updateField('workPeriod', e.target.value)}
              >
                {['monthly', 'weekly', 'daily', 'hourly', 'fixed'].map(period => (
                  <option key={period} value={period}>{period.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block">Work Amount</label>
              <input 
                type="number"
                className="input-dark py-3 text-xs font-black italic" 
                placeholder="0.00" 
                value={formData.workAmount}
                onChange={e => updateField('workAmount', e.target.value)}
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block">Student Fee</label>
              <input 
                type="number"
                className="input-dark py-3 text-xs font-black italic" 
                placeholder="0.00" 
                value={formData.studentFee}
                onChange={e => updateField('studentFee', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block">Jurisdiction (Space IDs)</label>
            <div className="max-h-40 overflow-y-auto space-y-1 p-2 bg-black/20 rounded-xl border border-white/5 no-scrollbar">
              {spaces?.length === 0 && (
                <p className="text-[10px] text-slate-600 text-center py-4 uppercase font-bold italic">No spaces detected in manifest</p>
              )}
              {spaces?.map(s => {
                const spaceId = s.spaceId || s.id;
                const isSelected = formData.spaceIds?.includes(spaceId);
                return (
                  <div 
                    key={spaceId} 
                    onClick={() => toggleSpaceId(spaceId)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-primary/20 border border-primary/30' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
                  >
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-primary' : 'text-slate-400'}`}>
                      {(s.spaceName || s.name || '').toUpperCase()}
                    </span>
                    {isSelected && <Save size={10} className="text-primary" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4">
            <button 
              onClick={isEditing ? handleUpdateResponsibility : handleCreateResponsibility}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.3em] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-2 group"
            >
              {isEditing ? (
                <>RE-AUTHORIZE PROTOCOL <Save size={14} className="group-hover:scale-110 transition-transform" /></>
              ) : (
                <>AUTHORIZE MISSION <Plus size={14} className="group-hover:rotate-90 transition-transform" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResponsibilityForm;