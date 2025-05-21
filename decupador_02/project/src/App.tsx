import React, { useRef, useState } from 'react';
import Toolbar from './components/Toolbar';
import ProjectInfoPanel from './components/ProjectInfoPanel';
import ScenesList from './components/ScenesList';
import SettingsDrawer from './components/SettingsDrawer';
import { useStoryboardStore } from './hooks/useStoryboardStore';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const { isDarkMode } = useStoryboardStore();
  
  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-900 text-white">
        <Toolbar
          mainRef={mainRef}
          onSettingsToggle={() => setIsSettingsOpen(!isSettingsOpen)}
        />
        
        <main ref={mainRef} className="container mx-auto px-4 py-6">
          <ProjectInfoPanel />
          <ScenesList />
        </main>
        
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-10" onClick={() => setIsSettingsOpen(false)} />
        )}
        
        <SettingsDrawer 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      </div>
    </div>
  );
}

export default App;