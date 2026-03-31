import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, LayoutGrid, Loader } from 'lucide-react';
import { useGetResponsibilitiesQuery, useGetResponsibilityDetailsQuery, useCreateResponsibilityMutation } from '../infrastructureApi';
import ResponsibilityCard from '../components/responsibility/ResponsibilityCard';
import ResponsibilityForm from '../components/responsibility/ResponsibilityForm';
import ResponsibilityDetailModal from '../components/responsibility/ResponsibilityDetailModal';

function ResponsibilityPage({ schoolId, pollingInterval, spaces }) {
  const { data: responsibilitiesData, isFetching: responsibilitiesFetching } = useGetResponsibilitiesQuery(schoolId, { pollingInterval });
  const [createResponsibility] = useCreateResponsibilityMutation();
  const [selectedResponsibilityId, setSelectedResponsibilityId] = useState(null);
  const { data: responsibilityDetails, isFetching: detailsFetching } = useGetResponsibilityDetailsQuery(
    { schoolId, responsibilityId: selectedResponsibilityId },
    { skip: !selectedResponsibilityId }
  );

  const [newResponsibilityName, setNewResponsibilityName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRolePrice, setNewRolePrice] = useState('');
  const [newRolePerDayPrice, setNewRolePerDayPrice] = useState('');
  const [newRoleTimePeriod, setNewRoleTimePeriod] = useState('30');
  const [newRoleType, setNewRoleType] = useState('teacher');
  const [newRoleSpaceId, setNewRoleSpaceId] = useState('');
  const [employees, setEmployees] = useState([]);

  const handleCreateResponsibility = async () => {
    if (!newResponsibilityName.trim()) return;
    try {
      // Filter out empty employee entries and clean up spaceIds
      const filteredEmployees = employees
        .filter(emp => emp.employeeId && emp.employeeId.trim() !== '')
        .map(emp => ({
          employeeId: emp.employeeId.trim(),
          spaceIds: (emp.spaceIds || [])
            .filter(spaceId => spaceId && spaceId.trim() !== '')
            .map(spaceId => spaceId.trim())
        }))
        .filter(emp => emp.spaceIds.length > 0 || emp.employeeId !== '');

      const body = {
        name: newResponsibilityName.trim(),
        description: newRoleDescription.trim(),
        employeeType: newRoleType,
        monthlyPrice: parseFloat(newRolePrice) || 0,
        perDayPrice: parseFloat(newRolePerDayPrice) || 0,
        timePeriod: parseInt(newRoleTimePeriod) || 30,
        spaceId: newRoleSpaceId || null,
        employees: filteredEmployees
      };
      await createResponsibility({ schoolId, body }).unwrap();
      showToast('success', 'Mission Protocol (Role) Authorized');
      setNewResponsibilityName('');
      setNewRoleDescription('');
      setNewRolePrice('');
      setNewRolePerDayPrice('');
      setNewRoleTimePeriod('30');
      setNewRoleType('teacher');
      setNewRoleSpaceId('');
      setEmployees([]);
    } catch (e) { showToast('error', e.data?.message || 'Failed to authorize protocol'); }
  };

  const showToast = (type, message) => {
    // This would typically use a toast notification library
    console.log(`${type}: ${message}`);
  };

  const handleCardClick = (responsibilityId) => {
    setSelectedResponsibilityId(responsibilityId);
  };

  const handleCloseModal = () => {
    setSelectedResponsibilityId(null);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-8 max-w-5xl mx-auto space-y-12">
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
            newResponsibilityName={newResponsibilityName}
            setNewResponsibilityName={setNewResponsibilityName}
            newRoleDescription={newRoleDescription}
            setNewRoleDescription={setNewRoleDescription}
            newRolePrice={newRolePrice}
            setNewRolePrice={setNewRolePrice}
            newRolePerDayPrice={newRolePerDayPrice}
            setNewRolePerDayPrice={setNewRolePerDayPrice}
            newRoleTimePeriod={newRoleTimePeriod}
            setNewRoleTimePeriod={setNewRoleTimePeriod}
            newRoleType={newRoleType}
            setNewRoleType={setNewRoleType}
            newRoleSpaceId={newRoleSpaceId}
            setNewRoleSpaceId={setNewRoleSpaceId}
            employees={employees}
            setEmployees={setEmployees}
            spaces={spaces}
            handleCreateResponsibility={handleCreateResponsibility}
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