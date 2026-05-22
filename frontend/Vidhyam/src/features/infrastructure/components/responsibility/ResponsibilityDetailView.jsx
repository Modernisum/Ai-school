import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Users, Activity, Clock, 
  RotateCcw, History, TrendingUp, Info,
  UserMinus, Calendar, ArrowLeft, ArrowRight
} from 'lucide-react';
import { toast } from 'react-toastify';

import GlassCard from '../../../../components/ui/GlassCard';
import StandardButton from '../../../../components/ui/StandardButton';
import KPIWidget, { KPITile } from '../../../../components/ui/KPIWidget';
import SwitchButton from '../../../../components/ui/SwitchButton';
import { 
  useGetResponsibilityDetailsQuery,
  useGetResponsibilityHistoryQuery,
  useGetResponsibilityVersionsQuery,
  useGetResponsibilityAnalyticsQuery,
  useRollbackResponsibilityMutation,
  useRemoveResponsibilityMutation
} from '../../infrastructureApi';

const ResponsibilityDetailView = ({ schoolId, responsibilityId, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Queries
  const { data: detailsData, isFetching: detailsLoading } = useGetResponsibilityDetailsQuery({ schoolId, responsibilityId });
  const { data: historyData, isFetching: historyLoading } = useGetResponsibilityHistoryQuery({ schoolId, responsibilityId }, { skip: activeTab !== 'history' });
  const { data: versionsData, isFetching: versionsLoading } = useGetResponsibilityVersionsQuery({ schoolId, responsibilityId }, { skip: activeTab !== 'versions' });
  const { data: analyticsData, isFetching: analyticsLoading } = useGetResponsibilityAnalyticsQuery({ schoolId, responsibilityId }, { skip: activeTab !== 'analytics' });

  const [rollback, { isLoading: isRollingBack }] = useRollbackResponsibilityMutation();
  const [removeAssignment] = useRemoveResponsibilityMutation();

  const details = detailsData?.data || {};

  const handleRollback = async (version) => {
    if (window.confirm(`ROLLBACK PROTOCOL TO VERSION ${version}? Current configurations will be overwritten.`)) {
      try {
        await rollback({ schoolId, responsibilityId, version }).unwrap();
        toast.success(`Protocol Restored to Version ${version}`);
      } catch (err) {
        toast.error('Rollback Sequence Failed');
      }
    }
  };

  const handleRemoveAssignment = async (employeeId) => {
    if (window.confirm('TERMINATE PERSONNEL ASSIGNMENT?')) {
      try {
        await removeAssignment({ schoolId, employeeId, responsibilityId }).unwrap();
        toast.success('Personnel Unit Released from Duty');
      } catch (err) {
        toast.error('Termination Failure');
      }
    }
  };

  const tabs = [
    { id: 'overview', label: 'OVERVIEW', icon: Info },
    { id: 'history', label: 'HISTORY', icon: History },
    { id: 'versions', label: 'VERSIONS', icon: RotateCcw },
    { id: 'analytics', label: 'ANALYTICS', icon: TrendingUp }
  ];

  return (
    <div className="absolute inset-0 z-[120] flex items-center justify-end p-8 pointer-events-none">
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
        className="relative w-full max-w-5xl z-10 pointer-events-auto h-[90vh] flex flex-col"
      >
        <GlassCard 
          title={details.name || 'PROTOCOL DETAILS'} 
          onClose={onClose}
          className="flex-1 flex flex-col overflow-hidden"
          glowColor="primary"
        >
          <div className="p-8 flex flex-col h-full overflow-hidden">
            
            {/* Tab Switcher */}
            <div className="mb-8 flex justify-center">
              <SwitchButton 
                options={tabs}
                activeTab={activeTab}
                onChange={setActiveTab}
              />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div 
                    key="overview"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-8"
                  >
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol Description</p>
                          <p className="text-sm text-slate-300 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5 italic">
                             {details.description || 'No operational brief provided.'}
                          </p>
                       </div>
                       <div className="space-y-4">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Core Parameters</p>
                          <div className="grid grid-cols-2 gap-4">
                             <DetailItem label="Priority" value={details.priority} color="warning" />
                             <DetailItem label="Personnel Class" value={details.employeeType} color="primary" />
                             <DetailItem label="Weekly Load" value={`${details.estimatedHoursPerWeek} HR`} color="accent" />
                             <DetailItem label="Compensation" value={`$${details.compensation}`} color="success" />
                          </div>
                       </div>
                    </div>

                    {/* Active Personnel */}
                    <div className="space-y-4 pt-4">
                       <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Personnel Deployment</p>
                          <span className="text-[10px] font-black text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20 uppercase tracking-widest font-mono">
                             {details.assignedEmployees?.length || 0} UNITS ACTIVE
                          </span>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {details.assignedEmployees?.length > 0 ? (
                            details.assignedEmployees.map((emp, idx) => (
                              <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                       <Users size={14} />
                                    </div>
                                    <div>
                                       <p className="text-xs font-black text-white italic">{emp.employeeName}</p>
                                       <p className="text-[9px] text-slate-500 uppercase tracking-widest">Deployed on {emp.assignmentDate}</p>
                                    </div>
                                 </div>
                                 <StandardButton 
                                   variant="ghost" 
                                   size="sm" 
                                   icon={UserMinus} 
                                   className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                   onClick={() => handleRemoveAssignment(emp.employeeId)}
                                 />
                              </div>
                            ))
                          ) : (
                            <div className="col-span-full py-10 text-center opacity-20 italic text-xs uppercase tracking-widest">No personnel assigned to this node.</div>
                          )}
                       </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'history' && (
                  <motion.div 
                    key="history"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6 max-w-2xl mx-auto"
                  >
                    {historyLoading ? (
                      <div className="py-20 flex justify-center opacity-20"><Activity className="animate-pulse" /></div>
                    ) : (historyData?.data?.assignments || []).map((h, i) => (
                      <div key={i} className="relative pl-8 pb-8 border-l border-white/10 last:border-0 last:pb-0">
                         <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                         <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                            <div className="flex justify-between items-start mb-2">
                               <p className="text-xs font-black text-white italic">{h.employeeName}</p>
                               <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${
                                 h.status === 'active' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' : 'text-slate-500 border-white/10 bg-white/5'
                               }`}>
                                 {h.status}
                               </span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight mb-3 uppercase tracking-widest">
                               Assignment Cycle: {h.assignmentDate} → {h.removalDate || 'PRESENT'}
                            </p>
                            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic">Authorized by {h.assignedBy}</p>
                         </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {activeTab === 'versions' && (
                  <motion.div 
                    key="versions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    {versionsLoading ? (
                      <div className="py-20 flex justify-center opacity-20"><RotateCcw className="animate-pulse" /></div>
                    ) : (versionsData?.data?.versions || []).map((v, i) => (
                      <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                        <div className="flex items-center gap-6">
                           <div className="text-2xl font-black text-slate-700 font-mono tracking-tighter group-hover:text-primary transition-colors">#{v.version}</div>
                           <div>
                              <p className="text-xs font-black text-white italic mb-1 uppercase tracking-tight">
                                 {typeof v.changes === 'string' ? v.changes : 'Protocol Refined'}
                              </p>
                              <p className="text-[9px] text-slate-500 uppercase tracking-widest">System Update by {v.updatedBy} | {v.updatedAt}</p>
                           </div>
                        </div>
                        <StandardButton 
                          variant="secondary" 
                          size="sm" 
                          icon={RotateCcw} 
                          onClick={() => handleRollback(v.version)}
                          isLoading={isRollingBack}
                        >
                          RESTORE
                        </StandardButton>
                      </div>
                    ))}
                  </motion.div>
                )}

                {activeTab === 'analytics' && (
                  <motion.div 
                    key="analytics"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-8"
                  >
                    {analyticsLoading ? (
                       <div className="py-20 flex justify-center opacity-20"><TrendingUp className="animate-pulse" /></div>
                    ) : (
                      <>
                        <KPIWidget columns={3}>
                           <KPITile label="Utilization" value={`${analyticsData?.data?.metrics?.completionRate || 0}%`} sub="Avg. Protocol Integrity" color="primary" icon={Activity} />
                           <KPITile label="Total Cycles" value={analyticsData?.data?.metrics?.totalAssignments || 0} sub="Historical Deployments" color="success" icon={Users} />
                           <KPITile label="Load Variance" value={analyticsData?.data?.metrics?.averageHoursPerWeek || 0} sub="Real vs Est. Load" color="warning" icon={Clock} />
                        </KPIWidget>
                        
                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6">
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Retention & Success Trend</p>
                           <div className="flex items-center gap-2">
                              {/* Simple trend indicator since full charts would need more data */}
                              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                 <motion.div 
                                    className="h-full bg-primary" 
                                    initial={{ width: 0 }} 
                                    animate={{ width: `${analyticsData?.data?.metrics?.satisfactionScore * 20}%` }} 
                                 />
                              </div>
                              <span className="text-xs font-black text-white">SCORE: {analyticsData?.data?.metrics?.satisfactionScore || 0}/5</span>
                           </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

const DetailItem = ({ label, value, color }) => (
  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
     <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">{label}</p>
     <p className={`text-xs font-black italic uppercase tracking-tight text-${color}-400`}>{value || 'N/A'}</p>
  </div>
);

export default ResponsibilityDetailView;
