import React, { useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useStoryboardStore } from '../hooks/useStoryboardStore';
import { Upload, X } from 'lucide-react';

const ProjectInfoPanel: React.FC = () => {
  const { project, updateProjectInfo, setProjectLogo } = useStoryboardStore();
  const [showMovieColorPicker, setShowMovieColorPicker] = React.useState(false);
  const [showClientColorPicker, setShowClientColorPicker] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleLogoUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProjectLogo(file);
    }
  };
  
  const removeLogo = () => {
    setProjectLogo(null);
  };
  
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6">
      <h2 className="text-xl font-semibold text-white mb-4">Project Information</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label 
              htmlFor="movieName" 
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Movie Title
            </label>
            <input
              id="movieName"
              type="text"
              value={project.movieName}
              onChange={(e) => updateProjectInfo({ movieName: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label 
              htmlFor="clientName" 
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Client Name
            </label>
            <input
              id="clientName"
              type="text"
              value={project.clientName}
              onChange={(e) => updateProjectInfo({ clientName: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex space-x-4">
            <div className="relative">
              <label 
                htmlFor="movieColor" 
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Movie Title Color
              </label>
              <div className="flex items-center">
                <div
                  className="w-10 h-10 rounded border border-gray-600 cursor-pointer"
                  style={{ backgroundColor: project.styles.movieColor }}
                  onClick={() => setShowMovieColorPicker(!showMovieColorPicker)}
                />
                <input
                  id="movieColor"
                  type="text"
                  value={project.styles.movieColor}
                  onChange={(e) => updateProjectInfo({ 
                    styles: { ...project.styles, movieColor: e.target.value } 
                  })}
                  className="ml-2 bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
                />
              </div>
              
              {showMovieColorPicker && (
                <div className="absolute z-10 mt-2">
                  <div 
                    className="fixed inset-0" 
                    onClick={() => setShowMovieColorPicker(false)}
                  />
                  <HexColorPicker
                    color={project.styles.movieColor}
                    onChange={(color) => updateProjectInfo({ 
                      styles: { ...project.styles, movieColor: color } 
                    })}
                  />
                </div>
              )}
            </div>
            
            <div className="relative">
              <label 
                htmlFor="clientColor" 
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Client Name Color
              </label>
              <div className="flex items-center">
                <div
                  className="w-10 h-10 rounded border border-gray-600 cursor-pointer"
                  style={{ backgroundColor: project.styles.clientColor }}
                  onClick={() => setShowClientColorPicker(!showClientColorPicker)}
                />
                <input
                  id="clientColor"
                  type="text"
                  value={project.styles.clientColor}
                  onChange={(e) => updateProjectInfo({ 
                    styles: { ...project.styles, clientColor: e.target.value } 
                  })}
                  className="ml-2 bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
                />
              </div>
              
              {showClientColorPicker && (
                <div className="absolute z-10 mt-2">
                  <div 
                    className="fixed inset-0" 
                    onClick={() => setShowClientColorPicker(false)}
                  />
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
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Project Logo
            </label>
            <div className="h-32 border border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-gray-700 relative">
              {project.logo ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img 
                    src={project.logoUrl} 
                    alt="Project Logo" 
                    className="max-h-28 max-w-full object-contain"
                  />
                  <button
                    onClick={removeLogo}
                    className="absolute top-2 right-2 bg-gray-800 rounded-full p-1 hover:bg-red-600 transition-colors"
                    title="Remove Logo"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogoUpload}
                  className="flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <Upload className="w-8 h-8 mb-2" />
                  <span className="text-sm">Upload Logo</span>
                </button>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label 
                htmlFor="fontSize" 
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Font Size
              </label>
              <div className="flex items-center">
                <input
                  id="fontSize"
                  type="range"
                  min="12"
                  max="24"
                  value={project.styles.fontSize}
                  onChange={(e) => updateProjectInfo({ 
                    styles: { ...project.styles, fontSize: parseInt(e.target.value) } 
                  })}
                  className="w-full"
                />
                <span className="ml-2 text-white">{project.styles.fontSize}px</span>
              </div>
            </div>
            
            <div>
              <label 
                htmlFor="spacing" 
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Spacing
              </label>
              <div className="flex items-center">
                <input
                  id="spacing"
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
                <span className="ml-2 text-white">{project.styles.spacing}px</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectInfoPanel;