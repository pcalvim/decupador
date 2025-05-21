import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useStoryboardStore } from '../hooks/useStoryboardStore';
import SceneCard from './SceneCard';
import { Film as FilmSlate } from 'lucide-react';

const ScenesList: React.FC = () => {
  const { scenes, addScene, reorderScenes } = useStoryboardStore();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const activeIndex = scenes.findIndex((scene) => scene.id === active.id);
      const overIndex = scenes.findIndex((scene) => scene.id === over.id);
      
      reorderScenes(activeIndex, overIndex);
    }
  };
  
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Scenes</h2>
        <button
          onClick={addScene}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors flex items-center"
        >
          <FilmSlate className="w-5 h-5 mr-2" />
          Add Scene
        </button>
      </div>
      
      {scenes.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center border-2 border-dashed border-gray-700">
          <FilmSlate className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 mb-4">No scenes yet. Start by adding your first scene!</p>
          <button
            onClick={addScene}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
          >
            Add First Scene
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={scenes.map((scene) => scene.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-6">
              {scenes.map((scene) => (
                <SceneCard key={scene.id} scene={scene} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default ScenesList;