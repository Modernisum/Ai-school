import { motion } from 'framer-motion';
import { X, Briefcase, DollarSign, Users, Calendar, Package, Info, MapPin, Shield } from 'lucide-react';

function ResponsibilityDetailModal({ responsibility, onClose }) {
  if (!responsibility) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="modal-content max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <Briefcase size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tight">{responsibility.name}</h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">{responsibility.responsibilityId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Description */}
          {responsibility.description && (
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Info size={16} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Description</span>
              </div>
              <p className="text-sm text-slate-300 font-medium leading-relaxed">{responsibility.description}</p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Price Information */}
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={16} className="text-green-400" />
                <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Compensation Structure</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Work Amount</span>
                  <span className="text-lg font-black text-green-400 italic">₹{responsibility.workAmount || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Work Period</span>
                  <span className="text-sm font-black text-slate-300 uppercase">{responsibility.workPeriod || 'Monthly'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Student Fee</span>
                  <span className="text-sm font-black text-slate-300">₹{responsibility.studentFee || 0}</span>
                </div>
              </div>
            </div>

            {/* Employee Type */}
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-blue-400" />
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Personnel Classification</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Employee Type</span>
                  <span className="text-sm font-black text-blue-400 uppercase">{responsibility.employeeType || 'Not Specified'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Work Level</span>
                  <span className="text-sm font-black text-slate-300 uppercase">{responsibility.workLevel || 'Junior'}</span>
                </div>
              </div>
            </div>

            {/* Space Information */}
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={16} className="text-purple-400" />
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Operational Sectors</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Space Category</span>
                  <span className="text-sm font-black text-purple-400 uppercase">{responsibility.spaceCategory || 'Classroom'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Assigned Spaces</span>
                  <span className="text-sm font-black text-slate-300">
                    {responsibility.spaceIds?.length || 0} Sectors
                  </span>
                </div>
              </div>
            </div>

            {/* Assigned Employees */}
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={16} className="text-yellow-400" />
                <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Active Assignments</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Assigned Employees</span>
                  <span className="text-lg font-black text-yellow-400">{responsibility.assignedEmployees?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Assignment Status</span>
                  <span className="text-sm font-black text-slate-300">
                    {(responsibility.assignedEmployees?.length || 0) > 0 ? 'Active' : 'Vacant'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Employees List */}
          {responsibility.assignedEmployees && responsibility.assignedEmployees.length > 0 && (
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Personnel</span>
              </div>
              <div className="space-y-3">
                {responsibility.assignedEmployees.map((assignment, index) => (
                  <div key={index} className="p-3 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-white">Employee ID: {assignment.employeeId}</p>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-md bg-green-500/20 text-green-400 font-black uppercase">
                        Active
                      </span>
                    </div>
                    {assignment.spaceIds && assignment.spaceIds.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Assigned Spaces:</p>
                        <div className="flex flex-wrap gap-1">
                          {assignment.spaceIds.map((spaceId, idx) => (
                            <span key={idx} className="text-[10px] px-2 py-1 rounded-md bg-blue-500/20 text-blue-400 font-medium">
                              {spaceId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State for No Assignments */}
          {(!responsibility.assignedEmployees || responsibility.assignedEmployees.length === 0) && (
            <div className="p-8 text-center rounded-xl bg-white/[0.01] border border-white/5 border-dashed">
              <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mx-auto mb-4">
                <Users size={24} />
              </div>
              <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-2">Protocol Vacancy</p>
              <p className="text-sm text-slate-400 font-medium">No personnel currently assigned to this responsibility</p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-black text-white uppercase tracking-wider transition-all"
          >
            Close Protocol
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default ResponsibilityDetailModal;