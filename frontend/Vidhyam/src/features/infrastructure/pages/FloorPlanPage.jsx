import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard } from 'lucide-react';
import { useGetSpacesQuery, useGetAllSpacesMaterialsQuery } from '../infrastructureApi';
import FloorPlanView from '../components/floorplan/FloorPlanView';
import SkeletonLoader from '../../../components/ui/SkeletonLoader';

export default function FloorPlanPage({ schoolId, pollingInterval }) {
  const { data: spacesData, isLoading: spacesLoading } = useGetSpacesQuery(
    { schoolId },
    { pollingInterval, skip: !schoolId }
  );

  const { data: materialsData, isLoading: matsLoading } = useGetAllSpacesMaterialsQuery(
    schoolId,
    { pollingInterval, skip: !schoolId }
  );

  const spaces = spacesData?.data || [];
  const materialsBySpace = materialsData?.data || {};
  const isLoading = spacesLoading || matsLoading;

  if (isLoading) {
    return (
      <div className="space-y-1">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonLoader key={i} variant="card" className="h-16" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-1"
    >
      <div className="flex items-center gap-2 px-1">
        <LayoutDashboard size={12} className="text-primary" />
        <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.3em]">FLOOR PLAN · {spaces.length} SPACES</span>
      </div>
      <FloorPlanView
        spaces={spaces}
        materialsBySpace={materialsBySpace}
        schoolId={schoolId}
        onViewDetails={(space) => {
          // Will be connected to SpaceDetailModal when needed
        }}
      />
    </motion.div>
  );
}
