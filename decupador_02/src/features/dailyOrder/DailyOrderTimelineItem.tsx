import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

// TODO: Definir tipos para TimelineItem (pode ser um Shot ou uma Atividade Adicional)
export interface TimelineItemData {
  id: string;
  type: 'shot' | 'activity';
  originalId: string; // ID do Shot original ou da Activity
  title: string; // Ex: "Shot 5.1" ou "Almoço"
  startTime?: string; // Ex: "09:00"
  duration?: number; // Em minutos, ex: 30
  endTime?: string; // Ex: "09:30", calculado ou definido
  order: number; // Para ordenação na timeline
  // Campos específicos dependendo do tipo
  sceneNumber?: string;
  shotNumber?: string;
  description?: string;
  // Adicionar campos que podem vir do shot original
  tipo?: string; // Ex: CLOSE, MÉDIO
  personagens?: string[]; // Ou uma string formatada
  locacao?: string; // Nome da locação
}

interface DailyOrderTimelineItemProps {
  item: TimelineItemData;
  onUpdateItem: (item: TimelineItemData) => void;
  onRemoveItem: (itemId: string) => void;
  isDragging?: boolean;
}

const DailyOrderTimelineItem: React.FC<DailyOrderTimelineItemProps> = ({ item, onUpdateItem, onRemoveItem, isDragging }) => {
  const handleInputChange = (field: keyof TimelineItemData, value: any) => {
    let processedValue = value;
    if (field === 'duration') {
      processedValue = parseInt(value) || 0;
    }
    onUpdateItem({ ...item, [field]: processedValue });
  };

  // Função para formatar duração de minutos para HH:MM
  const formatDuration = (minutes?: number): string => {
    if (minutes === undefined || minutes === null) return '00:00';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const bgColor = item.type === 'shot' ? (item.sceneNumber && parseInt(item.sceneNumber.replace(/[^0-9]/g, '')) % 2 === 0 ? 'bg-blue-100' : 'bg-green-100') : 'bg-yellow-100';
  const borderColor = item.type === 'shot' ? (item.sceneNumber && parseInt(item.sceneNumber.replace(/[^0-9]/g, '')) % 2 === 0 ? 'border-blue-300' : 'border-green-300') : 'border-yellow-300';


  return (
    <div 
      className={`flex items-center gap-2 p-2 border ${borderColor} rounded mb-2 ${isDragging ? 'opacity-50' : ''} ${bgColor}`}
      style={{ minHeight: '60px' }} // Altura mínima para melhor visualização
    >
      {/* Coluna de Horário */}
      <div className="flex flex-col w-28">
        <Input 
          type="time" 
          value={item.startTime || ''} 
          onChange={(e) => handleInputChange('startTime', e.target.value)} 
          className="p-1 text-xs h-auto bg-white/80" 
        />
        <span className="text-xs text-gray-600 text-center">{item.endTime || 'Fim?'}</span>
      </div>

      {/* Coluna de Cena */}
      <div className="w-20 text-center">
        <Input 
            value={item.sceneNumber || (item.type === 'activity' ? '-' : 'Cena?')}
            onChange={(e) => handleInputChange('sceneNumber', e.target.value)}
            className="p-1 text-sm font-semibold h-auto text-center bg-white/80 disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={item.type === 'activity'}
        />
      </div>

      {/* Coluna de Shot/Atividade */}
      <div className="w-20 text-center">
         <Input 
            value={item.shotNumber || (item.type === 'activity' ? 'Ativ.' : 'Shot?')}
            onChange={(e) => handleInputChange('shotNumber', e.target.value)}
            className="p-1 text-sm h-auto text-center bg-white/80 disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={item.type === 'activity'}
        />
      </div>

      {/* Coluna de Duração Estimada */}
      <div className="w-24 text-center">
        <Input 
          type="text" // Usar text para permitir formatação como "30m" ou "1h15m"
          value={formatDuration(item.duration)} 
          onChange={(e) => {
            const parts = e.target.value.split(':');
            const hours = parseInt(parts[0]) || 0;
            const minutes = parseInt(parts[1]) || 0;
            handleInputChange('duration', hours * 60 + minutes);
          }} 
          className="p-1 text-sm h-auto text-center bg-white/80"
        />
      </div>

      {/* Coluna de Descrição / Setting & Description */}
      <div className="flex-grow">
        <Input 
          value={item.description || item.title} 
          onChange={(e) => handleInputChange('description', e.target.value)} 
          placeholder="Descrição..."
          className="p-1 text-sm h-auto bg-white/80"
        />
        {item.type === 'shot' && item.locacao && <span className='text-xs text-gray-700 block'>{item.locacao}</span>}
      </div>
      
      {/* Personagens (exemplo simples) */}
      {item.type === 'shot' && (
        <div className="w-32 text-xs text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap">
          {item.personagens && item.personagens.join(', ')}
        </div>
      )}

      {/* Botão de Remover */}
      <Button variant="ghost" size="sm" onClick={() => onRemoveItem(item.id)} className="ml-auto">
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
};

export default DailyOrderTimelineItem; 