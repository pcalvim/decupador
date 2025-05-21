import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useAppStore from '../store/useAppStore';
import { TabType } from '../types';
import { FileUpload } from '../features/import/FileUpload';
import ScriptEditor from '../features/editor/ScriptEditor';
import ShotlistView from '../features/shotlist/ShotlistView';
import LocacoesView from '../features/locacoes/LocacoesView';
import CastingView from '../features/casting/CastingView';
import CronogramaView from '../features/cronograma/CronogramaView';
import DailyOrderPage from '../features/dailyOrder/DailyOrderPage';
import StoryboardPage from '../features/storyboard/StoryboardPage';
import ExportData from '../features/shared/ExportData';
import ScriptSelector from '../features/shared/ScriptSelector';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Import } from 'lucide-react';

const Index = () => {
  const { currentTab, setCurrentTab } = useAppStore();
  const scripts = useAppStore(state => state.scripts);
  const currentScriptId = useAppStore(state => state.currentScriptId);
  const addScript = useAppStore(state => state.addScript);
  const setCurrentScript = useAppStore(state => state.setCurrentScript);
  const undo = useAppStore(state => state.undo);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  // Log para depuração do Index
  useEffect(() => {
    console.log('[Index] Renderizando com:', { 
      scripts: scripts.length, 
      currentScriptId, 
      currentTab 
    });
    
    if (scripts.length > 0) {
      console.log('[Index] Scripts disponíveis:', scripts.map(s => ({ id: s.id, name: s.name })));
    }
  }, [scripts.length, currentScriptId, currentTab]);
  
  // Get current script
  const currentScript = scripts.find(s => s.id === currentScriptId);
  const texto = currentScript?.documentState.texto || '';
  const titulo = currentScript?.documentState.titulo || '';
  
  // Log quando encontrar o script atual
  useEffect(() => {
    if (currentScript) {
      console.log('[Index] Script atual encontrado:', { 
        id: currentScript.id, 
        name: currentScript.name,
        hasText: Boolean(currentScript.documentState.texto)
      });
    } else if (currentScriptId) {
      console.error('[Index] ERRO: Script atual não encontrado com ID:', currentScriptId);
    }
  }, [currentScript, currentScriptId]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Command+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);
  
  // Create a default script if there are no scripts
  useEffect(() => {
    if (scripts.length === 0) {
      console.log('[Index] Nenhum roteiro encontrado, criando roteiro padrão');
      const newId = addScript('Novo Roteiro');
      setCurrentScript(newId);
    }
  }, [scripts.length, addScript, setCurrentScript]);

  // Fix for ensuring the tab state is valid
  useEffect(() => {
    // If currentTab is invalid, reset to Editor
    if (!Object.values(TabType).includes(currentTab)) {
      console.log('[Index] Tab inválida, resetando para Editor');
      setCurrentTab(TabType.Editor);
    }
  }, [currentTab, setCurrentTab]);

  const handleImportComplete = () => {
    setIsImportDialogOpen(false);
    setCurrentTab(TabType.Editor);
  };

  const shouldShowTabs = scripts.length > 0 && (texto || currentTab !== TabType.Editor);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto py-4 px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">
              {scripts.length > 0 ? (
                titulo ? 
                  `Roteiro: ${titulo}` : 
                  `${currentScript?.name || 'Roteiro sem título'}`
              ) : (
                'Organizador de Roteiros & Cronograma'
              )}
            </h1>
            <div className="flex gap-3">
              {currentTab !== TabType.Editor && <ScriptSelector />}
              <ExportData />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4">
        {!shouldShowTabs ? (
          <div className="max-w-lg mx-auto py-12">
            <h2 className="text-2xl font-semibold mb-6 text-center">Começar</h2>
            
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full mb-6">
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
                    <Button variant="outline" onClick={handleImportComplete}>Fechar</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <FileUpload />
          </div>
        ) : (
          <Tabs 
            value={currentTab} 
            onValueChange={(value) => {
              console.log(`[Index] Alterando tab para: ${value}`);
              setCurrentTab(value as TabType);
            }}
            className="space-y-4"
          >
            <TabsList className="grid grid-cols-7 w-full">
              <TabsTrigger value={TabType.Editor}>Editor</TabsTrigger>
              <TabsTrigger value={TabType.Locacoes}>Locações</TabsTrigger>
              <TabsTrigger value={TabType.Casting}>Casting</TabsTrigger>
              <TabsTrigger value={TabType.Shotlist}>Shotlist</TabsTrigger>
              <TabsTrigger value={TabType.Cronograma}>Cronograma</TabsTrigger>
              <TabsTrigger value={TabType.OD}>OD</TabsTrigger>
              <TabsTrigger value={TabType.Storyboard}>Storyboard</TabsTrigger>
            </TabsList>
            
            <TabsContent value={TabType.Editor} className="space-y-4 min-h-[70vh]">
              <ScriptEditor />
            </TabsContent>
            
            <TabsContent value={TabType.Locacoes} className="space-y-4">
              <LocacoesView />
            </TabsContent>
            
            <TabsContent value={TabType.Casting} className="space-y-4">
              <CastingView />
            </TabsContent>
            
            <TabsContent value={TabType.Shotlist} className="space-y-4">
              <ShotlistView />
            </TabsContent>
            
            <TabsContent value={TabType.Cronograma} className="space-y-4">
              <CronogramaView />
            </TabsContent>

            <TabsContent value={TabType.OD} className="space-y-4">
              <DailyOrderPage />
            </TabsContent>

            <TabsContent value={TabType.Storyboard} className="space-y-4">
              <StoryboardPage />
            </TabsContent>
          </Tabs>
        )}
      </main>
      
      <footer className="border-t mt-8">
        <div className="container mx-auto py-4 px-4 text-sm text-center text-muted-foreground">
          <p>Organizador de Roteiros & Cronograma - Desenvolvido com ♥</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
