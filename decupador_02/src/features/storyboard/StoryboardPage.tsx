import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import useAppStore from '../../store/useAppStore';
import ScriptSelector from '../shared/ScriptSelector';
import { Scene, Shot, Script } from '../../types'; // Importando tipos necessários
import { getAllScenesFromSelectedScripts } from '../shared/SceneViewWithFilters'; // Reutilizando helper
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Para estilização
import { Film, RefreshCw, AlertTriangle, Edit3, Save, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { exportStoryboardToZip } from '../../utils/exportStoryboardZip'; // Importa a função de exportação
import type { StoryboardState, SceneState, ShotState, ProjectState, MediaFile, ProjectStyles } from '../../utils/exportStoryboardZip'; // Importa os tipos

const StoryboardPage: React.FC = () => {
  const scripts = useAppStore(state => state.scripts);
  const selectedScriptsFilter = useAppStore(state => state.selectedScriptsFilter);
  const updateShotStore = useAppStore(state => state.updateShot);
  const _getDocumentStateByScriptId = useAppStore(state => state._getDocumentStateByScriptId); // Corrigido para _getDocumentStateByScriptId
  // Assumindo que você tenha uma forma de obter o nome do projeto e cliente, e se o modo escuro está ativo.
  // Para este exemplo, vou usar valores placeholder ou lógica simples.
  const currentProjectName = useAppStore(state => state.scripts.find(s => s.id === state.currentScriptId)?.documentState.titulo || 'Meu Projeto de Storyboard');
  // const isDarkMode = useAppStore(state => state.isDarkMode); // Removido - isDarkMode não existe no store

  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [mediaErrorsCount, setMediaErrorsCount] = useState<Record<string, number>>({});
  const [editingShot, setEditingShot] = useState<{shot: Shot, sceneId: string, scriptId: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get scene text from document state
  const getSceneText = (scene: Scene, scriptId: string) => {
    const documentState = _getDocumentStateByScriptId(scriptId);
    if (documentState && documentState.texto && scene.startOffset !== undefined && scene.endOffset !== undefined) {
      return documentState.texto.substring(scene.startOffset, scene.endOffset);
    }
    return "Texto da cena não disponível ou offsets inválidos.";
  };

  // Force manual refresh function
  const forceRefresh = () => {
    console.log("Forcing storyboard refresh");
    
    // Get direct access to the latest store state
    const currentState = useAppStore.getState();
    const scripts = currentState.scripts;
    const selectedFilter = currentState.selectedScriptsFilter;
    
    // Log the raw data from the store
    console.log("STORE STATE CHECK:", {
      scriptsCount: scripts.length,
      selectedScriptsFilter: selectedFilter,
      scriptIds: scripts.map(s => s.id)
    });
    
    // Directly examine the shots in the store to see if they have media
    let totalShotsInStore = 0;
    let shotsWithMediaInStore = 0;
    
    scripts.forEach(script => {
      script.documentState.cenas.forEach(scene => {
        if (scene.shotlist && scene.shotlist.length > 0) {
          totalShotsInStore += scene.shotlist.length;
          scene.shotlist.forEach(shot => {
            if (shot.referenciaMidia && shot.referenciaMidia.dataUrl) {
              shotsWithMediaInStore++;
              console.log(`DIRECT STORE CHECK: Shot ${shot.id} (${shot.descricao}) has media:`, {
                mediaType: shot.referenciaMidia.tipoMedia,
                fileName: shot.referenciaMidia.nomeArquivo,
                dataUrlLength: shot.referenciaMidia.dataUrl.length
              });
            }
          });
        }
      });
    });
    
    console.log(`DIRECT STORE CHECK: ${totalShotsInStore} total shots, ${shotsWithMediaInStore} with media`);
    toast.info(`Atualizando storyboard: ${shotsWithMediaInStore} shots com mídia`);
    
    setRefreshKey(Date.now());
    setMediaErrorsCount({});
  };

  // Novo método para processar mídia
  const handleMediaFileChange = useCallback((files: FileList | null) => {
    if (!editingShot || !files || files.length === 0) return;
    
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      let tipoMedia: 'image' | 'gif' | 'webp' | 'video' = 'image'; // Padrão
      
      if (file.type.startsWith('image/gif')) {
        tipoMedia = 'gif';
      } else if (file.type.startsWith('image/webp')) {
        tipoMedia = 'webp';
      } else if (file.type.startsWith('video/webm') || file.type.startsWith('video/mp4') || file.type.startsWith('video/quicktime')) {
        tipoMedia = 'video';
      }

      const updatedShot = { 
        ...editingShot.shot,
        referenciaMidia: { 
          nomeArquivo: file.name, 
          mimeType: file.type, 
          tipoMedia,
          dataUrl 
        }
      };
      
      updateShotStore(editingShot.sceneId, editingShot.shot.id, updatedShot, editingShot.scriptId);
      toast.success('Mídia adicionada ao shot!');
      setEditingShot(null);
      setRefreshKey(Date.now());
    };
    reader.readAsDataURL(file);
  }, [editingShot, updateShotStore]);

  // Manipulador de evento paste (cmd+v)
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (!editingShot) return; // Só processa se tiver um shot em edição
      
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            handleMediaFileChange(dataTransfer.files);
            toast.success('Imagem colada da área de transferência!');
            event.preventDefault(); 
            return;
          }
        }
      }
    };

    if (editingShot) {
      document.addEventListener('paste', handlePaste);
      console.log(`[StoryboardPage Paste Listener ATTACHED] ID: ${editingShot.shot.id}`);
    }

    return () => {
      document.removeEventListener('paste', handlePaste);
      console.log(`[StoryboardPage Paste Listener CLEANUP]`);
    };
  }, [editingShot, handleMediaFileChange]);

  // Função para remover mídia
  const handleRemoveMedia = () => {
    if (!editingShot) return;
    
    const updatedShot = { 
      ...editingShot.shot,
      referenciaMidia: undefined
    };
    
    updateShotStore(editingShot.sceneId, editingShot.shot.id, updatedShot, editingShot.scriptId);
    toast.success('Mídia removida do shot!');
    setEditingShot(null);
    setRefreshKey(Date.now());
  };

  // Iniciar edição do shot para adicionar mídia
  const startEditingShot = (shot: Shot, sceneId: string, scriptId: string) => {
    setEditingShot({shot, sceneId, scriptId});
  };

  // Salvar alterações do shot
  const saveEditingShot = () => {
    if (!editingShot) return;
    
    // Já estamos atualizando ao mudar a mídia, então isso só é necessário para fechar o modo de edição
    setEditingShot(null);
  };

  // Obtém todas as cenas dos roteiros selecionados, junto com info do roteiro
  const scenesWithScriptInfo = useMemo(() => {
    console.log("Getting scenes for storyboard, refresh key:", refreshKey);
    return getAllScenesFromSelectedScripts(); // Esta função já retorna { scene, scriptName, scriptId }
  }, [scripts, selectedScriptsFilter, refreshKey]); // Added refreshKey dependency

  // Agrupa cenas por roteiro para exibição
  const scenesByScript = useMemo(() => {
    const grouped: Record<string, { scriptName: string; scriptId: string; scenes: Scene[] }> = {};
    scenesWithScriptInfo.forEach(({ scene, scriptName, scriptId }) => {
      if (!grouped[scriptId]) {
        grouped[scriptId] = { scriptName, scriptId, scenes: [] };
      }
      grouped[scriptId].scenes.push(scene);
    });
    
    // Log some debug info about media references
    let totalShots = 0;
    let shotsWithMedia = 0;
    
    Object.values(grouped).forEach(scriptGroup => {
      scriptGroup.scenes.forEach(scene => {
        if (scene.shotlist && scene.shotlist.length > 0) {
          totalShots += scene.shotlist.length;
          scene.shotlist.forEach(shot => {
            if (shot.referenciaMidia) {
              shotsWithMedia++;
              // Log a sample of the first media reference found
              if (shotsWithMedia === 1) {
                console.log("Sample media reference:", {
                  shotId: shot.id,
                  mediaType: shot.referenciaMidia.tipoMedia,
                  fileName: shot.referenciaMidia.nomeArquivo,
                  mimeType: shot.referenciaMidia.mimeType,
                  dataUrlLength: shot.referenciaMidia.dataUrl?.length || 0,
                  dataUrlStart: shot.referenciaMidia.dataUrl?.substring(0, 50) + '...'
                });
              }
            }
          });
        }
      });
    });
    
    console.log(`Storyboard stats: ${totalShots} total shots, ${shotsWithMedia} with media`);
    
    return grouped;
  }, [scenesWithScriptInfo]);

  // Check on initial load
  useEffect(() => {
    console.log("StoryboardPage mounted or scripts changed");
    
    // Get direct access to the latest store state to compare with what the component receives
    const currentState = useAppStore.getState();
    const scripts = currentState.scripts;
    
    // Directly examine the shots in the store to see if they have media
    let totalShotsInStore = 0;
    let shotsWithMediaInStore = 0;
    
    scripts.forEach(script => {
      script.documentState.cenas.forEach(scene => {
        if (scene.shotlist && scene.shotlist.length > 0) {
          totalShotsInStore += scene.shotlist.length;
          scene.shotlist.forEach(shot => {
            if (shot.referenciaMidia && shot.referenciaMidia.dataUrl) {
              shotsWithMediaInStore++;
            }
          });
        }
      });
    });
    
    console.log(`INITIAL CHECK: ${totalShotsInStore} total shots, ${shotsWithMediaInStore} with media in store`);
    
    // Force a refresh after a short delay to update anything that might be stale
    if (shotsWithMediaInStore > 0) {
      setTimeout(() => {
        setRefreshKey(Date.now());
        console.log("Auto-refreshing storyboard due to media detected in store");
      }, 500);
    }
  }, [scripts]);

  // Manipular o evento de arrastar e soltar
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (editingShot) {
      e.currentTarget.classList.add('border-dashed', 'border-primary');
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-dashed', 'border-primary');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-dashed', 'border-primary');
    
    if (!editingShot) return;
    
    if (e.dataTransfer.files.length > 0) {
      handleMediaFileChange(e.dataTransfer.files);
    }
  };

  // --- Função de Exportação para ZIP ---
  const handleExportZip = async () => {
    toast.info("Preparando exportação ZIP...");
    try {
      let cssFileContent: ArrayBuffer | undefined = undefined;
      try {
        const stylesheets = Array.from(document.head.getElementsByTagName('link'));
        // Tenta encontrar o CSS principal do Vite. O padrão do href pode variar.
        // Ajuste o seletor se o nome do seu arquivo CSS principal for diferente.
        const mainCssLink = stylesheets.find(
          (link) => link.rel === 'stylesheet' && link.href && (link.href.includes('/assets/index-') || link.href.includes('/assets/style-'))
        );

        if (mainCssLink && mainCssLink.href) {
          console.log('Found main CSS link:', mainCssLink.href);
          const response = await fetch(mainCssLink.href);
          if (response.ok) {
            cssFileContent = await response.arrayBuffer();
            console.log('CSS content fetched successfully, size:', cssFileContent.byteLength);
          } else {
            console.warn('Failed to fetch main CSS file:', response.status, response.statusText);
            toast.info('Não foi possível carregar o arquivo de estilo principal para o ZIP.');
          }
        } else {
          console.warn('Main CSS link not found in document.head. Searched for /assets/index- or /assets/style-');
          // Tenta uma busca mais genérica se a primeira falhar
          const genericCssLink = stylesheets.find(link => link.rel === 'stylesheet' && link.href.endsWith('.css'));
          if(genericCssLink && genericCssLink.href) {
            console.log('Found generic CSS link as fallback:', genericCssLink.href);
            const response = await fetch(genericCssLink.href);
            if (response.ok) {
              cssFileContent = await response.arrayBuffer();
              console.log('Generic CSS content fetched successfully, size:', cssFileContent.byteLength);
            } else {
              console.warn('Failed to fetch generic CSS file:', response.status, response.statusText);
              toast.info('Não foi possível carregar o arquivo de estilo genérico para o ZIP.');
            }
          } else {
            console.warn('Generic CSS link not found in document.head either.');
            toast.info('Link do arquivo de estilo principal não encontrado para o ZIP.');
          }
        }
      } catch (e) {
        console.error('Error fetching CSS content:', e);
        toast.error('Erro ao buscar conteúdo do CSS para o ZIP.');
      }

      const scenesToExport: SceneState[] = [];

      for (const scriptGroupId in scenesByScript) {
        const scriptGroup = scenesByScript[scriptGroupId];
        for (const scene of scriptGroup.scenes) {
          const sceneText = getSceneText(scene, scriptGroup.scriptId);
          const shotsForState: ShotState[] = (scene.shotlist || []).map(shot => {
            let mediaFile: MediaFile | undefined = undefined;
            if (shot.referenciaMidia && shot.referenciaMidia.dataUrl) {
              mediaFile = {
                name: shot.referenciaMidia.nomeArquivo || 'media',
                type: shot.referenciaMidia.mimeType || 'image/jpeg', // Default MIME type
                data: shot.referenciaMidia.dataUrl,
              };
            }
            return {
              title: shot.descricao || `Shot ${shot.id.substring(0,5)}`,
              description: shot.notas || '' , // Usando notas como descrição do shot para o HTML
              media: mediaFile,
              // inPoint e outPoint precisariam ser buscados do estado do shot se existirem
              // inPoint: shot.inPoint, 
              // outPoint: shot.outPoint,
            };
          });

          scenesToExport.push({
            title: scene.descricao || `Cena ${scene.id.substring(0,5)}`,
            description: sceneText, // Texto completo da cena
            shots: shotsForState,
          });
        }
      }
      
      // Placeholder para ProjectState - idealmente, isso viria de um estado global ou configurações
      const projectDetails: ProjectState = {
        movieName: currentProjectName || "Meu Storyboard",
        clientName: "Nome do Cliente", // Placeholder
        // logo: ... (se você tiver um logo para adicionar, ele deve ser um objeto MediaFile)
        styles: {
            movieColor: '#00a650', // Exemplo
            clientColor: '#555555', // Exemplo
            fontSize: 16,       // Exemplo em px
            spacing: 16,        // Exemplo em px
        },
      };

      const storyboardData: StoryboardState = {
        project: projectDetails,
        scenes: scenesToExport,
        isDarkMode: false, // Assumindo false por enquanto, já que não está no store
      };

      await exportStoryboardToZip(storyboardData, cssFileContent);
      toast.success("Storyboard exportado para ZIP com sucesso!");
    } catch (error) {
      console.error("Falha ao exportar ZIP:", error);
      toast.error(`Falha ao exportar ZIP: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  return (
    <div className="p-2 md:p-4 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-3 bg-white rounded-lg shadow-sm border">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-800">Storyboard</h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={forceRefresh}
            title="Atualizar storyboard"
          >
            <RefreshCw size={16} className="mr-1" /> Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportZip}
            title="Exportar storyboard como ZIP"
          >
            <Download size={16} className="mr-1" /> Exportar ZIP
          </Button>
          <ScriptSelector />
        </div>
      </div>

      {/* Input de arquivo escondido para seleção de mídia */}
      <input 
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/jpeg,image/png,image/gif,image/webp,video/webm,video/mp4,video/quicktime"
        onChange={(e) => handleMediaFileChange(e.target.files)}
      />

      {/* Modal de edição de mídia */}
      {editingShot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Editar Mídia: {editingShot.shot.descricao}</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingShot(null)}>
                <X size={18} />
              </Button>
            </div>
            
            <div 
              className="border-2 border-dashed rounded-lg p-8 mb-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {editingShot.shot.referenciaMidia ? (
                <div className="flex flex-col items-center">
                  {editingShot.shot.referenciaMidia.tipoMedia === 'video' ? (
                    <video 
                      src={editingShot.shot.referenciaMidia.dataUrl} 
                      autoPlay 
                      loop 
                      muted 
                      className="max-h-64 max-w-full object-contain mb-2" 
                    />
                  ) : (
                    <img 
                      src={editingShot.shot.referenciaMidia.dataUrl} 
                      alt={editingShot.shot.referenciaMidia.nomeArquivo} 
                      className="max-h-64 max-w-full object-contain mb-2" 
                    />
                  )}
                  <p className="text-sm text-gray-500">{editingShot.shot.referenciaMidia.nomeArquivo}</p>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="mt-2" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveMedia();
                    }}
                  >
                    Remover Mídia
                  </Button>
                </div>
              ) : (
                <>
                  <Film className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium">Arraste uma imagem ou vídeo aqui</p>
                  <p className="text-xs text-gray-500 mt-1">ou clique para selecionar um arquivo</p>
                  <p className="text-xs text-gray-500 mt-3">Também pode colar uma imagem (Cmd+V / Ctrl+V)</p>
                </>
              )}
            </div>
            
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="mr-2" onClick={() => setEditingShot(null)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={saveEditingShot}>
                <Save size={16} className="mr-1" /> Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {Object.keys(scenesByScript).length === 0 && (
        <div className="text-center text-gray-500 py-10">
          <p>Nenhuma cena para exibir. Selecione roteiros ou adicione cenas e shots com mídias.</p>
        </div>
      )}

      {Object.entries(scenesByScript).map(([scriptId, { scriptName, scenes }]) => (
        <div key={scriptId} className="mb-10">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-700 mb-3 ml-1 sticky top-0 bg-slate-50/80 backdrop-blur-sm py-2 z-10">Roteiro: {scriptName}</h2>
          {scenes.map(scene => (
            <Card key={scene.id} className="mb-8 shadow-lg border-l-4" style={{ borderLeftColor: scene.highlightColor || '#ccc' }}>
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-lg md:text-xl text-slate-800">Cena: {scene.descricao}</CardTitle>
              </CardHeader>
              
              <CardContent className="px-4 pt-2 pb-4 space-y-4">
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {getSceneText(scene, scriptId)}
                </div>
                
                {scene.shotlist && scene.shotlist.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                    {scene.shotlist.map((shot, index) => (
                      <Card 
                        key={shot.id} 
                        className="overflow-hidden flex flex-col justify-between bg-white hover:shadow-xl transition-shadow duration-200"
                      >
                        <div className="p-2 border-b text-xs font-medium text-slate-600 bg-slate-50 flex justify-between items-center">
                          <span>Shot {index + 1}{shot.tipo && <span className='text-slate-500'> ({shot.tipo})</span>}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => startEditingShot(shot, scene.id, scriptId)}
                            title="Editar mídia"
                          >
                            <Edit3 size={14} />
                          </Button>
                        </div>
                        <div 
                          className="aspect-video bg-muted rounded-t-md flex items-center justify-center overflow-hidden cursor-pointer"
                          onClick={() => startEditingShot(shot, scene.id, scriptId)}
                        >
                          {shot.referenciaMidia ? (
                            shot.referenciaMidia.tipoMedia === 'video' ? (
                              <div className="w-full h-full flex flex-col items-center justify-center">
                                <video 
                                  key={`${shot.id}-video-${refreshKey}`}
                                  src={shot.referenciaMidia.dataUrl} 
                                  autoPlay
                                  loop 
                                  muted 
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    console.error('Error loading video:', shot.id, shot.referenciaMidia?.nomeArquivo);
                                    setMediaErrorsCount(prev => ({ ...prev, [shot.id]: (prev[shot.id] || 0) + 1 }));
                                  }}
                                />
                                {(mediaErrorsCount[shot.id] || 0) >= 3 && (
                                  <div className="absolute inset-0 bg-orange-100/50 flex flex-col items-center justify-center p-2">
                                    <AlertTriangle className="w-5 h-5 text-orange-500 mb-1" />
                                    <p className="text-xs text-orange-700 text-center">Erro ao carregar vídeo</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center relative">
                                <img 
                                  key={`${shot.id}-img-${refreshKey}`}
                                  src={shot.referenciaMidia.dataUrl} 
                                  alt={shot.referenciaMidia.nomeArquivo || shot.descricao} 
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    console.error('Error loading image:', shot.id, shot.referenciaMidia?.nomeArquivo);
                                    setMediaErrorsCount(prev => ({ ...prev, [shot.id]: (prev[shot.id] || 0) + 1 }));
                                  }}
                                />
                                {(mediaErrorsCount[shot.id] || 0) >= 2 && (
                                  <div className="absolute inset-0 bg-red-100/60 flex flex-col items-center justify-center p-2">
                                    <AlertTriangle className="w-5 h-5 text-red-500 mb-1" />
                                    <p className="text-xs text-red-700 text-center">Erro ao carregar imagem</p>
                                    {shot.referenciaMidia && <p className="text-[10px] text-red-700 mt-1">
                                      {shot.referenciaMidia.tipoMedia} - {shot.referenciaMidia.dataUrl.substring(0, 15)}...
                                    </p>}
                                  </div>
                                )}
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col items-center justify-center text-gray-400">
                              <Film className="w-10 h-10 mb-1" />
                              <p className="text-xs">Sem mídia</p>
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium truncate" title={shot.descricao}>{shot.descricao}</p>
                          <p className="text-xs text-muted-foreground">{shot.tipo} - {shot.duracao}s</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Nenhum shot definido para esta cena.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
};

export default StoryboardPage; 