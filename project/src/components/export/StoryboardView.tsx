import React from 'react';
import { StoryboardState } from '../../types/models';

interface StoryboardViewProps {
  state: StoryboardState;
}

const StoryboardView: React.FC<StoryboardViewProps> = ({ state }) => {
  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-xl">
      <header className="flex justify-between items-center mb-12 pb-6 border-b dark:border-gray-700">
        <div>
          <h1 
            className="text-4xl font-bold mb-3 tracking-tight" 
            style={{ color: state.project.styles.movieColor }}
          >
            {state.project.movieName}
          </h1>
          <h2 
            className="text-2xl font-light" 
            style={{ color: state.project.styles.clientColor }}
          >
            {state.project.clientName}
          </h2>
        </div>
        {state.project.logoUrl && (
          <img 
            src={state.project.logoUrl} 
            alt="Project Logo"
            className="max-h-24 object-contain"
          />
        )}
      </header>

      <div className="space-y-12">
        {state.scenes.map((scene, index) => (
          <div 
            key={scene.id} 
            className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl shadow-md transition-all duration-200 hover:shadow-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-light text-gray-400 dark:text-gray-500">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">
                  {scene.title}
                </h3>
              </div>
              {scene.isRecorded && (
                <span className="bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-sm">
                  Recorded
                </span>
              )}
            </div>
            
            {scene.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg italic leading-relaxed">
                {scene.description}
              </p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scene.shots
                .filter(shot => !shot.hidden)
                .map((shot) => (
                  <div 
                    key={shot.id} 
                    className="bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    {shot.mediaUrl && (
                      <div className="aspect-video relative">
                        {shot.media?.type.startsWith('video/') ? (
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
                        )}
                        {shot.isRecorded && (
                          <div className="absolute top-2 right-2">
                            <span className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
                              ✓
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-4">
                      <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                        {shot.title}
                      </h4>
                      {shot.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                          {shot.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoryboardView;