import React, { useState } from 'react';
import { Users, ShieldCheck, X, Plus, Trash2 } from 'lucide-react';
import { useGetEmployeeResponsibilitiesQuery, useGetResponsibilitiesQuery, useAssignResponsibilityMutation, useRemoveResponsibilityMutation } from '../../infrastructureApi';

function SpaceRoleRow({ emp, schoolId, showToast, onRemove }) {
  const { data: respData } = useGetEmployeeResponsibilitiesQuery({ schoolId, employeeId: emp.employeeId });
  const [assignResp] = useAssignResponsibilityMutation();
  const [removeResp] = useRemoveResponsibilityMutation();
  const { data: allRespData } = useGetResponsibilitiesQuery(schoolId);
  const [isAdding, setIsAdding] = useState(false);

  const responsibilities = respData?.data || [];
  const availableOptions = (allRespData?.data || []).filter(r => !responsibilities.some(ar => ar.id === r.id));

  return (
    <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-6 group hover:border-primary/20 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary shadow-lg"><Users size={20} /></div>
          <div>
            <p className="text-base font-black text-white uppercase italic">{emp.name}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{emp.designation || 'Specialist'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsAdding(!isAdding)} className="px-3 py-1.5 bg-primary/10 text-primary text-[9px] font-black uppercase rounded-xl">{isAdding ? 'CANCEL' : 'ALLOCATE TASK'}</button>
          <button onClick={onRemove} className="w-8 h-8 flex items-center justify-center text-slate-700 hover:text-accent transition-colors"><Trash2 size={16} /></button>
        </div>
      </div>

      {isAdding && (
        <div className="grid grid-cols-1 gap-2 mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
          {availableOptions?.map(r => (
            <button key={r.id} onClick={async () => {
              try { await assignResp({ schoolId, employeeId: emp.employeeId, body: { responsibilityId: r.id } }).unwrap(); showToast('success', 'Task Protocol Established'); setIsAdding(false); } catch (e) { showToast('error', 'Protocol Failure'); }
            }} className="text-[10px] font-black text-slate-300 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-primary/40 text-left uppercase italic flex items-center justify-between">
              {r.name} <Plus size={12} className="text-primary" />
            </button>
          ))}
          {availableOptions.length === 0 && <p className="text-[9px] text-slate-600 uppercase text-center py-4 italic tracking-widest">— Archive Depleted —</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {responsibilities.map(r => (
          <div key={r.id} className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-slate-400 uppercase italic hover:text-white transition-all">
            <ShieldCheck size={12} className="text-primary/60" /> {r.name}
            <button onClick={async () => {
              try { await removeResp({ schoolId, employeeId: emp.employeeId, responsibilityId: r.id }).unwrap(); showToast('success', 'Protocol Deauthorized'); } catch (e) { showToast('error', 'Failure'); }
            }} className="text-slate-700 hover:text-accent ml-2"><X size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SpaceRoleRow;