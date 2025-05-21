import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAppStore from '../../store/useAppStore';
import { Shot as BaseShot, Activity, Diaria, Scene, TimelineEntry, Personagem, Locacao, TabType, OrdemDoDiaItem } from '../../types';
import DailyOrderTimelineItem from './DailyOrderTimelineItem';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { GripVertical, ListChecks, CalendarClock, DraftingCompass } from 'lucide-react';
import { toast } from 'sonner';

interface PanelShot extends BaseShot {
  sceneId: string;
  sceneDescription: string; // Descrição da cena para contexto
  sceneNumber: string; // Número/cabeçalho da cena
  shotNumber: string; // Número do shot dentro da cena
  locacaoPrincipalNome?: string;
}

const predefinedActivities: Activity[] = [
  { id: 'activity_breakfast', type: 'activity', title: 'Café da Manhã', defaultDuration: 30 },
  { id: 'activity_lunch', type: 'activity', title: 'Almoço', defaultDuration: 60 },
  { id: 'activity_travel', type: 'activity', title: 'Deslocamento' },
  { id: 'activity_setup', type: 'activity', title: 'Preparação de Set' },
  { id: 'activity_wrap', type: 'activity', title: 'Desprodução' },
  { id: 'custom_break', type: 'activity', title: 'Intervalo Personalizado' },
];

const DailyOrderPage: React.FC = () => {
  const store = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();

  const initialScriptIdFromState = location.state?.scriptId as string | undefined;
  const initialDiariaIdFromState = location.state?.diariaId as string | undefined;

  const [targetScriptId, setTargetScriptId] = useState<string | null>(initialScriptIdFromState || store.currentScriptId);
  const [selectedDiariaId, setSelectedDiariaId] = useState<string | null>(initialDiariaIdFromState);
  
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [draggedItem, setDraggedItem] = useState<TimelineEntry | PanelShot | Activity | null>(null);
  const [draggedSource, setDraggedSource] = useState<'timeline' | 'available_shots' | 'available_activities' | null>(null);

  useEffect(() => {
    if (!initialScriptIdFromState && store.currentScriptId !== targetScriptId) {
      setTargetScriptId(store.currentScriptId);
      setSelectedDiariaId(null);
      setTimelineEntries([]);
    }
  }, [store.currentScriptId, initialScriptIdFromState, targetScriptId]);

  useEffect(() => {
    if (initialDiariaIdFromState && initialDiariaIdFromState !== selectedDiariaId) {
      setSelectedDiariaId(initialDiariaIdFromState);
      if (initialScriptIdFromState && initialScriptIdFromState !== targetScriptId) {
        setTargetScriptId(initialScriptIdFromState);
      }
    }
  }, [initialDiariaIdFromState, initialScriptIdFromState, selectedDiariaId, targetScriptId]);

  const currentScript = useMemo(() => store.scripts.find(s => s.id === targetScriptId), [store.scripts, targetScriptId]);
  const diariasOfTargetScript = useMemo(() => currentScript?.documentState.diarias || [], [currentScript]);
  
  const allScenes = useMemo(() => currentScript?.documentState.cenas || [], [currentScript]);
  const allLocacoes = useMemo(() => currentScript?.documentState.locacoes || [], [currentScript]);
  const allPersonagens = useMemo(() => currentScript?.documentState.personagens || [], [currentScript]);

  const selectedDiaria = useMemo(() => diariasOfTargetScript.find(d => d.id === selectedDiariaId), [diariasOfTargetScript, selectedDiariaId]);

  const shotsForSelectedDiaria = useMemo(() => {
    if (!selectedDiaria) return [];
    const sceneIdsInDiaria = selectedDiaria.cenas;
    let panelShots: PanelShot[] = [];

    sceneIdsInDiaria.forEach(sceneId => {
      const scene = allScenes.find(s => s.id === sceneId);
      if (scene) {
        const locacao = allLocacoes.find(l => l.id === scene.locacaoPrincipal);
        scene.shotlist.forEach((shot, index) => {
          panelShots.push({
            ...shot,
            sceneId: scene.id,
            sceneDescription: scene.descricao,
            sceneNumber: scene.descricao.split('.')[0]?.trim() || `Cena ${scene.id.substring(0,4)}`,
            shotNumber: `Shot ${index + 1}`,
            locacaoPrincipalNome: locacao?.nome
          });
        });
      }
    });
    return panelShots;
  }, [selectedDiaria, allScenes, allLocacoes]);

  const availablePanelShots = useMemo(() => {
    return shotsForSelectedDiaria.filter(
      shot => !timelineEntries.some(entry => entry.type === 'shot' && entry.originalId === shot.id)
    );
  }, [shotsForSelectedDiaria, timelineEntries]);

  useEffect(() => {
    if (selectedDiaria) {
      const savedODItems = selectedDiaria.ordemDoDia;
      if (savedODItems && savedODItems.length > 0) {
        const loadedEntries = savedODItems.map((odi, index) => {
          const shotData = shotsForSelectedDiaria.find(s => s.id === odi.shotId);
          if (!shotData) return null;
          return {
            id: odi.id || uuidv4(),
            type: 'shot',
            originalId: shotData.id,
            title: `${shotData.sceneNumber} / ${shotData.shotNumber} - ${shotData.descricao}`,
            sceneNumber: shotData.sceneNumber,
            shotNumber: shotData.shotNumber,
            description: shotData.descricao,
            startTime: odi.horarioEstimado,
            duration: shotData.duracao,
            locacao: shotData.locacaoPrincipalNome,
            personagens: shotData.personagens, 
            tipo: shotData.tipo,
            order: odi.ordem !== undefined ? odi.ordem : index,
          } as TimelineEntry;
        }).filter(Boolean) as TimelineEntry[];
        setTimelineEntries(loadedEntries.map(calculateEndTime).sort((a, b) => a.order - b.order));
      } else {
        setTimelineEntries([]);
      }
    } else {
      setTimelineEntries([]);
    }
  }, [selectedDiaria, shotsForSelectedDiaria]);

  const calculateEndTime = (item: TimelineEntry): TimelineEntry => {
    if (item.startTime && item.duration !== undefined) {
      const [hours, minutes] = item.startTime.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        item.endTime = undefined;
        return item;
      }
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      date.setMinutes(date.getMinutes() + item.duration);
      item.endTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    return item;
  };

  const addTimelineEntryFromSource = (item: PanelShot | Activity) => {
    let newEntry: Partial<TimelineEntry>;
    const order = timelineEntries.length;

    if ('sceneId' in item) {
      newEntry = {
        id: uuidv4(), type: 'shot', originalId: item.id,
        title: `${item.sceneNumber} / ${item.shotNumber} - ${item.descricao}`,
        sceneNumber: item.sceneNumber, shotNumber: item.shotNumber, description: item.descricao,
        duration: item.duracao, tipo: item.tipo, personagens: item.personagens,
        locacao: item.locacaoPrincipalNome,
        order
      };
    } else {
      newEntry = {
        id: uuidv4(), type: 'activity', originalId: item.id,
        title: item.title, duration: item.defaultDuration,
        order
      };
    }
    setTimelineEntries(prev => [...prev, calculateEndTime(newEntry as TimelineEntry)].sort((a, b) => a.order - b.order));
  };

  const handleUpdateTimelineItem = (updatedItem: TimelineEntry) => {
    setTimelineEntries(prev => 
      prev.map(item => item.id === updatedItem.id ? calculateEndTime(updatedItem) : item)
          .sort((a,b) => a.order - b.order)
    );
  };

  const handleRemoveTimelineItem = (itemId: string) => {
    setTimelineEntries(prev => prev.filter(item => item.id !== itemId));
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    item: TimelineEntry | PanelShot | Activity,
    source: 'timeline' | 'available_shots' | 'available_activities'
  ) => {
    setDraggedItem(item);
    setDraggedSource(source);
    e.dataTransfer.effectAllowed = 'move';
    if (typeof item.id === 'string') {
        e.dataTransfer.setData('text/plain', item.id);
    }
  };

  const handleDragOverTimeline = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
  };

  const handleDropOnTimeline = (e: React.DragEvent<HTMLDivElement>, targetTimelineItem?: TimelineEntry) => {
    e.preventDefault();
    if (!draggedItem) return;

    let newTimelineEntries = [...timelineEntries];
    const itemToAddOrMove = draggedItem;

    if (draggedSource === 'timeline') {
      const draggedTimelineItem = itemToAddOrMove as TimelineEntry;
      const fromIndex = newTimelineEntries.findIndex(i => i.id === draggedTimelineItem.id);
      if (fromIndex === -1) return; 

      newTimelineEntries.splice(fromIndex, 1);
      const toIndex = targetTimelineItem ? newTimelineEntries.findIndex(i => i.id === targetTimelineItem.id) : newTimelineEntries.length;
      newTimelineEntries.splice(toIndex, 0, draggedTimelineItem);
    
    } else if (draggedSource === 'available_shots' || draggedSource === 'available_activities') {
      let newEntryToAdd: Partial<TimelineEntry>;
      if ('sceneId' in itemToAddOrMove) {
        const shot = itemToAddOrMove as PanelShot;
        newEntryToAdd = {
          id: uuidv4(), type: 'shot', originalId: shot.id,
          title: `${shot.sceneNumber} / ${shot.shotNumber} - ${shot.descricao.substring(0,30)}...`,
          sceneNumber: shot.sceneNumber, shotNumber: shot.shotNumber, description: shot.descricao,
          duration: shot.duracao, tipo: shot.tipo, personagens: shot.personagens, 
          locacao: shot.locacaoPrincipalNome,
        };
      } else {
        const activity = itemToAddOrMove as Activity;
        newEntryToAdd = {
          id: uuidv4(), type: 'activity', originalId: activity.id,
          title: activity.title, duration: activity.defaultDuration,
        };
      }
      const toIndex = targetTimelineItem ? newTimelineEntries.findIndex(i => i.id === targetTimelineItem.id) : newTimelineEntries.length;
      newTimelineEntries.splice(toIndex, 0, calculateEndTime(newEntryToAdd as TimelineEntry));
    }

    setTimelineEntries(newTimelineEntries.map((item, index) => ({ ...item, order: index })));
    setDraggedItem(null);
    setDraggedSource(null);
  };

  const getPersonagemNames = (ids?: string[]): string[] => {
    if (!ids) return [];
    return ids.map(id => allPersonagens.find(p => p.id === id)?.nome || id);
  };

  const saveOrderToStore = () => {
    if (!selectedDiaria || !targetScriptId || !currentScript || !allScenes) {
      console.warn("Não foi possível salvar a Ordem do Dia: dados ausentes.", { selectedDiaria, targetScriptId, currentScript, allScenes });
      toast.error("Erro ao salvar Ordem do Dia", { description: "Dados necessários não encontrados."});
      return;
    }

    const ordemDoDiaToSave: OrdemDoDiaItem[] = timelineEntries
      .filter(entry => entry.type === 'shot' && entry.originalId) // Salvar apenas shots por enquanto
      .map(entry => {
        // Encontrar a sceneId para este shot
        let sceneIdForShot: string | undefined = undefined;
        // Tentar encontrar a cena que contém este shot
        const sceneContainingShot = allScenes.find(scene => scene.shotlist.some(shot => shot.id === entry.originalId));
        if (sceneContainingShot) {
          sceneIdForShot = sceneContainingShot.id;
        } else {
          // Fallback se não encontrar diretamente, tentar usar a sceneId do PanelShot associado se existir
          // (Isso assume que a informação da cena de origem foi preservada de alguma forma no entry, o que não é o caso agora)
          // Uma forma mais robusta seria garantir que o `PanelShot` original ou sua `sceneId` sejam acessíveis.
          // Por agora, se não achar, o `sceneId` ficará undefined, o que não é ideal.
          console.warn('Não foi possível encontrar sceneId para o shot ' + entry.originalId + ' ao salvar OD.');
        }

        if (!sceneIdForShot) {
            console.error('sceneId não encontrado para shot ' + entry.originalId + '. Este item não será salvo corretamente.');
            // Decide if you want to skip this item or save it with an undefined sceneId
            // return null; // Option to skip
        }

        return {
          id: entry.id, // Usar o ID único do TimelineEntry
          shotId: entry.originalId!, // originalId é o shotId
          sceneId: sceneIdForShot || "SCENE_ID_NOT_FOUND", // Precisa ser robusto
          horarioEstimado: entry.startTime,
          ordem: entry.order,
        };
      })
      .filter(Boolean) as OrdemDoDiaItem[]; // .filter(Boolean) para remover quaisquer nulos se decidirmos não salvar itens sem sceneId

    console.log("Salvando Ordem do Dia:", ordemDoDiaToSave);
    console.log("Para a diária:", selectedDiaria.id, "no roteiro:", targetScriptId);
    
    store._updateDocumentStateByScriptId(targetScriptId, (prevState) => {
      const diariasAtualizadas = prevState.diarias.map(d => {
        if (d.id === selectedDiaria.id) {
          return { ...d, ordemDoDia: ordemDoDiaToSave, lastUpdated: Date.now() };
        }
        return d;
      });
      return { ...prevState, diarias: diariasAtualizadas, lastUpdated: Date.now() };
    });

    toast.success("Ordem do Dia salva com sucesso!");
    // Opcional: navegar de volta ou limpar o estado, dependendo do fluxo desejado
    // navigate(\`/roteiro/\${targetScriptId}/cronograma\`); // Exemplo de navegação
  };

  // Handler para quando o usuário muda a diária selecionada no dropdown
  const handleDiariaSelectionChange = (diariaId: string) => {
    setSelectedDiariaId(diariaId);
    // Quando uma nova diária é selecionada, limpamos as entradas da timeline
    // Elas serão recarregadas pelo useEffect que depende de 'selectedDiaria'
    setTimelineEntries([]); 
  };

  useEffect(() => {
    if (timelineEntries.length > 0 || (selectedDiaria && selectedDiaria.ordemDoDia && selectedDiaria.ordemDoDia.length > 0)) {
      const timer = setTimeout(() => {
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timelineEntries, selectedDiaria]);

  // DEBUG: Log para verificar o estado das variáveis principais
  useEffect(() => {
    console.groupCollapsed(`[OD Page Debug - ${new Date().toLocaleTimeString()}] State Update`);
    console.log("Target Script ID:", targetScriptId);
    console.log("Selected Diaria ID:", selectedDiariaId);
    
    if (currentScript) {
      console.log("Current Script:", { id: currentScript.id, name: currentScript.name, numDiarias: currentScript.documentState.diarias.length, numCenas: currentScript.documentState.cenas.length });
    } else {
      console.log("Current Script: null");
    }

    if (selectedDiaria) {
      console.log("Selected Diaria:", { 
        id: selectedDiaria.id, 
        data: selectedDiaria.data, 
        cenasIDs: selectedDiaria.cenas,
        ordemDoDiaSalva: selectedDiaria.ordemDoDia 
      });
      const cenasNaDiaria = selectedDiaria.cenas.map(sceneId => {
        const scene = allScenes.find(s => s.id === sceneId);
        return scene ? { id: scene.id, desc: scene.descricao, numShots: scene.shotlist.length, shotsIds: scene.shotlist.map(sh => sh.id) } : { id: sceneId, error: "Cena não encontrada em allScenes" };
      });
      console.log("Detalhes das Cenas na Diaria Selecionada:", cenasNaDiaria);
    } else {
      console.log("Selected Diaria: null");
    }

    console.log("Todas as Cenas do Roteiro (allScenes count):", allScenes.length);
    if (allScenes.length > 0) {
        console.log("Primeira Cena de allScenes:", allScenes[0]);
    }

    console.log("Shots para Diaria Selecionada (shotsForSelectedDiaria count):", shotsForSelectedDiaria.length);
    if (shotsForSelectedDiaria.length > 0) {
      console.log("Primeiro PanelShot de shotsForSelectedDiaria:", shotsForSelectedDiaria[0]);
    }
    
    console.log("Timeline Entries (estado local - count):", timelineEntries.length);
    if (timelineEntries.length > 0) {
        console.log("Primeira Timeline Entry:", timelineEntries[0]);
    }
    console.groupEnd();
  }, [targetScriptId, selectedDiariaId, currentScript, selectedDiaria, allScenes, shotsForSelectedDiaria, timelineEntries]);
  // FIM DEBUG

  if (!targetScriptId) {
    return <p className="p-4 text-center text-gray-500">Por favor, selecione um roteiro na aba Editor ou outra aba principal.</p>;
  }
  
  return (
    <div className="p-2 md:p-4 bg-slate-50 min-h-screen flex flex-col">
      <header className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl md:text-2xl font-semibold text-gray-800">Ordem do Dia</h1>
            {!initialDiariaIdFromState && (
                <Select onValueChange={setSelectedDiariaId} value={selectedDiariaId || ''}>
                    <SelectTrigger className="w-auto min-w-[200px] max-w-xs"><SelectValue placeholder="Selecione uma Diária..." /></SelectTrigger>
                    <SelectContent>
                        {diariasOfTargetScript.length === 0 && <SelectItem value="none" disabled>Nenhuma diária criada para este roteiro</SelectItem>}
                        {diariasOfTargetScript.map(d => <SelectItem key={d.id} value={d.id}>{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})} - Cenas: {d.cenas.length}</SelectItem>)}
                    </SelectContent>
                </Select>
            )}
        </div>
        {selectedDiaria && <p className="text-sm text-gray-600 mt-1">Editando OD para: {new Date(selectedDiaria.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>}
      </header>

      {!selectedDiariaId && (
        <div className="flex-grow flex items-center justify-center">
            <p className="text-gray-500 text-lg">Por favor, selecione uma diária de gravação para começar.</p>
        </div>
      )}

      {selectedDiariaId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-grow min-h-0">
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="p-3 border-b">
              <CardTitle className="text-lg font-medium flex items-center">
                <ListChecks className="mr-2 h-5 w-5 text-blue-600" />
                Itens Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex-grow overflow-y-auto space-y-4">
                <div>
                    <h3 className="text-md font-semibold mb-2 text-sky-700 sticky top-0 bg-white/80 backdrop-blur-sm py-1">Shots da Diária ({availablePanelShots.length})</h3>
                    {availablePanelShots.length === 0 && shotsForSelectedDiaria.length > 0 && <p className="text-xs text-gray-500 italic p-2 bg-gray-50 rounded">Todos os shots desta diária já foram adicionados.</p>}
                    {shotsForSelectedDiaria.length === 0 && <p className="text-xs text-gray-500 italic p-2 bg-gray-50 rounded">Não há shots definidos para as cenas desta diária.</p>}
                    {availablePanelShots.map(shot => (
                        <div 
                            key={shot.id} 
                            draggable 
                            onDragStart={(e) => handleDragStart(e, shot, 'available_shots')}
                            className="p-2.5 border rounded-md bg-sky-50 hover:bg-sky-100 cursor-grab text-xs mb-2 shadow-sm hover:shadow transition-all duration-150"
                        >
                            <strong className="block text-sky-800">{shot.sceneNumber} / {shot.shotNumber}</strong>
                            <p className="text-gray-700 my-0.5">{shot.descricao.substring(0, 60)}{shot.descricao.length > 60 ? '...' : ''}</p>
                            <span className="block text-gray-500 text-[10px]">📍 {shot.locacaoPrincipalNome || '-'} | ⏱️ {shot.duracao}s</span>
                        </div>
                    ))}
                </div>
                <div className="mt-3">
                    <h3 className="text-md font-semibold mb-2 text-orange-700 sticky top-0 bg-white/80 backdrop-blur-sm py-1">Atividades Padrão</h3>
                    {predefinedActivities.map(activity => (
                        <div 
                            key={activity.id} 
                            draggable 
                            onDragStart={(e) => handleDragStart(e, activity, 'available_activities')}
                            className="p-2.5 border rounded-md bg-orange-50 hover:bg-orange-100 cursor-grab text-xs mb-2 shadow-sm hover:shadow transition-all duration-150"
                        >
                            <DraftingCompass className="inline h-3.5 w-3.5 mr-1.5 text-orange-600" /> 
                            {activity.title} {activity.defaultDuration ? `(${activity.defaultDuration} min)` : ''}
                        </div>
                    ))}
                </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 flex flex-col">
            <CardHeader className="p-3 border-b">
                <CardTitle className="text-lg font-medium flex items-center">
                    <CalendarClock className="mr-2 h-5 w-5 text-green-600" />
                    Linha do Tempo da Gravação
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-grow flex flex-col overflow-hidden">
                <div className="hidden md:flex items-center gap-1 md:gap-2 p-2 mb-0 border-b border-gray-200 bg-gray-50 text-[10px] md:text-xs sticky top-0 z-10 flex-shrink-0">
                  <div className="w-6 md:w-8"></div>
                  <div className="w-20 md:w-24 font-semibold text-gray-600">Horário</div>
                  <div className="w-16 md:w-20 font-semibold text-gray-600 text-center">Cena</div>
                  <div className="w-16 md:w-20 font-semibold text-gray-600 text-center">Shot/Ativ.</div>
                  <div className="w-16 md:w-20 font-semibold text-gray-600 text-center">Duração</div>
                  <div className="flex-grow font-semibold text-gray-600">Descrição / Local</div>
                  <div className="w-24 md:w-32 font-semibold text-gray-600 hidden lg:block">Personagens</div>
                  <div className="w-10 md:w-12"></div>
                </div>

                <div 
                    className="flex-grow overflow-y-auto space-y-0 p-2 pr-1"
                    onDragOver={handleDragOverTimeline} 
                    onDrop={(e) => handleDropOnTimeline(e, undefined)} 
                >
                  {timelineEntries.map((entry) => (
                    <div 
                      key={entry.id} 
                      className={`flex items-stretch border-b border-gray-100 last:border-b-0 ${draggedItem?.id === entry.id && draggedSource === 'timeline' ? 'opacity-30' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => { e.stopPropagation(); handleDropOnTimeline(e, entry); }}
                    >
                      <div 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, entry, 'timeline')}
                        className="w-6 md:w-8 flex justify-center items-center cursor-grab text-gray-300 hover:text-gray-500 bg-slate-50 border-r border-gray-100 flex-shrink-0"
                      >
                        <GripVertical size={16} />
                      </div>
                      <div className="flex-grow">
                        <DailyOrderTimelineItem 
                          item={{...entry, personagens: getPersonagemNames(entry.personagens)}} 
                          onUpdateItem={handleUpdateTimelineItem}
                          onRemoveItem={handleRemoveTimelineItem}
                          isDragging={draggedItem?.id === entry.id && draggedSource === 'timeline'}
                        />
                      </div>
                    </div>
                  ))}
                  {timelineEntries.length === 0 && 
                    <div 
                        className="h-full min-h-[200px] flex items-center justify-center text-center text-gray-400 py-10 border-2 border-dashed border-gray-300 rounded-md bg-slate-50/50"
                        onDragOver={handleDragOverTimeline}
                        onDrop={(e) => handleDropOnTimeline(e, undefined)}
                    >
                        Arraste shots ou atividades aqui para montar a Ordem do Dia.
                    </div>
                  }
                </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {selectedDiariaId && (
        <div className="mt-6 text-center py-4 border-t">
            <Button variant="default" size="sm" onClick={saveOrderToStore} className="bg-green-600 hover:bg-green-700 text-white">
                Salvar Ordem do Dia
            </Button>
        </div>
      )}
    </div>
  );
};

export default DailyOrderPage; 