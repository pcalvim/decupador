import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useStoryboardStore } from './useStoryboardStore';

export const useDrag = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'scene' | 'shot' | null>(null);
  
  const { reorderScenes, reorderShots, moveShot } = useStoryboardStore();
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // Determine if we're dragging a scene or a shot
    if (active.data.current?.type === 'scene') {
      setActiveType('scene');
    } else if (active.data.current?.type === 'shot') {
      setActiveType('shot');
    }
  }, []);
  
  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Only handle shot dragging between scenes
    if (activeType !== 'shot') return;
    
    const { active, over } = event;
    if (!over) return;
    
    const activeSceneId = active.data.current?.sceneId;
    const activeShot = active.id;
    
    // If over a scene container that's different from the active scene
    if (over.data.current?.type === 'scene' && over.id !== activeSceneId) {
      moveShot(activeSceneId, over.id as string, activeShot as string);
    }
  }, [activeType, moveShot]);
  
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setActiveType(null);
      return;
    }
    
    // Handle scene reordering
    if (activeType === 'scene' && active.id !== over.id) {
      const activeIndex = active.data.current?.sortable?.index;
      const overIndex = over.data.current?.sortable?.index;
      
      if (activeIndex !== undefined && overIndex !== undefined) {
        reorderScenes(activeIndex, overIndex);
      }
    }
    
    // Handle shot reordering within the same scene
    if (activeType === 'shot' && active.id !== over.id) {
      const activeSceneId = active.data.current?.sceneId;
      const overSceneId = over.data.current?.sceneId;
      
      // Only reorder if in the same scene
      if (activeSceneId === overSceneId) {
        const activeIndex = active.data.current?.sortable?.index;
        const overIndex = over.data.current?.sortable?.index;
        
        if (activeIndex !== undefined && overIndex !== undefined) {
          reorderShots(activeSceneId, activeIndex, overIndex);
        }
      }
    }
    
    setActiveId(null);
    setActiveType(null);
  }, [activeType, reorderScenes, reorderShots]);
  
  return {
    DndContextProvider: ({ children }: { children: React.ReactNode }) => (
      <DndContext 
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {children}
      </DndContext>
    ),
    activeId,
    activeType
  };
};