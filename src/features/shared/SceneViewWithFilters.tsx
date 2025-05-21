import React from 'react';
import useAppStore from '../../store/useAppStore';
import { Scene, Locacao, Personagem } from '../../types';

interface SceneViewWithFiltersProps {
  renderScene: (scene: Scene, scriptName: string) => React.ReactNode;
}

const SceneViewWithFilters: React.FC<SceneViewWithFiltersProps> = ({ renderScene }) => {
  const scripts = useAppStore(state => state.scripts);
  const selectedScriptsFilter = useAppStore(state => state.selectedScriptsFilter);
  
  // If no scripts are selected, use all scripts
  const scriptsToUse = selectedScriptsFilter.length > 0
    ? scripts.filter(script => selectedScriptsFilter.includes(script.id))
    : scripts;
  
  // Collect all scenes from selected scripts
  const scenesWithScriptInfo = scriptsToUse.flatMap(script => {
    return script.documentState.cenas.map(scene => ({
      scene,
      scriptName: script.name,
      scriptId: script.id
    }));
  });
  
  return (
    <div className="space-y-4">
      {scenesWithScriptInfo.length === 0 ? (
        <div className="bg-muted/30 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">Nenhuma cena encontrada nos roteiros selecionados</p>
        </div>
      ) : (
        scenesWithScriptInfo.map(({ scene, scriptName }) => (
          <div key={scene.id} className="mb-4">
            {renderScene(scene, scriptName)}
          </div>
        ))
      )}
    </div>
  );
};

export const getAllScenesFromSelectedScripts = () => {
  console.log(`[DEBUG_GET_SCENES] getAllScenesFromSelectedScripts called`);
  // Always get the freshest state from the store
  const state = useAppStore.getState();
  const scripts = state.scripts;
  const selectedScriptsFilter = state.selectedScriptsFilter;
  
  console.log(`[DEBUG_GET_SCENES] Current scripts state:`, scripts.map(s => ({
    id: s.id,
    name: s.name,
    sceneCount: s.documentState.cenas.length,
    totalShots: s.documentState.cenas.reduce((acc, c) => acc + (c.shotlist?.length || 0), 0)
  })));
  
  const scriptsToUse = selectedScriptsFilter.length > 0
    ? scripts.filter(script => selectedScriptsFilter.includes(script.id))
    : scripts;
  
  const result = scriptsToUse.flatMap(script => {
    // For debugging - check if this script contains any media
    let scriptMediaCount = 0;
    script.documentState.cenas.forEach(scene => {
      scene.shotlist?.forEach(shot => {
        if (shot.referenciaMidia && shot.referenciaMidia.dataUrl) {
          scriptMediaCount++;
        }
      });
    });
    console.log(`[Script ${script.id}] contains ${scriptMediaCount} shots with media references`);
    
    return script.documentState.cenas.map(scene => {
      // Check if this scene contains any media for debugging
      let sceneMediaCount = 0;
      scene.shotlist?.forEach(shot => {
        if (shot.referenciaMidia && shot.referenciaMidia.dataUrl) {
          sceneMediaCount++;
        }
      });
      if (sceneMediaCount > 0) {
        console.log(`[Scene ${scene.id}] contains ${sceneMediaCount} shots with media references`);
      }
      
      // Create a deep copy of each scene and its shotlist to prevent reference issues
      const sceneCopy = {
        ...scene,
        shotlist: scene.shotlist ? scene.shotlist.map(shot => {
          // Log any media we find to confirm what's happening
          if (shot.referenciaMidia && shot.referenciaMidia.dataUrl) {
            console.log(`[Shot ${shot.id}] has media:`, {
              mediaType: shot.referenciaMidia.tipoMedia,
              dataUrlLength: shot.referenciaMidia.dataUrl.length
            });
          }
          
          return {
            ...shot,
            // Ensure referenciaMidia is also deep copied if it exists
            referenciaMidia: shot.referenciaMidia ? {
              ...shot.referenciaMidia,
              // Make sure to preserve the dataUrl that contains the image/video data
              dataUrl: shot.referenciaMidia.dataUrl,
              nomeArquivo: shot.referenciaMidia.nomeArquivo,
              mimeType: shot.referenciaMidia.mimeType,
              tipoMedia: shot.referenciaMidia.tipoMedia
            } : undefined
          };
        }) : []
      };
      
      return {
        scene: sceneCopy,
        scriptName: script.name,
        scriptId: script.id
      };
    });
  });
  
  console.log(`[DEBUG_GET_SCENES] Returning ${result.length} scene results`);
  return result;
};

export const getAllLocacoesFromSelectedScripts = () => {
  const scripts = useAppStore.getState().scripts;
  const selectedScriptsFilter = useAppStore.getState().selectedScriptsFilter;
  
  const scriptsToUse = selectedScriptsFilter.length > 0
    ? scripts.filter(script => selectedScriptsFilter.includes(script.id))
    : scripts;
  
  return scriptsToUse.flatMap(script => {
    return script.documentState.locacoes.map(locacao => ({
      locacao,
      scriptName: script.name,
      scriptId: script.id
    }));
  });
};

export const getAllPersonagensFromSelectedScripts = () => {
  const scripts = useAppStore.getState().scripts;
  const selectedScriptsFilter = useAppStore.getState().selectedScriptsFilter;
  
  const scriptsToUse = selectedScriptsFilter.length > 0
    ? scripts.filter(script => selectedScriptsFilter.includes(script.id))
    : scripts;
  
  return scriptsToUse.flatMap(script => {
    return script.documentState.personagens.map(personagem => ({
      personagem,
      scriptName: script.name,
      scriptId: script.id
    }));
  });
};

export default SceneViewWithFilters;
