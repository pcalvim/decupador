import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { StoryboardState, Scene, Shot } from '../../types/models';
import { Clock, Film } from 'lucide-react';

interface RecordingViewProps {
  state: StoryboardState;
}

interface FlatShot extends Shot {
  sceneTitle: string;
  sceneId: string;
}

const RecordingView: React.FC<RecordingViewProps> = ({ state }) => {
  const flatShots: FlatShot[] = state.scenes.flatMap(scene => 
    scene.shots.map(shot => ({
      ...shot,
      sceneTitle: scene.title,
      sceneId: scene.id
    }))
  );

  const [shots, setShots] = useState(flatShots);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calculate total time
  const totalTime = shots.reduce((acc, shot) => {
    return acc + (shot.prepTime || 0) + (shot.recordingTime || 0);
  }, 0);

  const hours = Math.floor(totalTime / 60);
  const minutes = totalTime % 60;

  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-xl">
      <header className="mb-12 pb-6 border-b dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 
            className="text-4xl font-bold tracking-tight" 
            style={{ color: state.project.styles.movieColor }}
          >
            Recording Order
          </h1>
          <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
            <div className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              <span>Total: {hours}h {minutes}m</span>
            </div>
            <div className="flex items-center">
              <Film className="w-5 h-5 mr-2" />
              <span>{shots.length} Shots</span>
            </div>
          </div>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Optimized recording sequence for efficient production
        </p>
      </header>

      <div className="space-y-6">
        {shots
          .filter(shot => !shot.hidden)
          .map((shot, index) => (
            <div 
              key={shot.id} 
              className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all duration-200 hover:shadow-lg"
            >
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-48 aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shadow-sm">
                  {shot.mediaUrl && (
                    shot.media?.type.startsWith('video/') ? (
                      <video
                        src={shot.mediaUrl}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={shot.mediaUrl}
                        alt={shot.title}
                        className="w-full h-full object-cover"
                      />
                    )
                  )}
                </div>
                
                <div className="flex-grow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-baseline gap-3 mb-2">
                        <span className="text-2xl font-light text-gray-400 dark:text-gray-500">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                          {shot.title}
                        </h3>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 mb-3">
                        Scene: {shot.sceneTitle}
                      </p>
                    </div>
                    {shot.isRecorded && (
                      <span className="bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-sm">
                        Recorded
                      </span>
                    )}
                  </div>
                  
                  {shot.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                      {shot.description}
                    </p>
                  )}
                  
                  <div className="flex gap-6 text-sm">
                    {shot.prepTime && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
                        <span className="text-blue-600 dark:text-blue-400">
                          Prep: {shot.prepTime} min
                        </span>
                      </div>
                    )}
                    {shot.recordingTime && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-lg">
                        <span className="text-purple-600 dark:text-purple-400">
                          Recording: {shot.recordingTime} min
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default RecordingView;