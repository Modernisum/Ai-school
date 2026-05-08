import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import ResponsibilityHub from '../components/responsibility/ResponsibilityHub';
import ResponsibilityForm from '../components/responsibility/ResponsibilityForm';
import ResponsibilityDetailView from '../components/responsibility/ResponsibilityDetailView';
import BulkAssignModal from '../components/responsibility/BulkAssignModal';
import GlassCard from '../../../components/ui/GlassCard';

import { 
  useCreateResponsibilityMutation,
  useUpdateResponsibilityMutation
} from '../infrastructureApi';

function ResponsibilityPage({ schoolId }) {
  // Modal States
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingResponsibility, setEditingResponsibility] = useState(null);
  const [selectedResponsibilityId, setSelectedResponsibilityId] = useState(null);
  const [bulkAssignTarget, setBulkAssignTarget] = useState(null);

  // Mutations
  const [createResponsibility, { isLoading: isCreating }] = useCreateResponsibilityMutation();
  const [updateResponsibility, { isLoading: isUpdating }] = useUpdateResponsibilityMutation();

  // Form setup
  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      name: '',
      description: '',
      employeeType: 'teacher',
      priority: 'medium',
      estimatedHoursPerWeek: 0,
      compensation: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      isActive: true
    }
  });

  // Handlers
  const handleAddSubmit = async (data) => {
    try {
      await createResponsibility({ schoolId, body: data }).unwrap();
      toast.success('New Protocol Authorized in Registry');
      setShowAddForm(false);
      reset();
    } catch (err) {
      toast.error(err.data?.message || 'Authorization Failure');
    }
  };

  const handleEditSubmit = async (data) => {
    try {
      await updateResponsibility({ 
        schoolId, 
        responsibilityId: editingResponsibility.responsibilityId || editingResponsibility.id, 
        body: data 
      }).unwrap();
      toast.success('Protocol Parameters Re-calibrated');
      setEditingResponsibility(null);
      reset();
    } catch (err) {
      toast.error(err.data?.message || 'Calibration Failure');
    }
  };

  const openEdit = (r) => {
    reset({
      name: r.name,
      description: r.description,
      employeeType: r.employeeType,
      priority: r.priority,
      estimatedHoursPerWeek: r.estimatedHoursPerWeek,
      compensation: r.compensation,
      startDate: r.startDate || new Date().toISOString().split('T')[0],
      endDate: r.endDate || '',
      isActive: r.isActive !== undefined ? r.isActive : true
    });
    setEditingResponsibility(r);
  };

  return (
    <div className="max-w-full p-1 space-y-1">
      <ResponsibilityHub 
        schoolId={schoolId}
        onAddProtocol={() => { reset(); setShowAddForm(true); }}
        onEditProtocol={openEdit}
        onViewDetails={(r) => setSelectedResponsibilityId(r.responsibilityId || r.id)}
        onBulkAssign={setBulkAssignTarget}
      />

      <AnimatePresence>
        {/* Add/Edit Form Modal */}
        {(showAddForm || editingResponsibility) && (
          <div className="fixed inset-0 z-[120] flex items-center justify-end p-8 pointer-events-none">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/20 backdrop-blur-xl pointer-events-auto"
              onClick={() => { setShowAddForm(false); setEditingResponsibility(null); }}
            />
            
            {/* Form Container */}
            <motion.div 
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="relative w-full max-w-xl z-10 pointer-events-auto"
            >
              <ResponsibilityForm 
                control={control}
                isEditing={!!editingResponsibility}
                isLoading={isCreating || isUpdating}
                onCancel={() => { setShowAddForm(false); setEditingResponsibility(null); }}
                onSubmit={handleSubmit(editingResponsibility ? handleEditSubmit : handleAddSubmit)}
              />
            </motion.div>
          </div>
        )}

        {/* Detail View Modal */}
        {selectedResponsibilityId && (
          <ResponsibilityDetailView 
            schoolId={schoolId}
            responsibilityId={selectedResponsibilityId}
            onClose={() => setSelectedResponsibilityId(null)}
          />
        )}

        {/* Bulk Assign Modal */}
        {bulkAssignTarget && (
          <BulkAssignModal 
            schoolId={schoolId}
            responsibility={bulkAssignTarget}
            onClose={() => setBulkAssignTarget(null)}
            onSuccess={() => { /* Hub will refetch via RTK Query tags */ }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ResponsibilityPage;