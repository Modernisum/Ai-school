import React, { useState, useCallback } from 'react';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { toast } from 'react-toastify';
import SpaceCard from './SpaceCard';
import TransferMaterialModal from '../space/TransferMaterialModal';

export default function FloorPlanView({ spaces, materialsBySpace, schoolId, onViewDetails }) {
  const [activeId, setActiveId] = useState(null);
  const [transferTarget, setTransferTarget] = useState(null);
  const [dragSource, setDragSource] = useState(null);

  const handleDragStart = useCallback((event) => {
    const { active } = event;
    setActiveId(active.id);
    const data = active.data.current;
    if (data?.type === 'space-drag') {
      setDragSource(data.space);
    }
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !active.data.current) return;

    const sourceData = active.data.current;
    const targetData = over.data.current;

    if (!sourceData || !targetData) return;
    if (sourceData.type !== 'space-drag' || targetData.type !== 'space') return;
    if (sourceData.space?.spaceId === targetData.space?.spaceId) return;

    setDragSource(sourceData.space);
    setTransferTarget({ targetSpace: targetData.space });
  }, []);

  const handleTransferClose = useCallback(() => {
    setTransferTarget(null);
    setDragSource(null);
  }, []);

  const activeSpace = activeId
    ? spaces.find(s => `space-${s.spaceId || s.name}` === activeId)
    : null;

  return (
    <>
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {spaces.map((space) => {
            const name = space.spaceName || space.name || '';
            const mats = materialsBySpace?.[name] || [];
            return (
              <SpaceCard
                key={space.spaceId || name}
                space={space}
                materials={mats}
                isDropTarget={true}
                onViewDetails={onViewDetails}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeSpace ? (
            <div className="opacity-80">
              <SpaceCard
                space={activeSpace}
                materials={materialsBySpace?.[activeSpace.spaceName || activeSpace.name] || []}
                isDropTarget={false}
                onViewDetails={onViewDetails}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {transferTarget && dragSource && (
        <TransferMaterialModal
          schoolId={schoolId}
          spaces={spaces}
          material={null}
          fromSpace={dragSource}
          materials={materialsBySpace?.[dragSource.spaceName || dragSource.name] || []}
          onClose={handleTransferClose}
          onTransfer={(args) => {
            // handle transfer — parent will wire actual mutation
            toast.info(`Transferring ${args.body.quantity} x ${args.materialName}`);
          }}
        />
      )}
    </>
  );
}
