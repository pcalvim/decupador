import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Scene, Shot, StoryboardState, ProductionBreak } from '../types/models';
import localforage from 'localforage';

// Initialize localforage
localforage.config({
  name: 'storyboard-creator',
  storeName: 'storyboards'
});

const initialState: StoryboardState = {
  scenes: [],
  project: {
    movieName: 'Untitled Project',
    clientName: 'Client Name',
    logo: null,
    logoUrl: '',
    styles: {
      movieColor: '#3366FF',
      clientColor: '#FF5533',
      fontSize: 16,
      spacing: 8
    }
  },
  isDarkMode: true,
  productionBreaks: []
};

export const useStoryboardStore = create<
  StoryboardState & {
    // Scene actions
    addScene: () => void;
    updateScene: (sceneId: string, updates: Partial<Omit<Scene, 'id' | 'shots'>>) => void;
    removeScene: (sceneId: string) => void;
    reorderScenes: (sourceIndex: number, destinationIndex: number) => void;
    
    // Shot actions
    addShot: (sceneId: string) => void;
    updateShot: (sceneId: string, shotId: string, updates: Partial<Omit<Shot, 'id'>>) => void;
    removeShot: (sceneId: string, shotId: string) => void;
    reorderShots: (sceneId: string, sourceIndex: number, destinationIndex: number) => void;
    moveShot: (sourceSceneId: string, destinationSceneId: string, shotId: string) => void;
    
    // Media actions
    addShotMedia: (sceneId: string, shotId: string, file: File) => void;
    trimShotMedia: (sceneId: string, shotId: string, inPoint: number, outPoint: number) => void;
    
    // Project actions
    updateProjectInfo: (updates: Partial<Omit<StoryboardState['project'], 'logo'>>) => void;
    setProjectLogo: (file: File | null) => void;
    
    // Theme actions
    toggleDarkMode: () => void;
    
    // Production actions
    addProductionBreak: (break_: Omit<ProductionBreak, 'id'>) => void;
    updateProductionBreak: (breakId: string, updates: Partial<Omit<ProductionBreak, 'id'>>) => void;
    removeProductionBreak: (breakId: string) => void;
    reorderProductionBreaks: (sourceIndex: number, destinationIndex: number) => void;
    
    // Storage actions
    resetProject: () => void;
    importProject: (state: StoryboardState) => void;
  }
>(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Scene actions
      addScene: () => set((state) => {
        const newScene: Scene = {
          id: uuidv4(),
          title: `Scene ${state.scenes.length + 1}`,
          description: '',
          shots: []
        };
        
        return { scenes: [...state.scenes, newScene] };
      }),
      
      updateScene: (sceneId, updates) => set((state) => ({
        scenes: state.scenes.map((scene) => 
          scene.id === sceneId 
            ? { ...scene, ...updates }
            : scene
        )
      })),
      
      removeScene: (sceneId) => set((state) => ({
        scenes: state.scenes.filter((scene) => scene.id !== sceneId)
      })),
      
      reorderScenes: (sourceIndex, destinationIndex) => set((state) => {
        const scenes = [...state.scenes];
        const [removed] = scenes.splice(sourceIndex, 1);
        scenes.splice(destinationIndex, 0, removed);
        
        return { scenes };
      }),
      
      // Shot actions
      addShot: (sceneId) => set((state) => {
        const newShot: Shot = {
          id: uuidv4(),
          title: 'New Shot',
          description: '',
          media: null,
          inPoint: 0,
          outPoint: 0,
          prepTime: 15, // Default prep time in minutes
          recordingTime: 30, // Default recording time in minutes
          isRecorded: false,
          hidden: false
        };
        
        return {
          scenes: state.scenes.map((scene) =>
            scene.id === sceneId
              ? { ...scene, shots: [...scene.shots, newShot] }
              : scene
          )
        };
      }),
      
      updateShot: (sceneId, shotId, updates) => set((state) => ({
        scenes: state.scenes.map((scene) =>
          scene.id === sceneId
            ? {
                ...scene,
                shots: scene.shots.map((shot) =>
                  shot.id === shotId ? { ...shot, ...updates } : shot
                )
              }
            : scene
        )
      })),
      
      removeShot: (sceneId, shotId) => set((state) => ({
        scenes: state.scenes.map((scene) =>
          scene.id === sceneId
            ? {
                ...scene,
                shots: scene.shots.filter((shot) => shot.id !== shotId)
              }
            : scene
        )
      })),
      
      reorderShots: (sceneId, sourceIndex, destinationIndex) => set((state) => {
        const updatedScenes = state.scenes.map((scene) => {
          if (scene.id !== sceneId) return scene;
          
          const shots = [...scene.shots];
          const [removed] = shots.splice(sourceIndex, 1);
          shots.splice(destinationIndex, 0, removed);
          
          return { ...scene, shots };
        });
        
        return { scenes: updatedScenes };
      }),
      
      moveShot: (sourceSceneId, destinationSceneId, shotId) => set((state) => {
        const sourceScene = state.scenes.find((scene) => scene.id === sourceSceneId);
        if (!sourceScene) return state;
        
        const shotToMove = sourceScene.shots.find((shot) => shot.id === shotId);
        if (!shotToMove) return state;
        
        const updatedScenes = state.scenes.map((scene) => {
          if (scene.id === sourceSceneId) {
            return {
              ...scene,
              shots: scene.shots.filter((shot) => shot.id !== shotId)
            };
          }
          if (scene.id === destinationSceneId) {
            return {
              ...scene,
              shots: [...scene.shots, shotToMove]
            };
          }
          return scene;
        });
        
        return { scenes: updatedScenes };
      }),
      
      // Media actions
      addShotMedia: (sceneId, shotId, file) => set((state) => {
        const mediaUrl = URL.createObjectURL(file);
        
        return {
          scenes: state.scenes.map((scene) =>
            scene.id === sceneId
              ? {
                  ...scene,
                  shots: scene.shots.map((shot) =>
                    shot.id === shotId
                      ? { ...shot, media: file, mediaUrl }
                      : shot
                  )
                }
              : scene
          )
        };
      }),
      
      trimShotMedia: (sceneId, shotId, inPoint, outPoint) => set((state) => ({
        scenes: state.scenes.map((scene) =>
          scene.id === sceneId
            ? {
                ...scene,
                shots: scene.shots.map((shot) =>
                  shot.id === shotId
                    ? { ...shot, inPoint, outPoint }
                    : shot
                )
              }
            : scene
        )
      })),
      
      // Project actions
      updateProjectInfo: (updates) => set((state) => ({
        project: { ...state.project, ...updates }
      })),
      
      setProjectLogo: (file) => set((state) => {
        const logoUrl = file ? URL.createObjectURL(file) : '';
        
        return {
          project: {
            ...state.project,
            logo: file,
            logoUrl
          }
        };
      }),
      
      // Theme actions
      toggleDarkMode: () => set((state) => ({
        isDarkMode: !state.isDarkMode
      })),
      
      // Production actions
      addProductionBreak: (break_) => set((state) => ({
        productionBreaks: [...state.productionBreaks, { ...break_, id: uuidv4() }]
      })),
      
      updateProductionBreak: (breakId, updates) => set((state) => ({
        productionBreaks: state.productionBreaks.map((break_) =>
          break_.id === breakId ? { ...break_, ...updates } : break_
        )
      })),
      
      removeProductionBreak: (breakId) => set((state) => ({
        productionBreaks: state.productionBreaks.filter((break_) => break_.id !== breakId)
      })),
      
      reorderProductionBreaks: (sourceIndex, destinationIndex) => set((state) => {
        const breaks = [...state.productionBreaks];
        const [removed] = breaks.splice(sourceIndex, 1);
        breaks.splice(destinationIndex, 0, removed);
        
        return { productionBreaks: breaks };
      }),
      
      // Storage actions
      resetProject: () => set(initialState),
      
      importProject: (projectData) => set(projectData)
    }),
    {
      name: 'storyboard-storage',
      storage: {
        getItem: async (name) => {
          return await localforage.getItem(name);
        },
        setItem: async (name, value) => {
          await localforage.setItem(name, value);
        },
        removeItem: async (name) => {
          await localforage.removeItem(name);
        }
      },
      partialize: (state) => ({
        scenes: state.scenes,
        project: state.project,
        isDarkMode: state.isDarkMode,
        productionBreaks: state.productionBreaks
      })
    }
  )
);