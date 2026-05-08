import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, X, Search, Check, 
  ChevronRight, Calendar, Info, Shield 
} from 'lucide-react';
import { toast } from 'react-toastify';
import GlassCard from '../../../../components/ui/GlassCard';
import StandardButton from '../../../../components/ui/StandardButton';
import { useGetEmployeesQuery } from '../../../employees/api/employeeApi';
import { useBulkAssignResponsibilitiesMutation } from '../../infrastructureApi';

const BulkAssignModal = ({ 
  schoolId, 
  responsibility, 
  onClose, 
  onSuccess 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Queries
  const { 
    data: employeesData, 
    isFetching: employeesFetching 
  } = useGetEmployeesQuery(schoolId);

  const [bulkAssign, { isLoading: isAssigning }] = useBulkAssignResponsibilitiesMutation();

  const employees = employeesData?.data || [];
  
  // Filter employees by type if specified in responsibility, plus search term
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Optional: Filter by employeeType if defined in responsibility
    const matchesType = !responsibility.employeeType || 
                       emp.type?.toLowerCase() === responsibility.employeeType.toLowerCase();

    return matchesSearch && matchesType;
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkAssign = async () => {
    if (selectedIds.length === 0) {
      toast.warning('No personnel selected for deployment');
      return;
    }

    try {
      await bulkAssign({
        schoolId,
        responsibilityId: responsibility.responsibilityId || responsibility.id,
        body: {
          employeeIds: selectedIds,
          assignmentDate,
          notes
        }
      }).unwrap();

      toast.success(`Protocol deployed to ${selectedIds.length} personnel units`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.data?.message || 'Bulk Deployment Failure');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-end p-8 pointer-events-none">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="absolute inset-0 bg-slate-950/20 backdrop-blur-xl pointer-events-auto"
        onClick={onClose}
      />
      <motion.div 
        initial={{ x: 100, opacity: 0 }} 
        animate={{ x: 0, opacity: 1 }} 
        exit={{ x: 100, opacity: 0 }} 
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col z-10 pointer-events-auto"
      >
        <GlassCard 
          title="BULK PERSONNEL ASSIGNMENT" 
          onClose={onClose} 
          className="flex-1 flex flex-col overflow-hidden"
          glowColor="primary"
        >
          <div className="p-8 flex flex-col md:flex-row gap-8 h-full overflow-hidden">
            
            {/* Left Column: Selection */}
            <div className="flex-[1.5] flex flex-col overflow-hidden min-h-0">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Personnel Selection Manifest</p>
              
              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text"
                  placeholder="Scan by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>

              {/* Employee List */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                {employeesFetching ? (
                  <div className="py-20 flex justify-center opacity-20"><Users className="animate-pulse" /></div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="py-20 text-center opacity-30 text-xs uppercase tracking-widest font-black">No matching personnel</div>
                ) : (
                  filteredEmployees.map(emp => {
                    const isSelected = selectedIds.includes(emp.employeeId);
                    return (
                      <div 
                        key={emp.employeeId}
                        onClick={() => toggleSelect(emp.employeeId)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 ${
                          isSelected 
                            ? 'bg-primary/10 border-primary/40' 
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-primary text-white' : 'bg-white/10 text-slate-400'
                        }`}>
                          {isSelected ? <Check size={20} /> : <Users size={20} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-black text-white italic">{emp.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{emp.employeeId} | {emp.type}</p>
                        </div>
                        <ChevronRight size={16} className={isSelected ? 'text-primary' : 'text-slate-700'} />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Config */}
            <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                   <Shield size={16} className="text-primary" />
                   <h4 className="text-sm font-black text-white italic uppercase tracking-tight">{responsibility.name}</h4>
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                   Bulk deployment sequence authorized for {selectedIds.length} personnel units.
                </p>
              </div>

              <div className="space-y-6 flex-1">
                 <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                       <Calendar size={12} className="text-primary" />
                       Assignment Date
                    </label>
                    <input 
                      type="date"
                      value={assignmentDate}
                      onChange={(e) => setAssignmentDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary/50"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                       <Info size={12} className="text-primary" />
                       Operations Notes
                    </label>
                    <textarea 
                      placeholder="Enter deployment notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary/50 resize-none"
                    />
                 </div>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-3">
                 <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Nodes Selected</span>
                    <span className="text-xs font-black text-primary">{selectedIds.length} UNITS</span>
                 </div>
                 <StandardButton 
                   variant="primary" 
                   size="lg" 
                   icon={UserPlus} 
                   className="w-full"
                   isLoading={isAssigning}
                   onClick={handleBulkAssign}
                   disabled={selectedIds.length === 0}
                 >
                   EXECUTE DEPLOYMENT
                 </StandardButton>
                 <StandardButton 
                   variant="ghost" 
                   size="md" 
                   className="w-full text-slate-500"
                   onClick={onClose}
                 >
                   ABORT MISSION
                 </StandardButton>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default BulkAssignModal;
