import React, { useState } from 'react';
import { X, Clock, Film, Calendar } from 'lucide-react';
import { StoryboardState, ExportView } from '../types/models';
import StoryboardView from './export/StoryboardView';
import RecordingView from './export/RecordingView';
import ScheduleView from './export/ScheduleView';

interface PreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  state: StoryboardState;
}

const PreviewDialog: React.FC<PreviewDialogProps> = ({ isOpen, onClose, state }) => {
  const [activeView, setActiveView] = useState<ExportView>('storyboard');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl h-[80vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 bg-gray-700 flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveView('storyboard')}
              className={`px-4 py-2 rounded-md flex items-center ${
                activeView === 'storyboard' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Film className="w-4 h-4 mr-2" />
              Storyboard
            </button>
            <button
              onClick={() => setActiveView('recording')}
              className={`px-4 py-2 rounded-md flex items-center ${
                activeView === 'recording' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Clock className="w-4 h-4 mr-2" />
              Recording Order
            </button>
            <button
              onClick={() => setActiveView('schedule')}
              className={`px-4 py-2 rounded-md flex items-center ${
                activeView === 'schedule' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {activeView === 'storyboard' && <StoryboardView state={state} />}
          {activeView === 'recording' && <RecordingView state={state} />}
          {activeView === 'schedule' && <ScheduleView state={state} />}
        </div>
      </div>
    </div>
  );
};

export default PreviewDialog;