import React, { useState } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

const CastingView: React.FC = () => {
  const { personagens, cenas } = useAppStore(state => state.getCurrentDocumentState());
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Elenco & Personagens</h2>
        <AddCharacterDialog />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {personagens.length === 0 ? (
          <Card className="col-span-full border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-6 min-h-[200px]">
              <p className="text-muted-foreground mb-4">
                Nenhum personagem cadastrado ainda
              </p>
              <AddCharacterDialog />
            </CardContent>
          </Card>
        ) : (
          personagens.map(personagem => (
            <CharacterCard 
              key={personagem.id} 
              personagem={personagem} 
              cenas={cenas.filter(cena => personagem.cenas.includes(cena.id))}
              isSelected={selectedCharacterId === personagem.id}
              onSelectCharacter={() => setSelectedCharacterId(
                selectedCharacterId === personagem.id ? null : personagem.id
              )}
            />
          ))
        )}
      </div>
      
      {/* Character scenes view */}
      {selectedCharacterId && (
        <CharacterScenesView 
          characterId={selectedCharacterId} 
          onClose={() => setSelectedCharacterId(null)} 
        />
      )}
    </div>
  );
};

// Component for adding new characters
const AddCharacterDialog: React.FC = () => {
  const addPersonagem = useAppStore(state => state.addPersonagem);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    ator: '',
    contato: '',
    notas: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPersonagem({
      nome: formData.nome,
      ator: formData.ator,
      contato: formData.contato,
      notas: formData.notas,
      cenas: []
    });
    setFormData({
      nome: '',
      ator: '',
      contato: '',
      notas: '',
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Adicionar Personagem</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Personagem</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Personagem</Label>
            <Input 
              id="nome" 
              value={formData.nome} 
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="ator">Ator/Atriz</Label>
            <Input 
              id="ator" 
              value={formData.ator} 
              onChange={(e) => setFormData({...formData, ator: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contato">Contato</Label>
            <Input 
              id="contato" 
              value={formData.contato} 
              onChange={(e) => setFormData({...formData, contato: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea 
              id="notas" 
              value={formData.notas} 
              onChange={(e) => setFormData({...formData, notas: e.target.value})}
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

// Component for displaying a character
const CharacterCard: React.FC<{ 
  personagem: any, 
  cenas: any[], 
  isSelected: boolean,
  onSelectCharacter: () => void 
}> = ({ personagem, cenas, isSelected, onSelectCharacter }) => {
  const { updatePersonagem, removePersonagem } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...personagem });

  const handleUpdate = () => {
    updatePersonagem(personagem.id, editData);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja excluir este personagem?')) {
      removePersonagem(personagem.id);
    }
  };

  if (isEditing) {
    return (
      <Card>
        <CardHeader className="bg-muted/50">
          <CardTitle className="text-lg">Editar Personagem</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div>
            <Label htmlFor="edit-nome">Nome</Label>
            <Input 
              id="edit-nome" 
              value={editData.nome} 
              onChange={(e) => setEditData({...editData, nome: e.target.value})}
            />
          </div>
          
          <div>
            <Label htmlFor="edit-ator">Ator/Atriz</Label>
            <Input 
              id="edit-ator" 
              value={editData.ator || ''} 
              onChange={(e) => setEditData({...editData, ator: e.target.value})}
            />
          </div>
          
          <div>
            <Label htmlFor="edit-contato">Contato</Label>
            <Input 
              id="edit-contato" 
              value={editData.contato || ''} 
              onChange={(e) => setEditData({...editData, contato: e.target.value})}
            />
          </div>
          
          <div>
            <Label htmlFor="edit-notas">Notas</Label>
            <Textarea 
              id="edit-notas" 
              value={editData.notas || ''} 
              onChange={(e) => setEditData({...editData, notas: e.target.value})}
              rows={2}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
          <Button onClick={handleUpdate}>Salvar</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className={isSelected ? 'ring-2 ring-primary' : ''}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{personagem.nome}</CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              Editar
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </div>
        </div>
        {personagem.ator && (
          <p className="text-sm font-medium mt-1">Interpretado por: {personagem.ator}</p>
        )}
      </CardHeader>
      <CardContent className="p-4">
        {personagem.contato && (
          <div className="mb-2 text-sm">
            <span className="text-muted-foreground">Contato:</span> {personagem.contato}
          </div>
        )}
        
        {personagem.notas && (
          <div className="mb-3 text-sm p-2 bg-muted/50 rounded">
            {personagem.notas}
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 mt-3">
          <TooltipProvider>
            {cenas.slice(0, 5).map((cena) => (
              <Tooltip key={cena.id}>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer"
                    style={{ borderLeftColor: cena.highlightColor }}
                  >
                    {cena.descricao.substring(0, 20)}
                    {cena.descricao.length > 20 ? '...' : ''}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{cena.descricao}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            
            {cenas.length > 5 && (
              <Badge variant="outline">+{cenas.length - 5}</Badge>
            )}
            
            {cenas.length === 0 && (
              <span className="text-sm text-muted-foreground">
                Nenhuma cena atribuída
              </span>
            )}
          </TooltipProvider>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between">
        <span className="text-sm text-muted-foreground">
          {cenas.length} cenas
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onSelectCharacter}
        >
          {isSelected ? 'Fechar Detalhes' : 'Ver Cenas'}
        </Button>
      </CardFooter>
    </Card>
  );
};

// Component for viewing all scenes of a selected character
const CharacterScenesView: React.FC<{ characterId: string, onClose: () => void }> = ({ characterId, onClose }) => {
  const { cenas, personagens } = useAppStore(state => state.getCurrentDocumentState());
  const { updatePersonagem } = useAppStore();
  
  const character = personagens.find(p => p.id === characterId);
  if (!character) return null;
  
  const characterScenes = cenas.filter(cena => character.cenas.includes(cena.id));
  const otherScenes = cenas.filter(cena => !character.cenas.includes(cena.id));
  
  // Toggle whether a character is in a scene
  const toggleSceneForCharacter = (sceneId: string) => {
    const updatedScenes = character.cenas.includes(sceneId)
      ? character.cenas.filter(id => id !== sceneId)
      : [...character.cenas, sceneId];
      
    updatePersonagem(characterId, { cenas: updatedScenes });
  };
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Cenas de {character.nome}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-medium mb-3">Cenas Atribuídas</h3>
            {characterScenes.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma cena atribuída</p>
            ) : (
              <div className="space-y-2">
                {characterScenes.map(cena => (
                  <div
                    key={cena.id}
                    className="p-3 border rounded"
                    style={{
                      borderLeftColor: cena.highlightColor,
                      borderLeftWidth: '4px'
                    }}
                  >
                    <div className="flex justify-between">
                      <span>{cena.descricao}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive"
                        onClick={() => toggleSceneForCharacter(cena.id)}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3">Outras Cenas</h3>
            {otherScenes.length === 0 ? (
              <p className="text-muted-foreground">
                Todas as cenas já estão atribuídas a este personagem
              </p>
            ) : (
              <div className="space-y-2">
                {otherScenes.map(cena => (
                  <div
                    key={cena.id}
                    className="p-3 border rounded"
                    style={{
                      borderLeftColor: cena.highlightColor,
                      borderLeftWidth: '4px'
                    }}
                  >
                    <div className="flex justify-between">
                      <span>{cena.descricao}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => toggleSceneForCharacter(cena.id)}
                      >
                        Adicionar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CastingView;
