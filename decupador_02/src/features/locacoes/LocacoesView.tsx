
import React, { useState } from 'react';
import { 
  DndContext, 
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
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
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ScriptSelector from '../shared/ScriptSelector';
import { getAllScenesFromSelectedScripts, getAllLocacoesFromSelectedScripts } from '../shared/SceneViewWithFilters';

const LocacoesView: React.FC = () => {
  const { addLocacao, setSceneLocation } = useAppStore();
  const currentScriptId = useAppStore(state => state.currentScriptId);
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get all scenes and locations from selected scripts
  const allScenes = getAllScenesFromSelectedScripts();
  const allLocacoes = getAllLocacoesFromSelectedScripts();

  // Filter scenes based on search query
  const filteredScenes = searchQuery
    ? allScenes.filter(({ scene }) => 
        scene.descricao.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allScenes;
  
  // Setup sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    
    const { active, over } = event;
    
    if (!over) return;
    
    const sceneId = active.id;
    const locationId = over.id;
    
    // Find which script the scene belongs to
    const sceneData = allScenes.find(({ scene }) => scene.id === sceneId);
    if (!sceneData) return;
    
    const scriptId = sceneData.scriptId;
    
    // Set the current script to the one containing the scene
    if (currentScriptId !== scriptId) {
      useAppStore.getState().setCurrentScript(scriptId);
    }
    
    // Now set the scene location
    setSceneLocation(sceneId, locationId);
  };

  // Find scene number based on its position in allScenes
  const getSceneNumber = (sceneId: string) => {
    const index = allScenes.findIndex(({ scene }) => scene.id === sceneId);
    return index !== -1 ? index + 1 : '?';
  };

  // Find orphaned scenes (those without a location)
  const orphanedScenes = filteredScenes.filter(({ scene }) => !scene.locacaoPrincipal);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Gerenciamento de Locações</h2>
        <div className="flex gap-2">
          <ScriptSelector />
          <AddLocationDialog />
        </div>
      </div>
      
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input 
          placeholder="Buscar cenas..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
          {/* Unassigned Scenes */}
          <Card className="order-2 lg:order-1">
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-lg">Cenas não atribuídas</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {orphanedScenes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Todas as cenas já estão atribuídas a locações
                </p>
              ) : (
                <div className="space-y-2">
                  {orphanedScenes.map(({ scene, scriptName }) => (
                    <div
                      key={scene.id}
                      id={scene.id}
                      className="p-3 border rounded cursor-move"
                      style={{
                        borderLeftColor: scene.highlightColor,
                        borderLeftWidth: '4px'
                      }}
                      aria-roledescription="draggable item"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">Cena {getSceneNumber(scene.id)}</span>
                        <Badge variant="outline">{scriptName}</Badge>
                      </div>
                      <p className="text-sm">{scene.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {scene.shotlist.length} shots • {scene.duracao}s
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Locations */}
          <div className="order-1 lg:order-2 space-y-6">
            {allLocacoes.map(({ locacao, scriptName, scriptId }) => (
              <LocationCard 
                key={`${scriptId}-${locacao.id}`} 
                locacao={locacao} 
                scriptName={scriptName}
                scriptId={scriptId}
                scenes={filteredScenes
                  .filter(({ scene }) => scene.locacaoPrincipal === locacao.id)
                  .map(({ scene }) => scene)
                }
                getSceneNumber={getSceneNumber}
              />
            ))}
            
            {allLocacoes.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-6 min-h-[200px]">
                  <p className="text-muted-foreground mb-4">Nenhuma locação cadastrada</p>
                  <AddLocationDialog />
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Drag Overlay */}
          <DragOverlay>
            {activeId ? (
              <div
                className="p-3 border rounded bg-background shadow-lg opacity-80"
                style={{
                  borderLeftColor: allScenes.find(({ scene }) => scene.id === activeId)?.scene.highlightColor,
                  borderLeftWidth: '4px',
                  width: '300px'
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">Cena {getSceneNumber(activeId)}</span>
                  <Badge variant="outline">
                    {allScenes.find(({ scene }) => scene.id === activeId)?.scriptName || ''}
                  </Badge>
                </div>
                <p className="text-sm">{allScenes.find(({ scene }) => scene.id === activeId)?.scene.descricao}</p>
              </div>
            ) : null}
          </DragOverlay>
        </div>
      </DndContext>
    </div>
  );
};

// Component to add a new location
const AddLocationDialog: React.FC = () => {
  const addLocacao = useAppStore(state => state.addLocacao);
  const currentScriptId = useAppStore(state => state.currentScriptId);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [notas, setNotas] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentScriptId) return;
    
    addLocacao({
      nome,
      endereco,
      notas
    });
    
    setNome('');
    setEndereco('');
    setNotas('');
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Adicionar Locação</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Locação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input 
              id="nome" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input 
              id="endereco" 
              value={endereco} 
              onChange={(e) => setEndereco(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea 
              id="notas" 
              value={notas} 
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Component for displaying a location with its scenes
const LocationCard: React.FC<{ 
  locacao: any, 
  scenes: any[],
  scriptName: string,
  scriptId: string,
  getSceneNumber: (sceneId: string) => number | string
}> = ({ locacao, scenes, scriptName, scriptId, getSceneNumber }) => {
  const { updateLocacao, removeLocacao } = useAppStore();
  const currentScriptId = useAppStore(state => state.currentScriptId);
  const setCurrentScript = useAppStore(state => state.setCurrentScript);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...locacao });

  const handleUpdate = () => {
    // Set current script to the one containing this location
    if (currentScriptId !== scriptId) {
      setCurrentScript(scriptId);
    }
    
    updateLocacao(locacao.id, editData);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja excluir esta locação?')) {
      // Set current script to the one containing this location
      if (currentScriptId !== scriptId) {
        setCurrentScript(scriptId);
      }
      
      removeLocacao(locacao.id);
    }
  };

  if (isEditing) {
    return (
      <Card>
        <CardHeader className="bg-muted/50">
          <CardTitle className="text-lg">Editar Locação</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-nome">Nome</Label>
              <Input 
                id="edit-nome" 
                value={editData.nome} 
                onChange={(e) => setEditData({...editData, nome: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="edit-endereco">Endereço</Label>
              <Input 
                id="edit-endereco" 
                value={editData.endereco || ''} 
                onChange={(e) => setEditData({...editData, endereco: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="edit-notas">Notas</Label>
              <Textarea 
                id="edit-notas" 
                value={editData.notas || ''} 
                onChange={(e) => setEditData({...editData, notas: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
          <Button onClick={handleUpdate}>Salvar</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="bg-muted/50">
        <div className="flex justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {locacao.nome}
              <Badge variant="outline">{scriptName}</Badge>
            </CardTitle>
            {locacao.endereco && (
              <p className="text-sm text-muted-foreground mt-1">{locacao.endereco}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              Editar
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {locacao.notas && (
          <div className="mb-4 text-sm p-3 bg-muted/30 rounded-md">
            {locacao.notas}
          </div>
        )}
        
        <div id={locacao.id} className="space-y-2 min-h-[120px]">
          <h3 className="text-md font-medium">Cenas nesta locação</h3>
          
          {scenes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Arraste cenas para esta locação
            </p>
          ) : (
            scenes.map(scene => (
              <div
                key={scene.id}
                id={scene.id}
                className="p-3 border rounded cursor-move"
                style={{
                  borderLeftColor: scene.highlightColor,
                  borderLeftWidth: '4px'
                }}
                aria-roledescription="draggable item"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">Cena {getSceneNumber(scene.id)}</span>
                  <Badge variant="outline">
                    {scriptName}
                  </Badge>
                </div>
                <p className="text-sm">{scene.descricao}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {scene.shotlist.length} shots • {scene.duracao}s
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LocacoesView;
