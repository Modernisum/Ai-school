import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Loader } from 'lucide-react';
import { 
  useGetResponsibilitiesQuery, 
  useGetResponsibilityDetailsQuery, 
  useCreateResponsibilityMutation,
  useUpdateResponsibilityMutation,
  useDeleteResponsibilityMutation 
} from '../infrastructureApi';
import ResponsibilityCard from '../components/responsibility/ResponsibilityCard';
import ResponsibilityForm from '../components/responsibility/ResponsibilityForm';
import ResponsibilityDetailModal from '../components/responsibility/ResponsibilityDetailModal';
import NoConnection from '../../../components/ui/NoConnection.jsx';

function ResponsibilityPage({ schoolId, pollingInterval, spaces, showToast }) {
  const { data: responsibilitiesData, isFetching: responsibilitiesFetching, refetch: refetchResponsibilities, error: responsibilitiesError } = useGetResponsibilitiesQuery(schoolId, { pollingInterval });
  
  const isOffline = responsibilitiesError?.status === 'FETCH_ERROR';
  const responsibilities = responsibilitiesData?.data || [];

  const [createResponsibility] = useCreateResponsibilityMutation();
  const [updateResponsibility] = useUpdateResponsibilityMutation();
  const [deleteResponsibility] = useDeleteResponsibilityMutation();
  
  const [selectedResponsibilityId, setSelectedResponsibilityId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingResponsibilityId, setEditingResponsibilityId] = useState(null);

  const { data: responsibilityDetails, isFetching: detailsFetching } = useGetResponsibilityDetailsQuery(
    { schoolId, responsibilityId: selectedResponsibilityId },
    { skip: !selectedResponsibilityId || isOffline }
  );

  const handleRetry = () => {
    refetchResponsibilities();
  };

  if (isOffline && !responsibilities.length) {
    return <NoConnection onRetry={handleRetry} />;
  }

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    spaceCategory: 'classroom',
    employeeType: 'teaching',
    workLevel: 'junior',
    workAmount: '0.0',
    workPeriod: 'monthly',
    spaceIds: [],
    studentFee: '0.0'
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      spaceCategory: 'classroom',
      employeeType: 'teaching',
      workLevel: 'junior',
      workAmount: '0.0',
      workPeriod: 'monthly',
      spaceIds: [],
      studentFee: '0.0'
    });
    setIsEditing(false);
    setEditingResponsibilityId(null);
  };

  const handleCreateResponsibility = async () => {
    if (!formData.name.trim()) return;
    try {
      const body = {
        ...formData,
        workAmount: parseFloat(formData.workAmount) || 0,
        studentFee: parseFloat(formData.studentFee) || 0,
        spaceIds: formData.spaceIds.filter(id => id.trim() !== '')
      };
      await createResponsibility({ schoolId, body }).unwrap();
      showToast('success', 'Mission Protocol (Role) Authorized');
      resetForm();
    } catch (e) { showToast('error', e.data?.message || 'Failed to authorize protocol'); }
  };

  const handleUpdateResponsibility = async () => {
    if (!formData.name.trim() || !editingResponsibilityId) return;
    try {
      const body = {
        ...formData,
        workAmount: parseFloat(formData.workAmount) || 0,
        studentFee: parseFloat(formData.studentFee) || 0,
        spaceIds: formData.spaceIds.filter(id => id.trim() !== '')
      };
      await updateResponsibility({ 
        schoolId, 
        responsibilityId: editingResponsibilityId, 
        body 
      }).unwrap();
      showToast('success', 'Protocol Updated and Re-authorized');
      resetForm();
    } catch (e) { showToast('error', e.data?.message || 'Failed to update protocol'); }
  };

  const handleEditClick = (responsibility) => {
    setFormData({
      name: responsibility.name || '',
      description: responsibility.description || '',
      spaceCategory: responsibility.spaceCategory || 'classroom',
      employeeType: responsibility.employeeType || 'teaching',
      workLevel: responsibility.workLevel || 'junior',
      workAmount: (responsibility.workAmount || 0).toString(),
      workPeriod: responsibility.workPeriod || 'monthly',
      spaceIds: responsibility.spaceIds || [],
      studentFee: (responsibility.studentFee || 0).toString()
    });
    setIsEditing(true);
    setEditingResponsibilityId(responsibility.responsibilityId || responsibility.id);
  };

  const handleDeleteResponsibility = async (responsibilityId) => {
    if (window.confirm('Are you sure you want to decommission this protocol?')) {
      try {
        await deleteResponsibility({ schoolId, responsibilityId }).unwrap();
        showToast('success', 'Protocol Decommissioned');
      } catch (e) { showToast('error', e.data?.message || 'Failed to decommission protocol'); }
    }
  };


  const handleCardClick = (responsibilityId) => {
    setSelectedResponsibilityId(responsibilityId);
  };

  const handleCloseModal = () => {
    setSelectedResponsibilityId(null);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-8 max-w-5xl mx-auto space-y-12">
      {isOffline && (
        <NoConnection compact onRetry={handleRetry} />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Command Roles</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-3">Personnel Responsibility Protocols</p>
        </div>
        <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <Briefcase size={20} />
           </div>
           <div>
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Active Protocols</p>
              <p className="text-lg font-black text-primary italic leading-none">{(responsibilitiesData?.data || []).length}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-1 space-y-6">
          <ResponsibilityForm
            formData={formData}
            setFormData={setFormData}
            spaces={spaces}
            handleCreateResponsibility={handleCreateResponsibility}
            handleUpdateResponsibility={handleUpdateResponsibility}
            isEditing={isEditing}
            resetForm={resetForm}
          />
        </div>

        <div className="md:col-span-2 space-y-6">
           <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operational Role Registry</p>
              {responsibilitiesFetching && <Loader className="animate-spin text-primary" size={14} />}
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(responsibilitiesData?.data || []).length === 0 && !responsibilitiesFetching && (
                <div className="col-span-full py-20 text-center bg-white/[0.01] border border-white/5 rounded-3xl border-dashed">
                  <p className="text-[10px] font-bold text-slate-600 uppercase italic">No custom roles defined in manifest</p>
                </div>
              )}
              {responsibilitiesData?.data?.map(r => (
                <ResponsibilityCard
                  key={r.responsibilityId || r.id}
                  responsibility={r}
                  spaces={spaces}
                  onClick={() => handleCardClick(r.responsibilityId || r.id)}
                  onEdit={() => handleEditClick(r)}
                  onDelete={() => handleDeleteResponsibility(r.responsibilityId || r.id)}
                />
              ))}
           </div>
           
           <div className="mt-8 pt-6 border-t border-white/5">
              <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] mb-4">Core System Defaults</p>
              <div className="flex flex-wrap gap-2">
                 {['Teaching', 'Admin', 'Management', 'Operational'].map(d => (
                   <span key={d} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                     {d}
                   </span>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {selectedResponsibilityId && responsibilityDetails?.data && (
        <ResponsibilityDetailModal
          responsibility={responsibilityDetails.data}
          onClose={handleCloseModal}
        />
      )}
    </motion.div>
  );
}

export default ResponsibilityPage;