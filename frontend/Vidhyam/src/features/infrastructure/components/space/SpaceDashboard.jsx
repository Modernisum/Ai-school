import React from 'react';
import { motion } from 'framer-motion';
import { Layout, Layers, CheckCircle, AlertTriangle, DollarSign, Users, Briefcase, Box } from 'lucide-react';
import GlassCard from '../../../../components/ui/GlassCard';
import KPIWidget from '../../../../components/ui/KPIWidget';
import SkeletonLoader from '../../../../components/ui/SkeletonLoader';
import SpaceAlertBanner from './SpaceAlertBanner';

export default function SpaceDashboard({
  spaces,
  categories,
  spaceDistribution,
  materialsBySpace,
  isLoading,
}) {
  const totalSpaces = spaces?.length || 0;
  const totalCategories = Array.from(new Set((spaces || []).map(s => s.spaceCategory || 'Uncategorized'))).length;
  const distributionData = spaceDistribution?.spaces || [];
  const assignedEmployees = distributionData.reduce((sum, s) => sum + (s.employeeCount || 0), 0);
  const vacantSpaces = distributionData.filter(s => (s.employeeCount || 0) === 0).length;

  const alerts = React.useMemo(() => {
    const result = [];
    const deficitSpaces = new Set();
    if (materialsBySpace && spaces) {
      for (const space of spaces) {
        const name = space.spaceId || space.name;
        const mats = materialsBySpace[name];
        if (mats && mats.length > 0) {
          const deficits = mats.filter(m => m.status === 'deficit');
          if (deficits.length > 0) {
            deficitSpaces.add(name);
            result.push({
              spaceId: name,
              spaceName: space.spaceName || space.name,
              category: space.spaceCategory,
              type: 'MATERIAL_SHORTAGE',
              severity: deficits.length > 2 ? 'critical' : 'warning',
              message: `${space.spaceName || space.name}: ${deficits.length} material(s) short (${deficits.map(d => d.materialName).join(', ')})`,
            });
          }
        }
      }
    }
    for (const dist of distributionData) {
      if ((dist.employeeCount || 0) === 0 && !deficitSpaces.has(dist.spaceId)) {
        result.push({
          spaceId: dist.spaceId,
          spaceName: dist.name || dist.spaceId,
          type: 'MISSING_RESPONSIBILITY',
          severity: 'warning',
          message: `${dist.name || dist.spaceId}: No employees assigned`,
        });
      }
    }
    return result;
  }, [materialsBySpace, spaces, distributionData]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map(i => <SkeletonLoader key={i} variant="card" className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <SpaceAlertBanner alerts={alerts} />
      <KPIWidget columns={4} gap="gap-2"
        kpis={[
          { label: 'Total Spaces', value: totalSpaces, sub: 'Total Space Count', icon: Box, color: 'primary' },
          { label: 'Categories', value: totalCategories, sub: 'Active Categories', icon: Layers, color: 'accent' },
          { label: 'Assigned', value: assignedEmployees, sub: 'Assigned Staff', icon: Briefcase, color: 'success' },
          { label: 'Vacant', value: vacantSpaces, sub: 'Vacant Spaces', icon: vacantSpaces > 0 ? AlertTriangle : CheckCircle, color: vacantSpaces > 0 ? 'warning' : 'success' },
        ]}
      />
    </div>
  );
}
