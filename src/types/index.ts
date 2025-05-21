export enum TabType {
  Editor = 'editor',
  Casting = 'casting',
  Locacoes = 'locacoes',
  Shotlist = 'shotlist',
  Cronograma = 'cronograma',
  OD = 'od',
  Storyboard = 'storyboard'
}

export interface Shot {
  id: string;
  descricao: string;
  tipo: string; // CLOSE, MÉDIO, AMERICANO, GERAL, DETALHE, POV
  personagens: string[]; // IDs dos personagens específicos deste shot
  duracao: number; // em segundos
  equipamento?: string;
  notas?: string;
  locacaoId?: string; // ID da locação específica do shot
  tipoLocacaoShot?: 'INT' | 'EXT' | 'INT/EXT' | 'EXT/INT'; // Tipo de locação para o shot
  referenciaMidia?: {
    nomeArquivo: string;
    tipoMedia: 'image' | 'gif' | 'webp' | 'video'; // Adicionado 'video'
    mimeType: string; // e.g., image/jpeg, image/gif, image/webp
    dataUrl: string; // Conteúdo Base64 da mídia
  };
}

export interface Scene {
  id: string;
  descricao: string;
  startOffset: number; // Início do trecho no texto
  endOffset: number; // Fim do trecho no texto
  highlightColor: string;
  shotlist: Shot[];
  personagens: string[]; // IDs dos personagens
  duracao: number;
  contentHash?: string;
  locacaoPrincipal?: string; // ID da locação principal
  tipoLocacao?: string; // INT, EXT, INT/EXT
  objetos?: string;
  observacao?: string;
  // No sequence property needed as we'll derive it from sorted position
}

export interface Personagem {
  id: string;
  nome: string;
  ator?: string;
  contato?: string;
  notas?: string;
  cenas: string[]; // IDs das cenas em que aparece
}

export interface Locacao {
  id: string;
  nome: string;
  endereco?: string;
  notas?: string;
  cenas: string[]; // IDs das cenas nesta locação
}

// Novo tipo para o item da Ordem do Dia
export interface OrdemDoDiaItem {
  id: string; // Pode ser o próprio shotId para simplicidade ou um novo UUID se precisar de mais flexibilidade
  shotId: string;
  sceneId: string;
  horarioEstimado?: string; // HH:mm
  ordem: number; // Para manter a ordem manual
  // Poderíamos adicionar mais campos aqui no futuro, como status (filmado, pendente), etc.
}

export interface Diaria {
  id: string;
  data: string;
  locacoes: string[]; // IDs das locações
  cenas: string[]; // IDs das cenas
  horarioInicio: string;
  horarioFim: string;
  notas?: string;
  ordemDoDia?: OrdemDoDiaItem[]; // Array opcional dos shots ordenados para o dia
}

// Tipos para a página de Ordem do Dia (OD)
export interface Activity {
  id: string; // Pode ser um ID único da atividade (ex: "almoço", "deslocamento_manha")
  type: 'activity'; // Discriminador
  title: string; // Nome da atividade, ex: "Almoço da Equipe"
  defaultDuration?: number; // Em minutos, sugestão inicial
}

// Representa um item na linha do tempo da Ordem do Dia.
// Pode ser um Shot (referenciando o Shot original) ou uma Activity.
export interface TimelineEntry {
  id: string; // ID único para esta entrada na timeline (uuidv4)
  type: 'shot' | 'activity';
  originalId: string; // ID do Shot original ou da Activity predefinida/personalizada
  title: string; // Para exibição. Ex: "C5/S1 - Descrição" ou "Almoço"
  startTime?: string; // HH:mm
  duration?: number; // Em minutos
  endTime?: string; // HH:mm (calculado ou definido)
  order: number; // Para manter a ordem na timeline
  
  // Campos específicos para type: 'shot'
  sceneNumber?: string;
  shotNumber?: string;
  description?: string; // Descrição detalhada do shot ou da atividade
  locacao?: string; // Nome da locação para o shot
  personagens?: string[]; // Array de IDs de Personagem para o shot
  tipo?: string; // Tipo de shot (ex: CLOSE, MÉDIO)
  
  // Campos para detalhes completos (opcional, para evitar joins constantes se necessário)
  shotDetails?: Shot; 
  activityDetails?: Activity;
}

// A Ordem do Dia para uma Diaria específica
export interface DailySchedule {
  diariaId: string; // ID da Diaria à qual esta OD pertence
  entries: TimelineEntry[];
  lastUpdated: number;
  // Outras meta-informações, como notas gerais para a OD do dia
  notes?: string;
}

export interface DocumentState {
  texto: string;
  originalText?: string; // Store original text for reset functionality
  titulo?: string;
  cenas: Scene[];
  personagens: Personagem[];
  locacoes: Locacao[];
  diarias: Diaria[];
  lastUpdated: number;
  textFormatting?: {
    bold?: { [key: number]: boolean };
    italic?: { [key: number]: boolean };
    alignment?: { [key: number]: 'left' | 'center' | 'right' };
    fontSize?: { [key: number]: number };
  };
}

export interface Script {
  id: string;
  name: string;
  documentState: DocumentState;
}

export interface AppStateWithMultipleScripts {
  scripts: Script[];
  currentScriptId: string | null;
  currentTab: TabType;
  undoStack: DocumentState[];
  selectedScriptsFilter: string[];
  
  // Script management
  addScript: (name: string) => string;
  updateScriptName: (id: string, name: string) => void;
  removeScript: (id: string) => void;
  resetAllScripts: () => void; // Nova função adicionada
  setCurrentScript: (id: string) => void;
  
  // Multi-script filter selection
  setSelectedScriptsFilter: (scriptIds: string[]) => void;
  toggleScriptInFilter: (scriptId: string) => void;
  
  // Helper functions
  getCurrentDocumentState: () => DocumentState;
  updateCurrentDocumentState: (updater: (state: DocumentState) => DocumentState) => void;
  _getDocumentStateByScriptId: (scriptId: string) => DocumentState | null;
  _updateDocumentStateByScriptId: (scriptId: string, updater: (state: DocumentState) => DocumentState) => void;
  
  // Document state actions
  setDocumentText: (scriptId: string, text: string, title?: string) => void;
  setOriginalText: (text: string) => void;
  
  // Scene management
  addScene: (scene: Partial<Scene>) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  removeScene: (id: string) => void;
  removeAllScenes: () => void;
  
  // Shot management
  addShot: (sceneId: string, shot: Partial<Shot>, scriptId?: string) => void;
  updateShot: (sceneId: string, shotId: string, updates: Partial<Shot>, scriptId?: string) => void;
  removeShot: (sceneId: string, shotId: string, scriptId?: string) => void;
  
  // Character management
  addPersonagem: (personagem: Partial<Personagem>) => void;
  updatePersonagem: (id: string, updates: Partial<Personagem>) => void;
  removePersonagem: (id: string) => void;
  
  // Location management
  addLocacao: (locacao: Partial<Locacao>) => void;
  updateLocacao: (id: string, updates: Partial<Locacao>) => void;
  removeLocacao: (id: string) => void;
  setSceneLocation: (sceneId: string, locationId: string) => void;
  
  // Schedule management
  addDiaria: (diaria: Partial<Diaria>, scriptId?: string) => void;
  updateDiaria: (id: string, updates: Partial<Diaria>, scriptId?: string) => void;
  removeDiaria: (id: string, scriptId?: string) => void;
  addSceneToDiaria: (diarioId: string, sceneId: string, scriptId?: string) => void;
  removeSceneFromDiaria: (diarioId: string, sceneId: string, scriptId?: string) => void;
  
  // Navigation
  setCurrentTab: (tab: TabType) => void;
  
  // Undo functionality
  undo: () => void;
  
  // Document processing
  processDocument: (scriptId: string, text: string, title?: string, detectScenesAutomatically?: boolean, createNoScenes?: boolean) => void;
  
  // Text formatting
  applyTextFormatting: (formatType: 'bold' | 'italic' | 'alignment' | 'fontSize', range: [number, number], value: any) => void;

  // Shot movement between scenes (for drag and drop)
  moveShotToAnotherScene: (shotToMove: Shot, oldSceneId: string, oldScriptId: string, newSceneId: string, newScriptId: string) => void;

  // Shot reordering within a scene
  reorderShotsInScene: (sceneId: string, scriptId: string, orderedShotIds: string[]) => void;
}
