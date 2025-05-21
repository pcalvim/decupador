import React, { useState } from 'react';
import useAppStore from '../../../store/useAppStore';
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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CirclePlus, Edit, Trash2, Eye, ArrowUpDown, X, MapPin, Users, Maximize, Minimize, SquarePlus } from 'lucide-react';

const ScenesList: React.FC = () => {
  const { cenas, texto } = useAppStore(state => state.getCurrentDocumentState());
  const { removeScene, updateScene, addLocacao, addPersonagem, setSceneLocation, removeAllScenes, setOriginalText } = useAppStore();
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const [newCharacterName, setNewCharacterName] = useState('');
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [isAddingCharacter, setIsAddingCharacter] = useState(false);
  const locacoes = useAppStore(state => state.getCurrentDocumentState().locacoes);
  const personagens = useAppStore(state => state.getCurrentDocumentState().personagens);
  
  // Handle clear all scenes
  const handleClearAllScenes = () => {
    if (texto) {
      removeAllScenes();
      // Store original text if not already stored
      setOriginalText(texto);
    }
  };
  
  // No scenes yet
  if (cenas.length === 0) {
    return (
      <Card className="w-full border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">Cenas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-6">
          <p className="text-muted-foreground mb-4">
            Nenhuma cena definida. Selecione um trecho do texto e clique em "Definir como Cena".
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Get the selected scene
  const selectedScene = selectedSceneId 
    ? cenas.find(cena => cena.id === selectedSceneId) 
    : null;
  
  // Handle new location creation
  const handleAddLocation = () => {
    if (!newLocationName.trim()) return;
    
    addLocacao({
      nome: newLocationName.trim(),
      cenas: []
    });
    
    setNewLocationName('');
    setIsAddingLocation(false);
  };
  
  // Handle new character creation
  const handleAddCharacter = () => {
    if (!newCharacterName.trim()) return;
    
    addPersonagem({
      nome: newCharacterName.trim(),
      cenas: []
    });
    
    setNewCharacterName('');
    setIsAddingCharacter(false);
  };
  
  // Update scene's characters
  const toggleCharacterInScene = (sceneId: string, characterId: string) => {
    const scene = cenas.find(s => s.id === sceneId);
    if (!scene) return;
    
    const hasCharacter = scene.personagens.includes(characterId);
    const updatedCharacters = hasCharacter
      ? scene.personagens.filter(id => id !== characterId)
      : [...scene.personagens, characterId];
    
    updateScene(sceneId, { personagens: updatedCharacters });
  };
  
  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Cenas do Roteiro</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {cenas.length} cenas
          </span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                size="sm"
                title="Limpar todas as cenas"
              >
                Limpar Todas
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar Todas as Cenas</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover todas as cenas do roteiro? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAllScenes}>
                  Limpar Todas
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="grid grid-cols-1 gap-3 pr-4">
          {cenas.map((cena, index) => (
            <SceneCard 
              key={cena.id} 
              scene={cena}
              sceneNumber={index + 1}
              isSelected={selectedSceneId === cena.id}
              onSelect={() => setSelectedSceneId(
                selectedSceneId === cena.id ? null : cena.id
              )}
              onDelete={() => removeScene(cena.id)}
              onUpdate={(updates) => updateScene(cena.id, updates)}
              fullText={texto || ''}
              locations={locacoes}
              characters={personagens}
              onSetLocation={(locationId) => setSceneLocation(cena.id, locationId)}
              onToggleCharacter={(characterId) => toggleCharacterInScene(cena.id, characterId)}
              onAddLocation={() => setIsAddingLocation(true)}
              onAddCharacter={() => setIsAddingCharacter(true)}
            />
          ))}
        </div>
      </ScrollArea>
      
      {/* Add new location dialog */}
      <Dialog open={isAddingLocation} onOpenChange={setIsAddingLocation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Locação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="location-name">Nome da Locação</Label>
              <Input
                id="location-name"
                placeholder="Ex: Apartamento do protagonista"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingLocation(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddLocation}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add new character dialog */}
      <Dialog open={isAddingCharacter} onOpenChange={setIsAddingCharacter}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Personagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="character-name">Nome do Personagem</Label>
              <Input
                id="character-name"
                placeholder="Ex: João Silva"
                value={newCharacterName}
                onChange={(e) => setNewCharacterName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingCharacter(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCharacter}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {selectedScene && (
        <SceneDetailSheet 
          scene={selectedScene}
          sceneNumber={cenas.findIndex(s => s.id === selectedScene.id) + 1}
          onClose={() => setSelectedSceneId(null)}
          onUpdate={(updates) => updateScene(selectedScene.id, updates)}
          fullText={texto || ''}
          locations={locacoes}
          characters={personagens}
          onSetLocation={(locationId) => setSceneLocation(selectedScene.id, locationId)}
          onToggleCharacter={(characterId) => toggleCharacterInScene(selectedScene.id, characterId)}
          onAddLocation={() => setIsAddingLocation(true)}
          onAddCharacter={() => setIsAddingCharacter(true)}
        />
      )}
    </div>
  );
};

interface SceneCardProps {
  scene: any;
  sceneNumber: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (updates: any) => void;
  onSetLocation: (locationId: string) => void;
  onToggleCharacter: (characterId: string) => void;
  onAddLocation: () => void;
  onAddCharacter: () => void;
  fullText: string;
  locations: any[];
  characters: any[];
}

const SceneCard: React.FC<SceneCardProps> = ({ 
  scene, 
  sceneNumber,
  isSelected, 
  onSelect, 
  onDelete, 
  onUpdate,
  onSetLocation,
  onToggleCharacter,
  onAddLocation,
  onAddCharacter,
  fullText,
  locations,
  characters
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [editData, setEditData] = useState({
    descricao: scene.descricao,
    highlightColor: scene.highlightColor,
    observacao: scene.observacao || '',
    objetos: scene.objetos || ''
  });
  
  // Get scene text for preview
  const sceneText = fullText.substring(scene.startOffset, scene.endOffset);
  const previewText = sceneText.length > 100 
    ? sceneText.substring(0, 100) + '...' 
    : sceneText;
  
  // Find location name if assigned
  const location = scene.locacaoPrincipal
    ? locations.find(loc => loc.id === scene.locacaoPrincipal)
    : null;
    
  // Find characters in this scene
  const sceneCharacters = characters.filter(char => 
    scene.personagens && scene.personagens.includes(char.id)
  );
  
  const handleUpdate = () => {
    onUpdate(editData);
    setIsEditing(false);
  };
  
  // Determine if scene is interior/exterior based on description or selected option
  const getSceneLocation = () => {
    if (scene.tipoLocacao) {
      return scene.tipoLocacao;
    } else if (scene.descricao.includes('EXT') || scene.descricao.includes('EXTERNA')) {
      return 'EXT';
    } else if (scene.descricao.includes('INT') || scene.descricao.includes('INTERNA')) {
      return 'INT';
    } else {
      return 'INT/EXT';
    }
  };
  
  // Update scene location type
  const handleUpdateLocationType = (type: string) => {
    onUpdate({ tipoLocacao: type });
  };
  
  if (isEditing) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/50 p-3">
          <CardTitle className="text-sm font-medium">Editar Cena {sceneNumber}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="descricao">Descrição</Label>
            <Input 
              id="descricao" 
              value={editData.descricao} 
              onChange={(e) => setEditData({...editData, descricao: e.target.value})}
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="objetos">Objetos</Label>
            <Textarea 
              id="objetos" 
              value={editData.objetos} 
              onChange={(e) => setEditData({...editData, objetos: e.target.value})}
              placeholder="Liste os objetos importantes desta cena"
              rows={2}
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea 
              id="observacao" 
              value={editData.observacao} 
              onChange={(e) => setEditData({...editData, observacao: e.target.value})}
              placeholder="Adicione observações sobre esta cena"
              rows={2}
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="color">Cor</Label>
            <Input 
              id="color" 
              type="color" 
              value={editData.highlightColor} 
              onChange={(e) => setEditData({...editData, highlightColor: e.target.value})}
              className="h-8 w-full"
            />
          </div>
        </CardContent>
        <CardFooter className="p-3 flex justify-between">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleUpdate}>
            Salvar
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card 
      className={`overflow-hidden cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={isMinimized ? undefined : onSelect}
    >
      <div 
        className="h-2" 
        style={{ backgroundColor: scene.highlightColor }}
      />
      <CardHeader className="p-3 pb-1">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-medium line-clamp-1 flex items-center">
            Cena {sceneNumber}: {scene.descricao}
          </CardTitle>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7" 
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
            >
              {isMinimized ? (
                <Maximize className="h-4 w-4" />
              ) : (
                <Minimize className="h-4 w-4" />
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7" 
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-destructive" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir Cena</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir esta cena? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      
      {!isMinimized && (
        <>
          <CardContent className="p-3 pt-1 space-y-3">
            {/* Scene description/preview */}
            <div className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">
              {previewText}
            </div>
            
            {/* Location type and selection */}
            <div className="space-y-1">
              <div className="flex gap-2 mb-1">
                <Label className="text-xs flex items-center">Tipo:</Label>
                <div className="flex gap-1">
                  <Button 
                    variant={getSceneLocation() === 'INT' ? "default" : "outline"} 
                    size="sm" 
                    className="h-6 text-xs px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateLocationType('INT');
                    }}
                  >
                    INT
                  </Button>
                  <Button 
                    variant={getSceneLocation() === 'EXT' ? "default" : "outline"} 
                    size="sm" 
                    className="h-6 text-xs px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateLocationType('EXT');
                    }}
                  >
                    EXT
                  </Button>
                  <Button 
                    variant={getSceneLocation() === 'INT/EXT' ? "default" : "outline"} 
                    size="sm" 
                    className="h-6 text-xs px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateLocationType('INT/EXT');
                    }}
                  >
                    INT/EXT
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Select 
                  value={scene.locacaoPrincipal || ""} 
                  onValueChange={(value) => {
                    if (value === "add_new") {
                      onAddLocation();
                    } else {
                      onSetLocation(value);
                    }
                  }}
                  onOpenChange={(open) => open && setTimeout(() => document.body.click(), 1)}
                >
                  <SelectTrigger 
                    className="h-7 text-xs flex-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue placeholder="Selecionar locação" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.nome}
                      </SelectItem>
                    ))}
                    <SelectItem value="add_new" className="text-primary font-medium">
                      + Nova locação
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Character selection */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" className="h-7 text-xs w-full justify-between">
                    <span className="truncate">
                      {sceneCharacters.length 
                        ? `${sceneCharacters.length} personagens` 
                        : "Selecionar personagens"}
                    </span>
                    <ArrowUpDown className="h-3 w-3 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  <DropdownMenuLabel>Personagens</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {characters.map(char => (
                    <DropdownMenuItem 
                      key={char.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCharacter(char.id);
                      }}
                      className="flex items-center gap-2"
                    >
                      <div className={`w-4 h-4 rounded-sm border ${scene.personagens?.includes(char.id) ? 'bg-primary border-primary' : 'border-input'} flex items-center justify-center`}>
                        {scene.personagens?.includes(char.id) && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span>{char.nome}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddCharacter();
                    }}
                    className="text-primary font-medium"
                  >
                    + Novo personagem
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Objects */}
            {scene.objetos && (
              <div className="space-y-1">
                <Label className="text-xs">Objetos:</Label>
                <div className="text-xs text-muted-foreground pl-2">
                  {scene.objetos}
                </div>
              </div>
            )}
            
            {/* Observations */}
            {scene.observacao && (
              <div className="space-y-1">
                <Label className="text-xs">Observações:</Label>
                <div className="text-xs text-muted-foreground pl-2">
                  {scene.observacao}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="p-3 pt-0 flex justify-between">
            <Badge variant="outline" className="text-xs">
              {scene.duracao ? `${scene.duracao}s` : 'Duração N/A'}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              {isSelected ? 'Fechar' : 'Detalhes'}
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
};

interface SceneDetailSheetProps {
  scene: any;
  sceneNumber: number;
  onClose: () => void;
  onUpdate: (updates: any) => void;
  onSetLocation: (locationId: string) => void;
  onToggleCharacter: (characterId: string) => void;
  onAddLocation: () => void;
  onAddCharacter: () => void;
  fullText: string;
  locations: any[];
  characters: any[];
}

const SceneDetailSheet: React.FC<SceneDetailSheetProps> = ({ 
  scene,
  sceneNumber,
  onClose, 
  onUpdate,
  onSetLocation,
  onToggleCharacter,
  onAddLocation,
  onAddCharacter,
  fullText,
  locations,
  characters
}) => {
  const [editData, setEditData] = useState({
    descricao: scene.descricao,
    notas: scene.notas || '',
    objetos: scene.objetos || '',
    observacao: scene.observacao || '',
    startOffset: scene.startOffset,
    endOffset: scene.endOffset
  });
  
  // Get the full scene text
  const sceneText = fullText.substring(scene.startOffset, scene.endOffset);
  
  // Find location name if assigned
  const location = scene.locacaoPrincipal
    ? locations.find(loc => loc.id === scene.locacaoPrincipal)
    : null;
    
  // Find characters in this scene
  const sceneCharacters = characters.filter(char => 
    scene.personagens && scene.personagens.includes(char.id)
  );
  
  const handleUpdate = () => {
    onUpdate(editData);
  };
  
  // Function to update in/out points and refresh scene text preview
  const handleBoundaryUpdate = (startOffset: number, endOffset: number) => {
    // Ensure start is not negative and end is not beyond text length
    const validStart = Math.max(0, startOffset);
    const validEnd = Math.min(fullText.length, endOffset);
    
    // Ensure end is not before start
    const finalEnd = Math.max(validStart, validEnd);
    
    setEditData({
      ...editData,
      startOffset: validStart,
      endOffset: finalEnd
    });
  };
  
  // Get scene text preview based on current boundaries
  const previewText = fullText.substring(editData.startOffset, editData.endOffset);
  
  // Determine if scene is interior/exterior based on description or selected option
  const getSceneLocation = () => {
    if (scene.tipoLocacao) {
      return scene.tipoLocacao;
    } else if (scene.descricao.includes('EXT') || scene.descricao.includes('EXTERNA')) {
      return 'EXT';
    } else if (scene.descricao.includes('INT') || scene.descricao.includes('INTERNA')) {
      return 'INT';
    } else {
      return 'INT/EXT';
    }
  };
  
  // Update scene location type
  const handleUpdateLocationType = (type: string) => {
    onUpdate({ tipoLocacao: type });
  };
  
  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Detalhes da Cena {sceneNumber}</SheetTitle>
          <SheetDescription>
            Visualize e edite informações sobre esta cena
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="scene-desc">Descrição</Label>
            <Input 
              id="scene-desc" 
              value={editData.descricao} 
              onChange={(e) => setEditData({...editData, descricao: e.target.value})}
            />
          </div>
          
          {/* Location type selection */}
          <div className="space-y-2">
            <Label>Tipo de Locação</Label>
            <div className="flex gap-2">
              <Button 
                variant={getSceneLocation() === 'INT' ? "default" : "outline"} 
                onClick={() => handleUpdateLocationType('INT')}
                className="flex-1"
              >
                Interior (INT)
              </Button>
              <Button 
                variant={getSceneLocation() === 'EXT' ? "default" : "outline"} 
                onClick={() => handleUpdateLocationType('EXT')}
                className="flex-1"
              >
                Exterior (EXT)
              </Button>
              <Button 
                variant={getSceneLocation() === 'INT/EXT' ? "default" : "outline"} 
                onClick={() => handleUpdateLocationType('INT/EXT')}
                className="flex-1"
              >
                INT/EXT
              </Button>
            </div>
          </div>
          
          {/* Location selection */}
          <div className="space-y-2">
            <Label>Locação</Label>
            <Select 
              value={scene.locacaoPrincipal || ""} 
              onValueChange={(value) => {
                if (value === "add_new") {
                  onAddLocation();
                } else {
                  onSetLocation(value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar locação" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.nome}
                  </SelectItem>
                ))}
                <SelectItem value="add_new" className="text-primary font-medium">
                  + Nova locação
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Characters selection */}
          <div className="space-y-2">
            <Label>Personagens</Label>
            <div className="border rounded-md p-2 space-y-2">
              <div className="flex flex-wrap gap-1 mb-2">
                {sceneCharacters.length > 0 ? (
                  sceneCharacters.map(char => (
                    <Badge key={char.id} className="flex items-center gap-1 pr-1">
                      {char.nome}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 rounded-full"
                        onClick={() => onToggleCharacter(char.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">Nenhum personagem selecionado</span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="text-xs w-full">
                      Adicionar Personagem
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48">
                    <DropdownMenuLabel>Todos os Personagens</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {characters
                      .filter(char => !scene.personagens?.includes(char.id))
                      .map(char => (
                        <DropdownMenuItem 
                          key={char.id}
                          onClick={() => onToggleCharacter(char.id)}
                        >
                          {char.nome}
                        </DropdownMenuItem>
                      ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={onAddCharacter}
                      className="text-primary font-medium"
                    >
                      + Criar novo personagem
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="scene-objects">Objetos</Label>
            <Textarea 
              id="scene-objects" 
              value={editData.objetos} 
              onChange={(e) => setEditData({...editData, objetos: e.target.value})}
              rows={2}
              placeholder="Lista de objetos importantes para esta cena..."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="scene-notes">Observações</Label>
            <Textarea 
              id="scene-notes" 
              value={editData.observacao} 
              onChange={(e) => setEditData({...editData, observacao: e.target.value})}
              rows={3}
              placeholder="Adicione observações sobre esta cena..."
            />
          </div>
          
          {/* Scene boundaries (In and Out points) */}
          <div className="space-y-2">
            <Label>Pontos de Entrada e Saída</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="scene-start">Entrada (caractere)</Label>
                <Input 
                  id="scene-start" 
                  type="number"
                  value={editData.startOffset} 
                  onChange={(e) => {
                    const newStart = parseInt(e.target.value);
                    if (!isNaN(newStart)) {
                      handleBoundaryUpdate(newStart, editData.endOffset);
                    }
                  }}
                />
              </div>
              <div>
                <Label htmlFor="scene-end">Saída (caractere)</Label>
                <Input 
                  id="scene-end" 
                  type="number"
                  value={editData.endOffset} 
                  onChange={(e) => {
                    const newEnd = parseInt(e.target.value);
                    if (!isNaN(newEnd)) {
                      handleBoundaryUpdate(editData.startOffset, newEnd);
                    }
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Conteúdo da Cena</Label>
            <div className="border rounded-md p-3 bg-muted/30">
              <ScrollArea className="h-[200px]">
                <div className="whitespace-pre-line text-sm">
                  {previewText}
                </div>
              </ScrollArea>
            </div>
          </div>
          
          <div className="flex justify-between">
            <div>
              <Badge variant="outline" className="mr-2">
                {scene.duracao ? `${scene.duracao}s` : 'Duração N/A'}
              </Badge>
              <Badge 
                variant="outline" 
                style={{ borderLeftColor: scene.highlightColor, borderLeftWidth: '3px' }}
              >
                Cor
              </Badge>
            </div>
          </div>
        </div>
        
        <SheetFooter>
          <Button onClick={handleUpdate}>Salvar Alterações</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

// Add missing Check component needed for the character checkbox
const Check = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default ScenesList;
