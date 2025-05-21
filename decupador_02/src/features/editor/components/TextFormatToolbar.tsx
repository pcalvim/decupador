
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TextFormatToolbarProps {
  editor: any;
  onFormatText: (formatType: 'bold' | 'italic' | 'alignment' | 'fontSize', value: any) => void;
}

const TextFormatToolbar: React.FC<TextFormatToolbarProps> = ({ editor, onFormatText }) => {
  const isSelectionActive = () => {
    if (!editor || !editor.selection) return false;
    return true;
  };

  const handleBold = () => {
    if (!isSelectionActive()) return;
    onFormatText('bold', true);
  };

  const handleItalic = () => {
    if (!isSelectionActive()) return;
    onFormatText('italic', true);
  };

  const handleAlignment = (alignment: 'left' | 'center' | 'right') => {
    if (!isSelectionActive()) return;
    onFormatText('alignment', alignment);
  };

  const handleFontSize = (size: string) => {
    if (!isSelectionActive()) return;
    onFormatText('fontSize', parseInt(size, 10));
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-muted border rounded-md mb-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleBold}
            className="h-8 w-8 p-0"
          >
            <Bold className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Negrito</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleItalic}
            className="h-8 w-8 p-0"
          >
            <Italic className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Itálico</TooltipContent>
      </Tooltip>
      
      <Separator orientation="vertical" className="mx-1 h-6" />
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleAlignment('left')}
            className="h-8 w-8 p-0"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Alinhar à esquerda</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleAlignment('center')}
            className="h-8 w-8 p-0"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Centralizar</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleAlignment('right')}
            className="h-8 w-8 p-0"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Alinhar à direita</TooltipContent>
      </Tooltip>
      
      <Separator orientation="vertical" className="mx-1 h-6" />
      
      <Select onValueChange={handleFontSize} defaultValue="12">
        <SelectTrigger className="w-16 h-8">
          <SelectValue placeholder="Tamanho" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="10">10</SelectItem>
          <SelectItem value="12">12</SelectItem>
          <SelectItem value="14">14</SelectItem>
          <SelectItem value="16">16</SelectItem>
          <SelectItem value="18">18</SelectItem>
          <SelectItem value="20">20</SelectItem>
          <SelectItem value="24">24</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default TextFormatToolbar;
