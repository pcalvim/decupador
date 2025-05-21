import React, { useState, useRef } from 'react';
import { 
  Film, Save, FolderOpen, FileDown, FilePlus, Moon, Sun, Settings, X 
} from 'lucide-react';
import { useStoryboardStore } from '../hooks/useStoryboardStore';
import { StoryboardState } from '../types/models';
import { exportZip } from '../utils/exportZip';
import { exportPdf } from '../utils/exportPdf';
import PreviewDialog from './PreviewDialog';

interface ToolbarProps {
  mainRef: React.RefObject<HTMLElement>;
  onSettingsToggle: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ mainRef, onSettingsToggle }) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    resetProject, 
    importProject, 
    isDarkMode, 
    toggleDarkMode,
    project
  } = useStoryboardStore();
  
  const handleNewProject = () => {
    if (confirm('Are you sure you want to start a new project? All unsaved changes will be lost.')) {
      resetProject();
    }
  };
  
  const handleSaveProject = () => {
    const state = useStoryboardStore.getState();
    
    const exportData = {
      ...state,
      project: {
        ...state.project,
        logo: null,
        logoUrl: ''
      },
      scenes: state.scenes.map(scene => ({
        ...scene,
        shots: scene.shots.map(shot => ({
          ...shot,
          media: null,
          mediaUrl: ''
        }))
      }))
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.movieName.replace(/\s+/g, '-').toLowerCase()}-storyboard.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleImportProject = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result === 'string') {
          const importedData = JSON.parse(result) as StoryboardState;
          importProject(importedData);
        }
      } catch (error) {
        console.error('Error importing project:', error);
        alert('Failed to import project. The file may be corrupted or in the wrong format.');
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleExportZip = async () => {
    try {
      await exportZip(useStoryboardStore.getState());
      setIsExportMenuOpen(false);
    } catch (error) {
      console.error('Error exporting as ZIP:', error);
      alert('Failed to export as ZIP. Please try again.');
    }
  };
  
  const handleExportPdf = async () => {
    if (!mainRef.current) return;
    
    try {
      await exportPdf(mainRef.current);
      setIsExportMenuOpen(false);
    } catch (error) {
      console.error('Error exporting as PDF:', error);
      alert('Failed to export as PDF. Please try again.');
    }
  };
  
  return (
    <>
      <div className="bg-gray-900 text-white p-3 flex items-center justify-between sticky top-0 z-10 shadow-lg">
        <div className="flex items-center">
          <div className="flex items-center mr-6">
            <Film className="w-6 h-6 mr-2 text-blue-400" />
            <span className="text-xl font-bold">Storyboard Creator</span>
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={handleNewProject}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="New Project"
            >
              <FilePlus className="w-5 h-5" />
            </button>
            
            <button 
              onClick={handleSaveProject}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Save Project"
            >
              <Save className="w-5 h-5" />
            </button>
            
            <button 
              onClick={handleImportProject}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Open Project"
            >
              <FolderOpen className="w-5 h-5" />
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".json" 
              className="hidden" 
            />
            
            <div className="relative">
              <button 
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="p-2 hover:bg-gray-700 rounded transition-colors"
                title="Export"
              >
                <FileDown className="w-5 h-5" />
              </button>
              
              {isExportMenuOpen && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded shadow-lg z-20 w-40">
                  <div className="flex justify-between items-center px-3 py-2 border-b border-gray-700">
                    <span className="text-sm font-medium">Export As</span>
                    <button 
                      onClick={() => setIsExportMenuOpen(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => setShowPreview(true)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 rounded"
                    >
                      Preview
                    </button>
                    <button 
                      onClick={handleExportZip}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 rounded"
                    >
                      ZIP Archive
                    </button>
                    <button 
                      onClick={handleExportPdf}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 rounded"
                    >
                      PDF Document
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button 
            onClick={toggleDarkMode}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
            title={isDarkMode ? "Light Mode" : "Dark Mode"}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <button 
            onClick={onSettingsToggle}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <PreviewDialog
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        state={useStoryboardStore.getState()}
      />
    </>
  );
};

export default Toolbar;