import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { createEditor, Editor, Text, Node, Descendant, Range } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import useAppStore from '../../../store/useAppStore';
import { Button } from '@/components/ui/button';
import { generateSceneColor, calculateDuration, generateContentHash } from '../../../utils/parseDocx';
import { CustomElement, CustomText, DOMNode, DOMText, DOMElement } from '../types/SlateTypes';
import { Undo, Redo, Trash2 } from 'lucide-react';
import TextFormatToolbar from './TextFormatToolbar';
import { Scene } from '../../../types';

interface ScriptEditorCoreProps {
  texto: string;
  setDocumentText: (text: string) => void;
}

const ScriptEditorCore: React.FC<ScriptEditorCoreProps> = ({ texto, setDocumentText }) => {
  console.log('[ScriptEditorCore] Receiving texto:', texto?.substring(0, 50) + '...');
  
  // Use selectors for specific parts of the state to avoid frequent rerenders
  const cenas = useAppStore(state => state.getCurrentDocumentState().cenas);
  const locacoes = useAppStore(state => state.getCurrentDocumentState().locacoes);
  const updateScene = useAppStore(state => state.updateScene);
  const addScene = useAppStore(state => state.addScene);
  const removeAllScenes = useAppStore(state => state.removeAllScenes);
  const originalText = useAppStore(state => state.getCurrentDocumentState().originalText || texto);
  const setOriginalText = useAppStore(state => state.setOriginalText);
  const textFormatting = useAppStore(state => state.getCurrentDocumentState().textFormatting);
  const currentScriptId = useAppStore(state => state.currentScriptId);
  
  // Create editor instance that persists across renders with history support
  const editor = useRef(withHistory(withReact(createEditor())));
  const editorDomRef = useRef<HTMLDivElement | null>(null);
  
  // Define default editor content with memoization to avoid unnecessary recalculations
  const initialValue = useMemo<CustomElement[]>(() => [{
    type: 'paragraph',
    children: [{ text: texto || 'Carregue um roteiro ou comece a escrever...' }]
  }], [texto]);
  
  // Editor state setup with guaranteed initial value
  const [editorValue, setEditorValue] = useState<CustomElement[]>(initialValue);
  const [selection, setSelection] = useState<{ start: number, end: number } | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<{ top: number, left: number } | null>(null);
  
  // Store original text when first loaded
  useEffect(() => {
    if (texto && !originalText) {
      setOriginalText(texto);
    }
  }, [texto, originalText, setOriginalText]);
  
  // Initialize editor with text from store whenever texto or currentScriptId changes
  useEffect(() => {
    console.log('[ScriptEditorCore] Script or text changed, updating editor content');
    if (texto !== undefined) {
      const newValue = [{
        type: 'paragraph',
        children: [{ text: texto }]
      }] as CustomElement[];
      
      setEditorValue(newValue);
    }
  }, [texto, currentScriptId]);

  // Handle custom keyboard shortcuts
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
      event.preventDefault();
      editor.current.undo();
      return;
    }
    
    if ((event.metaKey || event.ctrlKey) && event.key === 'y') {
      event.preventDefault();
      editor.current.redo();
      return;
    }
  }, []);

  // Combine existing handleEditorChange with new handler for boundary updates
  const handleEditorChange = (newValue: CustomElement[]) => {
    // Calculate the change in text content
    const previousText = editorValue.map(node => Node.string(node)).join('\n');
    const newText = newValue.map(node => Node.string(node)).join('\n');
    
    // If there was a real text change
    if (previousText !== newText) {
      // Atualiza completamente todas as cenas com base nas posições relativas
      recalculateSceneBoundaries(newValue);
      setDocumentText(newText);
    }
    
    setEditorValue(newValue);
  };

  // Recalcula completamente as posições de todas as cenas
  const recalculateSceneBoundaries = useCallback((newValue: CustomElement[]) => {
    if (cenas.length === 0) return;

    // Cria o texto completo atual a partir dos nós do editor
    const fullText = newValue.map(node => Node.string(node)).join('\n');
    console.log(`Recalculando limites, texto completo tem ${fullText.length} caracteres`);
    
    // Mapeamento para coletar cenas que precisam ser atualizadas
    const updates: Array<{id: string, updates: Partial<Scene>}> = [];
    
    // Estratégia mais robusta para manter a integridade do texto das cenas
    cenas.forEach(scene => {
      try {
        // Validações básicas
        if (scene.endOffset <= scene.startOffset || scene.startOffset >= fullText.length) {
          console.log(`Cena ${scene.id} ignorada, posições inválidas: ${scene.startOffset}-${scene.endOffset}`);
          return;
        }
        
        // Extrair o texto da cena baseado nos offsets atuais
        const currentSceneText = fullText.substring(
          Math.min(scene.startOffset, fullText.length), 
          Math.min(scene.endOffset, fullText.length)
        );
        
        if (!currentSceneText.trim()) {
          console.log(`Cena ${scene.id} tem texto vazio`);
          return;
        }
        
        // Abordagem mais robusta: usar texto da cena inteira como padrão
        // Normalizar o texto removendo espaços extras e quebras de linha
        const normalizedSceneText = currentSceneText.replace(/\s+/g, ' ').trim();
        if (normalizedSceneText.length < 10) {
          console.log(`Texto da cena ${scene.id} muito curto para busca confiável: "${normalizedSceneText}"`);
          return;
        }
        
        // Pegar uma parte significativa do início do texto (30% ou primeiros 50 caracteres)
        const startPatternLength = Math.min(50, Math.floor(normalizedSceneText.length * 0.3));
        const startPattern = normalizedSceneText.substring(0, startPatternLength);
        
        // Pegar uma parte significativa do final do texto (30% ou últimos 50 caracteres)
        const endPatternLength = Math.min(50, Math.floor(normalizedSceneText.length * 0.3));
        const endPattern = normalizedSceneText.substring(normalizedSceneText.length - endPatternLength);
        
        console.log(`Cena ${scene.id}, padrões: início="${startPattern}" ... fim="${endPattern}"`);
        
        // Normalizar texto completo para busca
        const normalizedFullText = fullText.replace(/\s+/g, ' ');
        
        // Buscar posições no texto normalizado
        const startInNormalized = normalizedFullText.indexOf(startPattern);
        const endInNormalized = normalizedFullText.lastIndexOf(endPattern) + endPattern.length;
        
        if (startInNormalized >= 0 && endInNormalized > startInNormalized) {
          // Agora precisamos converter essas posições de volta para o texto original com quebras de linha
          // Esta é a parte mais complexa e pode exigir um algoritmo de mapeamento
          
          // Abordagem simplificada: buscar padrões no texto original
          // que podem ser afetados pelas quebras de linha
          const startInOriginal = fullText.indexOf(startPattern.split(' ')[0]);
          
          // Para o final, buscamos a última palavra do padrão de final
          const lastWord = endPattern.split(' ').pop() || '';
          let endInOriginal = fullText.lastIndexOf(lastWord);
          if (endInOriginal >= 0) {
            endInOriginal += lastWord.length;
          } else {
            endInOriginal = scene.endOffset; // Manter original se não encontrar
          }
          
          // Verificar se encontramos posições válidas
          if (startInOriginal >= 0 && endInOriginal > startInOriginal) {
            console.log(`Cena ${scene.id}, novas posições: ${startInOriginal}-${endInOriginal}`);
            
            // Se as posições mudaram significativamente, atualizamos
            if (Math.abs(startInOriginal - scene.startOffset) > 5 || 
                Math.abs(endInOriginal - scene.endOffset) > 5) {
              updates.push({
                id: scene.id,
                updates: {
                  startOffset: startInOriginal,
                  endOffset: endInOriginal
                }
              });
            }
          } else {
            console.log(`Padrões não encontrados no texto original para cena ${scene.id}`);
          }
        } else {
          console.log(`Padrões não encontrados no texto normalizado para cena ${scene.id}`);
        }
      } catch (error) {
        console.error(`Erro ao recalcular limites para cena ${scene.id}:`, error);
      }
    });
    
    // Aplica todas as atualizações
    updates.forEach(update => {
      updateScene(update.id, update.updates);
    });
    
  }, [cenas, updateScene]);

  // Track selection changes for scene marking
  const handleSelectionChange = useCallback(() => {
    const { selection: editorSelection } = editor.current;
    if (!editorSelection) {
      setSelection(null);
      setSelectionPosition(null);
      return;
    }
    
    // Convert editor selection to text offsets
    const start = Editor.start(editor.current, editorSelection);
    const end = Editor.end(editor.current, editorSelection);
    
    const startOffset = Editor.string(editor.current, { anchor: { path: [0, 0], offset: 0 }, focus: start })
      .length;
    
    const endOffset = Editor.string(editor.current, { anchor: { path: [0, 0], offset: 0 }, focus: end })
      .length;
    
    setSelection({ start: startOffset, end: endOffset });
    
    // Get position for floating button - position near the last letter of selection
    try {
      const domRange = ReactEditor.toDOMRange(editor.current, editorSelection);
      const rect = domRange.getBoundingClientRect();
      
      if (!editorDomRef.current) return;
      
      const editorRect = editorDomRef.current.getBoundingClientRect();
      
      // Calculate position for the floating button making sure it's always visible
      const top = Math.max(rect.top - editorRect.top - 40, 20); 
      const left = Math.min(
        rect.right - editorRect.left, 
        editorRect.width - 150
      );
      
      setSelectionPosition({
        top,
        left
      });
    } catch (error) {
      console.error('Error getting selection position:', error);
      setSelectionPosition(null);
    }
  }, []);

  // Create a new scene from the current selection
  const handleCreateScene = useCallback(() => {
    if (!selection) return;
    
    const currentText = editorValue.map(node => Node.string(node)).join('\n');
    const sceneText = currentText.substring(selection.start, selection.end);
    
    // Try to extract scene heading information from the text (if it follows scriptwriting conventions)
    let descricao = '';
    let isExterior = false;
    let isDia = true;
    let locacaoNome = '';
    
    // Look for patterns like "INT/EXT - DIA/NOITE - LOCATION"
    const scenePattern = /^\s*(INT|EXT|INT\/EXT|INTERNA|EXTERNA)\.?\s*[-—–.]?\s*(DIA|NOITE|TARDE|MANHÃ|AMANHECER|ANOITECER)\.?\s*[-—–.]?\s*(.+?)$/i;
    const firstLine = sceneText.split('\n')[0].trim();
    const match = firstLine.match(scenePattern);
    
    if (match) {
      const intExt = match[1].toUpperCase();
      const timeOfDay = match[2].toUpperCase();
      locacaoNome = match[3].trim();
      
      isExterior = intExt.includes('EXT');
      isDia = timeOfDay.includes('DIA') || timeOfDay.includes('MANHÃ') || timeOfDay.includes('TARDE');
      
      descricao = `${intExt} - ${timeOfDay} - ${locacaoNome}`;
    } else {
      // If no pattern match, use the first line (or part of it) as description
      descricao = firstLine.length > 30 ? 
        firstLine.substring(0, 30).trim() + '...' : 
        firstLine.trim();
    }

    addScene({
      descricao,
      startOffset: selection.start,
      endOffset: selection.end,
      highlightColor: generateSceneColor(cenas.length),
      shotlist: [],
      personagens: [],
      duracao: calculateDuration(sceneText),
      contentHash: generateContentHash(sceneText),
      tipoLocacao: isExterior ? 'EXT' : 'INT'
    });
    
    setSelection(null);
    setSelectionPosition(null);
  }, [addScene, cenas.length, selection, editorValue]);

  // Reset text to original imported text
  const handleResetText = useCallback(() => {
    if (originalText) {
      setDocumentText(originalText);
    }
  }, [originalText, setDocumentText]);

  // Clear all scenes
  const handleClearScenes = useCallback(() => {
    removeAllScenes();
  }, [removeAllScenes]);

  // Handle text formatting
  const handleFormatText = useCallback((formatType: 'bold' | 'italic' | 'alignment' | 'fontSize', value: any) => {
    if (!selection) return;
    
    // This would update our store with formatting information
    useAppStore.getState().applyTextFormatting(formatType, [selection.start, selection.end], value);
  }, [selection]);

  // Render highlighted text according to scene definitions and formatting
  const renderLeaf = useCallback(({ attributes, children, leaf }: any) => {
    // Apply text formatting if any
    const style: React.CSSProperties = { 
      backgroundColor: leaf.highlight || 'transparent',
      padding: leaf.highlight ? '0.1em 0' : undefined,
      borderRadius: leaf.highlight ? '2px' : undefined,
    };
    
    if (leaf.bold) {
      style.fontWeight = 'bold';
    }
    
    if (leaf.italic) {
      style.fontStyle = 'italic';
    }
    
    if (leaf.alignment) {
      style.textAlign = leaf.alignment;
      style.display = 'block'; // Needed for text-align to work
    }
    
    if (leaf.fontSize) {
      style.fontSize = `${leaf.fontSize}px`;
    }
    
    return (
      <span {...attributes} style={style}>
        {children}
      </span>
    );
  }, []);

  // Update text decorations based on scene highlights and formatting
  const decorate = useCallback(([node, path]: any) => {
    if (!Text.isText(node)) return [];
    
    const nodeText = node.text;
    const decorations: any[] = [];
    
    // Ordene as cenas por posição para garantir a aplicação correta das decorações
    const sortedScenesByPosition = [...cenas].sort((a, b) => a.startOffset - b.startOffset);
    
    // Calcule o deslocamento para o nó atual
    // Isso determina em que posição dentro do texto completo este nó começa
    let nodeOffset = 0;
    for (let i = 0; i < path[0]; i++) {
      const previousNode = editor.current.children[i];
      nodeOffset += Node.string(previousNode).length + 1; // +1 para a quebra de linha
    }
    
    // Aplique realces para cada cena, garantindo que não se sobreponham
    sortedScenesByPosition.forEach((scene, index) => {
      // Calcule os limites relativos ao nó atual
      const sceneStartInNode = Math.max(0, scene.startOffset - nodeOffset);
      const sceneEndInNode = Math.min(nodeText.length, scene.endOffset - nodeOffset);
      
      // Apenas decore se a cena estiver neste nó de texto
      if (sceneEndInNode > 0 && sceneStartInNode < nodeText.length) {
        // Crie uma decoração que se aplica apenas ao intervalo correto desta cena neste nó
        decorations.push({
          anchor: { path, offset: sceneStartInNode },
          focus: { path, offset: sceneEndInNode },
          highlight: scene.highlightColor,
          id: scene.id // Adicionar ID para depuração
        });
      }
    });
    
    // Aplique os outros tipos de formatação conforme antes
    if (textFormatting) {
      // Apply bold formatting
      if (textFormatting.bold) {
        Object.entries(textFormatting.bold).forEach(([startStr, isBold]) => {
          if (isBold) {
            const start = parseInt(startStr, 10);
            // Assume the formatting applies to the next character if not specified
            const end = start + 1;
            
            if (start >= 0 && start < nodeText.length) {
              decorations.push({
                anchor: { path, offset: start },
                focus: { path, offset: Math.min(end, nodeText.length) },
                bold: true,
              });
            }
          }
        });
      }
      
      // Apply italic formatting
      if (textFormatting.italic) {
        Object.entries(textFormatting.italic).forEach(([startStr, isItalic]) => {
          if (isItalic) {
            const start = parseInt(startStr, 10);
            const end = start + 1;
            
            if (start >= 0 && start < nodeText.length) {
              decorations.push({
                anchor: { path, offset: start },
                focus: { path, offset: Math.min(end, nodeText.length) },
                italic: true,
              });
            }
          }
        });
      }
      
      // Apply alignment
      if (textFormatting.alignment) {
        Object.entries(textFormatting.alignment).forEach(([startStr, alignment]) => {
          const start = parseInt(startStr, 10);
          const end = start + 1;
          
          if (start >= 0 && start < nodeText.length) {
            decorations.push({
              anchor: { path, offset: start },
              focus: { path, offset: Math.min(end, nodeText.length) },
              alignment,
            });
          }
        });
      }
      
      // Apply font size
      if (textFormatting.fontSize) {
        Object.entries(textFormatting.fontSize).forEach(([startStr, fontSize]) => {
          const start = parseInt(startStr, 10);
          const end = start + 1;
          
          if (start >= 0 && start < nodeText.length) {
            decorations.push({
              anchor: { path, offset: start },
              focus: { path, offset: Math.min(end, nodeText.length) },
              fontSize,
            });
          }
        });
      }
    }
    
    return decorations;
  }, [cenas, textFormatting]);

  // Get scenes sorted by their position in the document
  const sortedScenes = useMemo(() => {
    return [...cenas].sort((a, b) => a.startOffset - b.startOffset);
  }, [cenas]);
  
  // Calculate scene positions within the text
  const getScenePositions = useCallback(() => {
    if (!editorDomRef.current || sortedScenes.length === 0) return [];
    
    // Extract editor text
    const editorContent = editorValue.map(node => Node.string(node)).join('\n');
    
    // Map all line breaks to find line positions
    const characterPositions = [];
    let lineNumber = 0;
    
    for (let i = 0; i < editorContent.length; i++) {
      characterPositions[i] = lineNumber;
      if (editorContent[i] === '\n') lineNumber++;
    }
    
    // Function to map a character offset to a line number
    const getLineNumberFromOffset = (offset: number) => {
      if (offset >= characterPositions.length) return lineNumber;
      return characterPositions[Math.min(offset, characterPositions.length - 1)];
    };
    
    // Map scenes to their line positions
    return sortedScenes.map((scene, index) => {
      // Find the line number where this scene starts
      const lineNum = getLineNumberFromOffset(scene.startOffset);
      
      // Find the location name if a location is assigned
      let locationName = "LOCAÇÃO";
      if (scene.locacaoPrincipal) {
        const location = locacoes.find(l => l.id === scene.locacaoPrincipal);
        if (location) locationName = location.nome;
      }
      
      // Determine if scene is interior/exterior and day/night based on description
      const isExterior = scene.tipoLocacao === 'EXT' || scene.descricao.includes('EXT') || scene.descricao.includes('EXTERNA');
      const isDia = scene.descricao.includes('DIA') || !scene.descricao.includes('NOITE');
      
      // Scene number is based on order in the document
      const sceneNumber = index + 1;
      const typePrefix = isExterior ? 'EXT' : 'INT';
      const timePrefix = isDia ? 'DIA' : 'NOITE';
      
      return {
        scene,
        lineNumber: lineNum,
        sceneNumber,
        typePrefix,
        timePrefix,
        locationName
      };
    });
  }, [sortedScenes, locacoes, editorValue]);

  // Helper function to safely get text nodes
  const getTextNodesIn = (node: DOMNode | null): DOMText[] => {
    if (!node) return [];
    
    let textNodes: DOMText[] = [];
    
    try {
      if (node.nodeType === 3) { // Text node
        return [node as DOMText];
      }
      
      if ('childNodes' in node) {
        const childNodes = node.childNodes;
        if (childNodes) {
          for (let i = 0; i < childNodes.length; i++) {
            textNodes = [...textNodes, ...getTextNodesIn(childNodes[i] as DOMNode)];
          }
        }
      }
    } catch (error) {
      console.error('Error in getTextNodesIn:', error);
    }
    
    return textNodes;
  };

  // Always ensure we have a valid editor value
  const safeEditorValue = useMemo(() => {
    return editorValue && editorValue.length > 0 
      ? editorValue 
      : initialValue;
  }, [editorValue, initialValue]);
  
  // Render scene headers inline with the content
  const renderSceneHeaders = useCallback(() => {
    if (!editorDomRef.current || !safeEditorValue || sortedScenes.length === 0) 
      return null;
      
    return (
      <div className="scene-headers-overlay absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
        {getScenePositions().map(({ scene, sceneNumber, typePrefix, timePrefix, locationName }) => (
          <div 
            key={scene.id}
            className="scene-header"
            data-scene-id={scene.id}
            data-scene-number={sceneNumber}
            style={{
              backgroundColor: scene.highlightColor,
              color: '#000',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              position: 'absolute',
              left: '0',
              opacity: 0.9,
              zIndex: 10,
              fontFamily: 'monospace',
              maxWidth: '90%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              // These will be set by the effect below
              top: 0,
              visibility: 'hidden',
              // Adicionar sombra para melhor legibilidade
              boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
              border: '1px solid rgba(0,0,0,0.1)',
              // Adicionar margem para separar do texto
              marginBottom: '8px'
            }}
          >
            {`[Cena ${sceneNumber} - ${typePrefix} - ${timePrefix} - ${locationName}]`}
          </div>
        ))}
      </div>
    );
  }, [getScenePositions, safeEditorValue, sortedScenes.length]);
  
  // Position headers above their scenes after render
  useEffect(() => {
    if (!editorDomRef.current) return;
    
    // Get all text nodes in the editor to find where scenes start
    const editorEl = editorDomRef.current.querySelector('[data-slate-editor="true"]');
    if (!editorEl) return;
    
    const textNodes = getTextNodesIn(editorEl as DOMNode);
    if (!textNodes.length) return;
    
    // Get the editor text content
    const editorContent = safeEditorValue.map(node => Node.string(node)).join('\n');
    
    // For each scene header element, find its position
    const headerElements = editorDomRef.current.querySelectorAll('.scene-header');
    
    getScenePositions().forEach(({ scene, sceneNumber }, index) => {
      const headerElement = headerElements[index] as HTMLElement;
      if (!headerElement) return;
      
      // Find where in the text this scene starts
      let currentLength = 0;
      let targetTextNode: DOMText | null = null;
      let targetOffset = 0;
      
      // Look for the text node containing the start of the scene
      for (const textNode of textNodes) {
        const nodeTextLength = textNode.textContent?.length || 0;
        if (currentLength + nodeTextLength > scene.startOffset) {
          targetTextNode = textNode;
          targetOffset = scene.startOffset - currentLength;
          break;
        }
        currentLength += nodeTextLength;
      }
      
      if (!targetTextNode) return;
      
      try {
        // Get the position of the text node
        const range = document.createRange();
        range.setStart(targetTextNode, Math.min(targetOffset, targetTextNode.textContent?.length || 0));
        range.setEnd(targetTextNode, Math.min(targetOffset, targetTextNode.textContent?.length || 0));
        
        const rect = range.getBoundingClientRect();
        const editorRect = editorDomRef.current!.getBoundingClientRect();
        
        // Novo: posicionar o cabeçalho mais próximo ao texto da cena
        // Usar um offset negativo menor para integrar melhor ao texto
        const isFirstScene = index === 0;
        const verticalSpacing = isFirstScene ? 8 : 20; // Menor espaçamento para integração
        
        // Calcular posição vertical final (levemente acima do texto)
        const top = Math.max(4, rect.top - editorRect.top - verticalSpacing);
        
        // Atualizar posição do cabeçalho
        headerElement.style.top = `${top}px`;
        headerElement.style.visibility = 'visible'; // Show it once positioned
        
        // Ajustar o estilo do texto da cena para criar espaço para o cabeçalho
        try {
          const sceneRange = document.createRange();
          sceneRange.setStart(targetTextNode, Math.min(targetOffset, targetTextNode.textContent?.length || 0));
          
          // Encontrar o container pai para adicionar margem
          let parentElement = targetTextNode.parentElement;
          while (parentElement && !parentElement.classList.contains('slate-paragraph')) {
            parentElement = parentElement.parentElement;
          }
          
          // Se encontrou o elemento pai, adicionar espaçamento adequado
          if (parentElement) {
            parentElement.style.paddingTop = '12px'; // Reduzir padding
            parentElement.style.paddingLeft = '15px'; // Adicionar indentação para o texto da cena
            parentElement.style.marginTop = '25px'; // Melhorar separação entre cenas
            parentElement.style.borderTop = index > 0 ? '1px dashed rgba(0,0,0,0.1)' : 'none';
            
            // Adicionar uma borda esquerda para indicar a cena visualmente
            parentElement.style.borderLeft = `4px solid ${scene.highlightColor}`;
            parentElement.style.paddingLeft = '12px';
            parentElement.style.borderTopLeftRadius = '4px';
            parentElement.style.borderBottomLeftRadius = '4px';
          }
        } catch (e) {
          console.warn('Erro ao ajustar o estilo do texto da cena:', e);
        }
      } catch (e) {
        console.error('Error positioning scene header:', e);
      }
    });
    
    // Schedule this effect to run after every render to maintain correct positioning
  }, [safeEditorValue, getScenePositions, sortedScenes]);

  // Log when component re-renders with new script
  useEffect(() => {
    console.log('[ScriptEditorCore] Re-rendering with currentScriptId:', currentScriptId);
  }, [currentScriptId]);

  return (
    <>
      {/* Aplicar estilos como uma tag style normal */}
      <style dangerouslySetInnerHTML={{ 
        __html: `
          .scene-editor {
            line-height: 1.8;
          }
          
          .scene-editor .slate-paragraph {
            position: relative;
            margin-top: 0.5em;
            margin-bottom: 0.5em;
            padding: 0.25em 0;
          }
          
          /* Estilo para cenas */
          [data-scene-id] {
            margin-top: 1.5em;
            margin-bottom: 1.5em;
          }
          
          /* Melhorar a aparência do texto */
          .scene-editor {
            font-size: 16px;
          }
        `
      }} />

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Editor de Roteiro</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => editor.current.undo()}
            title="Desfazer (Cmd+Z)"
          >
            <Undo className="h-4 w-4 mr-1" /> Desfazer
          </Button>
          <Button
            variant="outline"
            size="sm" 
            onClick={() => editor.current.redo()}
            title="Refazer (Cmd+Y)"
          >
            <Redo className="h-4 w-4 mr-1" /> Refazer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetText}
            title="Resetar para o texto original"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Resetar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearScenes}
            title="Limpar todas as cenas"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Limpar Cenas
          </Button>
        </div>
      </div>
      
      {/* Text formatting toolbar */}
      <TextFormatToolbar 
        editor={editor.current} 
        onFormatText={handleFormatText} 
      />
      
      <div className="flex-grow border rounded-md overflow-hidden relative">
        <Slate
          editor={editor.current}
          value={safeEditorValue}
          onChange={handleEditorChange}
        >
          <div className="relative" ref={editorDomRef}>
            {/* Scene headers overlay that will be positioned inline with content */}
            {renderSceneHeaders()}
            
            <Editable
              className="p-4 min-h-[500px] outline-none font-mono relative z-0 scene-editor" 
              decorate={decorate}
              renderLeaf={renderLeaf}
              onSelect={handleSelectionChange}
              onKeyDown={handleKeyDown}
              placeholder="Carregue um roteiro DOCX ou comece a escrever aqui..."
              spellCheck
              // Adicionar estilos específicos para elementos do editor
              renderElement={(props) => {
                const { children, element, attributes } = props;
                // Adicionamos classes aos elementos do parágrafo para facilitar estilização
                return (
                  <div 
                    {...attributes} 
                    className={`slate-paragraph my-3 relative rounded transition-colors`}
                  >
                    {children}
                  </div>
                );
              }}
            />
            
            {/* Floating "Define as Scene" button */}
            {selection && selectionPosition && (
              <div 
                className="absolute z-50"
                style={{
                  top: `${selectionPosition.top}px`,
                  left: `${selectionPosition.left}px`,
                  transform: 'translateX(-50%)', 
                  pointerEvents: 'auto'
                }}
              >
                <Button 
                  onClick={handleCreateScene} 
                  className="bg-primary hover:bg-primary/90 shadow-md"
                  size="sm"
                >
                  Definir como Cena
                </Button>
              </div>
            )}
          </div>
        </Slate>
      </div>
    </>
  );
};

export default ScriptEditorCore;
