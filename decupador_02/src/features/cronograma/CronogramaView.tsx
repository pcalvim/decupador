import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  UniqueIdentifier,
  useDroppable
} from '@dnd-kit/core';
import useAppStore from '../../store/useAppStore';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Plus, Edit3, Trash2, CalendarDays, ChevronDown, ChevronUp, GripVertical, List, Save, XCircle, Film } from 'lucide-react';
import { toast } from 'sonner';
import ScriptSelector from '../shared/ScriptSelector';
import { getAllScenesFromSelectedScripts, getAllLocacoesFromSelectedScripts, getAllPersonagensFromSelectedScripts } from '../shared/SceneViewWithFilters';
import { Diaria, Scene, Locacao, Personagem, TabType } from '@/types';
import { 
  SortableContext, 
  useSortable, 
  arrayMove, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { KeyboardSensor as DndKeyboardSensor } from '@dnd-kit/core';
import { useNavigate } from 'react-router-dom';

interface UnscheduledSceneCardProps {
  scene: Scene;
  locacoes: Locacao[];
}

const UnscheduledSceneCard: React.FC<UnscheduledSceneCardProps> = ({ scene, locacoes }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="p-3 border rounded bg-card shadow"
    >
      <div className="flex items-center justify-between">
        <p className="font-medium truncate pr-2">{scene.descricao}</p>
        <Button variant="ghost" size="icon" {...listeners} className="cursor-grab">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      {scene.locacaoPrincipal && (
        <Badge variant="outline" className="mt-2 text-xs">
          {locacoes.find(l => l.id === scene.locacaoPrincipal)?.nome || "Locação"}
        </Badge>
      )}
      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
        <span>{scene.shotlist?.length || 0} shots</span>
        <span>{scene.duracao || 0}s</span>
      </div>
    </div>
  );
};

const CronogramaView: React.FC = () => {
  const scripts = useAppStore(state => state.scripts);
  const addDiariaStore = useAppStore(state => state.addDiaria);
  const addSceneToDiariaStore = useAppStore(state => state.addSceneToDiaria);
  const selectedScriptsFilter = useAppStore(state => state.selectedScriptsFilter);
  const currentScriptId = useAppStore(state => state.currentScriptId);

  const [isNewDiariaDialogOpen, setIsNewDiariaDialogOpen] = useState(false);
  const [newDiariaData, setNewDiariaData] = useState<Partial<Diaria>>({ data: new Date().toISOString().split('T')[0], horarioInicio: '08:00', horarioFim: '18:00' });
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null); // For drag overlay

  const scenesWithScriptInfo = useMemo(() => getAllScenesFromSelectedScripts(), [scripts, selectedScriptsFilter]);
  const locacoesWithScriptInfo = useMemo(() => getAllLocacoesFromSelectedScripts(), [scripts, selectedScriptsFilter]);
  const personagensWithScriptInfo = useMemo(() => getAllPersonagensFromSelectedScripts(), [scripts, selectedScriptsFilter]);

  const allDiarias = useMemo(() => {
    const scriptsToUse = selectedScriptsFilter.length > 0
      ? scripts.filter(script => selectedScriptsFilter.includes(script.id))
      : scripts;
    return scriptsToUse.flatMap(script => script.documentState.diarias.map(d => ({ ...d, scriptId: script.id })));
  }, [scripts, selectedScriptsFilter]);

  const sortedDiarias = useMemo(() => {
    return [...allDiarias].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [allDiarias]);

  const scenes = useMemo(() => scenesWithScriptInfo.map(s => s.scene), [scenesWithScriptInfo]);
  const locacoes = useMemo(() => locacoesWithScriptInfo.map(l => l.locacao), [locacoesWithScriptInfo]);
  const personagens = useMemo(() => personagensWithScriptInfo.map(p => p.personagem), [personagensWithScriptInfo]);

  const scheduledSceneIds = useMemo(() => {
    return new Set(allDiarias.flatMap(diaria => diaria.cenas));
  }, [allDiarias]);

  const unscheduledScenes = useMemo(() => {
    return scenes.filter(scene => !scheduledSceneIds.has(scene.id));
  }, [scenes, scheduledSceneIds]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(DndKeyboardSensor, {
      coordinateGetter: (event: any) => {
        const target = event.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        return {
          x: rect.left,
          y: rect.top,
        };
      }
    })
  );

  const handleAddDiaria = () => {
    if (newDiariaData.data) {
      let targetScriptIdToAddDiaria = currentScriptId;
      if (selectedScriptsFilter.length === 1) {
        targetScriptIdToAddDiaria = selectedScriptsFilter[0];
      } else if (selectedScriptsFilter.length > 1) {
        targetScriptIdToAddDiaria = selectedScriptsFilter[0]; 
        toast.info(`Diária criada no roteiro: ${scripts.find(s => s.id === targetScriptIdToAddDiaria)?.name}. Você pode alterar o roteiro ao editar a diária.`);
      }

      if (!targetScriptIdToAddDiaria) {
        toast.error("Nenhum roteiro selecionado para adicionar a diária.")
        return;
      }

      addDiariaStore(newDiariaData, targetScriptIdToAddDiaria);
      setNewDiariaData({ data: new Date().toISOString().split('T')[0], horarioInicio: '08:00', horarioFim: '18:00' });
      setIsNewDiariaDialogOpen(false);
      toast.success("Nova diária de gravação criada!");
    } else {
      toast.error("A data da diária é obrigatória.");
    }
  };
  
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const sceneId = active.id as string;
      const diariaId = over.id as string; // ID do DiariaCard (droppable)
      
      const targetDiaria = sortedDiarias.find(d => d.id === diariaId);
      
      if (targetDiaria) {
        const isSceneInDiaria = targetDiaria.cenas.includes(sceneId);
        if (!isSceneInDiaria) {
          const sceneExists = scenes.find(s => s.id === sceneId);
          if (sceneExists) {
            addSceneToDiariaStore(diariaId, sceneId, targetDiaria.scriptId);
            toast.success(`Cena "${sceneExists.descricao}" adicionada à diária.`);
          } else {
            console.error('[DragEnd] Cena arrastada não encontrada no estado global de cenas:', sceneId);
            toast.error('Erro ao adicionar cena: cena não encontrada.');
          }
        } else {
          toast.info('Cena já está nesta diária.');
        }
      } else {
        // Potencialmente solto em outro lugar não tratado, ou o ID não é de uma diária
        // console.log("[DragEnd] Solto sobre um ID não correspondente a uma diária:", diariaId);
      }
    }
  }, [addSceneToDiariaStore, sortedDiarias, scenes]);
  
  const activeScene = useMemo(() => {
    if (!activeId) return null;
    return unscheduledScenes.find(s => s.id === activeId) || scenes.find(s => s.id === activeId) ;
  }, [activeId, unscheduledScenes, scenes]);

  if (scripts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <div>
          <h3 className="text-lg font-medium mb-2">Nenhum roteiro carregado</h3>
          <p className="text-muted-foreground">Importe um roteiro para começar.</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Cronograma de Filmagem</h1>
          <div className="flex items-center gap-2">
            <ScriptSelector />
            <Button onClick={() => setIsNewDiariaDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Criar Diária
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Unscheduled Scenes */} 
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                Cenas Não Agendadas ({unscheduledScenes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[60vh] overflow-y-auto space-y-3 p-4">
              {unscheduledScenes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Todas as cenas estão agendadas.</p>
              ) : (
                <SortableContext items={unscheduledScenes.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {unscheduledScenes.map(scene => (
                    <UnscheduledSceneCard key={scene.id} scene={scene} locacoes={locacoes} />
                  ))}
                </SortableContext>
              )}
            </CardContent>
          </Card>

          {/* Scheduled Days (Diarias) */}
          <div className="lg:col-span-2 space-y-6">
            {sortedDiarias.length === 0 && (
                 <Card className="lg:col-span-2 flex items-center justify-center py-12">
                    <CardContent className="text-center">
                        <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground/50" />
                        <p className="mt-4 text-lg font-medium text-muted-foreground">Nenhuma diária de gravação criada.</p>
                        <p className="text-sm text-muted-foreground">Clique em "Criar Diária" para começar.</p>
                    </CardContent>
                 </Card>
            )}
            {sortedDiarias.map(diaria => (
              <DiariaCard 
                key={diaria.id} 
                diaria={diaria} 
                cenas={scenes} 
                locacoes={locacoes} 
                personagens={personagens}
              />
            ))}
          </div>
        </div>

        {/* Dialog for new Diaria */}
        {isNewDiariaDialogOpen && (
          <Dialog open={isNewDiariaDialogOpen} onOpenChange={setIsNewDiariaDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Criar Nova Diária de Gravação</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="data" className="text-right">Data</Label>
                  <Input id="data" type="date" value={newDiariaData.data} onChange={e => setNewDiariaData({...newDiariaData, data: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="horarioInicio" className="text-right">Início</Label>
                  <Input id="horarioInicio" type="time" value={newDiariaData.horarioInicio} onChange={e => setNewDiariaData({...newDiariaData, horarioInicio: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="horarioFim" className="text-right">Fim</Label>
                  <Input id="horarioFim" type="time" value={newDiariaData.horarioFim} onChange={e => setNewDiariaData({...newDiariaData, horarioFim: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notas-diaria" className="text-right">Notas</Label>
                  <Textarea id="notas-diaria" value={newDiariaData.notas || ''} onChange={e => setNewDiariaData({...newDiariaData, notas: e.target.value})} className="col-span-3" placeholder="Notas adicionais para a diária..."/>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewDiariaDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddDiaria}>Salvar Diária</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        
        {/* Drag Overlay for smoother dragging animation */}
        <DragOverlay>
          {activeId && activeScene ? (
            <div className="p-3 border rounded bg-card shadow-xl cursor-grabbing">
               <div className="flex items-center justify-between">
                <p className="font-medium truncate pr-2">{activeScene.descricao}</p>
                 <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              {activeScene.locacaoPrincipal && (
                <Badge variant="outline" className="mt-2 text-xs">
                  {locacoes.find(l => l.id === activeScene.locacaoPrincipal)?.nome || "Locação"}
                </Badge>
              )}
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>{activeScene.shotlist?.length || 0} shots</span>
                <span>{activeScene.duracao || 0}s</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>

      </div>
    </DndContext>
  );
};

// Component for displaying a shooting day
interface DiariaCardProps {
  diaria: Diaria & { scriptId: string };
  cenas: Scene[];
  locacoes: Locacao[];
  personagens: Personagem[];
}

const DiariaCard: React.FC<DiariaCardProps> = ({ diaria, cenas, locacoes, personagens }) => {
  const updateDiaria = useAppStore(state => state.updateDiaria);
  const removeDiaria = useAppStore(state => state.removeDiaria);
  const removeSceneFromDiariaStore = useAppStore(state => state.removeSceneFromDiaria);
  const setCurrentTab = useAppStore(state => state.setCurrentTab);
  const navigate = useNavigate();
  
  const { setNodeRef, isOver } = useDroppable({ 
    id: diaria.id, 
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editData, setEditData] = useState<Diaria & { scriptId: string }>(diaria);

  useEffect(() => {
    if (!isEditing) {
      setEditData({...diaria});
    }
  }, [diaria.id, isEditing]);

  const handleUpdate = () => {
    updateDiaria(diaria.id, editData, diaria.scriptId);
    setIsEditing(false);
    toast.success("Diária atualizada!");
  };

  const handleCancelEdit = () => {
    setEditData(diaria);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja excluir esta diária de gravação?')) {
      removeDiaria(diaria.id, diaria.scriptId);
      toast.success("Diária removida.");
    }
  };

  const handleRemoveScene = (sceneId: string) => {
    removeSceneFromDiariaStore(diaria.id, sceneId, diaria.scriptId);
    toast.info("Cena removida da diária.");
  };

  const diariaScenes = useMemo(() => 
    cenas.filter(cena => diaria.cenas.includes(cena.id))
  , [cenas, diaria.cenas]);
  
  const totalDuration = useMemo(() => 
    diariaScenes.reduce((sum, scene) => sum + (scene.duracao || 0), 0)
  , [diariaScenes]);
  
  const charactersInScenes = useMemo(() => {
    const charMap = new Map<string, Personagem>();
    diariaScenes.forEach(scene => {
      (scene.personagens || []).forEach(charId => {
        const char = personagens.find(p => p.id === charId);
        if (char && !charMap.has(char.id)) {
          charMap.set(char.id, char);
        }
      });
    });
    return Array.from(charMap.values());
  }, [diariaScenes, personagens]);
  
  const uniqueLocations = useMemo(() => {
    const locMap = new Map<string, Locacao>();
    diariaScenes.forEach(scene => {
      if (scene.locacaoPrincipal) {
        const loc = locacoes.find(l => l.id === scene.locacaoPrincipal);
        if (loc && !locMap.has(loc.id)) {
          locMap.set(loc.id, loc);
        }
      }
    });
    return Array.from(locMap.values());
  }, [diariaScenes, locacoes]);

  const handleGoToOD = () => {
    setCurrentTab(TabType.OD);
    navigate('/od', { state: { diariaId: diaria.id, scriptId: diaria.scriptId } });
  };

  const totalDurationSeconds = useMemo(() => {
    return diaria.cenas.reduce((total, sceneId) => {
      const scene = cenas.find(s => s.id === sceneId);
      return total + (scene?.duracao || 0);
    }, 0);
  }, [diaria.cenas, cenas]);

  const formatTotalDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    let parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 && hours === 0) parts.push(`${seconds}s`);
    return parts.join(' ') || '0s';
  };

  const style = {
    border: isOver ? '2px dashed hsl(var(--primary))' : '1px solid hsl(var(--border))',
    transition: 'border-color 0.2s ease-in-out',
  };

  return (
    <Card ref={setNodeRef} style={style} className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="p-4 border-b">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-semibold">
              {isEditing ? (
                <Input 
                  type="date" 
                  value={editData.data} 
                  onChange={e => setEditData({...editData, data: e.target.value})} 
                  className="w-auto p-1"
                />
              ) : (
                new Date(diaria.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isEditing ? (
                <div className="flex gap-2 mt-1">
                  <Input type="time" value={editData.horarioInicio} onChange={e => setEditData({...editData, horarioInicio: e.target.value})} className="w-24 p-1" />
                  <span>-</span>
                  <Input type="time" value={editData.horarioFim} onChange={e => setEditData({...editData, horarioFim: e.target.value})} className="w-24 p-1" />
                </div>
              ) : (
                `${diaria.horarioInicio} - ${diaria.horarioFim}`
              )}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Minimizar Detalhes" : "Expandir Detalhes"}>
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleGoToOD} title="Ordem do Dia">
              <Film className="h-5 w-5 text-blue-600" />
            </Button>
            {isEditing ? (
              <>
                <Button variant="ghost" size="icon" onClick={handleUpdate} title="Salvar Alterações">
                  <Save className="h-5 w-5 text-green-600" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancelEdit} title="Cancelar Edição">
                  <XCircle className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} title="Editar Diária">
                <Edit3 className="h-5 w-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleDelete} title="Excluir Diária" className="text-destructive">
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {isEditing && (
          <Textarea 
            value={editData.notas || ''} 
            onChange={e => setEditData({...editData, notas: e.target.value})} 
            placeholder="Notas sobre a diária..."
            className="mt-2"
            rows={2}
          />
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="p-4 space-y-4">
          {diaria.notas && !isEditing && (
            <p className="text-sm p-3 bg-muted/50 rounded-md"><strong>Notas da Diária:</strong> {diaria.notas}</p>
          )}

          <div>
            <h3 className="text-md font-medium mb-3 flex items-center">
              <List className="mr-2 h-4 w-4 text-primary"/> Cenas Programadas ({diariaScenes.length})
              <Badge variant="secondary" className="ml-auto">Total: {formatTotalDuration(totalDurationSeconds)}</Badge>
            </h3>
            
            {diariaScenes.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 border border-dashed rounded-md">
                Arraste cenas aqui para programá-las para esta diária.
              </p>
            ) : (
              <div className="space-y-3">
                {diariaScenes.map((scene, index) => (
                  <div
                    key={scene.id}
                    className="p-3 border rounded-md flex justify-between items-start bg-background hover:bg-muted/50 transition-colors"
                    style={{
                      borderLeftColor: scene.highlightColor,
                      borderLeftWidth: '4px'
                    }}
                  >
                    <div>
                      <p className="font-medium">{index + 1}. {scene.descricao}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                        {scene.locacaoPrincipal && (
                          <span>📍 {locacoes.find(l => l.id === scene.locacaoPrincipal)?.nome || "Locação"}</span>
                        )}
                        <span>🎬 {scene.shotlist?.length || 0} shots</span>
                        <span>⏱️ {scene.duracao || 0}s</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90 h-7 w-7 mt-[-4px] mr-[-4px] flex-shrink-0"
                      onClick={() => handleRemoveScene(scene.id)}
                      title="Remover Cena da Diária"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Locations & Cast Lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">Locações do Dia</h4>
              {uniqueLocations.length > 0 ? (
                <ul className="list-disc list-inside text-sm space-y-1">
                  {uniqueLocations.map(loc => <li key={loc.id}>{loc.nome}</li>)}
                </ul>
              ) : <p className="text-sm text-muted-foreground italic">Nenhuma locação primária definida para as cenas.</p>}
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">Elenco Presente</h4>
              {charactersInScenes.length > 0 ? (
                <ul className="list-disc list-inside text-sm space-y-1">
                  {charactersInScenes.map(char => <li key={char.id}>{char.nome}</li>)}
                </ul>
              ) : <p className="text-sm text-muted-foreground italic">Nenhum personagem nas cenas.</p>}
            </div>
          </div>

        </CardContent>
      )}
    </Card>
  );
};

export default CronogramaView;
