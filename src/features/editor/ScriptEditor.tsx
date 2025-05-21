
import React, { useState, useEffect } from 'react';
import useAppStore from '../../store/useAppStore';
import ScriptEditorCore from './components/ScriptEditorCore';
import ScenesList from './components/ScenesList';
import { FileUpload } from '../import/FileUpload';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { File, Edit, Trash, Import } from 'lucide-react';

const ScriptEditor: React.FC = () => {
  // Get scripts from store
  const scripts = useAppStore(state => state.scripts);
  const currentScriptId = useAppStore(state => state.currentScriptId);
  const setCurrentScript = useAppStore(state => state.setCurrentScript);
  const addScript = useAppStore(state => state.addScript);
  const updateScriptName = useAppStore(state => state.updateScriptName);
  const removeScript = useAppStore(state => state.removeScript);
  const setDocumentText = useAppStore(state => state.setDocumentText);
  
  // Logs para depuração
  useEffect(() => {
    console.log('[ScriptEditor] Renderizando com scripts:', scripts.map(s => ({ id: s.id, name: s.name })));
    console.log('[ScriptEditor] Script atual ID:', currentScriptId);
  }, [scripts, currentScriptId]);
  
  // Find current script
  const currentScript = scripts.find(script => script.id === currentScriptId);
  
  useEffect(() => {
    console.log('[ScriptEditor] Current script encontrado:', currentScript ? { id: currentScript.id, name: currentScript.name } : 'não encontrado');
  }, [currentScript]);
  
  // Ensure texto is never undefined by providing a default empty string
  const texto = currentScript?.documentState.texto || '';
  const cenas = currentScript?.documentState.cenas || [];
  
  // Dialog state for script management
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isNewScriptDialogOpen, setIsNewScriptDialogOpen] = useState(false);
  const [isEditScriptDialogOpen, setIsEditScriptDialogOpen] = useState(false);
  const [newScriptName, setNewScriptName] = useState('');
  const [editScriptName, setEditScriptName] = useState('');
  
  // Sort scenes by their position in the document
  const sortedScenes = [...cenas].sort((a, b) => a.startOffset - b.startOffset);
  
  const handleAddScript = () => {
    if (newScriptName) {
      addScript(newScriptName);
      setNewScriptName('');
      setIsNewScriptDialogOpen(false);
    }
  };
  
  const handleEditScript = () => {
    if (editScriptName && currentScriptId) {
      updateScriptName(currentScriptId, editScriptName);
      setEditScriptName('');
      setIsEditScriptDialogOpen(false);
    }
  };
  
  const handleDeleteScript = () => {
    if (currentScriptId && scripts.length > 1) {
      if (window.confirm('Tem certeza que deseja excluir este roteiro? Esta ação não pode ser desfeita.')) {
        removeScript(currentScriptId);
      }
    }
  };
  
  // If there are no scripts, create a default one
  React.useEffect(() => {
    if (scripts.length === 0) {
      const newId = addScript('Novo Roteiro');
      setCurrentScript(newId);
    }
  }, [scripts.length, addScript, setCurrentScript]);

  // Log when the script is changed via selector
  const handleScriptChange = (value: string) => {
    console.log(`[ScriptEditor] Alterando script para: ${value}`);
    console.log(`[ScriptEditor] Scripts disponíveis:`, scripts.map(s => ({ id: s.id, name: s.name })));
    setCurrentScript(value);
  };
  
  return (
    <div className="space-y-4">
      {/* Script selection header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select
            value={currentScriptId || ''}
            onValueChange={handleScriptChange}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Selecione um roteiro" />
            </SelectTrigger>
            <SelectContent>
              {scripts.map(script => (
                <SelectItem key={script.id} value={script.id}>
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4" />
                    <span>{script.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Edit current script button */}
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => {
              if (currentScript) {
                setEditScriptName(currentScript.name);
                setIsEditScriptDialogOpen(true);
              }
            }}
            disabled={!currentScript}
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          {/* Delete script button */}
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleDeleteScript}
            disabled={!currentScript || scripts.length <= 1}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Importar roteiro button */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Import className="mr-2 h-4 w-4" />
              Importar Roteiro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importar Roteiro</DialogTitle>
              <DialogDescription>
                Importe um roteiro em formato DOCX para começar.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <FileUpload />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Fechar</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Create new script dialog */}
        <Dialog open={isNewScriptDialogOpen} onOpenChange={setIsNewScriptDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="ml-3">
              Novo Roteiro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Roteiro</DialogTitle>
              <DialogDescription>
                Crie um novo roteiro em branco.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="scriptName">Nome do Roteiro</Label>
              <Input 
                id="scriptName"
                value={newScriptName} 
                onChange={(e) => setNewScriptName(e.target.value)}
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleAddScript}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Edit script dialog */}
        <Dialog open={isEditScriptDialogOpen} onOpenChange={setIsEditScriptDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Roteiro</DialogTitle>
              <DialogDescription>
                Altere o nome do roteiro selecionado.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="editScriptName">Nome do Roteiro</Label>
              <Input 
                id="editScriptName"
                value={editScriptName} 
                onChange={(e) => setEditScriptName(e.target.value)}
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleEditScript}>Atualizar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Main editor area */}
      <div className="h-full flex flex-col md:flex-row">
        <div className="flex-1 flex flex-col mb-4 md:mb-0 md:mr-4 relative z-0">
          {currentScript ? (
            <ScriptEditorCore 
              key={currentScriptId} // Add key to force re-render when script changes
              texto={texto}
              setDocumentText={(text) => {
                if (currentScriptId) {
                  setDocumentText(currentScriptId, text);
                }
              }}
            />
          ) : (
            <div className="border rounded-md p-6 text-center">
              <p>Nenhum roteiro selecionado. Crie um novo para começar.</p>
            </div>
          )}
        </div>
        
        {/* Right sidebar for scenes */}
        <div className="w-full md:w-1/3 flex-shrink-0">
          <ScenesList />
        </div>
      </div>
    </div>
  );
};

export default ScriptEditor;
