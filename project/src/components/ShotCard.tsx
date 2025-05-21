import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStoryboardStore } from '../hooks/useStoryboardStore';
import { Shot } from '../types/models';
import { useDropzone } from 'react-dropzone';
import { 
  GripVertical, 
  Trash2, 
  Upload, 
  Scissors,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import ReactPlayer from 'react-player';
import VideoTrimDialog from './VideoTrimDialog';

interface ShotCardProps {
  shot: Shot;
  sceneId: string;
}

const ShotCard: React.FC<ShotCardProps> = ({ shot, sceneId }) => {
  const [title, setTitle] = useState(shot.title);
  const [description, setDescription] = useState(shot.description);
  const [isHovering, setIsHovering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTrimDialog, setShowTrimDialog] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isTouchDevice] = useState('ontouchstart' in window);
  
  const playerRef = useRef<ReactPlayer>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  
  const { updateShot, removeShot, addShotMedia } = useStoryboardStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({
    id: shot.id,
    data: {
      type: 'shot',
      sceneId,
    }
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Handle clipboard paste
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            addShotMedia(sceneId, shot.id, file);
            break;
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [sceneId, shot.id, addShotMedia]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': [],
      'video/*': []
    },
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        addShotMedia(sceneId, shot.id, file);
      }
    }
  });

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    updateShot(sceneId, shot.id, { title: newTitle });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    setDescription(newDescription);
    updateShot(sceneId, shot.id, { description: newDescription });
    
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
    }
  }, [description]);

  const handleDeleteShot = () => {
    removeShot(sceneId, shot.id);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Delete') {
      removeShot(sceneId, shot.id);
    }
  };

  const handleMediaInteraction = () => {
    if (isTouchDevice) {
      setIsPlaying(!isPlaying);
    }
  };

  const handleToggleRecorded = () => {
    updateShot(sceneId, shot.id, { isRecorded: !shot.isRecorded });
  };

  const handleToggleHidden = () => {
    updateShot(sceneId, shot.id, { hidden: !shot.hidden });
  };
  
  const isVideo = shot.media?.type?.startsWith('video/');
  const isAnimated = shot.media?.type === 'image/gif' || shot.media?.type === 'image/webp';
  
  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="bg-gray-700 rounded-lg shadow-md overflow-hidden"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="relative aspect-video bg-gray-800">
          {!shot.media ? (
            <div
              {...getRootProps()}
              ref={dropzoneRef}
              className={`h-full flex items-center justify-center border-2 border-dashed transition-colors ${
                isDragActive ? 'border-blue-400 bg-blue-400/10' : 'border-gray-600'
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-center p-4">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-xs text-gray-400">
                  Drag & drop, paste, or click to upload
                </p>
              </div>
            </div>
          ) : (
            <div 
              className="h-full w-full relative"
              onMouseEnter={() => {
                setIsHovering(true);
                if (!isTouchDevice && (isVideo || isAnimated)) {
                  setIsPlaying(true);
                }
              }}
              onMouseLeave={() => {
                setIsHovering(false);
                setIsPlaying(false);
              }}
              onClick={handleMediaInteraction}
            >
              {isVideo ? (
                <div className="w-full h-full">
                  <ReactPlayer
                    ref={playerRef}
                    url={shot.mediaUrl}
                    width="100%"
                    height="100%"
                    playing={isPlaying}
                    controls={false}
                    muted
                    loop
                    onDuration={(duration) => setVideoDuration(duration)}
                    config={{
                      file: {
                        attributes: {
                          style: {
                            objectFit: 'cover',
                            width: '100%',
                            height: '100%'
                          }
                        }
                      }
                    }}
                  />
                  {isHovering && (
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTrimDialog(true);
                        }}
                        className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-full transition-colors"
                        title="Trim Video"
                      >
                        <Scissors className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <img
                  src={shot.mediaUrl}
                  alt={shot.title}
                  className="w-full h-full object-cover"
                  style={{
                    animationPlayState: isAnimated && !isPlaying ? 'paused' : 'running'
                  }}
                />
              )}
              
              <div 
                {...getRootProps()}
                className="absolute inset-0 opacity-0 hover:opacity-100 bg-black bg-opacity-50 transition-opacity flex items-center justify-center"
              >
                <input {...getInputProps()} />
                <div className="text-white text-sm">Replace Media</div>
              </div>
            </div>
          )}
          
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 cursor-grab active:cursor-grabbing p-1 bg-gray-800 bg-opacity-70 rounded hover:bg-gray-700"
          >
            <GripVertical className="w-4 h-4 text-gray-300" />
          </div>

          <div className="absolute top-2 right-2 flex space-x-1">
            <button
              onClick={handleToggleRecorded}
              className={`p-1 rounded transition-colors ${
                shot.isRecorded ? 'bg-green-600 text-white' : 'bg-gray-800 bg-opacity-70 hover:bg-gray-700 text-gray-300'
              }`}
              title={shot.isRecorded ? "Mark as Not Recorded" : "Mark as Recorded"}
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleToggleHidden}
              className={`p-1 rounded transition-colors ${
                shot.hidden ? 'bg-red-600 text-white' : 'bg-gray-800 bg-opacity-70 hover:bg-gray-700 text-gray-300'
              }`}
              title={shot.hidden ? "Show Shot" : "Hide Shot"}
            >
              {shot.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        <div className="p-3">
          <div className="flex justify-between items-start mb-2">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              className="bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none text-white text-sm w-full mr-2"
              placeholder="Shot Title"
            />
            <button
              onClick={handleDeleteShot}
              className="p-1 hover:bg-red-600 rounded transition-colors flex-shrink-0"
              title="Delete Shot"
            >
              <Trash2 className="w-3 h-3 text-gray-300" />
            </button>
          </div>
          <textarea
            ref={descriptionRef}
            value={description}
            onChange={handleDescriptionChange}
            className="w-full bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none text-gray-300 text-xs min-h-[1.5rem] overflow-hidden"
            placeholder="Shot Description"
            style={{ resize: 'none' }}
          />
        </div>
      </div>
      
      {showTrimDialog && shot.media && (
        <VideoTrimDialog
          videoUrl={shot.mediaUrl || ''}
          videoFile={shot.media}
          duration={videoDuration}
          initialInPoint={shot.inPoint || 0}
          initialOutPoint={shot.outPoint || videoDuration}
          onClose={() => setShowTrimDialog(false)}
          onSave={(inPoint, outPoint) => {
            updateShot(sceneId, shot.id, { inPoint, outPoint });
            setShowTrimDialog(false);
          }}
        />
      )}
    </>
  );
};

export default ShotCard;