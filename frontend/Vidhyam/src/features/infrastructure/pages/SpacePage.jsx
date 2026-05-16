import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Layers, Upload, Box, Edit3, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";

import FormWidget from "../../../components/ui/FormWidget";
import GlassCard from "../../../components/ui/GlassCard";
import StandardButton from "../../../components/ui/StandardButton";
import BulkImportModal from "../../../components/ui/BulkImportModal";
import NoConnection from "../../../components/ui/NoConnection.jsx";

import SpaceDashboard from "../components/space/SpaceDashboard";
import SpaceDataGrid from "../components/space/SpaceDataGrid";
import SpaceDetailModal from "../components/space/SpaceDetailModal";
import CloneSpaceModal from "../components/space/CloneSpaceModal";
import TransferMaterialModal from "../components/space/TransferMaterialModal";

import {
  useGetSpacesQuery,
  useGetSpaceCategoriesQuery,
  useCreateSpaceCategoryMutation,
  useDeleteSpaceCategoryMutation,
  useCreateSpaceMutation,
  useUpdateSpaceMutation,
  useDeleteSpaceMutation,
  useGetSpaceMaterialsQuery,
  useCloneSpaceMutation,
  useTransferMaterialMutation,
  useGetSpaceResponsibilitiesQuery,
  useGetSpaceDistributionMetricsQuery,
} from "../infrastructureApi";
import { useGetEmployeesQuery } from "../../employees/api/employeeApi";

function SpacePage({ schoolId, pollingInterval }) {
  const { data: spacesData, isLoading: spacesLoading, isFetching, refetch: refetchSpaces, error: spacesError } = useGetSpacesQuery(schoolId, { pollingInterval });
  const { data: categoriesData, isFetching: categoriesFetching, error: categoriesError } = useGetSpaceCategoriesQuery(schoolId, { pollingInterval });
  const { data: distributionData } = useGetSpaceDistributionMetricsQuery(schoolId, { pollingInterval, skip: !!spacesError });
  const { data: employeesData } = useGetEmployeesQuery(schoolId, { pollingInterval, skip: !!spacesError });

  const isOffline = spacesError?.status === "FETCH_ERROR" || categoriesError?.status === "FETCH_ERROR";

  const [createSpaceCategory] = useCreateSpaceCategoryMutation();
  const [deleteSpaceCategory] = useDeleteSpaceCategoryMutation();
  const [createSpace] = useCreateSpaceMutation();
  const [updateSpace] = useUpdateSpaceMutation();
  const [deleteSpace] = useDeleteSpaceMutation();
  const [cloneSpace] = useCloneSpaceMutation();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryView, setShowCategoryView] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [detailSpace, setDetailSpace] = useState(null);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const [cloneSource, setCloneSource] = useState(null);

  const { control, handleSubmit, reset } = useForm();

  const spaces = spacesData?.spaces || spacesData?.data || [];
  const categoriesList = React.useMemo(() =>
    Array.from(new Set(categoriesData?.map(c => typeof c === "string" ? c : (c.name || "Unnamed")) || []))
  , [categoriesData]);

  const SPACE_SCHEMA = React.useMemo(() => [
    {
      id: "general",
      label: "Sector Definition",
      icon: Box,
      fields: [
        { name: "spaceName", label: "Space Identifier", type: "text", required: true, labelIcon: Box, placeholder: "e.g. Physics Lab A" },
        {
          name: "categoryName",
          label: "Infrastucture Class",
          type: "select",
          options: categoriesList,
          required: true,
          labelIcon: Layers
        },
        { name: "roomSize", label: "Sector Dimensions", type: "text", labelIcon: Box, placeholder: "e.g. 40x60 sqft" },
        { name: "description", label: "Operational Description", type: "textarea", placeholder: "Define intended use..." },
      ]
    }
  ], [categoriesList]);

  // Compute space responsibility counts from distribution data
  const spaceResponsibilityCount = React.useMemo(() => {
    const counts = {};
    const distList = distributionData?.spaces || [];
    for (const s of distList) {
      counts[s.spaceId] = s.responsibilityCount || 0;
    }
    return counts;
  }, [distributionData]);

  // Material alerts per space are fetched in SpaceDetailModal on demand

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createSpaceCategory({ schoolId, body: { name: newCategoryName.trim() } }).unwrap();
      toast.success("Category provisioned");
      setNewCategoryName("");
    } catch (e) { toast.error(e?.data?.message || "Creation failure"); }
  };

  const handleCreateSpace = async (data) => {
    try {
      const category = data.categoryName || categoriesList[0];
      await createSpace({ schoolId, category, body: data }).unwrap();
      toast.success("Sector Provisioned Successfully");
      setShowAddForm(false); reset();
    } catch (e) { toast.error(e?.data?.message || "Provisioning failure"); }
  };

  const handleUpdateSpace = async (id, data) => {
    try {
      await updateSpace({ schoolId, spaceName: id, body: data }).unwrap();
      toast.success("Sector Protocol Updated");
      setEditingSpace(null); reset();
    } catch (e) { toast.error(e?.data?.message || "Update failure"); }
  };

  const handleDeleteSpace = async (space) => {
    const name = space.spaceName || space.name;
    if (!window.confirm(`Decommission '${name}' permanently?`)) return;
    try {
      await deleteSpace({ schoolId, spaceName: name }).unwrap();
      toast.success("Sector Purged");
    } catch (e) { toast.error(e?.data?.message || "Decommission failure"); }
  };

  const handleCloneSpace = async (space) => {
    setCloneSource(space);
    setCloneModalOpen(true);
  };

  const handleCloneSubmit = async (args) => {
    await cloneSpace(args).unwrap();
    refetchSpaces();
  };

  if (isOffline && !spaces.length) {
    return <NoConnection onRetry={refetchSpaces} />;
  }

  return (
    <div className="max-w-full p-1 space-y-2">
      {/* Dashboard Section */}
      <SpaceDashboard
        spaces={spaces}
        categories={categoriesData}
        spaceDistribution={distributionData}
        isLoading={spacesLoading}
      />

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-2 items-center justify-between bg-white/5 p-1.5 rounded-xl border border-white/10">
        <div className="flex items-center gap-1">
          <StandardButton label="ADD_SECTOR" icon={Plus} size="xs" onClick={() => setShowAddForm(true)} />
          <StandardButton label="ARCHITECT" variant="ghost" icon={Layers} size="xs" onClick={() => setShowCategoryView(true)} />
          <StandardButton label="SYNC" variant="ghost" icon={Upload} size="xs" onClick={() => setBulkModalOpen(true)} />
        </div>
      </div>

      {/* Data Grid */}
      <SpaceDataGrid
        spaces={spaces}
        materialsBySpace={{}}
        spaceResponsibilityCount={spaceResponsibilityCount}
        isLoading={spacesLoading}
        search={search}
        onSearchChange={setSearch}
        onViewDetails={setDetailSpace}
        onEdit={(s) => setEditingSpace(s)}
        onDelete={(s) => handleDeleteSpace(s)}
      />

      {/* Add/Edit Space Form */}
      <AnimatePresence>
        {(showAddForm || editingSpace) && (
          <div className="fixed inset-0 z-[120] flex items-center justify-end p-8 pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/20 backdrop-blur-xl pointer-events-auto"
              onClick={() => { setShowAddForm(false); setEditingSpace(null); reset(); }}
            />
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="relative w-full max-w-xl z-10 pointer-events-auto"
            >
              <FormWidget
                title={editingSpace ? "MODIFY_SECTOR" : "PROVISION_SECTOR"}
                description={editingSpace ? "Update internal parameters." : "Provision a new node."}
                sections={SPACE_SCHEMA}
                control={control}
                onSubmit={handleSubmit(editingSpace ? (data) => handleUpdateSpace(editingSpace.spaceId || editingSpace.id, data) : handleCreateSpace)}
                onCancel={() => { setShowAddForm(false); setEditingSpace(null); reset(); }}
                submitLabel={editingSpace ? "COMMIT_NODE" : "INITIALIZE_PROVISION"}
                dense
              />
            </motion.div>
          </div>
        )}

        {/* Category Manager */}
        {showCategoryView && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-3xl bg-slate-950/60">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-2xl">
              <GlassCard title="ARCHITECTURE_MANAGER" onClose={() => setShowCategoryView(false)} className="p-4" glowColor="accent" dense>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-4">
                    <div>
                      <p className="text-micro font-black text-slate-800 uppercase tracking-widest mb-2">PROVISION_NEW_CLASS</p>
                      <div className="flex gap-2">
                        <input
                          className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-micro text-white focus:outline-none focus:border-primary/50 font-bold uppercase tracking-tight placeholder:text-slate-800"
                          placeholder="e.g. LABORATORY..."
                          value={newCategoryName}
                          onChange={e => setNewCategoryName(e.target.value)}
                        />
                        <StandardButton icon={Plus} size="xs" onClick={handleCreateCategory} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-micro font-black text-slate-800 uppercase tracking-widest">ACTIVE_CLASS_REGISTRY</p>
                    <div className="grid grid-cols-1 gap-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                      {categoriesData?.map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:border-primary/20 transition-all group">
                          <span className="text-micro font-black text-white uppercase tracking-tighter italic">{typeof c === "string" ? c : c.name}</span>
                          <StandardButton variant="ghost" size="xs" icon={Trash2} onClick={() => deleteSpaceCategory({ schoolId, categoryId: c.id || c })} className="text-rose-500 opacity-0 group-hover:opacity-100" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}

        {/* Space Detail Modal */}
        {detailSpace && (
          <SpaceDetailModal
            schoolId={schoolId}
            space={detailSpace}
            spaces={spaces}
            allSpaces={spaces}
            onClose={() => setDetailSpace(null)}
            onClone={handleCloneSpace}
          />
        )}

        {/* Clone Space Modal */}
        {cloneModalOpen && (
          <CloneSpaceModal
            schoolId={schoolId}
            spaces={spaces}
            onClose={() => { setCloneModalOpen(false); setCloneSource(null); }}
            onClone={handleCloneSubmit}
          />
        )}

        {/* Transfer Material Modal */}
        {transferTarget && (
          <TransferMaterialModal
            schoolId={schoolId}
            spaces={spaces}
            material={transferTarget.material}
            fromSpace={transferTarget.space}
            onClose={() => setTransferTarget(null)}
            onTransfer={(args) => {
              // handle transfer via mutation hook
            }}
          />
        )}
      </AnimatePresence>

      {bulkModalOpen && (
        <BulkImportModal
          type="spaces"
          schoolId={schoolId}
          onClose={() => setBulkModalOpen(false)}
          onSuccess={() => { toast.success("Bulk Import Synchronized"); refetchSpaces(); }}
        />
      )}
    </div>
  );
}

export default SpacePage;
