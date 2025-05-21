import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Test log to ensure console logging works
console.log("ShotlistView.tsx loaded - logging is working");
import useAppStore from '../../store/useAppStore';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogClose 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import ScriptSelector from '../shared/ScriptSelector';
import { getAllScenesFromSelectedScripts } from '../shared/SceneViewWithFilters';
import { Plus, ChevronDown, ChevronUp, Edit3, Trash2, Save, XCircle, Eye, EyeOff, List, GripVertical } from 'lucide-react';
import { Shot, Scene, Locacao, Personagem } from '@/types'; // Adicionado Locacao, Personagem

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter, // Or rectIntersection if preferred
  DragEndEvent,
  useDraggable,
  useDroppable,
  DragOverlay,
  DragStartEvent
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';

interface ShotCardProps {
  shot: Shot;
  sceneId: string;
  scriptId: string;
  allLocacoes: Locacao[]; // Lista de todas as locações do roteiro
  allPersonagens: Personagem[]; // Lista de todos os personagens do roteiro
  isEditing: boolean; // Now a prop
  onToggleEditState: (shotId: string, editState: boolean) => void; // To notify parent
  isNewShotPlaceholder?: boolean;
  onSaveNewShot?: (shotData: Partial<Shot>) => void;
  onCancelNewShot?: () => void;
  forceUpdateList?: () => void;
}

const ShotCard: React.FC<ShotCardProps> = ({ 
  shot, 
  sceneId,
  scriptId,
  allLocacoes,
  allPersonagens,
  isEditing, // Consumed as a prop
  onToggleEditState, // Consumed as a prop
  isNewShotPlaceholder = false, 
  onSaveNewShot,
  onCancelNewShot,
  forceUpdateList
}) => {
  const updateShotStore = useAppStore(state => state.updateShot);
  const removeShotStore = useAppStore(state => state.removeShot);

  // const [isEditing, setIsEditing] = useState(isNewShotPlaceholder); // Local isEditing state removed
  const [isMinimized, setIsMinimized] = useState(!isNewShotPlaceholder && !isEditing); // Minimize if not new and not editing
  const [editData, setEditData] = useState<Partial<Shot>>({ ...shot, personagens: shot.personagens || [] });

  const {
    attributes: sortableAttributes, 
    listeners: sortableListeners, 
    setNodeRef: sortableSetNodeRef, 
    transform: sortableTransform,
    transition: sortableTransition,
    isDragging: isSortableDragging // Renamed to avoid conflict
  } = useSortable({
    id: `shot-${shot.id}`, // Keep consistent ID for dnd-kit
    data: { // Data for sorting
        shot,
        type: 'sortable-shot',
        sourceSceneId: sceneId, // Needed for context
        sourceScriptId: scriptId
    },
    disabled: isEditing || isNewShotPlaceholder,
  });

  // Draggable for moving between scenes (distinct from sortable)
  const {
    attributes: draggableAttributes, 
    listeners: draggableListeners, 
    setNodeRef: draggableSetNodeRefForSceneMove, 
    isDragging: isSceneMoveDragging
  } = useDraggable({
    id: `move-shot-${shot.id}`, // Different ID prefix for clarity and to avoid conflicts
    data: {
      shot,
      sourceSceneId: sceneId,
      sourceScriptId: scriptId,
      type: 'scene-movable-shot', 
    },
    disabled: isEditing || isNewShotPlaceholder,
  });

  const isActuallyDragging = isSortableDragging || isSceneMoveDragging;

  const style = {
    transform: CSS.Translate.toString(sortableTransform), // Use sortableTransform for in-list movement
    transition: sortableTransition,
    zIndex: isActuallyDragging ? 100 : undefined,
    opacity: isActuallyDragging ? 0.7 : 1,
  };

  useEffect(() => {
    // Reset editData if the shot prop changes and this card is not the one being edited,
    // or if it stops being the new shot placeholder.
    if (!isEditing) {
      setEditData({ ...shot, personagens: shot.personagens || [] });
      if (!isNewShotPlaceholder) { // Keep new shot form open if it was, until saved/cancelled
          setIsMinimized(true);
      }
    } else {
        // If it becomes the editing card, ensure it's not minimized.
        setIsMinimized(false);
    }
  }, [shot, isEditing, isNewShotPlaceholder]);


  const handleMediaFileChange = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
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
        // Poderia adicionar mais lógicas para outros tipos se necessário

        setEditData(prev => ({ 
          ...prev, 
          referenciaMidia: { 
            nomeArquivo: file.name, 
            mimeType: file.type, 
            tipoMedia,
            dataUrl 
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  }, []); // setEditData is stable

  // Efeito para lidar com o evento de colar imagem
  useEffect(() => {
    const actualHandlePaste = (event: ClipboardEvent) => {
      // Log para identificar qual ShotCard está processando o paste
      // isEditing is now a prop, correctly scoping the log and action.
      console.log(`[ShotCard Paste Event Processing] ID: ${shot.id}, Desc: ${shot.descricao}, isEditing: ${isEditing}`);

      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            handleMediaFileChange(dataTransfer.files); // handleMediaFileChange is now stable
            toast.success('Imagem colada da área de transferência!');
            event.preventDefault(); 
            return;
          }
        }
      }
    };

    if (isEditing) { // Only add listener if this card is the one being edited
      document.addEventListener('paste', actualHandlePaste);
      console.log(`[ShotCard Paste Listener ATTACHED] ID: ${shot.id}`);
    } else {
      document.removeEventListener('paste', actualHandlePaste);
      console.log(`[ShotCard Paste Listener DETACHED] ID: ${shot.id}`);
    }

    return () => {
      document.removeEventListener('paste', actualHandlePaste);
      console.log(`[ShotCard Paste Listener CLEANUP] ID: ${shot.id}`);
    };
  }, [isEditing, shot.id, shot.descricao, handleMediaFileChange]);

  const handleSave = () => {
    if (!editData.descricao?.trim()) {
      toast.error('A descrição do shot não pode estar vazia.');
      return;
    }
    const dataToSave = { ...editData, personagens: Array.isArray(editData.personagens) ? editData.personagens : [] };

    if (isNewShotPlaceholder) {
      if (onSaveNewShot) onSaveNewShot(dataToSave); // Parent will call onToggleEditState
    } else {
      updateShotStore(sceneId, shot.id, dataToSave, scriptId);
      toast.success('Shot atualizado!');
      onToggleEditState(shot.id, false); // Notify parent to stop editing this card
      setIsMinimized(true);
    }
    if (forceUpdateList) forceUpdateList();
  };

  const handleDelete = () => {
    if (isNewShotPlaceholder) {
      if (onCancelNewShot) onCancelNewShot(); // Parent will call onToggleEditState
    } else {
      if (window.confirm('Tem certeza que deseja excluir este shot?')) {
        removeShotStore(sceneId, shot.id, scriptId);
        toast.success('Shot removido.');
        // If this was the card being edited, parent should clear editingShotId
        // This is implicitly handled if the card is removed from the list.
        // To be safe, we can also call onToggleEditState if it was editing.
        if (isEditing) {
            onToggleEditState(shot.id, false);
        }
        if (forceUpdateList) forceUpdateList();
      }
    }
  };
  
  const handleCancel = () => {
    if (isNewShotPlaceholder) {
      if (onCancelNewShot) onCancelNewShot(); // Parent will call onToggleEditState
    } else {
      setEditData({ ...shot, personagens: shot.personagens || [] }); // Reset data
      onToggleEditState(shot.id, false); // Notify parent to stop editing
      setIsMinimized(true);
    }
  };

  const toggleMinimizeDisplay = () => {
    // If currently editing and trying to minimize, save first.
    if (isEditing && !isNewShotPlaceholder && !isMinimized) {
      handleSave(); 
      // Save might make it not-editing. If still editing (e.g. save failed validation)
      // then don't minimize. If save was successful, it will call onToggleEditState
      // and isEditing will become false, then setIsMinimized will apply.
      if (editData.descricao?.trim() && !isEditing) setIsMinimized(true); // this logic is a bit tricky now
                                                                      // Let's simplify: if it's not editing, toggle minimize.
                                                                      // If it IS editing, it should already be expanded.
    } else if (!isEditing) { // Only toggle minimize if not actively editing this card
        setIsMinimized(!isMinimized);
    } else if (isEditing && isNewShotPlaceholder && isMinimized) {
        // Prevent minimizing new shot form if it's the active one
        setIsMinimized(false);
        toast.info("Salve ou cancele o novo shot primeiro.")
        return;
    }
    // If user clicks to expand a minimized card that is NOT currently the active editing card
    // it should NOT automatically go into edit mode. Edit mode is explicit.
    // If it IS the active editing card, it should already be expanded.
  };
  
  const cardStyle = isEditing && !isNewShotPlaceholder ? { borderColor: 'hsl(var(--primary))' } : {};

  // Helper para obter nome da locação
  const getLocacaoName = (locacaoId?: string) => {
    return allLocacoes.find(l => l.id === locacaoId)?.nome || 'N/A';
  };

  // Helper para obter nomes dos personagens
  const getPersonagemNamesDisplay = (personagemIds?: string[]) => {
    if (!personagemIds || personagemIds.length === 0) return 'N/A';
    return personagemIds.map(id => allPersonagens.find(p => p.id === id)?.nome || id).join(', ');
  };
  
  const handlePersonagensChange = (selectedPersonagemId: string) => {
    setEditData(prev => {
      const currentPersonagens = Array.isArray(prev.personagens) ? prev.personagens : [];
      const isSelected = currentPersonagens.includes(selectedPersonagemId);
      if (isSelected) {
        return { ...prev, personagens: currentPersonagens.filter(id => id !== selectedPersonagemId) };
      } else {
        return { ...prev, personagens: [...currentPersonagens, selectedPersonagemId] };
      }
    });
  };

  const handleRemoveMedia = () => {
    setEditData(prev => ({ ...prev, referenciaMidia: undefined }));
  };

  if (isNewShotPlaceholder) { // This block implies isEditing is true for the placeholder
    return (
      <Card className="mb-3 border-primary" style={cardStyle}>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-base font-medium">Novo Shot</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-1 space-y-3">
          <Input
            placeholder="Descrição do shot"
            value={editData.descricao || ''}
            onChange={e => setEditData({ ...editData, descricao: e.target.value })}
            autoFocus
          />
          {!isMinimized && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Select value={editData.tipo || 'MÉDIO'} onValueChange={value => setEditData({ ...editData, tipo: value })}>
                  <SelectTrigger><SelectValue placeholder="Tipo de Câmera" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLOSE">CLOSE</SelectItem>
                    <SelectItem value="MÉDIO">MÉDIO</SelectItem>
                    <SelectItem value="AMERICANO">AMERICANO</SelectItem>
                    <SelectItem value="GERAL">GERAL</SelectItem>
                    <SelectItem value="DETALHE">DETALHE</SelectItem>
                    <SelectItem value="POV">POV</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Duração (s)"
                  value={editData.duracao || ''}
                  onChange={e => setEditData({ ...editData, duracao: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select value={editData.locacaoId || undefined} onValueChange={value => setEditData({ ...editData, locacaoId: value === '' ? undefined : value })}>
                  <SelectTrigger><SelectValue placeholder="Locação do Shot" /></SelectTrigger>
                  <SelectContent>
                    {allLocacoes.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={editData.tipoLocacaoShot || undefined} onValueChange={value => setEditData({ ...editData, tipoLocacaoShot: value as any })}>
                  <SelectTrigger><SelectValue placeholder="Tipo Loc. (Shot)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INT">INT</SelectItem>
                    <SelectItem value="EXT">EXT</SelectItem>
                    <SelectItem value="INT/EXT">INT/EXT</SelectItem>
                    <SelectItem value="EXT/INT">EXT/INT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Personagens no Shot</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1 border p-2 rounded-md max-h-32 overflow-y-auto">
                  {allPersonagens.map(p => (
                    <div key={p.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`personagem-shot-${p.id}`}
                        checked={(editData.personagens || []).includes(p.id)}
                        onChange={() => handlePersonagensChange(p.id)}
                        className="form-checkbox h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <Label htmlFor={`personagem-shot-${p.id}`} className="text-xs font-normal">{p.nome}</Label>
                    </div>
                  ))}
                  {allPersonagens.length === 0 && <p className="text-xs text-muted-foreground col-span-full">Nenhum personagem no roteiro.</p>}
                </div>
              </div>
              <Input
                placeholder="Equipamento (opcional)"
                value={editData.equipamento || ''}
                onChange={e => setEditData({ ...editData, equipamento: e.target.value })}
              />
              <Textarea
                placeholder="Notas (opcional)"
                value={editData.notas || ''}
                onChange={e => setEditData({ ...editData, notas: e.target.value })}
                rows={2}
              />
              <div className="mt-3">
                <Label htmlFor={`media-upload-new-${shot.id}`} className="text-sm font-medium">Imagem/GIF/WebM/MP4/MOV de Referência</Label>
                <Input
                  id={`media-upload-new-${shot.id}`}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/webm,video/mp4,video/quicktime"
                  onChange={(e) => handleMediaFileChange(e.target.files)}
                  className="mt-1"
                />
                {editData.referenciaMidia && (
                  <div className="mt-2 text-xs">
                    <p>Arquivo: {editData.referenciaMidia.nomeArquivo} ({editData.referenciaMidia.mimeType})</p>
                    {editData.referenciaMidia.tipoMedia === 'video' ? (
                      <video src={editData.referenciaMidia.dataUrl} controls className="max-w-full h-auto rounded-md border mt-1 max-h-24 object-contain" />
                    ) : (
                      <img src={editData.referenciaMidia.dataUrl} alt={editData.referenciaMidia.nomeArquivo} className="max-w-full h-auto rounded-md border mt-1 max-h-24 object-contain" />
                    )}
                    <Button variant="link" size="sm" className="text-red-500 px-1 py-0.5 h-auto mt-1" onClick={handleRemoveMedia}>Remover</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="p-3 flex justify-between items-center">
          <Button variant="ghost" size="icon" onClick={() => setIsMinimized(!isMinimized)} title={isMinimized ? "Mostrar campos" : "Ocultar campos"}>
            {isMinimized ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleCancel} size="sm">
              <XCircle className="h-4 w-4 mr-1" /> Cancelar
            </Button>
            <Button onClick={handleSave} size="sm" disabled={!editData.descricao?.trim()}>
              <Save className="h-4 w-4 mr-1" /> Salvar Novo Shot
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  }

  if (isMinimized && !isEditing) {
    return (
      <Card ref={sortableSetNodeRef} className="mb-3" style={{...cardStyle, ...style}} {...sortableAttributes}>
        <CardHeader className="p-3 pb-2 flex flex-row justify-between items-center">
          <div className="flex items-center gap-1 flex-grow min-w-0">
            {!isNewShotPlaceholder && !isEditing && (
              <div className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  {...sortableListeners} // Listeners for sorting
                  className="cursor-grab p-1 h-auto w-auto mr-1"
                  title="Reordenar shot"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            )}
            <div 
              ref={draggableSetNodeRefForSceneMove} 
              {...draggableAttributes} 
              {...draggableListeners}
              className="w-full cursor-move"
              title="Arraste para outra cena para mover"
            >
              <CardTitle className="text-base font-medium truncate" title={shot.descricao}>{shot.descricao}</CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={toggleMinimizeDisplay} title="Expandir Detalhes">
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { onToggleEditState(shot.id, true); setIsMinimized(false); }} title="Editar Shot">
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={handleDelete} title="Excluir Shot">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{editData.tipo}</span>
            {editData.duracao && editData.duracao > 0 ? <span>{editData.duracao}s</span> : null}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Loc: {getLocacaoName(editData.locacaoId)} ({editData.tipoLocacaoShot || 'N/A'})
          </div>
          <div className="text-xs text-muted-foreground mt-1 truncate">
            Pers: {getPersonagemNamesDisplay(editData.personagens)}
          </div>
          {editData.referenciaMidia && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">Ref: {editData.referenciaMidia.nomeArquivo}</p>
              {editData.referenciaMidia.tipoMedia === 'video' ? (
                <video src={editData.referenciaMidia.dataUrl} controls loop muted className="max-w-full h-auto rounded-md border mt-1 max-h-40 object-contain" />
              ) : (
                <img 
                  src={editData.referenciaMidia.dataUrl} 
                  alt={editData.referenciaMidia.nomeArquivo} 
                  className="max-w-full h-auto rounded-md border mt-1 max-h-40 object-contain"
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card ref={sortableSetNodeRef} className="mb-3" style={{...cardStyle, ...style}} {...sortableAttributes}>
      <CardHeader className="p-3 pb-2 flex flex-row justify-between items-center">
        <div className="flex items-center gap-1 flex-grow min-w-0">
           {!isNewShotPlaceholder && !isEditing && (
              <Button 
                variant="ghost" 
                size="icon" 
                {...sortableListeners} // Listeners for sorting
                className="cursor-grab p-1 h-auto w-auto mr-1"
                title="Reordenar shot"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          <CardTitle className="text-base font-medium">
            {isEditing ? "Editando Shot" : (shot.descricao || "Detalhes do Shot")}
          </CardTitle>
        </div>
        <div className="flex items-center gap-1">
          {isEditing ? (
             <Button variant="ghost" size="icon" onClick={handleCancel} title="Cancelar Edição e Minimizar">
                <ChevronUp className="h-4 w-4" />
             </Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setIsMinimized(true)} title="Minimizar Detalhes">
              <ChevronUp className="h-4 w-4" />
            </Button>
          )}
          {!isEditing && (
            <Button variant="ghost" size="icon" onClick={() => onToggleEditState(shot.id, true)} title="Editar Shot">
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
           <Button variant="ghost" size="icon" className="text-destructive" onClick={handleDelete} title="Excluir Shot">
              <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-3">
         <Input
            placeholder="Descrição do shot"
            value={editData.descricao || ''}
            onChange={e => setEditData({ ...editData, descricao: e.target.value })}
            readOnly={!isEditing}
            className={!isEditing ? "border-none p-0 h-auto read-only:bg-transparent read-only:cursor-default" : ""}
          />
        <div className="grid grid-cols-2 gap-3">
          {isEditing ? (
            <Select value={editData.tipo || 'MÉDIO'} onValueChange={value => setEditData({ ...editData, tipo: value })}>
              <SelectTrigger><SelectValue placeholder="Tipo de Câmera" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CLOSE">CLOSE</SelectItem>
                <SelectItem value="MÉDIO">MÉDIO</SelectItem>
                <SelectItem value="AMERICANO">AMERICANO</SelectItem>
                <SelectItem value="GERAL">GERAL</SelectItem>
                <SelectItem value="DETALHE">DETALHE</SelectItem>
                <SelectItem value="POV">POV</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <p><span className="font-medium text-muted-foreground">Tipo:</span> {editData.tipo}</p>
          )}
          {isEditing ? (
            <Input
              type="number"
              placeholder="Duração (s)"
              value={editData.duracao || ''}
              onChange={e => setEditData({ ...editData, duracao: parseInt(e.target.value) || 0 })}
            />
          ) : (
             editData.duracao && editData.duracao > 0 ? <p><span className="font-medium text-muted-foreground">Duração:</span> {editData.duracao}s</p> : <p className="text-muted-foreground"><span className="font-medium">Duração:</span> N/A</p>
          )}
        </div>
        {isEditing ? (
          <div className="grid grid-cols-2 gap-3 mt-3">
                 <Select value={editData.locacaoId || undefined} onValueChange={value => setEditData({ ...editData, locacaoId: value === '' ? undefined : value })}>
                  <SelectTrigger><SelectValue placeholder="Locação do Shot" /></SelectTrigger>
                  <SelectContent>
                    {allLocacoes.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={editData.tipoLocacaoShot || undefined} onValueChange={value => setEditData({ ...editData, tipoLocacaoShot: value as any })}>
                  <SelectTrigger><SelectValue placeholder="Tipo Loc. (Shot)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INT">INT</SelectItem>
                    <SelectItem value="EXT">EXT</SelectItem>
                    <SelectItem value="INT/EXT">INT/EXT</SelectItem>
                    <SelectItem value="EXT/INT">EXT/INT</SelectItem>
                  </SelectContent>
                </Select>
            </div>
        ) : (
            <>
                <p className="mt-2"><span className="font-medium text-muted-foreground">Locação Shot:</span> {getLocacaoName(editData.locacaoId)} ({editData.tipoLocacaoShot || 'N/A'})</p>
            </>
        )}
        {isEditing ? (
            <div className="mt-3">
                <Label className="text-sm font-medium">Personagens no Shot</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1 border p-2 rounded-md max-h-32 overflow-y-auto">
                  {allPersonagens.map(p => (
                    <div key={p.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`personagem-shot-edit-${p.id}`}
                        checked={(editData.personagens || []).includes(p.id)}
                        onChange={() => handlePersonagensChange(p.id)}
                        className="form-checkbox h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <Label htmlFor={`personagem-shot-edit-${p.id}`} className="text-xs font-normal">{p.nome}</Label>
                    </div>
                  ))}
                  {allPersonagens.length === 0 && <p className="text-xs text-muted-foreground col-span-full">Nenhum personagem no roteiro.</p>}
                </div>
            </div>
        ) : (
             <p className="mt-2 truncate"><span className="font-medium text-muted-foreground">Personagens:</span> {getPersonagemNamesDisplay(editData.personagens)}</p>
        )}
        {isEditing ? (
          <Input
            placeholder="Equipamento (opcional)"
            value={editData.equipamento || ''}
            onChange={e => setEditData({ ...editData, equipamento: e.target.value })}
          />
        ) : (
          editData.equipamento ? <p><span className="font-medium text-muted-foreground">Equipamento:</span> {editData.equipamento}</p> : <p className="text-muted-foreground"><span className="font-medium">Equipamento:</span> N/A</p>
        )}
        {isEditing ? (
          <Textarea
            placeholder="Notas (opcional)"
            value={editData.notas || ''}
            onChange={e => setEditData({ ...editData, notas: e.target.value })}
            rows={2}
          />
        ) : (
          editData.notas ? <p><span className="font-medium text-muted-foreground">Notas:</span> {editData.notas}</p> : <p className="text-muted-foreground"><span className="font-medium">Notas:</span> N/A</p>
        )}
        {isEditing ? (
          <div className="mt-3">
            <Label htmlFor={`media-upload-edit-${shot.id}`} className="text-sm font-medium">Imagem/GIF/WebM/MP4/MOV de Referência</Label>
            <Input
              id={`media-upload-edit-${shot.id}`}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/webm,video/mp4,video/quicktime"
              onChange={(e) => handleMediaFileChange(e.target.files)}
              className="mt-1"
            />
            {editData.referenciaMidia && (
              <div className="mt-2 text-xs">
                <p>Arquivo: {editData.referenciaMidia.nomeArquivo} ({editData.referenciaMidia.mimeType})</p>
                {editData.referenciaMidia.tipoMedia === 'video' ? (
                  <video src={editData.referenciaMidia.dataUrl} controls className="max-w-full h-auto rounded-md border mt-1 max-h-32 object-contain" />
                ) : (
                  <img src={editData.referenciaMidia.dataUrl} alt={editData.referenciaMidia.nomeArquivo} className="max-w-full h-auto rounded-md border mt-1 max-h-32 object-contain" />
                )}
                <Button variant="link" size="sm" className="text-red-500 px-1 py-0.5 h-auto mt-1" onClick={handleRemoveMedia}>Remover</Button>
              </div>
            )}
          </div>
        ) : (
          editData.referenciaMidia && (
            <div className="mt-2">
              <p className="font-medium text-muted-foreground">Referência:</p>
              {editData.referenciaMidia.tipoMedia === 'video' ? (
                <video src={editData.referenciaMidia.dataUrl} controls loop muted className="max-w-full h-auto rounded-md border mt-1 max-h-48 object-contain" />
              ) : (
                <img 
                  src={editData.referenciaMidia.dataUrl} 
                  alt={editData.referenciaMidia.nomeArquivo} 
                  className="max-w-full h-auto rounded-md border mt-1 max-h-48 object-contain"
                />
              )}
              <p className="text-xs text-muted-foreground text-center mt-1">{editData.referenciaMidia.nomeArquivo}</p>
            </div>
          )
        )}
      </CardContent>
      {isEditing && (
        <CardFooter className="p-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={handleCancel} size="sm">
            <XCircle className="h-4 w-4 mr-1" /> Cancelar Edição
          </Button>
          <Button onClick={handleSave} size="sm" disabled={!editData.descricao?.trim()}>
            <Save className="h-4 w-4 mr-1" /> Salvar Alterações
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

// Componente para um Card de Cena individual, agora com expandir/minimizar
interface SceneCardItemProps {
  scene: Scene; // Usar o tipo Scene importado
  scriptId: string; // Adicionado para buscar o texto do roteiro
  isSelected: boolean;
  onSelectScene: (sceneId: string) => void;
}

const SceneCardItem: React.FC<SceneCardItemProps> = ({ scene, scriptId, isSelected, onSelectScene }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const getDocumentStateByScriptId = useAppStore(state => state._getDocumentStateByScriptId); // Acessa a função do store

  const { setNodeRef: droppableSetNodeRef, isOver } = useDroppable({
    id: `scene-${scene.id}`, // Ensure unique ID for dnd-kit
    data: {
      targetSceneId: scene.id,
      targetScriptId: scriptId,
      type: 'scene', // To identify the droppable type
    },
  });

  const sceneText = useMemo(() => {
    if (!isExpanded) return null;
    const documentState = getDocumentStateByScriptId(scriptId);
    if (documentState && documentState.texto && scene.startOffset !== undefined && scene.endOffset !== undefined) {
      return documentState.texto.substring(scene.startOffset, scene.endOffset);
    }
    return "Texto da cena não disponível ou offsets inválidos.";
  }, [isExpanded, scene, scriptId, getDocumentStateByScriptId]);

  return (
    <Card
      ref={droppableSetNodeRef}
      className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : ''} ${isOver ? 'ring-2 ring-green-500 bg-green-50' : ''}`}
      style={{ borderLeftColor: scene.highlightColor, borderLeftWidth: '4px' }}
    >
      <CardHeader 
        className="p-3 pb-2 flex flex-row justify-between items-center" 
        onClick={() => onSelectScene(scene.id)} // Seleciona ao clicar no header
      >
        <CardTitle className="text-base">{scene.descricao}</CardTitle>
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded);}} title={isExpanded ? "Minimizar Shots" : "Mostrar Shots"}>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="p-3 pt-0" onClick={() => onSelectScene(scene.id)}>
        <div className="text-sm text-muted-foreground mb-2">
          {scene.shotlist?.length || 0} shots • {scene.duracao || 0}s
        </div>
        {isExpanded && (
          <div className="mt-2 space-y-1 border-t pt-2">
            <div className="mb-2 p-2 bg-gray-50 rounded-md">
              <h4 className="text-xs font-semibold text-gray-600 mb-1">Texto da Cena:</h4>
              <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                {sceneText}
              </p>
            </div>
            <h4 className="text-xs font-semibold text-gray-600 mt-3">Shots:</h4>
            {scene.shotlist && scene.shotlist.length > 0 ? (
              scene.shotlist.map(shot => (
                <div key={shot.id} className="text-xs p-1 bg-muted/50 rounded">
                  {shot.descricao}
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic">Nenhum shot nesta cena.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ShotlistView: React.FC = () => {
  const scripts = useAppStore(state => state.scripts);
  const selectedScriptsFilter = useAppStore(state => state.selectedScriptsFilter);
  const [updateCounter, setUpdateCounter] = useState(0);
  const store = useAppStore(); // Para acessar locações e personagens
  const moveShotToAnotherScene = useAppStore(state => state.moveShotToAnotherScene); // Assuming this exists
  const reorderShotsInScene = useAppStore(state => state.reorderShotsInScene); // Added for reordering
  const [isMoving, setIsMoving] = useState(false); // Add loading state for drag operations

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );
  
  const [activeDraggedShot, setActiveDraggedShot] = useState<Shot | null>(null);

  const scenesWithScriptInfo = useMemo(() => {
    console.log(`[DEBUG_SCENES] Regenerating scenesWithScriptInfo with updateCounter: ${updateCounter}`);
    const scenes = getAllScenesFromSelectedScripts();
    console.log(`[DEBUG_SCENES] scenesWithScriptInfo generated:`, 
      scenes.map(info => ({
        scriptId: info.scriptId,
        sceneId: info.scene.id,
        shotlistLength: info.scene.shotlist?.length || 0
      }))
    );
    return scenes;
  }, [scripts, selectedScriptsFilter, updateCounter]);

  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  
  const forceUpdateParentView = useCallback(() => {
    console.log(`[DEBUG_UPDATE] forceUpdateParentView called, incrementing updateCounter from ${updateCounter}`);
    // Force a complete component re-render by refreshing state
    setUpdateCounter(Date.now()); // Use timestamp for guaranteed change
  }, []);
  
  const scenesByScript = useMemo(() => {
    const grouped: Record<string, { scriptName: string; scenes: Scene[] }> = {}; 
    scenesWithScriptInfo.forEach(({ scene, scriptName, scriptId }) => {
      if (!grouped[scriptId]) grouped[scriptId] = { scriptName, scenes: [] };
      grouped[scriptId].scenes.push(scene as Scene); 
    });
    return grouped;
  }, [scenesWithScriptInfo]);
  
  useEffect(() => {
    if (scenesWithScriptInfo.length > 0 && selectedSceneId === null) {
      setSelectedSceneId(scenesWithScriptInfo[0].scene.id);
    } else if (selectedSceneId && !scenesWithScriptInfo.find(info => info.scene.id === selectedSceneId)) {
      setSelectedSceneId(scenesWithScriptInfo.length > 0 ? scenesWithScriptInfo[0].scene.id : null);
    } else if (scenesWithScriptInfo.length === 0) {
        setSelectedSceneId(null);
    }
  }, [scenesWithScriptInfo, selectedSceneId]);
  
  const selectedSceneInfo = scenesWithScriptInfo.find((info) => info.scene.id === selectedSceneId);

  // Obter todas as locações e personagens do roteiro da cena selecionada
  const { allLocacoesForSelectedScene, allPersonagensForSelectedScene } = useMemo(() => {
    if (selectedSceneInfo && selectedSceneInfo.scriptId) {
      const scriptState = store._getDocumentStateByScriptId(selectedSceneInfo.scriptId);
      return {
        allLocacoesForSelectedScene: scriptState?.locacoes || [],
        allPersonagensForSelectedScene: scriptState?.personagens || []
      };
    }
    return { allLocacoesForSelectedScene: [], allPersonagensForSelectedScene: [] };
  }, [selectedSceneInfo, store]);

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'scene-movable-shot') {
      setActiveDraggedShot(event.active.data.current.shot as Shot);
    } else if (event.active.data.current?.type === 'sortable-shot') {
      // For sortable, dnd-kit handles overlay if not using custom. 
      // We can set activeDraggedShot if we want a consistent overlay.
      setActiveDraggedShot(event.active.data.current.shot as Shot);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDraggedShot(null);
    const { active, over } = event;

    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;
    const activeShot = active.data.current?.shot as Shot;
    const activeSourceSceneId = active.data.current?.sourceSceneId as string;
    const activeSourceScriptId = active.data.current?.sourceScriptId as string;

    console.log(`[DEBUG_DRAG] Drag ended:`, {
      activeType,
      overType,
      shotId: activeShot?.id,
      shotDesc: activeShot?.descricao,
      sourceSceneId: activeSourceSceneId,
      sourceScriptId: activeSourceScriptId
    });

    // Scenario 1: Moving a shot to another scene card
    if ((activeType === 'scene-movable-shot' || activeType === 'sortable-shot') && overType === 'scene') {
      const targetSceneId = over.data.current?.targetSceneId as string;
      const targetScriptId = over.data.current?.targetScriptId as string;

      console.log(`[DEBUG_DRAG] Moving shot to another scene:`, {
        targetSceneId,
        targetScriptId,
        sameScene: activeSourceSceneId === targetSceneId,
        sameScript: activeSourceScriptId === targetScriptId
      });

      if (activeSourceSceneId === targetSceneId && activeSourceScriptId === targetScriptId) {
        console.log(`[DEBUG_DRAG] Shot dropped on the same scene, no action needed`);
        return; // Dropped on the same scene, do nothing for this drag type
      }
      
      // Direct update approach that doesn't rely on moveShotToAnotherScene
      try {
        console.log("MANUALLY MOVING SHOT:", activeShot);
        setIsMoving(true); // Set loading state
        
        // 1. Get direct references to store's update functions
        const updateScene = useAppStore.getState().updateScene;
        
        // 2. Get source scene
        const sourceScene = scenesWithScriptInfo.find(info => 
          info.scene.id === activeSourceSceneId && info.scriptId === activeSourceScriptId
        )?.scene;
        
        if (!sourceScene) {
          console.error("Source scene not found!");
          toast.error("Cena de origem não encontrada");
          setIsMoving(false);
          return;
        }
        
        // 3. Get target scene
        const targetScene = scenesWithScriptInfo.find(info => 
          info.scene.id === targetSceneId && info.scriptId === targetScriptId
        )?.scene;
        
        if (!targetScene) {
          console.error("Target scene not found!");
          toast.error("Cena de destino não encontrada");
          setIsMoving(false);
          return;
        }
        
        // 4. Create a modified copy of the shot
        const shotToMove = {
          ...activeShot,
          id: `shot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        };
        
        // 5. Remove shot from source scene
        const updatedSourceShotlist = (sourceScene.shotlist || []).filter(s => s.id !== activeShot.id);
        
        // 6. Add shot to target scene
        const updatedTargetShotlist = [...(targetScene.shotlist || []), shotToMove];
        
        // 7. Update scenes
        console.log("UPDATING SOURCE SCENE", { 
          sceneId: sourceScene.id,
          scriptId: activeSourceScriptId,
          shotlist: updatedSourceShotlist.map(s => s.id)
        });
        
        console.log("UPDATING TARGET SCENE", { 
          sceneId: targetScene.id,
          scriptId: targetScriptId,
          shotlist: updatedTargetShotlist.map(s => s.id)
        });
        
        // Update source scene first
        updateScene(sourceScene.id, { shotlist: updatedSourceShotlist });
        
        // Then update target scene
        updateScene(targetScene.id, { shotlist: updatedTargetShotlist });
        
        toast.success(`Shot "${activeShot.descricao}" movido para a cena destino.`);
        
        // Increment the counter to force a full re-render
        setUpdateCounter(Date.now());
        
        // Small delay to ensure state updates are processed
        setTimeout(() => {
          setIsMoving(false);
        }, 500);
        
        return; // Skip the regular implementation
      } catch (err) {
        console.error("Error in manual move:", err);
        setIsMoving(false);
      }
    }

    // Scenario 2: Reordering shots within the same ShotlistPanel
    if (activeType === 'sortable-shot' && over.data.current?.type === 'sortable-shot') {
      const overShotId = over.id.toString().replace('shot-',''); // Assuming over.id is `shot-${id}`
      const activeShotId = active.id.toString().replace('shot-','');

      console.log(`[DEBUG_DRAG] Reordering shots within scene:`, {
        activeShotId,
        overShotId,
        sceneId: activeSourceSceneId
      });

      if (activeShotId !== overShotId) {
        const sceneOfShots = scenesWithScriptInfo.find(sInfo => sInfo.scene.id === activeSourceSceneId)?.scene;
        if (sceneOfShots && sceneOfShots.shotlist) {
          const oldIndex = sceneOfShots.shotlist.findIndex(s => s.id === activeShotId);
          const newIndex = sceneOfShots.shotlist.findIndex(s => s.id === overShotId);
          
          if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedShotIds = arrayMove(sceneOfShots.shotlist, oldIndex, newIndex).map(s => s.id);
            if (reorderShotsInScene) {
              reorderShotsInScene(activeSourceSceneId, activeSourceScriptId, reorderedShotIds);
              toast.success("Ordem dos shots atualizada.");
              forceUpdateParentView(); // Or rely on store update to trigger re-render
            } else {
              toast.error("Função para reordenar shots não implementada no store.");
              console.error("reorderShotsInScene function is not available in the store.");
            }
          }
        }
      }
      return; // Handled
    }
  };

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
  
  if (scenesWithScriptInfo.length === 0 && scripts.length > 0) {
     return (
      <div className="space-y-6">
        <div className="mb-4"><ScriptSelector /></div>
        <div className="flex items-center justify-center h-64 text-center">
          <div>
            <h3 className="text-lg font-medium mb-2">Nenhuma cena nos roteiros selecionados</h3>
            <p className="text-muted-foreground">Selecione roteiros com cenas ou adicione cenas no editor.</p>
          </div>
        </div>
      </div>
     );
  }

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} // Or rectIntersection
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {isMoving && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <p className="text-center">Movendo shot...</p>
          </div>
        </div>
      )}
      <div className="space-y-6">
        <div className="mb-4"><ScriptSelector /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
          <div className="border rounded-lg p-4 overflow-auto max-h-[calc(100vh-200px)]">
            <h2 className="text-lg font-medium mb-4">Cenas</h2>
            {Object.keys(scenesByScript).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhuma cena para exibir.</p>
            ) : (
              Object.entries(scenesByScript).map(([scriptId, { scriptName, scenes }]) => (
                <div key={`${scriptId}-${updateCounter}`} className="mb-6">
                  <div className="font-semibold text-primary mb-2">{scriptName} ({scenes.length})</div>
                  <div className="space-y-4">
                    {scenes.map((scene) => ( 
                      <SceneCardItem 
                        key={`${scene.id}-${scene.shotlist?.length || 0}-${updateCounter}`}
                        scene={scene} 
                        scriptId={scriptId}
                        isSelected={selectedSceneId === scene.id} 
                        onSelectScene={setSelectedSceneId} 
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border rounded-lg p-4 overflow-auto max-h-[calc(100vh-200px)]">
            {!selectedSceneInfo ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                {scenesWithScriptInfo.length > 0 ? "Selecione uma cena para gerenciar o shotlist" : "Nenhuma cena disponível."}
              </div>
            ) : (
              <ShotlistPanel 
                  scene={selectedSceneInfo.scene} 
                  scriptId={selectedSceneInfo.scriptId}
                  allLocacoes={allLocacoesForSelectedScene}
                  allPersonagens={allPersonagensForSelectedScene}
                  forceUpdateParentView={forceUpdateParentView} 
              />
            )}
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeDraggedShot ? (
          <Card className="mb-3 shadow-xl opacity-90" style={{ borderLeftColor: 'hsl(var(--primary))', borderLeftWidth: '4px' }}>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-base font-medium truncate">{activeDraggedShot.descricao}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 text-sm">
              <p className="text-muted-foreground">{activeDraggedShot.tipo} - {activeDraggedShot.duracao}s</p>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

interface ShotlistPanelProps {
  scene: Scene; 
  scriptId: string;
  allLocacoes: Locacao[];
  allPersonagens: Personagem[];
  forceUpdateParentView: () => void;
}

const ShotlistPanel: React.FC<ShotlistPanelProps> = ({ scene, scriptId, allLocacoes, allPersonagens, forceUpdateParentView }) => {
  const addShotToStore = useAppStore(state => state.addShot);
  const [displayShots, setDisplayShots] = useState<Shot[]>(scene.shotlist || []);
  const [showNewShotPlaceholder, setShowNewShotPlaceholder] = useState(false);
  const [editingShotId, setEditingShotId] = useState<string | null>(null); // Centralized editing ID

  const NEW_SHOT_PLACEHOLDER_ID = `new_shot_for_scene_${scene.id}`; // Make it unique per scene panel instance

  useEffect(() => {
    console.log(`[DEBUG_PANEL] ShotlistPanel useEffect triggered for scene ${scene.id}:`, {
      sceneId: scene.id,
      sceneDesc: scene.descricao,
      shotlistLength: scene.shotlist?.length || 0,
      shots: scene.shotlist?.map(s => ({ id: s.id, descricao: s.descricao })) || []
    });
    
    setDisplayShots(scene.shotlist || []);
    // If the scene changes, cancel any ongoing edit in this panel
    setEditingShotId(null);
    setShowNewShotPlaceholder(false);
  }, [scene.shotlist, scene.id]);

  const handleToggleEditState = (shotId: string, editState: boolean) => {
    if (editState) {
      setEditingShotId(shotId);
      // If we start editing an existing shot, hide the new shot placeholder if it was open
      if (shotId !== NEW_SHOT_PLACEHOLDER_ID) {
        setShowNewShotPlaceholder(false);
      }
    } else {
      if (editingShotId === shotId) {
        setEditingShotId(null);
      }
    }
  };

  const handleShowNewShotPlaceholder = () => {
    setEditingShotId(NEW_SHOT_PLACEHOLDER_ID); // Set this as the one being "edited"
    setShowNewShotPlaceholder(true);
  };

  const handleSaveNewShot = (shotData: Partial<Shot>) => {
    addShotToStore(scene.id, { 
      ...shotData, 
      id: `shot_${Date.now()}`, // Keep generating unique ID
      descricao: shotData.descricao || "Novo Shot", 
      tipo: shotData.tipo || "MÉDIO",
      personagens: shotData.personagens || [],
      duracao: shotData.duracao || 0,
    }, scriptId);
    setShowNewShotPlaceholder(false);
    setEditingShotId(null); // Stop "editing" the new shot placeholder
    forceUpdateParentView();
    toast.success('Novo shot adicionado!');
  };

  const handleCancelNewShot = () => {
    setShowNewShotPlaceholder(false);
    setEditingShotId(null); // Stop "editing" the new shot placeholder
  };
  
  const localForceUpdate = () => {
    forceUpdateParentView(); 
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Shotlist: {scene.descricao}</h2>
        <Button variant="outline" size="icon" onClick={handleShowNewShotPlaceholder} title="Adicionar Novo Shot">
          <Plus />
        </Button>
      </div>

      {showNewShotPlaceholder && (
        <ShotCard
          shot={{ id: NEW_SHOT_PLACEHOLDER_ID, descricao: '', tipo: 'MÉDIO', duracao: 0, personagens:[] } as Shot}
          sceneId={scene.id}
          scriptId={scriptId}
          allLocacoes={allLocacoes}
          allPersonagens={allPersonagens}
          isEditing={editingShotId === NEW_SHOT_PLACEHOLDER_ID}
          onToggleEditState={handleToggleEditState}
          isNewShotPlaceholder={true}
          onSaveNewShot={handleSaveNewShot}
          onCancelNewShot={handleCancelNewShot}
          forceUpdateList={localForceUpdate}
        />
      )}
      
      <SortableContext 
        items={displayShots.map(s => `shot-${s.id}`)} // dnd-kit needs string IDs, ensure prefix matches useSortable
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {displayShots.length === 0 && !showNewShotPlaceholder ? (
            <p className="text-muted-foreground text-center py-4">Nenhum shot definido. Clique em "+" para adicionar.</p>
          ) : (
            displayShots.map(shot => (
              <ShotCard 
                  key={shot.id} 
                  shot={shot} 
                  sceneId={scene.id}
                  scriptId={scriptId}
                  allLocacoes={allLocacoes}
                  allPersonagens={allPersonagens}
                  isEditing={editingShotId === shot.id}
                  onToggleEditState={handleToggleEditState}
                  isNewShotPlaceholder={false}
                  forceUpdateList={localForceUpdate}
              />
            ))
          )}
        </div>
      </SortableContext>
    </>
  );
};

export default ShotlistView;
