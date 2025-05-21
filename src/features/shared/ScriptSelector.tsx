
import React from 'react';
import useAppStore from '../../store/useAppStore';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, File, Filter } from 'lucide-react';

const ScriptSelector: React.FC = () => {
  const scripts = useAppStore(state => state.scripts);
  const selectedScriptsFilter = useAppStore(state => state.selectedScriptsFilter);
  const toggleScriptInFilter = useAppStore(state => state.toggleScriptInFilter);
  const setSelectedScriptsFilter = useAppStore(state => state.setSelectedScriptsFilter);
  
  const selectedCount = selectedScriptsFilter.length;
  
  const handleSelectAll = () => {
    setSelectedScriptsFilter(scripts.map(s => s.id));
  };
  
  const handleSelectNone = () => {
    setSelectedScriptsFilter([]);
  };
  
  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Roteiros</span>
            {selectedCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Filtrar Roteiros</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Select All / None buttons */}
          <div className="flex justify-between px-2 py-1.5">
            <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-8 text-xs">
              Selecionar Todos
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSelectNone} className="h-8 text-xs">
              Limpar
            </Button>
          </div>
          
          <DropdownMenuSeparator />
          
          {/* List of scripts */}
          {scripts.map(script => {
            const isSelected = selectedScriptsFilter.includes(script.id);
            
            return (
              <DropdownMenuCheckboxItem
                key={script.id}
                checked={isSelected}
                onCheckedChange={() => toggleScriptInFilter(script.id)}
              >
                <div className="flex items-center gap-2">
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <File className="h-4 w-4" />
                  )}
                  <span>{script.name}</span>
                </div>
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ScriptSelector;
