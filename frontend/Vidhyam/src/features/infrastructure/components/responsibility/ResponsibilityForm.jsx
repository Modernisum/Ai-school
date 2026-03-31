import React, { useState } from 'react';
import { Info, Plus, Trash2, X } from 'lucide-react';

function ResponsibilityForm({
  newResponsibilityName,
  setNewResponsibilityName,
  newRoleDescription,
  setNewRoleDescription,
  newRolePrice,
  setNewRolePrice,
  newRolePerDayPrice,
  setNewRolePerDayPrice,
  newRoleTimePeriod,
  setNewRoleTimePeriod,
  newRoleType,
  setNewRoleType,
  newRoleSpaceId,
  setNewRoleSpaceId,
  employees,
  setEmployees,
  spaces,
  handleCreateResponsibility
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-all" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-4 italic">Establish Mission Protocol</p>
        
        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block">Protocol Name</label>
            <input 
              className="input-dark py-3 text-xs font-bold" 
              placeholder="e.g. Floor Marshal, Safety Officer..." 
              value={newResponsibilityName} 
              onChange={e => setNewResponsibilityName(e.target.value)} 
            />
          </div>

          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block">Description</label>
            <textarea 
              className="input-dark py-3 text-xs min-h-[80px]" 
              placeholder="Define core duties and jurisdictions..." 
              value={newRoleDescription}
              onChange={e => setNewRoleDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block">Personnel Type</label>
              <select 
                className="input-dark py-3 text-[10px]"
                value={newRoleType}
                onChange={e => setNewRoleType(e.target.value)}
              >
                {['teacher', 'admin', 'management', 'operational', 'housekeeping'].map(type => (
                  <option key={type} value={type}>{type.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block">Monthly Price</label>
              <input 
                type="number"
                className="input-dark py-3 text-xs font-black italic" 
                placeholder="0.00" 
                value={newRolePrice}
                onChange={e => setNewRolePrice(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block">Daily Price</label>
              <input 
                type="number"
                className="input-dark py-3 text-xs font-black italic" 
                placeholder="0.00" 
                value={newRolePerDayPrice}
                onChange={e => setNewRolePerDayPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block">Time Period (Days)</label>
              <input 
                type="number"
                className="input-dark py-3 text-xs font-black italic" 
                placeholder="30" 
                value={newRoleTimePeriod}
                onChange={e => setNewRoleTimePeriod(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block">Jurisdiction (Space)</label>
            <select 
              className="input-dark py-3 text-[10px]"
              value={newRoleSpaceId}
              onChange={e => setNewRoleSpaceId(e.target.value)}
            >
              <option value="">GLOBAL (ALL SECTORS)</option>
              {spaces?.map(s => (
                <option key={s.id || s.spaceId} value={s.id || s.spaceId}>
                  {(s.spaceName || s.name || '').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block">Assigned Personnel</label>
              <button 
                type="button"
                onClick={() => setEmployees([...employees, { employeeId: '', spaceIds: [] }])}
                className="text-[8px] px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-black uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center gap-1"
              >
                <Plus size={10} /> ADD PERSONNEL
              </button>
            </div>

            {employees.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase">No personnel assigned</p>
                <p className="text-[9px] text-slate-600 mt-1">Click "ADD PERSONNEL" to assign employees to this role</p>
              </div>
            ) : (
              <div className="space-y-3">
                {employees.map((employee, index) => (
                  <div key={index} className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black text-white uppercase">Personnel #{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newEmployees = [...employees];
                          newEmployees.splice(index, 1);
                          setEmployees(newEmployees);
                        }}
                        className="text-[8px] p-1 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 block">Employee ID</label>
                        <input
                          className="input-dark py-2 text-xs"
                          placeholder="e.g. EMP101, EMP102..."
                          value={employee.employeeId}
                          onChange={(e) => {
                            const newEmployees = [...employees];
                            newEmployees[index].employeeId = e.target.value;
                            setEmployees(newEmployees);
                          }}
                        />
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Assigned Spaces</label>
                          <button
                            type="button"
                            onClick={() => {
                              const newEmployees = [...employees];
                              newEmployees[index].spaceIds = [...(newEmployees[index].spaceIds || []), ''];
                              setEmployees(newEmployees);
                            }}
                            className="text-[7px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-black uppercase hover:bg-blue-500/20 transition-all"
                          >
                            <Plus size={8} /> ADD SPACE
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          {(employee.spaceIds || []).map((spaceId, spaceIndex) => (
                            <div key={spaceIndex} className="flex items-center gap-2">
                              <input
                                className="input-dark py-2 text-xs flex-1"
                                placeholder="e.g. CLASS_10A, LAB_01..."
                                value={spaceId}
                                onChange={(e) => {
                                  const newEmployees = [...employees];
                                  newEmployees[index].spaceIds[spaceIndex] = e.target.value;
                                  setEmployees(newEmployees);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newEmployees = [...employees];
                                  newEmployees[index].spaceIds.splice(spaceIndex, 1);
                                  setEmployees(newEmployees);
                                }}
                                className="p-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={handleCreateResponsibility} 
            className="btn-primary w-full mt-6 py-4 text-[10px] font-black uppercase tracking-widest italic shadow-xl shadow-primary/20"
          >
            AUTHORIZE PROTOCOL
          </button>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-secondary/5 border border-secondary/10">
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-secondary" />
          <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Protocol Tip</span>
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide leading-relaxed">
          Roles are global identifiers. Once defined, they can be assigned to any personnel within specific infrastructure sectors.
        </p>
      </div>
    </div>
  );
}

export default ResponsibilityForm;