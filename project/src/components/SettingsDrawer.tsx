import React from 'react';
import { X, Monitor, Moon, Sun } from 'lucide-react';
import { useStoryboardStore } from '../hooks/useStoryboardStore';
import { HexColorPicker } from 'react-colorful';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ isOpen, onClose }) => {
  const { 
    isDarkMode, 
    toggleDarkMode, 
    project, 
    updateProjectInfo 
  } = useStoryboardStore();
  
  const [activeColorPicker, setActiveColorPicker] = React.useState<string | null>(null);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-gray-800 shadow-lg z-20 transition-transform transform">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Settings</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-300" />
        </button>
      </div>
      
      <div className="p-4 overflow-y-auto max-h-[calc(100vh-64px)]">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-2">Appearance</h3>
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {isDarkMode ? (
                  <Moon className="w-5 h-5 text-blue-400 mr-2" />
                ) : (
                  <Sun className="w-5 h-5 text-yellow-400 mr-2" />
                )}
                <span className="text-white">Theme</span>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`relative inline-flex items-center h-6 rounded-full w-12 transition-colors ${
                  isDarkMode ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block w-4 h-4 transform rounded-full bg-white transition-transform ${
                    isDarkMode ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-2">Colors</h3>
          <div className="space-y-3">
            <div className="bg-gray-700 rounded-lg p-3">
              <label className="block text-white mb-2">Movie Title Color</label>
              <div className="flex items-center space-x-3">
                <div
                  className="w-8 h-8 rounded-md border border-gray-600 cursor-pointer"
                  style={{ backgroundColor: project.styles.movieColor }}
                  onClick={() => setActiveColorPicker(activeColorPicker === 'movie' ? null : 'movie')}
                />
                <input
                  type="text"
                  value={project.styles.movieColor}
                  onChange={(e) => updateProjectInfo({ 
                    styles: { ...project.styles, movieColor: e.target.value } 
                  })}
                  className="bg-gray-600 border border-gray-500 rounded-md py-1 px-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {activeColorPicker === 'movie' && (
                <div className="mt-2">
                  <HexColorPicker
                    color={project.styles.movieColor}
                    onChange={(color) => updateProjectInfo({ 
                      styles: { ...project.styles, movieColor: color } 
                    })}
                  />
                </div>
              )}
            </div>
            
            <div className="bg-gray-700 rounded-lg p-3">
              <label className="block text-white mb-2">Client Name Color</label>
              <div className="flex items-center space-x-3">
                <div
                  className="w-8 h-8 rounded-md border border-gray-600 cursor-pointer"
                  style={{ backgroundColor: project.styles.clientColor }}
                  onClick={() => setActiveColorPicker(activeColorPicker === 'client' ? null : 'client')}
                />
                <input
                  type="text"
                  value={project.styles.clientColor}
                  onChange={(e) => updateProjectInfo({ 
                    styles: { ...project.styles, clientColor: e.target.value } 
                  })}
                  className="bg-gray-600 border border-gray-500 rounded-md py-1 px-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {activeColorPicker === 'client' && (
                <div className="mt-2">
                  <HexColorPicker
                    color={project.styles.clientColor}
                    onChange={(color) => updateProjectInfo({ 
                      styles: { ...project.styles, clientColor: color } 
                    })}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-2">Typography</h3>
          <div className="space-y-3">
            <div className="bg-gray-700 rounded-lg p-3">
              <label className="block text-white mb-2">
                Font Size: {project.styles.fontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="24"
                value={project.styles.fontSize}
                onChange={(e) => updateProjectInfo({ 
                  styles: { ...project.styles, fontSize: parseInt(e.target.value) } 
                })}
                className="w-full"
              />
            </div>
            
            <div className="bg-gray-700 rounded-lg p-3">
              <label className="block text-white mb-2">
                Spacing: {project.styles.spacing}px
              </label>
              <input
                type="range"
                min="4"
                max="16"
                step="4"
                value={project.styles.spacing}
                onChange={(e) => updateProjectInfo({ 
                  styles: { ...project.styles, spacing: parseInt(e.target.value) } 
                })}
                className="w-full"
              />
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="text-lg font-medium text-white mb-2">Keyboard Shortcuts</h3>
          <div className="bg-gray-700 rounded-lg p-3">
            <ul className="space-y-2 text-gray-300">
              <li className="flex justify-between">
                <span>Delete Shot</span>
                <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Delete</kbd>
              </li>
              <li className="flex justify-between">
                <span>Set In Point (Trim)</span>
                <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">I</kbd>
              </li>
              <li className="flex justify-between">
                <span>Set Out Point (Trim)</span>
                <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">O</kbd>
              </li>
              <li className="flex justify-between">
                <span>Play/Pause (Trim)</span>
                <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Space</kbd>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsDrawer;