import React, { useCallback, useState } from 'react';
import useAppStore from '../../store/useAppStore';
import { parseDocx } from '../../utils/parseDocx';
import { Upload, File, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { TabType } from '../../types';

export const FileUpload: React.FC = () => {
  console.log('[FileUpload] Componente renderizado');
  const [isDragging, setIsDragging] = useState(false);
  const addScript = useAppStore((state) => state.addScript);
  const setCurrentScript = useAppStore((state) => state.setCurrentScript);
  const setCurrentTab = useAppStore((state) => state.setCurrentTab);
  const [loading, setLoading] = useState(false);
  
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setLoading(true);
    console.log(`[FileUpload] Processando ${files.length} arquivo(s)`);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          console.warn(`[FileUpload] Arquivo não suportado: ${file.name} (${file.type})`);
          toast.error(`Arquivo não suportado: ${file.name}. Apenas arquivos DOCX são permitidos.`);
          continue;
        }

        console.log(`[FileUpload] Processando arquivo: ${file.name}`);
        // Extrair o texto do documento
        const text = await parseDocx(file);
        
        // Adicionar novo roteiro com o nome do arquivo (sem extensão)
        const fileName = file.name.replace(/\.docx$/, '');
        const scriptId = addScript(fileName);
        console.log(`[FileUpload] Novo roteiro adicionado: ${fileName} (${scriptId})`);
        
        // Alternar para o novo roteiro
        setCurrentScript(scriptId);
        
        // Processar documento com o ID do script correto
        // Passing true for createNoScenes to disable all automatic scene creation
        try {
          useAppStore.getState().processDocument(scriptId, text, fileName, false, true);
          toast.success(`Roteiro "${fileName}" importado com sucesso! Cenas deverão ser criadas manualmente.`);
        } catch (error) {
          console.error(`[FileUpload] Erro ao processar documento: ${error}`);
          toast.error(`Erro ao processar "${fileName}". Verifique o console para mais detalhes.`);
        }
      }
      
      // Garantir que o usuário seja direcionado para a tela de editor após a conclusão
      setCurrentTab(TabType.Editor);
    } catch (error) {
      console.error('[FileUpload] Erro ao processar arquivos:', error);
      toast.error('Erro ao processar arquivos. Verifique o console para mais detalhes.');
    } finally {
      setLoading(false);
    }
  }, [addScript, setCurrentScript, setCurrentTab]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log('[FileUpload] Arquivos selecionados:', files ? files.length : 0);
    handleFiles(files);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    handleFiles(files);
  };
  
  return (
    <div 
      className={`border-2 border-dashed rounded-md p-6 text-center transition-colors
        ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'}
        ${loading ? 'opacity-70 pointer-events-none' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer text-primary hover:text-primary/80">
        {loading ? (
          <div className="flex flex-col items-center">
            <Upload className="h-10 w-10 animate-bounce mb-2" />
            <span className="font-medium">Importando...</span>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center">
              <File className="h-7 w-7 mr-2" />
              <ArrowDown className="h-5 w-5" />
            </div>
            <span className="font-medium">Clique para importar</span>
            <span className="text-gray-500 mt-1">ou arraste e solte arquivos DOCX aqui</span>
            <span className="text-xs text-gray-400 mt-1">(Múltiplos arquivos permitidos)</span>
            <input 
              id="file-upload" 
              name="file-upload" 
              type="file" 
              accept=".docx" 
              multiple
              className="sr-only" 
              onChange={handleFileChange}
            />
          </>
        )}
      </label>
    </div>
  );
};

export default FileUpload;
