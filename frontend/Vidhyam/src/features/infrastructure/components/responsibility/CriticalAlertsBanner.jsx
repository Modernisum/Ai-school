import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import GlassCard from '../../../../components/ui/GlassCard';
import StandardButton from '../../../../components/ui/StandardButton';
import SkeletonLoader from '../../../../components/ui/SkeletonLoader';

export default function CriticalAlertsBanner({ alerts, isLoading, onDismiss, onNavigate }) {
  if (isLoading) {
    return <SkeletonLoader variant="card" className="h-8" />;
  }

  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {alerts.slice(0, 3).map((alert, i) => (
        <GlassCard key={`${alert.spaceId}-${alert.responsibilityId}-${i}`} dense className="bg-rose-500/10 border-rose-500/20" hover>
          <div className="p-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle size={14} className="text-rose-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] font-black text-rose-300 uppercase tracking-tight truncate">
                  {alert.spaceName} — {alert.responsibilityName}
                </p>
                <p className="text-[8px] text-rose-400/60 font-bold">
                  CRITICAL: This space is missing a mandatory responsibility
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onNavigate && (
                <StandardButton
                  variant="ghost"
                  size="xs"
                  label="ASSIGN"
                  className="text-rose-400 border-rose-500/30"
                  onClick={() => onNavigate(alert)}
                />
              )}
              {onDismiss && (
                <StandardButton
                  variant="ghost"
                  size="xs"
                  icon={X}
                  className="text-rose-500/50"
                  onClick={() => onDismiss(i)}
                />
              )}
            </div>
          </div>
        </GlassCard>
      ))}
      {alerts.length > 3 && (
        <p className="text-[8px] text-rose-400/40 text-center font-bold">
          +{alerts.length - 3} more critical alerts
        </p>
      )}
    </div>
  );
}
