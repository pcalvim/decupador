import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { X, Play, Pause, Save, SkipBack, SkipForward } from 'lucide-react';
import { trimVideo } from '../utils/ffmpegHelpers';

interface VideoTrimDialogProps {
  videoUrl: string;
  videoFile: File;
  duration: number;
  initialInPoint: number;
  initialOutPoint: number;
  onClose: () => void;
  onSave: (inPoint: number, outPoint: number) => void;
}

const VideoTrimDialog: React.FC<VideoTrimDialogProps> = ({
  videoUrl,
  videoFile,
  duration,
  initialInPoint,
  initialOutPoint,
  onClose,
  onSave
}) => {
  const [inPoint, setInPoint] = useState(initialInPoint);
  const [outPoint, setOutPoint] = useState(initialOutPoint || duration);
  const [currentTime, setCurrentTime] = useState(initialInPoint);
  const [playing, setPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const playerRef = useRef<ReactPlayer>(null);
  
  useEffect(() => {
    // Add keyboard event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'i') {
        setInPoint(currentTime);
      } else if (e.key === 'o') {
        setOutPoint(currentTime);
      } else if (e.key === ' ') {
        e.preventDefault();
        setPlaying(!playing);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, onClose, playing]);
  
  // Monitor video playback time to handle loop between in/out points
  useEffect(() => {
    if (playing && currentTime >= outPoint) {
      // Reset playback to in point when reaching out point
      if (playerRef.current) {
        playerRef.current.seekTo(inPoint, 'seconds');
      }
    }
  }, [currentTime, inPoint, outPoint, playing]);
  
  const handleProgress = (state: { playedSeconds: number }) => {
    setCurrentTime(state.playedSeconds);
  };
  
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (playerRef.current) {
      playerRef.current.seekTo(time, 'seconds');
    }
  };
  
  const handleSetInPoint = () => {
    setInPoint(currentTime);
  };
  
  const handleSetOutPoint = () => {
    setOutPoint(currentTime);
  };
  
  const handleSave = async () => {
    try {
      setIsLoading(true);
      // Perform the actual video trimming
      // For simplicity in this MVP, we'll just save the in/out points
      // In a real app, you'd use FFmpeg to actually trim the video
      onSave(inPoint, outPoint);
    } catch (error) {
      console.error('Error trimming video:', error);
      alert('There was an error trimming the video. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-3xl overflow-hidden shadow-2xl">
        <div className="p-4 bg-gray-700 flex justify-between items-center">
          <h3 className="text-white font-medium">Trim Video</h3>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="relative aspect-video bg-black rounded overflow-hidden mb-4">
            <ReactPlayer
              ref={playerRef}
              url={videoUrl}
              width="100%"
              height="100%"
              playing={playing}
              onProgress={handleProgress}
              progressInterval={100}
              onDuration={(d) => duration || d}
              config={{
                file: {
                  attributes: {
                    style: {
                      width: '100%',
                      height: '100%'
                    }
                  }
                }
              }}
            />
          </div>
          
          <div className="mb-6">
            <div className="flex justify-between text-gray-400 text-sm mb-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            
            <div className="relative mb-2">
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              
              {/* In point marker */}
              <div
                className="absolute h-4 w-2 bg-blue-500 rounded-sm top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-ew-resize"
                style={{ left: `${(inPoint / duration) * 100}%` }}
                title={`In: ${formatTime(inPoint)}`}
              />
              
              {/* Out point marker */}
              <div
                className="absolute h-4 w-2 bg-red-500 rounded-sm top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-ew-resize"
                style={{ left: `${(outPoint / duration) * 100}%` }}
                title={`Out: ${formatTime(outPoint)}`}
              />
              
              {/* Trimmed section indicator */}
              <div
                className="absolute h-2 bg-gray-400 bg-opacity-30 top-0"
                style={{
                  left: `${(inPoint / duration) * 100}%`,
                  width: `${((outPoint - inPoint) / duration) * 100}%`
                }}
              />
            </div>
            
            <div className="flex justify-center space-x-4 mt-4">
              <button
                onClick={() => {
                  if (playerRef.current) {
                    playerRef.current.seekTo(Math.max(0, currentTime - 1), 'seconds');
                  }
                }}
                className="bg-gray-700 hover:bg-gray-600 p-2 rounded-full"
                title="Back 1 second"
              >
                <SkipBack className="w-5 h-5 text-white" />
              </button>
              
              <button
                onClick={() => setPlaying(!playing)}
                className="bg-blue-600 hover:bg-blue-700 p-3 rounded-full"
              >
                {playing ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white" />
                )}
              </button>
              
              <button
                onClick={() => {
                  if (playerRef.current) {
                    playerRef.current.seekTo(Math.min(duration, currentTime + 1), 'seconds');
                  }
                }}
                className="bg-gray-700 hover:bg-gray-600 p-2 rounded-full"
                title="Forward 1 second"
              >
                <SkipForward className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-gray-300 text-sm mb-1">In Point: {formatTime(inPoint)}</div>
              <button
                onClick={handleSetInPoint}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors flex items-center justify-center"
                title="Press 'I' key"
              >
                Set In Point
              </button>
            </div>
            <div>
              <div className="text-gray-300 text-sm mb-1">Out Point: {formatTime(outPoint)}</div>
              <button
                onClick={handleSetOutPoint}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded transition-colors flex items-center justify-center"
                title="Press 'O' key"
              >
                Set Out Point
              </button>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors flex items-center ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Trim
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoTrimDialog;