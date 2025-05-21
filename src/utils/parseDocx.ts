
import mammoth from 'mammoth';

/**
 * Parse DOCX file into plain text
 */
export const parseDocx = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

/**
 * Generate a random pastel color for scene highlighting
 * @param index Scene index for consistent colors
 */
export const generateSceneColor = (index: number): string => {
  // Use HSL to generate evenly distributed pastel colors
  const hue = (index * 137.508) % 360; // Golden angle approximation for good distribution
  return `hsl(${hue}, 70%, 80%)`;
};

/**
 * Calculate estimated duration in seconds based on word count
 * @param text Scene text content
 */
export const calculateDuration = (text: string): number => {
  const words = text.trim().split(/\s+/).length;
  // Average speaking rate is about 150 words per minute (2.5 words per second)
  // We're adding a bit of padding for scene transitions and action
  return Math.round((words / 2.5) * 1.2);
};

/**
 * Generate a simple hash of text for change detection
 */
export const generateContentHash = (text: string, length = 20): string => {
  if (!text || text.length === 0) return '';
  
  const sample = text.substring(0, Math.min(length, text.length));
  let hash = 0;
  
  for (let i = 0; i < sample.length; i++) {
    hash = ((hash << 5) - hash) + sample.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  return hash.toString(16);
};

/**
 * Detect scene breaks in a screenplay
 * Returns array of potential scene boundaries
 * @param text The screenplay text
 * @param createSingleScene If true, creates a single scene for the entire document (for manual scene creation later)
 */
export const detectScenes = (text: string, createSingleScene: boolean = false): { 
  startOffset: number; 
  endOffset: number; 
  descricao: string;
}[] => {
  // If createSingleScene is true, return a single scene that covers the entire document
  if (createSingleScene) {
    return [{
      startOffset: 0,
      endOffset: text.length,
      descricao: "Documento Completo" // "Full Document"
    }];
  }
  
  const scenes: { startOffset: number; endOffset: number; descricao: string }[] = [];
  
  // Common screenplay scene header patterns
  const sceneHeaderPatterns = [
    /^\s*(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/im, // Interior/Exterior markers
    /^\s*CENA\s*\d+/im,                     // "CENA X" format
    /^\s*SCENE\s*\d+/im,                    // "SCENE X" format
  ];
  
  let lines = text.split('\n');
  let currentPosition = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const position = currentPosition;
    
    // Check if this line matches any scene header pattern
    const isSceneHeader = sceneHeaderPatterns.some(pattern => pattern.test(line));
    
    if (isSceneHeader) {
      // If we already found at least one scene, complete the previous one
      if (scenes.length > 0) {
        scenes[scenes.length - 1].endOffset = position;
      }
      
      // Start a new scene
      scenes.push({
        startOffset: position,
        endOffset: text.length, // Temporary, will be updated when finding next scene
        descricao: line.trim()
      });
    }
    
    currentPosition += line.length + 1; // +1 for the newline character
  }
  
  // If no scenes were detected, create a single scene covering the entire document
  if (scenes.length === 0) {
    scenes.push({
      startOffset: 0,
      endOffset: text.length,
      descricao: "Documento Completo" // "Full Document"
    });
  }
  
  return scenes;
};
