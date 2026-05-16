import React from 'react';
import { motion } from 'framer-motion';
import { Package, Briefcase, Users, X, Box, IndianRupee, Pencil } from 'lucide-react';
import { toast } from 'react-toastify';
import GlassCard from '../../../../components/ui/GlassCard';
import StandardButton from '../../../../components/ui/StandardButton';
import SkeletonLoader from '../../../../components/ui/SkeletonLoader';
import SpaceMaterialTab from './SpaceMaterialTab';
import SpaceResponsibilityTab from './SpaceResponsibilityTab';
import SpaceConsumersTab from './SpaceConsumersTab';
import BudgetIndicator from './BudgetIndicator';
import FinancialOverviewWidget from './FinancialOverviewWidget';
import TransferMaterialModal from './TransferMaterialModal';
import {
  useGetSpaceMaterialsQuery,
  useGetSpaceResponsibilitiesQuery,
  useGetSpaceFinancialOverviewQuery,
  useUpdateSpaceBudgetMutation,
} from '../../api/infrastructureApi';
import { useGetStudentsQuery } from '../../../students/api/studentApi';

const TABS = [
  { id: 'materials', label: 'MATERIALS', icon: Package },
  { id: 'responsibilities', label: 'RESPONSIBILITIES', icon: Briefcase },
  { id: 'consumers', label: 'CONSUMERS', icon: Users },
];

function getSectionFromSpaceName(spaceName) {
  if (!spaceName) return null;
  const parts = spaceName.split('-');
  if (parts.length >= 2) {
    const section = parts[parts.length - 1];
    const cls = parts.slice(0, -1).join('-');
    return { class: cls, section };
  }
  return null;
}

export default function SpaceDetailModal({ schoolId, space, spaces, allSpaces, onClose, onClone, onUpdateBudget }) {
  const [activeTab, setActiveTab] = React.useState('materials');
  const [transferTarget, setTransferTarget] = React.useState(null);
  const [editingBudget, setEditingBudget] = React.useState(false);
  const [budgetInput, setBudgetInput] = React.useState('');
  const [updateBudgetMutation] = useUpdateSpaceBudgetMutation();

  const name = space?.spaceName || space?.name;
  const spaceId = space?.spaceId || name;

  const { data: materialsData, isLoading: matsLoading, error: matsError } = useGetSpaceMaterialsQuery(
    { schoolId, spaceName: name },
    { skip: !name }
  );

  const { data: responsibilitiesData, isLoading: respLoading } = useGetSpaceResponsibilitiesQuery(
    { schoolId, spaceId },
    { skip: !spaceId }
  );

  const { data: financialData, isLoading: financialLoading } = useGetSpaceFinancialOverviewQuery(
    { schoolId, spaceId },
    { skip: !spaceId }
  );

  const sectionInfo = getSectionFromSpaceName(name);

  const { data: studentsData, isLoading: studentsLoading } = useGetStudentsQuery(
    schoolId,
    { skip: !sectionInfo }
  );

  const materials = materialsData?.materials || [];
  const summary = materialsData?.summary || {};
  const responsibilities = responsibilitiesData?.data || [];

  const filteredStudents = React.useMemo(() => {
    if (!studentsData || !sectionInfo) return [];
    const list = studentsData?.data || studentsData?.students || studentsData || [];
    return list.filter(s =>
      String(s.class || s.className || '').toLowerCase() === String(sectionInfo.class).toLowerCase() &&
      String(s.section || '').toLowerCase() === String(sectionInfo.section).toLowerCase()
    );
  }, [studentsData, sectionInfo]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-3xl bg-slate-950/60">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-3xl max-h-[85vh] flex flex-col"
      >
        <GlassCard className="p-0 overflow-hidden flex flex-col" glowColor="primary">
          <div className="flex items-center justify-between p-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Box size={14} className="text-primary" />
              <div>
                <h2 className="text-[11px] font-black text-white uppercase tracking-tight">{name}</h2>
                <p className="text-[8px] font-bold text-primary/60 uppercase tracking-widest">{space?.spaceCategory || 'SPACE'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <StandardButton label="CLONE" icon={Package} variant="ghost" size="xs"
                onClick={() => onClone && onClone(space)} />
              <button onClick={onClose} className="p-1 hover:bg-white/5 rounded transition-colors">
                <X size={14} className="text-slate-500" />
              </button>
            </div>
          </div>

          {(summary?.totalValue > 0 || summary?.budget) && (
            <div className="px-3 py-1.5 bg-primary/5 border-b border-primary/10 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black text-primary uppercase tracking-widest">VALUE:</span>
                <span className="text-[9px] font-black text-white flex items-center gap-1">
                  <IndianRupee size={9} />{summary.totalValue.toLocaleString()}
                </span>
              </div>
              {summary.deficitCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[7px] font-black text-red-400 uppercase tracking-widest">SHORT:</span>
                  <span className="text-[8px] font-black text-red-400">₹{summary.deficitValue.toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <BudgetIndicator totalValue={summary.totalValue} budget={summary.budget} />
                <button onClick={() => { setBudgetInput(summary.budget || ''); setEditingBudget(true); }}
                  className="p-0.5 hover:bg-white/5 rounded text-slate-600 hover:text-slate-400 transition-colors">
                  <Pencil size={8} />
                </button>
              </div>
              {editingBudget && (
                <div className="flex items-center gap-1">
                  <input type="number" value={budgetInput}
                    onChange={e => setBudgetInput(e.target.value)}
                    className="w-20 px-1 py-0.5 text-[8px] font-black bg-slate-800 border border-white/10 rounded text-white uppercase"
                    placeholder="Budget" />
                  <button onClick={async () => {
                    const val = parseFloat(budgetInput);
                    if (!isNaN(val) && val >= 0) {
                      await updateBudgetMutation({ schoolId, spaceName: name, budget: val });
                      toast.success('Budget updated');
                    }
                    setEditingBudget(false);
                  }} className="text-[8px] font-black text-green-400 hover:text-green-300 px-1">SAVE</button>
                  <button onClick={() => setEditingBudget(false)}
                    className="text-[8px] font-black text-slate-600 hover:text-slate-400 px-1">X</button>
                </div>
              )}
            </div>
          )}

          <div className="px-3 pt-2">
            <FinancialOverviewWidget data={financialData?.data} isLoading={financialLoading} />
          </div>

          <div className="flex border-b border-white/5">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-3 py-2 text-[8px] font-black uppercase tracking-widest transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'text-primary border-primary bg-primary/5'
                    : 'text-slate-700 border-transparent hover:text-slate-500'
                }`}
              >
                <tab.icon size={10} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            {activeTab === 'materials' && (
              <SpaceMaterialTab
                materials={materials}
                summary={summary}
                isLoading={matsLoading}
                onTransfer={(mat) => setTransferTarget(mat)}
                onAddMaterial={() => toast.info('Use Materials page to assign')}
              />
            )}
            {activeTab === 'responsibilities' && (
              <SpaceResponsibilityTab
                responsibilities={responsibilities}
                isLoading={respLoading}
                onAssign={() => toast.info('Use Responsibilities page to assign')}
                onRemove={() => toast.info('Remove from Responsibilities page')}
              />
            )}
            {activeTab === 'consumers' && (
              <SpaceConsumersTab
                students={filteredStudents}
                isLoading={studentsLoading}
              />
            )}
          </div>
        </GlassCard>
      </motion.div>

      {transferTarget && spaces && (
        <TransferMaterialModal
          schoolId={schoolId}
          spaces={allSpaces || [space]}
          material={transferTarget}
          fromSpace={space}
          onClose={() => setTransferTarget(null)}
          onTransfer={(args) => {
            // This creates the transfer call — the mutation hook will be passed from parent
          }}
        />
      )}
    </div>
  );
}
