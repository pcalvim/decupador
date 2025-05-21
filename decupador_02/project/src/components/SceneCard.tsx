import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStoryboardStore } from '../hooks/useStoryboardStore';
import ShotCard from './ShotCard';
import { 
  GripVertical, Trash2, Plus
} from 'lucide-react';
import { Scene } from '../types/models';
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
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';

interface SceneCardProps {
  scene: Scene;
}

const SceneCard: React.FC<SceneCardProps> = ({ scene }) => {
  const [title, setTitle] = useState(scene.title);
  const [description, setDescription] = useState(scene.description);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  
  const { updateScene, removeScene, addShot, reorderShots } = useStoryboardStore();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({
    id: scene.id,
    data: {
      type: 'scene',
    }
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
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
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    updateScene(scene.id, { title: newTitle });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    setDescription(newDescription);
    updateScene(scene.id, { description: newDescription });
    
    // Auto-adjust height
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
    }
  };

  // Initialize textarea height
  useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
    }
  }, [description]);
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const activeIndex = scene.shots.findIndex((shot) => shot.id === active.id);
      const overIndex = scene.shots.findIndex((shot) => shot.id === over.id);
      
      reorderShots(scene.id, activeIndex, overIndex);
    }
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-800 rounded-lg shadow-md overflow-hidden"
    >
      <div className="bg-gray-700 p-4">
        <div className="flex items-start">
          <div
            {...attributes}
            {...listeners}
            className="mr-3 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-600 self-center"
          >
            <GripVertical className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                className="text-xl font-semibold text-white bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none w-full mr-2"
                placeholder="Scene Title"
              />
              <button
                onClick={() => removeScene(scene.id)}
                className="p-1 hover:bg-red-600 rounded transition-colors flex-shrink-0"
                title="Delete Scene"
              >
                <Trash2 className="w-4 h-4 text-gray-300" />
              </button>
            </div>
            <textarea
              ref={descriptionRef}
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Add scene description..."
              className="w-full mt-2 bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none text-gray-300 text-sm min-h-[2.5rem] overflow-hidden"
              style={{ resize: 'none' }}
            />
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-gray-300">Shots</h4>
          <button
            onClick={() => addShot(scene.id)}
            className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-md transition-colors flex items-center text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Shot
          </button>
        </div>
        
        {scene.shots.length === 0 ? (
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">No shots yet. Add your first shot!</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={scene.shots.map((shot) => shot.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {scene.shots.map((shot) => (
                  <ShotCard 
                    key={shot.id} 
                    shot={shot} 
                    sceneId={scene.id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};

export default SceneCard;