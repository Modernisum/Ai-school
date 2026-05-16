import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Box, AlertTriangle, CheckCircle } from 'lucide-react';
import GlassCard from '../../../../components/ui/GlassCard';

export default function SpaceCard({ space, materials, isDropTarget, onViewDetails }) {
  const name = space.spaceName || space.name || '';
  const spaceId = space.spaceId || name;
  const deficits = materials.filter(m => m.status === 'deficit');
  const status = deficits.length > 0 ? 'deficient' : materials.length > 0 ? 'full' : 'unset';

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: spaceId, data: { space, type: 'space' } });
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: `space-${spaceId}`,
    data: { space, type: 'space-drag' },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : 1,
  } : undefined;

  const borderColor = status === 'full' ? 'border-green-500/30'
    : status === 'deficient' ? 'border-red-500/30'
    : 'border-white/5';

  return (
    <div ref={setDropRef} className="relative">
      <GlassCard
        dense
        className={`bg-white/[0.02] ${borderColor} ${isOver ? 'ring-2 ring-primary' : ''} ${isDragging ? 'opacity-50' : ''}`}
        hover
        style={style}
      >
        <div ref={setDragRef} {...attributes} {...listeners} className="p-1.5 cursor-grab active:cursor-grabbing">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Box size={10} className="text-primary" />
              <span className="text-[9px] font-black text-white uppercase tracking-tighter truncate max-w-[100px]">{name}</span>
            </div>
            {status === 'full' && <CheckCircle size={8} className="text-green-400" />}
            {status === 'deficient' && <AlertTriangle size={8} className="text-red-400" />}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-black text-slate-700 uppercase tracking-widest">{space.spaceCategory || 'SPACE'}</span>
            <span className="text-[7px] font-black text-slate-700">·</span>
            <span className="text-[7px] font-black text-slate-700">{materials.length} items</span>
            {deficits.length > 0 && (
              <>
                <span className="text-[7px] font-black text-slate-700">·</span>
                <span className="text-[7px] font-black text-red-400">{deficits.length} short</span>
              </>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
