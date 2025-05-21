import React from 'react';
import { StoryboardState, ProductionBreak } from '../../types/models';
import { Clock, Coffee, Utensils, Car, PenTool as Tool, Sun } from 'lucide-react';

interface ScheduleViewProps {
  state: StoryboardState;
}

const getBreakIcon = (type: ProductionBreak['type']) => {
  switch (type) {
    case 'coffee':
      return <Coffee className="w-5 h-5" />;
    case 'lunch':
      return <Utensils className="w-5 h-5" />;
    case 'travel':
      return <Car className="w-5 h-5" />;
    case 'setup':
    case 'teardown':
      return <Tool className="w-5 h-5" />;
    case 'breakfast':
      return <Sun className="w-5 h-5" />;
    default:
      return <Clock className="w-5 h-5" />;
  }
};

const ScheduleView: React.FC<ScheduleViewProps> = ({ state }) => {
  const timeline: (ProductionBreak | { 
    type: 'shot', 
    shot: any, 
    sceneTitle: string 
  })[] = [];
  
  let totalMinutes = 0;
  let currentTime = new Date();
  currentTime.setHours(9, 0, 0, 0); // Start at 9 AM

  state.scenes.forEach(scene => {
    scene.shots
      .filter(shot => !shot.hidden)
      .forEach(shot => {
        if (shot.prepTime) totalMinutes += shot.prepTime;
        if (shot.recordingTime) totalMinutes += shot.recordingTime;
        timeline.push({
          type: 'shot',
          shot,
          sceneTitle: scene.title
        });
      });
  });

  state.productionBreaks?.forEach(break_ => {
    totalMinutes += break_.duration;
    timeline.push(break_);
  });

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-xl">
      <header className="mb-12 pb-6 border-b dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 
            className="text-4xl font-bold tracking-tight" 
            style={{ color: state.project.styles.movieColor }}
          >
            Production Schedule
          </h1>
          <div className="flex items-center text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
            <Clock className="w-5 h-5 mr-2" />
            Total Time: {hours}h {minutes}m
          </div>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Detailed production timeline with breaks and estimated durations
        </p>
      </header>

      <div className="relative">
        <div className="absolute top-0 bottom-0 left-8 w-px bg-gray-200 dark:bg-gray-700" />
        
        <div className="space-y-8">
          {timeline.map((item, index) => {
            const itemTime = new Date(currentTime);
            
            if ('type' in item && item.type === 'shot') {
              const { shot, sceneTitle } = item;
              const duration = (shot.prepTime || 0) + (shot.recordingTime || 0);
              currentTime = new Date(currentTime.getTime() + duration * 60000);
              
              return (
                <div 
                  key={shot.id}
                  className={`relative pl-16 ${shot.isRecorded ? 'opacity-50' : ''}`}
                >
                  <div className="absolute left-6 top-4 w-4 h-4 bg-blue-500 rounded-full border-4 border-white dark:border-gray-900" />
                  <time className="absolute left-20 top-3 text-sm text-gray-500 dark:text-gray-400">
                    {itemTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl shadow-md">
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
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                              {shot.title}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                              Scene: {sceneTitle}
                            </p>
                          </div>
                          {shot.isRecorded && (
                            <span className="bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-sm">
                              Recorded
                            </span>
                          )}
                        </div>
                        
                        {shot.description && (
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
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
                </div>
              );
            } else {
              currentTime = new Date(currentTime.getTime() + item.duration * 60000);
              
              return (
                <div key={item.id} className="relative pl-16">
                  <div className="absolute left-6 top-4 w-4 h-4 bg-yellow-500 rounded-full border-4 border-white dark:border-gray-900" />
                  <time className="absolute left-20 top-3 text-sm text-gray-500 dark:text-gray-400">
                    {itemTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border-l-4 border-yellow-500">
                    <div className="flex items-center gap-3 mb-2">
                      {getBreakIcon(item.type)}
                      <h3 className="font-medium text-gray-800 dark:text-white">
                        {item.title}
                      </h3>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        ({item.duration} min)
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 ml-8">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
};

export default ScheduleView;