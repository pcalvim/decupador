
import React from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
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
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

const ExportData: React.FC = () => {
  const { toast } = useToast();
  const documentState = useAppStore(state => state.getCurrentDocumentState());
  const resetAllScripts = useAppStore(state => state.resetAllScripts);
  
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(documentState, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `roteiro-${documentState.titulo || 'exportado'}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    console.log('Exportando JSON do roteiro atual:', documentState.titulo);
  };
  
  const handleExportCSV = () => {
    // Create a CSV for the schedule (diarias)
    const { diarias, cenas, locacoes, personagens } = documentState;
    
    // CSV Headers
    let csv = 'Data,Início,Término,Locações,Cenas,Duração Total (min),Personagens,Notas\n';
    
    // Add rows for each diaria
    diarias.forEach(diaria => {
      const diariaCenas = cenas.filter(cena => diaria.cenas.includes(cena.id));
      
      // Get locations for these scenes
      const scenesLocations = diariaCenas
        .map(scene => scene.locacaoPrincipal)
        .filter(Boolean)
        .map(locId => locacoes.find(loc => loc.id === locId)?.nome)
        .filter(Boolean);
      
      // Remove duplicates
      const uniqueLocations = Array.from(new Set(scenesLocations));
      
      // Get characters for these scenes
      const charactersInScenes = diariaCenas.flatMap(scene => 
        personagens.filter(person => person.cenas.includes(scene.id))
      );
      
      // Remove duplicates
      const uniqueCharacters = Array.from(new Map(
        charactersInScenes.map(person => [person.id, person.nome])
      ).values());
      
      // Calculate total duration
      const totalDurationMinutes = Math.round(
        diariaCenas.reduce((sum, scene) => sum + scene.duracao, 0) / 60
      );
      
      // Format scene descriptions
      const sceneDescriptions = diariaCenas.map(scene => `"${scene.descricao}"`).join('; ');
      
      // Format row data
      const row = [
        diaria.data,
        diaria.horarioInicio,
        diaria.horarioFim,
        `"${uniqueLocations.join(', ')}"`,
        `"${sceneDescriptions}"`,
        totalDurationMinutes,
        `"${uniqueCharacters.join(', ')}"`,
        `"${diaria.notas || ''}"`
      ];
      
      // Add row to CSV
      csv += row.join(',') + '\n';
    });
    
    const dataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    
    const exportFileDefaultName = `cronograma-${documentState.titulo || 'exportado'}-${new Date().toISOString().split('T')[0]}.csv`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    console.log('Exportando CSV do roteiro atual:', documentState.titulo);
  };

  const handleReset = () => {
    console.log('Resetando todos os roteiros. Estado anterior:', {
      scripts: useAppStore.getState().scripts.map(s => ({ id: s.id, name: s.name })),
      currentScriptId: useAppStore.getState().currentScriptId
    });
    
    resetAllScripts();
    toast({
      title: "Aplicativo reiniciado",
      description: "Todos os roteiros foram removidos com sucesso.",
    });
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleExportJSON}>
        Exportar JSON
      </Button>
      <Button variant="outline" onClick={handleExportCSV}>
        Exportar CSV (Cronograma)
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">
            <RotateCcw className="mr-2 h-4 w-4" />
            Resetar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover todos os roteiros e dados associados. 
              Você perderá todas as informações salvas e não poderá recuperá-las.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Resetar tudo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExportData;
