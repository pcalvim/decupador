export interface Shot {
  id: string;
  title: string;
  description: string;
  media?: File | null;
  mediaUrl?: string;
  inPoint?: number;
  outPoint?: number;
  isRecorded?: boolean;
  hidden?: boolean;
  // Production planning
  prepTime?: number; // in minutes
  recordingTime?: number; // in minutes
  notes?: string;
}

export interface Scene {
  id: string;
  title: string;
  description: string;
  shots: Shot[];
  isRecorded?: boolean;
}

export interface ProductionBreak {
  id: string;
  type: 'breakfast' | 'lunch' | 'coffee' | 'setup' | 'teardown' | 'travel' | 'custom';
  title: string;
  duration: number; // in minutes
  notes?: string;
}

export interface ProjectInfo {
  movieName: string;
  clientName: string;
  logo?: File | null;
  logoUrl?: string;
  styles: {
    movieColor: string;
    clientColor: string;
    fontSize: number;
    spacing: number;
  };
}

export interface StoryboardState {
  scenes: Scene[];
  project: ProjectInfo;
  isDarkMode: boolean;
  productionBreaks: ProductionBreak[];
}

export interface ExportOptions {
  format: 'zip' | 'pdf';
  includeMedia: boolean;
}

export type ExportView = 'storyboard' | 'recording' | 'schedule';