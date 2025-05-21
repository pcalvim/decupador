import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DocumentState, Scene, Personagem, Locacao, Diaria, TabType, Shot, AppStateWithMultipleScripts } from '../types';
import { generateSceneColor, calculateDuration, generateContentHash, detectScenes } from '../utils/parseDocx';
import { toast } from 'sonner';

// Helper to create a new UUID
const createId = () => Math.random().toString(36).substring(2, 9);

// Helper for storing snapshots for undo
const MAX_UNDO_HISTORY = 20;
const saveSnapshot = (current: DocumentState, undoStack: DocumentState[]): DocumentState[] => {
  if (undoStack.length >= MAX_UNDO_HISTORY) {
    return [...undoStack.slice(1), { ...current }];
  }
  return [...undoStack, { ...current }];
};

const initialDocumentState: DocumentState = {
  texto: '',
  originalText: '',
  cenas: [],
  personagens: [],
  locacoes: [],
  diarias: [],
  lastUpdated: Date.now(),
  textFormatting: {
    bold: {},
    italic: {},
    alignment: {},
    fontSize: {}
  }
};

const useAppStore = create<AppStateWithMultipleScripts>()(
  persist(
    (set, get) => ({
      scripts: [],
      currentScriptId: null,
      currentTab: TabType.Editor,
      undoStack: [],
      selectedScriptsFilter: [],

      // Script management
      addScript: (name: string) => {
        const id = createId();
        console.log(`[Roteiro] Adicionando novo roteiro: "${name}" com ID: ${id}`);
        
        set(state => {
          console.log(`[Roteiro] Estado antes de adicionar: ${state.scripts.length} roteiros, atual: ${state.currentScriptId}`);
          
          const newScripts = [...state.scripts, {
            id,
            name,
            documentState: { ...initialDocumentState }
          }];
          
          console.log(`[Roteiro] Novos scripts após adicionar:`, newScripts.map(s => ({ id: s.id, name: s.name })));
          
          return {
            scripts: newScripts,
            currentScriptId: id
          };
        });
        
        const newState = get();
        console.log(`[Roteiro] Estado após adicionar: ${newState.scripts.length} roteiros, atual: ${newState.currentScriptId}`);
        console.log(`[Roteiro] Lista de roteiros:`, newState.scripts.map(s => ({ id: s.id, name: s.name })));
        
        return id;
      },
      
      // Função para resetar todos os roteiros
      resetAllScripts: () => {
        console.log('[Reset] Resetando todos os roteiros...');
        set({
          scripts: [],
          currentScriptId: null,
          currentTab: TabType.Editor,
          undoStack: [],
          selectedScriptsFilter: []
        });
        console.log('[Reset] Reset completo. Novo estado:', get());
      },
      
      updateScriptName: (id: string, name: string) => {
        console.log(`[Roteiro] Atualizando nome do roteiro ${id} para "${name}"`);
        set(state => ({
          scripts: state.scripts.map(script => 
            script.id === id ? { ...script, name } : script
          )
        }));
        
        // Adicionar log após atualização
        const updatedState = get();
        console.log(`[Roteiro] Após atualização de nome, scripts:`, updatedState.scripts.map(s => ({ id: s.id, name: s.name })));
      },
      
      removeScript: (id: string) => {
        console.log(`[Roteiro] Removendo roteiro: ${id}`);
        set(state => {
          const newScripts = state.scripts.filter(script => script.id !== id);
          console.log(`[Roteiro] Scripts após remoção:`, newScripts.map(s => ({ id: s.id, name: s.name })));
          
          // If we're removing the current script, select another one if possible
          let newCurrentScriptId = state.currentScriptId;
          if (state.currentScriptId === id) {
            newCurrentScriptId = newScripts.length > 0 ? newScripts[0].id : null;
            console.log(`[Roteiro] Roteiro atual removido, alterando para: ${newCurrentScriptId}`);
          }
          
          return {
            scripts: newScripts,
            currentScriptId: newCurrentScriptId
          };
        });
        
        // Log após remoção
        const afterRemoval = get();
        console.log(`[Roteiro] Estado após remoção: ${afterRemoval.scripts.length} roteiros, atual: ${afterRemoval.currentScriptId}`);
      },
      
      setCurrentScript: (id: string) => {
        console.log(`[Roteiro] Alterando roteiro atual para: ${id}`);
        const prevScript = get().currentScriptId;
        
        // Verificar se o ID existe
        const scriptExists = get().scripts.some(s => s.id === id);
        if (!scriptExists) {
          console.error(`[Roteiro] ERRO: Tentativa de definir roteiro inexistente com ID: ${id}`);
          return;
        }
        
        set({ currentScriptId: id });
        const state = get();
        const script = state.scripts.find(s => s.id === id);
        console.log(`[Roteiro] Mudança de roteiro: ${prevScript} -> ${id}`);
        console.log(`[Roteiro] Informações do roteiro atual:`, 
          script ? { 
            id: script.id, 
            name: script.name, 
            scenes: script.documentState.cenas.length,
            characters: script.documentState.personagens.length 
          } : 'Não encontrado');
      },
      
      // Multi-script filter selection
      setSelectedScriptsFilter: (scriptIds: string[]) => {
        console.log(`[Filtro] Definindo filtro de roteiros:`, scriptIds);
        set({ selectedScriptsFilter: scriptIds });
      },
      
      toggleScriptInFilter: (scriptId: string) => {
        set(state => {
          const isSelected = state.selectedScriptsFilter.includes(scriptId);
          
          if (isSelected) {
            console.log(`[Filtro] Removendo roteiro ${scriptId} do filtro`);
            return { 
              selectedScriptsFilter: state.selectedScriptsFilter.filter(id => id !== scriptId)
            };
          } else {
            console.log(`[Filtro] Adicionando roteiro ${scriptId} ao filtro`);
            return {
              selectedScriptsFilter: [...state.selectedScriptsFilter, scriptId]
            };
          }
        });
      },
      
      // Helper function to get current document state
      getCurrentDocumentState: () => {
        const { scripts, currentScriptId } = get();
        const currentScript = scripts.find(s => s.id === currentScriptId);
        
        if (!currentScript) {
          console.log(`[Estado] Roteiro atual (${currentScriptId}) não encontrado!`);
          return initialDocumentState;
        }
        
        return currentScript.documentState;
      },
      
      // Helper function to get document state by script ID
      _getDocumentStateByScriptId: (scriptId: string) => {
        const { scripts } = get();
        const script = scripts.find(s => s.id === scriptId);
        
        if (!script) {
          console.log(`[Estado] Roteiro com ID ${scriptId} não encontrado!`);
          return null;
        }
        
        return script.documentState;
      },
      
      // Helper function to update document state by script ID
      _updateDocumentStateByScriptId: (scriptId: string, updater: (state: DocumentState) => DocumentState) => {
        const { scripts } = get();
        
        if (!scriptId) {
          console.log(`[Estado] Tentativa de atualizar estado sem ID de roteiro!`);
          return;
        }
        
        // Verificar se o roteiro existe
        const scriptExists = scripts.some(s => s.id === scriptId);
        if (!scriptExists) {
          console.log(`[Estado] Roteiro com ID ${scriptId} não encontrado para atualização!`);
          return;
        }
        
        set(state => ({
          scripts: state.scripts.map(script => 
            script.id === scriptId 
              ? { ...script, documentState: updater(script.documentState) }
              : script
          )
        }));
      },
      
      // Helper function to update current document state
      updateCurrentDocumentState: (updater: (state: DocumentState) => DocumentState) => {
        const { scripts, currentScriptId } = get();
        
        if (!currentScriptId) {
          console.log(`[Estado] Tentativa de atualizar estado sem roteiro selecionado!`);
          return;
        }
        
        set(state => ({
          scripts: state.scripts.map(script => 
            script.id === currentScriptId 
              ? { ...script, documentState: updater(script.documentState) }
              : script
          )
        }));
      },
      
      // Document state actions
      setDocumentText: (scriptId: string, text: string, title?: string) => {
        const { scripts } = get();
        const scriptIndex = scripts.findIndex(s => s.id === scriptId);
        
        if (scriptIndex === -1) return;
        
        const currentState = scripts[scriptIndex].documentState;
        const newState = { 
          ...currentState,
          texto: text,
          titulo: title || currentState.titulo,
          lastUpdated: Date.now()
        };
        
        set(state => ({
          scripts: state.scripts.map(script => 
            script.id === scriptId 
              ? { ...script, documentState: newState }
              : script
          ),
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
      },
      
      setOriginalText: (text: string) => {
        get().updateCurrentDocumentState(state => ({
          ...state,
          originalText: text,
          lastUpdated: Date.now()
        }));
      },
      
      // Text formatting
      applyTextFormatting: (formatType: string, range: [number, number], value: any) => {
        const currentState = get().getCurrentDocumentState();
        
        // Create a copy of the current formatting or initialize if none exists
        const newFormatting = {
          ...currentState.textFormatting || {},
          [formatType]: {
            ...(currentState.textFormatting?.[formatType] || {})
          }
        };
        
        // Apply formatting to each character in the range
        for (let i = range[0]; i < range[1]; i++) {
          newFormatting[formatType][i] = value;
        }
        
        const newState = {
          ...currentState,
          textFormatting: newFormatting,
          lastUpdated: Date.now()
        };
        
        get().updateCurrentDocumentState(() => newState);
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
      },
      
      // Scene management
      addScene: (scene: Partial<Scene>) => {
        const currentState = get().getCurrentDocumentState();
        const id = scene.id || createId();
        const newScene: Scene = {
          id,
          descricao: scene.descricao || 'Nova cena',
          startOffset: scene.startOffset || 0,
          endOffset: scene.endOffset || 0,
          highlightColor: scene.highlightColor || generateSceneColor(currentState.cenas.length),
          shotlist: scene.shotlist || [],
          personagens: scene.personagens || [],
          duracao: scene.duracao || 0,
          tipoLocacao: scene.tipoLocacao
        };
        
        if (scene.contentHash) {
          newScene.contentHash = scene.contentHash;
        }
        
        if (scene.locacaoPrincipal) {
          newScene.locacaoPrincipal = scene.locacaoPrincipal;
        }
        
        const updatedScenes = [...currentState.cenas, newScene];
        const newState = {
          ...currentState,
          cenas: updatedScenes,
          lastUpdated: Date.now()
        };
        
        get().updateCurrentDocumentState(() => newState);
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
      },
      
      updateScene: (id: string, updates: Partial<Scene>) => {
        const currentState = get().getCurrentDocumentState();
        const sceneIndex = currentState.cenas.findIndex(s => s.id === id);
        
        if (sceneIndex === -1) return;
        
        const updatedScenes = [...currentState.cenas];
        updatedScenes[sceneIndex] = { ...updatedScenes[sceneIndex], ...updates };
        
        const newState = {
          ...currentState,
          cenas: updatedScenes,
          lastUpdated: Date.now()
        };
        
        get().updateCurrentDocumentState(() => newState);
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
      },
      
      removeScene: (id: string) => {
        const currentState = get().getCurrentDocumentState();
        
        const newState = {
          ...currentState,
          cenas: currentState.cenas.filter(scene => scene.id !== id),
          lastUpdated: Date.now()
        };
        
        get().updateCurrentDocumentState(() => newState);
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
      },
      
      removeAllScenes: () => {
        const currentState = get().getCurrentDocumentState();
        
        const newState = {
          ...currentState,
          cenas: [],
          lastUpdated: Date.now()
        };
        
        get().updateCurrentDocumentState(() => newState);
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
      },
      
      addShot: (sceneId: string, shot: Partial<Shot>, scriptId?: string) => {
        console.log(`[STORE_LOG] Tentando ADICIONAR shot à cena ID: ${sceneId}`, shot);
        
        // Determinar qual scriptId usar
        const targetScriptId = scriptId || get().currentScriptId;
        console.log(`[STORE_LOG] Usando scriptId: ${targetScriptId}`);
        
        if (!targetScriptId) {
          console.error(`[STORE_LOG] ERRO: Nenhum scriptId fornecido ou selecionado ao tentar adicionar shot.`);
          toast.error(`Erro interno: Nenhum roteiro selecionado.`);
          return;
        }
        
        // Obter o estado do documento do roteiro específico
        const currentState = get()._getDocumentStateByScriptId(targetScriptId);
        if (!currentState) {
          console.error(`[STORE_LOG] ERRO: Roteiro com ID ${targetScriptId} não encontrado ao tentar adicionar shot.`);
          toast.error(`Erro interno: Roteiro ${targetScriptId} não encontrado.`);
          return;
        }
        
        console.log(`[STORE_LOG] Estado atual do documento (roteiro ${targetScriptId}):`, JSON.parse(JSON.stringify(currentState)));
        
        const sceneIndex = currentState.cenas.findIndex(s => s.id === sceneId);
        console.log(`[STORE_LOG] Índice da cena encontrada: ${sceneIndex}`);

        if (sceneIndex === -1) {
          console.error(`[STORE_LOG] ERRO: Cena com ID ${sceneId} não encontrada ao tentar adicionar shot.`);
          toast.error(`Erro interno: Cena ${sceneId} não encontrada.`);
          return;
        }
        
        const newShot: Shot = {
          id: shot.id || `shot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          descricao: shot.descricao || 'Novo shot',
          tipo: shot.tipo || 'MÉDIO',
          personagens: shot.personagens || [],
          duracao: shot.duracao || 0,
          equipamento: shot.equipamento,
          notas: shot.notas
        };
        
        console.log(`[STORE_LOG] Novo shot preparado:`, newShot);

        const updatedScenes = [...currentState.cenas];
        const targetScene = { ...updatedScenes[sceneIndex] }; // Clonar a cena alvo
        targetScene.shotlist = [...(targetScene.shotlist || []), newShot]; // Adicionar ao shotlist
        updatedScenes[sceneIndex] = targetScene; // Atualizar a cena no array de cenas
        
        const newState = {
          ...currentState,
          cenas: updatedScenes,
          lastUpdated: Date.now()
        };
        
        console.log(`[STORE_LOG] Novo estado do documento após ADICIONAR shot:`, JSON.parse(JSON.stringify(newState)));
        
        // Atualizar o estado do documento no roteiro específico
        get()._updateDocumentStateByScriptId(targetScriptId, () => newState);
        
        // Salvar snapshot para undo
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        })); 
        
        console.log(`[STORE_LOG] Shot ADICIONADO com sucesso à cena ${sceneId} no roteiro ${targetScriptId}`);
      },
      
      updateShot: (sceneId: string, shotId: string, updates: Partial<Shot>, scriptId?: string) => {
        console.log(`[STORE_LOG] Tentando ATUALIZAR shot ID: ${shotId} na cena ID: ${sceneId}`, updates);
        
        // Determinar qual scriptId usar
        const targetScriptId = scriptId || get().currentScriptId;
        console.log(`[STORE_LOG] Usando scriptId: ${targetScriptId}`);
        
        if (!targetScriptId) {
          console.error(`[STORE_LOG] ERRO: Nenhum scriptId fornecido ou selecionado ao tentar atualizar shot.`);
          toast.error(`Erro interno: Nenhum roteiro selecionado.`);
          return;
        }
        
        // Obter o estado do documento do roteiro específico
        const currentState = get()._getDocumentStateByScriptId(targetScriptId);
        if (!currentState) {
          console.error(`[STORE_LOG] ERRO: Roteiro com ID ${targetScriptId} não encontrado ao tentar atualizar shot.`);
          toast.error(`Erro interno: Roteiro ${targetScriptId} não encontrado.`);
          return;
        }
        
        console.log(`[STORE_LOG] Estado atual do documento (roteiro ${targetScriptId}):`, JSON.parse(JSON.stringify(currentState)));
        
        const sceneIndex = currentState.cenas.findIndex(s => s.id === sceneId);
        console.log(`[STORE_LOG] Índice da cena encontrada: ${sceneIndex}`);

        if (sceneIndex === -1) {
          console.error(`[STORE_LOG] ERRO: Cena com ID ${sceneId} não encontrada ao tentar atualizar shot.`);
          toast.error(`Erro interno: Cena ${sceneId} não encontrada.`);
          return;
        }
        
        const scene = currentState.cenas[sceneIndex];
        const shotIndex = scene.shotlist.findIndex(s => s.id === shotId);
        
        console.log(`[STORE_LOG] Índice do shot encontrado na cena: ${shotIndex}`);

        if (shotIndex === -1) {
          console.error(`[STORE_LOG] ERRO: Shot com ID ${shotId} não encontrado na cena ${sceneId}.`);
          toast.error(`Erro interno: Shot ${shotId} não encontrado.`);
          return;
        }
        
        const updatedShots = [...scene.shotlist];
        updatedShots[shotIndex] = { ...updatedShots[shotIndex], ...updates };
        
        const updatedScenes = [...currentState.cenas];
        updatedScenes[sceneIndex] = {
          ...updatedScenes[sceneIndex],
          shotlist: updatedShots
        };
        
        const newState = {
          ...currentState,
          cenas: updatedScenes,
          lastUpdated: Date.now()
        };
        
        console.log(`[STORE_LOG] Novo estado do documento após ATUALIZAR shot:`, JSON.parse(JSON.stringify(newState)));
        
        // Atualizar o estado do documento no roteiro específico
        get()._updateDocumentStateByScriptId(targetScriptId, () => newState);
        
        // Salvar snapshot para undo
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
        
        console.log(`[STORE_LOG] Shot ATUALIZADO com sucesso: ${shotId} na cena ${sceneId} no roteiro ${targetScriptId}`);
      },
      
      removeShot: (sceneId: string, shotId: string, scriptId?: string) => {
        console.log(`[STORE_LOG] Tentando REMOVER shot ID: ${shotId} da cena ID: ${sceneId}`);
        
        // Determinar qual scriptId usar
        const targetScriptId = scriptId || get().currentScriptId;
        console.log(`[STORE_LOG] Usando scriptId: ${targetScriptId}`);
        
        if (!targetScriptId) {
          console.error(`[STORE_LOG] ERRO: Nenhum scriptId fornecido ou selecionado ao tentar remover shot.`);
          toast.error(`Erro interno: Nenhum roteiro selecionado.`);
          return;
        }
        
        // Obter o estado do documento do roteiro específico
        const currentState = get()._getDocumentStateByScriptId(targetScriptId);
        if (!currentState) {
          console.error(`[STORE_LOG] ERRO: Roteiro com ID ${targetScriptId} não encontrado ao tentar remover shot.`);
          toast.error(`Erro interno: Roteiro ${targetScriptId} não encontrado.`);
          return;
        }
        
        const sceneIndex = currentState.cenas.findIndex(s => s.id === sceneId);
        
        if (sceneIndex === -1) {
          console.error(`[STORE_LOG] ERRO: Cena com ID ${sceneId} não encontrada ao tentar remover shot.`);
          toast.error(`Erro interno: Cena ${sceneId} não encontrada.`);
          return;
        }
        
        const scene = currentState.cenas[sceneIndex];
        const updatedShots = scene.shotlist.filter(shot => shot.id !== shotId);
        
        const updatedScenes = [...currentState.cenas];
        updatedScenes[sceneIndex] = {
          ...updatedScenes[sceneIndex],
          shotlist: updatedShots
        };
        
        const newState = {
          ...currentState,
          cenas: updatedScenes,
          lastUpdated: Date.now()
        };
        
        // Atualizar o estado do documento no roteiro específico
        get()._updateDocumentStateByScriptId(targetScriptId, () => newState);
        
        // Salvar snapshot para undo
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
        
        console.log(`[STORE_LOG] Shot REMOVIDO com sucesso: ${shotId} da cena ${sceneId} no roteiro ${targetScriptId}`);
      },
      
      moveShotToAnotherScene: (shot: Shot, sourceSceneId: string, sourceScriptId: string, targetSceneId: string, targetScriptId: string) => {
        console.log(`[STORE_LOG] Tentando MOVER shot ID: ${shot.id} da cena ${sourceSceneId} (roteiro ${sourceScriptId}) para cena ${targetSceneId} (roteiro ${targetScriptId})`);
        console.log(`[DEBUG_MOVE] Shot original para mover:`, JSON.stringify(shot));
        
        // 1. Verificar se os roteiros de origem e destino existem
        const sourceDocState = get()._getDocumentStateByScriptId(sourceScriptId);
        const targetDocState = get()._getDocumentStateByScriptId(targetScriptId);
        
        if (!sourceDocState || !targetDocState) {
          console.error(`[STORE_LOG] ERRO: Roteiro de origem ou destino não encontrado ao tentar mover shot.`);
          toast.error(`Erro: Roteiro não encontrado.`);
          return;
        }
        
        // 2. Verificar se as cenas de origem e destino existem
        const sourceSceneIndex = sourceDocState.cenas.findIndex(s => s.id === sourceSceneId);
        const targetSceneIndex = targetDocState.cenas.findIndex(s => s.id === targetSceneId);
        
        if (sourceSceneIndex === -1 || targetSceneIndex === -1) {
          console.error(`[STORE_LOG] ERRO: Cena de origem ou destino não encontrada ao tentar mover shot.`);
          toast.error(`Erro: Cena não encontrada.`);
          return;
        }
        
        // 3. Verificar se o shot existe na cena de origem
        const sourceScene = sourceDocState.cenas[sourceSceneIndex];
        const shotIndex = sourceScene.shotlist.findIndex(s => s.id === shot.id);
        
        console.log(`[DEBUG_MOVE] Cena origem:`, {
          id: sourceScene.id,
          descricao: sourceScene.descricao,
          shotlist: sourceScene.shotlist.map(s => ({ id: s.id, descricao: s.descricao }))
        });
        
        if (shotIndex === -1) {
          console.error(`[STORE_LOG] ERRO: Shot com ID ${shot.id} não encontrado na cena de origem ${sourceSceneId}.`);
          toast.error(`Erro: Shot não encontrado na cena de origem.`);
          return;
        }
        
        // 4. Clonar o shot atual (usando o shot passado como parâmetro ou obtendo da cena)
        // Criamos um novo ID para garantir que o React detecte a mudança
        const shotToMove = { 
          ...shot,
          id: shot.id.includes('_moved_') ? shot.id : `${shot.id}_moved_${Date.now()}` 
        };
        
        console.log(`[DEBUG_MOVE] Shot modificado para mover:`, JSON.stringify(shotToMove));
        
        // 5. Remover o shot da cena de origem
        const updatedSourceShots = sourceScene.shotlist.filter(s => s.id !== shot.id);
        const updatedSourceScenes = [...sourceDocState.cenas];
        updatedSourceScenes[sourceSceneIndex] = {
          ...updatedSourceScenes[sourceSceneIndex],
          shotlist: updatedSourceShots
        };
        
        console.log(`[DEBUG_MOVE] Shotlist da cena origem APÓS remoção:`, 
          updatedSourceScenes[sourceSceneIndex].shotlist.map(s => ({ id: s.id, descricao: s.descricao }))
        );
        
        // 6. Adicionar o shot à cena de destino
        const targetScene = targetDocState.cenas[targetSceneIndex];
        
        console.log(`[DEBUG_MOVE] Cena destino ANTES de adicionar:`, {
          id: targetScene.id,
          descricao: targetScene.descricao,
          shotlist: targetScene.shotlist.map(s => ({ id: s.id, descricao: s.descricao }))
        });
        
        const updatedTargetShots = [...(targetScene.shotlist || []), shotToMove];
        const updatedTargetScenes = [...targetDocState.cenas];
        updatedTargetScenes[targetSceneIndex] = {
          ...updatedTargetScenes[targetSceneIndex],
          shotlist: updatedTargetShots
        };
        
        console.log(`[DEBUG_MOVE] Shotlist da cena destino APÓS adição:`, 
          updatedTargetScenes[targetSceneIndex].shotlist.map(s => ({ id: s.id, descricao: s.descricao }))
        );
        
        // 7. Atualizar o estado dos dois roteiros
        // Primeiro o roteiro de origem
        const newSourceState = {
          ...sourceDocState,
          cenas: updatedSourceScenes,
          lastUpdated: Date.now()
        };
        
        // Depois o roteiro de destino
        const newTargetState = {
          ...targetDocState,
          cenas: updatedTargetScenes,
          lastUpdated: Date.now()
        };
        
        // 8. Atualizar os estados no store
        // Se o roteiro de origem e destino são o mesmo, fazemos apenas uma atualização
        if (sourceScriptId === targetScriptId) {
          // Atualizamos com uma nova referência para forçar rerender
          const updatedState = {
            ...newSourceState,
            cenas: [...newSourceState.cenas]
          };
          get()._updateDocumentStateByScriptId(sourceScriptId, () => updatedState);
          
          console.log(`[DEBUG_MOVE] Estado atualizado para roteiro único ${sourceScriptId}`);
          console.log(`[DEBUG_MOVE] Shotlist da cena origem no estado final:`, 
            get()._getDocumentStateByScriptId(sourceScriptId)?.cenas.find(s => s.id === sourceSceneId)?.shotlist.map(s => ({ id: s.id, descricao: s.descricao }))
          );
          console.log(`[DEBUG_MOVE] Shotlist da cena destino no estado final:`, 
            get()._getDocumentStateByScriptId(sourceScriptId)?.cenas.find(s => s.id === targetSceneId)?.shotlist.map(s => ({ id: s.id, descricao: s.descricao }))
          );
          
          // Salvar snapshot para undo apenas uma vez
          set(state => ({
            undoStack: saveSnapshot(sourceDocState, state.undoStack)
          }));
        } else {
          // Se são roteiros diferentes, atualizamos cada um separadamente
          // Garantindo novas referências de objetos
          get()._updateDocumentStateByScriptId(sourceScriptId, () => ({
            ...newSourceState,
            cenas: [...newSourceState.cenas]
          }));
          
          get()._updateDocumentStateByScriptId(targetScriptId, () => ({
            ...newTargetState,
            cenas: [...newTargetState.cenas]
          }));
          
          console.log(`[DEBUG_MOVE] Estados atualizados para roteiros diferentes (origem: ${sourceScriptId}, destino: ${targetScriptId})`);
          console.log(`[DEBUG_MOVE] Shotlist da cena origem no estado final:`, 
            get()._getDocumentStateByScriptId(sourceScriptId)?.cenas.find(s => s.id === sourceSceneId)?.shotlist.map(s => ({ id: s.id, descricao: s.descricao }))
          );
          console.log(`[DEBUG_MOVE] Shotlist da cena destino no estado final:`, 
            get()._getDocumentStateByScriptId(targetScriptId)?.cenas.find(s => s.id === targetSceneId)?.shotlist.map(s => ({ id: s.id, descricao: s.descricao }))
          );
          
          // Salvar snapshot para undo (apenas do roteiro atual para simplificar)
          const currentScriptId = get().currentScriptId;
          if (currentScriptId === sourceScriptId) {
            set(state => ({
              undoStack: saveSnapshot(sourceDocState, state.undoStack)
            }));
          } else if (currentScriptId === targetScriptId) {
            set(state => ({
              undoStack: saveSnapshot(targetDocState, state.undoStack)
            }));
          }
        }
        
        // Forçar refresh dos scripts selecionados para filtro
        const selectedScripts = get().selectedScriptsFilter;
        console.log(`[DEBUG_MOVE] Forçando atualização com selectedScriptsFilter:`, selectedScripts);
        set(state => ({
          selectedScriptsFilter: [...selectedScripts]
        }));
        
        console.log(`[STORE_LOG] Shot MOVIDO com sucesso: ${shotToMove.id} da cena ${sourceSceneId} para a cena ${targetSceneId}`);
      },
      
      reorderShotsInScene: (sceneId: string, scriptId: string, orderedShotIds: string[]) => {
        console.log(`[STORE_LOG] Tentando REORDENAR shots na cena ID: ${sceneId}, roteiro ID: ${scriptId}`);
        
        // Obter o estado do documento do roteiro específico
        const currentState = get()._getDocumentStateByScriptId(scriptId);
        if (!currentState) {
          console.error(`[STORE_LOG] ERRO: Roteiro com ID ${scriptId} não encontrado ao tentar reordenar shots.`);
          toast.error(`Erro interno: Roteiro ${scriptId} não encontrado.`);
          return;
        }
        
        // Encontrar a cena
        const sceneIndex = currentState.cenas.findIndex(s => s.id === sceneId);
        if (sceneIndex === -1) {
          console.error(`[STORE_LOG] ERRO: Cena com ID ${sceneId} não encontrada ao tentar reordenar shots.`);
          toast.error(`Erro interno: Cena ${sceneId} não encontrada.`);
          return;
        }
        
        const scene = currentState.cenas[sceneIndex];
        
        // Verificar se todos os shotIds existem na cena
        const allShotsExist = orderedShotIds.every(id => 
          scene.shotlist.some(shot => shot.id === id)
        );
        
        if (!allShotsExist) {
          console.error(`[STORE_LOG] ERRO: Nem todos os shots fornecidos existem na cena ${sceneId}.`);
          toast.error("Erro ao reordenar: alguns shots não existem na cena.");
          return;
        }
        
        // Verificar se a lista fornecida tem o mesmo número de shots que a cena
        if (orderedShotIds.length !== scene.shotlist.length) {
          console.error(`[STORE_LOG] ERRO: A lista de shots fornecida (${orderedShotIds.length}) não tem o mesmo tamanho que a lista original (${scene.shotlist.length}).`);
          toast.error("Erro ao reordenar: contagem de shots inconsistente.");
          return;
        }
        
        // Reordenar os shots de acordo com a lista fornecida
        const reorderedShots = orderedShotIds.map(id => 
          scene.shotlist.find(shot => shot.id === id)!
        );
        
        // Criar uma cópia atualizada da lista de cenas
        const updatedScenes = [...currentState.cenas];
        updatedScenes[sceneIndex] = {
          ...updatedScenes[sceneIndex],
          shotlist: reorderedShots
        };
        
        // Criar o novo estado do documento
        const newState = {
          ...currentState,
          cenas: updatedScenes,
          lastUpdated: Date.now()
        };
        
        // Atualizar o estado do documento no roteiro específico
        get()._updateDocumentStateByScriptId(scriptId, () => newState);
        
        // Salvar snapshot para undo
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
        
        console.log(`[STORE_LOG] Shots REORDENADOS com sucesso na cena ${sceneId}, roteiro ${scriptId}`);
      },
      
      // Personagens (Cast)
      addPersonagem: (personagem: Partial<Personagem>) => {
        const currentState = get().getCurrentDocumentState();
        const newPersonagem: Personagem = {
          id: personagem.id || createId(),
          nome: personagem.nome || 'Novo personagem',
          ator: personagem.ator,
          contato: personagem.contato,
          notas: personagem.notas,
          cenas: personagem.cenas || []
        };
        
        const newState = {
          ...currentState,
          personagens: [...currentState.personagens, newPersonagem],
          lastUpdated: Date.now()
        };
        
        get().updateCurrentDocumentState(() => newState);
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
      },
      
      updatePersonagem: (id: string, updates: Partial<Personagem>) => {
        const currentState = get().getCurrentDocumentState();
        const index = currentState.personagens.findIndex(p => p.id === id);
        
        if (index === -1) return;
        
        const updatedPersonagens = [...currentState.personagens];
        updatedPersonagens[index] = { ...updatedPersonagens[index], ...updates };
        
        const newState = {
          ...currentState,
          personagens: updatedPersonagens,
          lastUpdated: Date.now()
        };
        
        get().updateCurrentDocumentState(() => newState);
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
      },
      
      removePersonagem: (id: string) => {
        const currentState = get().getCurrentDocumentState();
        
        const newState = {
          ...currentState,
          personagens: currentState.personagens.filter(p => p.id !== id),
          lastUpdated: Date.now()
        };
        
        get().updateCurrentDocumentState(() => newState);
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
      },
      
      // Locações (Locations)
      addLocacao: (locacao: Partial<Locacao>) => {
        const currentState = get().getCurrentDocumentState();
        const newLocacao: Locacao = {
          id: locacao.id || createId(),
          nome: locacao.nome || 'Nova locação',
          endereco: locacao.endereco,
          notas: locacao.notas,
          cenas: locacao.cenas || []
        };
        
        const newState = {
          ...currentState,
          locacoes: [...currentState.locacoes, newLocacao],
          lastUpdated: Date.now()
        };
        
        get().updateCurrentDocumentState(() => newState);
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
      },
      
      updateLocacao: (id: string, updates: Partial<Locacao>) => {
        const currentState = get().getCurrentDocumentState();
        const index = currentState.locacoes.findIndex(l => l.id === id);
        
        if (index === -1) return;
        
        const updatedLocacoes = [...currentState.locacoes];
        updatedLocacoes[index] = { ...updatedLocacoes[index], ...updates };
        
        const newState = {
          ...currentState,
          locacoes: updatedLocacoes,
          lastUpdated: Date.now()
        };
        
        get().updateCurrentDocumentState(() => newState);
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
      },
      
      removeLocacao: (id: string) => {
        const currentState = get().getCurrentDocumentState();
        
        const newState = {
          ...currentState,
          locacoes: currentState.locacoes.filter(l => l.id !== id),
          lastUpdated: Date.now()
        };
        
        get().updateCurrentDocumentState(() => newState);
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
      },
      
      setSceneLocation: (sceneId: string, locationId: string) => {
        const currentState = get().getCurrentDocumentState();
        const sceneIndex = currentState.cenas.findIndex(s => s.id === sceneId);
        
        if (sceneIndex === -1) return;
        
        // First remove this scene from all locations
        const updatedLocacoes = currentState.locacoes.map(loc => ({
          ...loc,
          cenas: loc.cenas.filter(id => id !== sceneId)
        }));
        
        // Then add this scene to the selected location
        const locationIndex = updatedLocacoes.findIndex(l => l.id === locationId);
        if (locationIndex !== -1) {
          updatedLocacoes[locationIndex] = {
            ...updatedLocacoes[locationIndex],
            cenas: [...updatedLocacoes[locationIndex].cenas, sceneId]
          };
        }
        
        // Update the scene's location
        const updatedScenes = [...currentState.cenas];
        updatedScenes[sceneIndex] = {
          ...updatedScenes[sceneIndex],
          locacaoPrincipal: locationId
        };
        
        const newState = {
          ...currentState,
          cenas: updatedScenes,
          locacoes: updatedLocacoes,
          lastUpdated: Date.now()
        };
        
        get().updateCurrentDocumentState(() => newState);
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
      },
      
      // Cronograma (Schedule)
      addDiaria: (diaria: Partial<Diaria>, scriptId?: string) => {
        const targetScriptId = scriptId || get().currentScriptId;
        if (!targetScriptId) {
          console.error("[STORE_LOG] ERRO: Nenhum scriptId fornecido ou selecionado ao tentar adicionar diária.");
          toast.error("Erro interno: Nenhum roteiro selecionado para adicionar diária.");
          return;
        }

        const currentState = get()._getDocumentStateByScriptId(targetScriptId);
        if (!currentState) {
          console.error(`[STORE_LOG] ERRO: Roteiro com ID ${targetScriptId} não encontrado ao tentar adicionar diária.`);
          toast.error(`Erro interno: Roteiro ${targetScriptId} não encontrado.`);
          return;
        }

        const newDiaria: Diaria = {
          id: diaria.id || createId(),
          data: diaria.data || new Date().toISOString().split('T')[0],
          locacoes: diaria.locacoes || [],
          cenas: diaria.cenas || [],
          horarioInicio: diaria.horarioInicio || '08:00',
          horarioFim: diaria.horarioFim || '18:00',
          notas: diaria.notas
        };
        
        const newState = {
          ...currentState,
          diarias: [...currentState.diarias, newDiaria],
          lastUpdated: Date.now()
        };
        
        get()._updateDocumentStateByScriptId(targetScriptId, () => newState);
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
      },
      
      updateDiaria: (id: string, updates: Partial<Diaria>, scriptId?: string) => {
        const targetScriptId = scriptId || get().currentScriptId;
        if (!targetScriptId) {
            console.error("[STORE_LOG] ERRO: Nenhum scriptId fornecido ou selecionado ao tentar atualizar diária.");
            toast.error("Erro interno: Nenhum roteiro selecionado para atualizar diária.");
            return;
        }
        const currentState = get()._getDocumentStateByScriptId(targetScriptId);
        if (!currentState) {
            console.error(`[STORE_LOG] ERRO: Roteiro com ID ${targetScriptId} não encontrado ao tentar atualizar diária.`);
            toast.error(`Erro interno: Roteiro ${targetScriptId} não encontrado.`);
            return;
        }

        const index = currentState.diarias.findIndex(d => d.id === id);
        if (index === -1) return;
        
        const updatedDiarias = [...currentState.diarias];
        updatedDiarias[index] = { ...updatedDiarias[index], ...updates };
        
        const newState = {
          ...currentState,
          diarias: updatedDiarias,
          lastUpdated: Date.now()
        };
        
        get()._updateDocumentStateByScriptId(targetScriptId, () => newState);
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
      },
      
      removeDiaria: (id: string, scriptId?: string) => {
        const targetScriptId = scriptId || get().currentScriptId;
        if (!targetScriptId) {
            console.error("[STORE_LOG] ERRO: Nenhum scriptId fornecido ou selecionado ao tentar remover diária.");
            toast.error("Erro interno: Nenhum roteiro selecionado para remover diária.");
            return;
        }
        const currentState = get()._getDocumentStateByScriptId(targetScriptId);
        if (!currentState) {
            console.error(`[STORE_LOG] ERRO: Roteiro com ID ${targetScriptId} não encontrado ao tentar remover diária.`);
            toast.error(`Erro interno: Roteiro ${targetScriptId} não encontrado.`);
            return;
        }
        
        const newState = {
          ...currentState,
          diarias: currentState.diarias.filter(d => d.id !== id),
          lastUpdated: Date.now()
        };
        
        get()._updateDocumentStateByScriptId(targetScriptId, () => newState);
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
      },
      
      addSceneToDiaria: (diarioId: string, sceneId: string, scriptId?: string) => {
        const targetScriptId = scriptId || get().currentScriptId;
        if (!targetScriptId) {
            console.error("[STORE_LOG] ERRO: Nenhum scriptId fornecido ou selecionado ao tentar adicionar cena à diária.");
            toast.error("Erro interno: Nenhum roteiro selecionado para adicionar cena à diária.");
            return;
        }
        const currentState = get()._getDocumentStateByScriptId(targetScriptId);
        if (!currentState) {
            console.error(`[STORE_LOG] ERRO: Roteiro com ID ${targetScriptId} não encontrado ao tentar adicionar cena à diária.`);
            toast.error(`Erro interno: Roteiro ${targetScriptId} não encontrado.`);
            return;
        }

        const index = currentState.diarias.findIndex(d => d.id === diarioId);
        if (index === -1) return;
        
        const updatedDiarias = [...currentState.diarias];
        if (!updatedDiarias[index].cenas.includes(sceneId)) {
          updatedDiarias[index] = {
            ...updatedDiarias[index],
            cenas: [...updatedDiarias[index].cenas, sceneId]
          };
        }
        
        const newState = {
          ...currentState,
          diarias: updatedDiarias,
          lastUpdated: Date.now()
        };
        
        get()._updateDocumentStateByScriptId(targetScriptId, () => newState);
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
      },
      
      removeSceneFromDiaria: (diarioId: string, sceneId: string, scriptId?: string) => {
        const targetScriptId = scriptId || get().currentScriptId;
        if (!targetScriptId) {
            console.error("[STORE_LOG] ERRO: Nenhum scriptId fornecido ou selecionado ao tentar remover cena da diária.");
            toast.error("Erro interno: Nenhum roteiro selecionado para remover cena da diária.");
            return;
        }
        const currentState = get()._getDocumentStateByScriptId(targetScriptId);
        if (!currentState) {
            console.error(`[STORE_LOG] ERRO: Roteiro com ID ${targetScriptId} não encontrado ao tentar remover cena da diária.`);
            toast.error(`Erro interno: Roteiro ${targetScriptId} não encontrado.`);
            return;
        }

        const index = currentState.diarias.findIndex(d => d.id === diarioId);
        if (index === -1) return;
        
        const updatedDiarias = [...currentState.diarias];
        updatedDiarias[index] = {
          ...updatedDiarias[index],
          cenas: updatedDiarias[index].cenas.filter(id => id !== sceneId)
        };
        
        const newState = {
          ...currentState,
          diarias: updatedDiarias,
          lastUpdated: Date.now()
        };
        
        get()._updateDocumentStateByScriptId(targetScriptId, () => newState);
        set(state => ({
          undoStack: saveSnapshot(currentState, state.undoStack)
        }));
      },
      
      // Navigation
      setCurrentTab: (tab: TabType) => {
        console.log(`[Navegação] Alterando para tab: ${tab}`);
        set({ currentTab: tab });
      },
      
      // Undo
      undo: () => {
        const { undoStack } = get();
        if (undoStack.length === 0) return;
        
        const previousState = undoStack[undoStack.length - 1];
        
        get().updateCurrentDocumentState(() => previousState);
        set({
          undoStack: undoStack.slice(0, -1)
        });
      },
      
      // Document processing
      processDocument: (scriptId: string, text: string, title?: string, detectScenesAutomatically: boolean = false, createNoScenes: boolean = false) => {
        const { scripts } = get();
        const targetScript = scripts.find(s => s.id === scriptId);
        
        if (!targetScript) {
          console.error(`[Processamento] Roteiro com ID ${scriptId} não encontrado!`);
          return;
        }
        
        console.log(`[Processamento] Processando documento para roteiro: ${scriptId} - "${targetScript.name}"`);
        
        const currentState = targetScript.documentState;
        
        // Initialize scenes array (either with detected scenes or empty array)
        let scenesWithMetadata = [];
        
        if (!createNoScenes) {
          // Detect scenes - now with the createSingleScene parameter (opposite of detectScenesAutomatically)
          const detectedScenes = detectScenes(text, !detectScenesAutomatically);
          console.log(`[Processamento] ${detectedScenes.length} ${detectScenesAutomatically ? 'cenas detectadas' : 'cena única criada'} no roteiro`);
          
          // Create scene objects
          scenesWithMetadata = detectedScenes.map((sceneData, index) => {
            const sceneText = text.substring(sceneData.startOffset, sceneData.endOffset);
            
            return {
              id: createId(),
              descricao: sceneData.descricao,
              startOffset: sceneData.startOffset,
              endOffset: sceneData.endOffset,
              highlightColor: generateSceneColor(index),
              shotlist: [],
              personagens: [],
              duracao: calculateDuration(sceneText),
              contentHash: generateContentHash(sceneText)
            };
          });
        } else {
          console.log(`[Processamento] Nenhuma cena criada automaticamente. Cenas deverão ser adicionadas manualmente.`);
        }
        
        const newState = {
          ...currentState,
          texto: text,
          originalText: text,
          titulo: title || currentState.titulo,
          cenas: scenesWithMetadata,
          lastUpdated: Date.now()
        };
        
        console.log(`[Processamento] Atualizando roteiro com ${scenesWithMetadata.length} cenas`);
        
        // Atualizar o roteiro específico
        set(state => {
          const updatedScripts = state.scripts.map(script => 
            script.id === scriptId 
              ? { ...script, documentState: newState }
              : script
          );
          
          console.log(`[Processamento] Scripts após atualização:`, updatedScripts.map(s => ({ id: s.id, name: s.name })));
          
          return {
            scripts: updatedScripts,
            undoStack: saveSnapshot(currentState, state.undoStack)
          };
        });
        
        console.log(`[Processamento] Roteiro processado com sucesso: ${scriptId}`);
      }
    }),
    {
      name: 'roteiro-app-storage',
      storage: createJSONStorage(() => ({
        getItem: (key) => {
          try {
            console.log(`[STORAGE] Retrieving data for key: ${key}`);
            const value = localStorage.getItem(key);
            if (!value) {
              console.log(`[STORAGE] No data found for key: ${key}`);
              return null;
            }
            // Check for potential large data
            console.log(`[STORAGE] Retrieved data size: ${value.length} chars`);
            return JSON.parse(value);
          } catch (err) {
            console.error(`[STORAGE] Error retrieving data from localStorage:`, err);
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            const serialized = JSON.stringify(value);
            console.log(`[STORAGE] Saving data for key: ${key}, size: ${serialized.length} chars`);
            
            // Check if any shots have media
            const data = value as any;
            if (data && data.scripts) {
              let mediaCount = 0;
              let largestDataUrl = 0;
              data.scripts.forEach((script: any) => {
                script.documentState?.cenas?.forEach((cena: any) => {
                  cena.shotlist?.forEach((shot: any) => {
                    if (shot.referenciaMidia && shot.referenciaMidia.dataUrl) {
                      mediaCount++;
                      const size = shot.referenciaMidia.dataUrl.length;
                      largestDataUrl = Math.max(largestDataUrl, size);
                    }
                  });
                });
              });
              console.log(`[STORAGE] Saving ${mediaCount} media references, largest is ${largestDataUrl} chars`);
              
              // Check if we're approaching localStorage size limits
              if (serialized.length > 4000000) {
                console.warn(`[STORAGE] WARNING: Data size ${serialized.length} is approaching localStorage limits (usually 5MB)`);
              }
            }
            
            localStorage.setItem(key, serialized);
          } catch (err) {
            console.error(`[STORAGE] Error saving data to localStorage:`, err);
          }
        },
        removeItem: (key) => {
          localStorage.removeItem(key);
        }
      })),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('[Storage] Recuperado do localStorage:', {
            scripts: state.scripts.length,
            currentScriptId: state.currentScriptId
          });
          
          if (state.scripts.length > 0) {
            console.log('[Storage] Scripts recuperados:', state.scripts.map(s => ({ id: s.id, name: s.name })));
          }
        }
      }
    }
  )
);

export default useAppStore;
