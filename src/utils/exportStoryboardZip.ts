import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// --- Simplified Interfaces based on usage in exportZip.ts ---
export interface MediaFile {
  name: string; // Original file name, or a generated one
  type: string; // MIME type
  data: string | ArrayBuffer; // DataURL string or ArrayBuffer
}

export interface ShotState {
  title: string;
  description?: string;
  media?: MediaFile; // Changed from File to handle DataURL from store
  inPoint?: number;
  outPoint?: number;
}

export interface SceneState {
  title: string;
  description?: string;
  shots: ShotState[];
}

export interface ProjectStyles {
  movieColor: string;
  clientColor: string;
  fontSize: number; // Assuming a base font size number
  spacing: number;  // Assuming a base spacing number
}

export interface ProjectState {
  movieName: string;
  clientName: string;
  logo?: MediaFile; // Changed from File
  styles: ProjectStyles;
}

export interface StoryboardState {
  project: ProjectState;
  scenes: SceneState[];
  isDarkMode: boolean;
}

// --- Helper Functions (Adapted) ---

// Helper to convert DataURL to ArrayBuffer
const dataURLToArrayBuffer = (dataUrl: string): ArrayBuffer => {
  const base64 = dataUrl.split(',')[1];
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Get file extension from media type or DataURL
const getFileExtension = (mediaType: string): string => {
  const extensions: { [key: string]: string } = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  };
  return extensions[mediaType] || 'jpg'; // Default to jpg if unknown
};

const getFileExtensionFromDataURL = (dataUrl: string): string => {
  const mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
  return getFileExtension(mimeType);
};


// Generate static HTML for the storyboard
const buildStaticHtml = (state: StoryboardState, mediaBasePath: string = '', cssPath: string = ''): string => {
  // Basic structure trying to mimic StoryboardPage.tsx with Tailwind-like classes for the linked CSS to target.
  // The actual Tailwind classes from the React components won't be here, 
  // but the structure + linked CSS should provide a similar layout.
  let html = `<!DOCTYPE html>
  <html lang="pt-BR" class="${state.isDarkMode ? 'dark' : ''}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${state.project.movieName} - Storyboard</title>
    ${cssPath ? `<link rel="stylesheet" href="${cssPath}">` : ''}
    <style>
      /* Minimal fallback styles if external CSS fails or for basic structure */
      body { margin: 0; background-color: ${state.isDarkMode ? '#18181b' : '#f8fafc'}; color: ${state.isDarkMode ? '#e2e8f0' : '#0f172a'}; font-family: sans-serif; transition: background-color 0.3s, color 0.3s; }
      .storyboard-container { padding: 1rem; max-width: 1280px; margin: auto; }
      .script-header { font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem; margin-top: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid ${state.isDarkMode ? '#3f3f46' : '#e5e7eb'}; }
      .scene-card { background-color: ${state.isDarkMode ? '#27272a' : '#ffffff'}; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06); margin-bottom: 2rem; border-left: 4px solid ${state.project.styles.movieColor || '#00a650'}; }
      .scene-card-header { padding: 1rem; border-bottom: 1px solid ${state.isDarkMode ? '#3f3f46' : '#e5e7eb'}; }
      .scene-card-title { font-size: 1.25rem; font-weight: 500; }
      .scene-card-content { padding: 1rem; }
      .scene-text { white-space: pre-wrap; margin-bottom: 1rem; font-size: 0.9rem; color: ${state.isDarkMode ? '#a1a1aa' : '#374151'}; }
      .shots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; }
      .shot-card { /* bg-white dark:bg-zinc-800 -> controlled by external CSS via .dark on html */ border-radius: 0.375rem; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
      .shot-header { padding: 0.5rem 0.75rem; font-size: 0.75rem; font-weight: 500; /* bg-slate-50 dark:bg-zinc-700 */ border-bottom: 1px solid ${state.isDarkMode ? '#52525b' : '#e5e7eb'}; }
      .shot-media-container { aspect-ratio: 16/9; /* bg-muted dark:bg-zinc-900 */ background-color: ${state.isDarkMode ? '#18181b' : '#e5e7eb'}; display: flex; align-items: center; justify-content: center; }
      .shot-media-container img, .shot-media-container video { width: 100%; height: 100%; object-fit: contain; }
      .shot-info { padding: 0.75rem; }
      .shot-title { font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; }
      .shot-description { font-size: 0.75rem; color: ${state.isDarkMode ? '#a1a1aa' : '#4b5563'}; }
      .empty-media-placeholder { color: ${state.isDarkMode ? '#71717a' : '#6b7280'}; font-size: 0.875rem; text-align: center; padding: 2rem; }
      /* Project Header Styles - Simplified */
      .project-main-header { padding: 1rem; /* bg-white dark:bg-zinc-800 */ box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-bottom: 1rem; }
      .project-title { font-size: 1.875rem; font-weight: bold; color: ${state.project.styles.movieColor || '#00a650'}; }
      .client-name { font-size: 1.125rem; color: ${state.project.styles.clientColor || '#555555'}; margin-top: 0.25rem; }
      
      /* Theme Toggle Button Styles */
      .theme-toggle-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 15px;
        background-color: ${state.isDarkMode ? '#3f3f46' : '#e5e7eb'}; /* Cor de fundo inicial */
        color: ${state.isDarkMode ? '#e2e8f0' : '#0f172a'}; /* Cor do texto inicial */
        border: 1px solid ${state.isDarkMode ? '#52525b' : '#d1d5db'};
        border-radius: 0.375rem;
        cursor: pointer;
        font-size: 0.875rem;
        z-index: 1000;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
      html.dark .theme-toggle-button { /* Estilo do botão quando em modo escuro */
        background-color: #3f3f46; /* bg-zinc-700 */
        color: #e2e8f0; /* text-slate-200 */
        border-color: #52525b; /* border-zinc-600 */
      }
      html:not(.dark) .theme-toggle-button { /* Estilo do botão quando em modo claro */
        background-color: #e5e7eb; /* bg-gray-200 */
        color: #0f172a; /* text-slate-900 */
        border-color: #d1d5db; /* border-gray-300 */
      }
    </style>
  </head>
  <body>
    <button id="theme-toggle" class="theme-toggle-button">Alternar Tema</button>
    <div class="storyboard-container">
      <header class="project-main-header">
        <h1 class="project-title">${state.project.movieName || 'Projeto de Storyboard'}</h1>
        ${state.project.clientName ? `<h2 class="client-name">${state.project.clientName}</h2>` : ''}
        ${state.project.logo && state.project.logo.data ? `<img src="${mediaBasePath}/logo.${getFileExtension(state.project.logo.type)}" alt="Logo" style="max-height: 50px; margin-top: 10px;">` : ''}
      </header>
  `;

  // Group scenes by scriptName for the HTML structure (if applicable from state)
  // For now, assumes scenes are flat or pre-grouped if needed by the calling function.
  // This simplified version iterates through state.scenes directly.

  state.scenes.forEach((scene, sceneIndex) => {
    // Assuming scene.title contains the script name if you have grouped them before passing to StoryboardState
    // Or, you might want to pass a scriptName property with each scene object in SceneState
    // For now, we'll just use a generic scene title.
    html += `
      <div class="scene-card">
        <div class="scene-card-header">
          <h3 class="scene-card-title">${scene.title || `Cena ${sceneIndex + 1}`}</h3>
        </div>
        <div class="scene-card-content">
          ${scene.description ? `<p class="scene-text">${scene.description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>` : ''}
          <div class="shots-grid">`;

    scene.shots.forEach((shot, shotIndex) => {
      html += `
            <div class="shot-card rounded-lg border bg-white text-card-foreground shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-xl transition-shadow duration-200">
              <div class="shot-header">Shot ${shotIndex + 1}${shot.title ? ` - ${shot.title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}` : ''}</div>
              <div class="shot-media-container">`;

      if (shot.media && shot.media.data) {
        const ext = getFileExtension(shot.media.type);
        const mediaPath = `${mediaBasePath}/scene${sceneIndex + 1}/shot${shotIndex + 1}.${ext}`;
        
        if (shot.media.type.startsWith('video/')) {
          html += `
                <video autoplay loop muted playsinline controls${shot.inPoint || shot.outPoint ? ` data-in="${shot.inPoint || 0}" data-out="${shot.outPoint || ''}"` : ''}>
                  <source src="${mediaPath}" type="${shot.media.type}">
                  Seu navegador não suporta a reprodução de vídeo.
                </video>`;
        } else {
          html += `
                <img src="${mediaPath}" alt="${shot.title || `Mídia do Shot ${shotIndex + 1}`}">`;
        }
      } else {
        html += `
                <div class="empty-media-placeholder">Sem mídia</div>`;
      }

      html += `
              </div>
              ${ (shot.title || shot.description) ? 
                `<div class="shot-info">
                  ${shot.title ? `<h4 class="shot-title">${shot.title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</h4>` : ''}
                  ${shot.description ? `<p class="shot-description">${shot.description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>` : ''}
                </div>` : ''}
            </div>`;
    });

    html += `
          </div>
        </div>
      </div>`;
  });

  html += `
    </div> <!-- /storyboard-container -->
    <script>
      document.addEventListener('DOMContentLoaded', () => {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          const inPoint = parseFloat(video.dataset.in || '0');
          const outPoint = parseFloat(video.dataset.out || 'NaN');
          
          video.addEventListener('loadedmetadata', () => {
            video.currentTime = inPoint;
          });
          
          video.addEventListener('timeupdate', () => {
            if (!isNaN(outPoint) && outPoint > inPoint && video.currentTime >= outPoint) {
              video.currentTime = inPoint; // Loop back to inPoint
            } else if (isNaN(outPoint) && video.loop && video.currentTime >= video.duration && video.duration > 0) {
              // Standard loop attribute should handle this if no outPoint and video.loop is true
              // If video.loop is false, it will stop. Forcing a loop here if needed:
              // video.currentTime = inPoint; 
            }
          });
        });

        // Theme Toggle Logic
        const themeToggleButton = document.getElementById('theme-toggle');
        const htmlElement = document.documentElement;

        // Function to apply theme based on stored preference or initial state
        const applyTheme = () => {
          const storedTheme = localStorage.getItem('storyboardTheme');
          if (storedTheme) {
            htmlElement.classList.toggle('dark', storedTheme === 'dark');
          } else {
            // If no stored theme, use the one set during export (from state.isDarkMode)
            // The class is already on <html> from the initial HTML generation
          }
          // Update button text/appearance if needed
          if (themeToggleButton) {
            themeToggleButton.textContent = htmlElement.classList.contains('dark') ? 'Tema Claro' : 'Tema Escuro';
          }
        };
        
        if (themeToggleButton) {
          themeToggleButton.addEventListener('click', () => {
            const isDark = htmlElement.classList.toggle('dark');
            localStorage.setItem('storyboardTheme', isDark ? 'dark' : 'light');
            applyTheme(); // Re-apply to update button text
          });
        }

        applyTheme(); // Apply theme on initial load
      });
    </script>
  </body>
  </html>`;

  return html;
};

// Main export function
export const exportStoryboardToZip = async (state: StoryboardState, cssFileContent?: ArrayBuffer): Promise<void> => {
  try {
    const zip = new JSZip();
    const mediaFolder = zip.folder('media');
    if (!mediaFolder) throw new Error("Failed to create media folder in ZIP.");
    
    let cssPathInZip = '';
    if (cssFileContent) {
        const assetsFolder = zip.folder('assets');
        if (!assetsFolder) throw new Error("Failed to create assets folder in ZIP.");
        // Usando um nome fixo para o CSS no ZIP para simplificar a referência no HTML
        cssPathInZip = './assets/styles.css'; 
        assetsFolder.file('styles.css', cssFileContent);
    }

    if (state.project.logo && state.project.logo.data) {
      const logoData = typeof state.project.logo.data === 'string' ? dataURLToArrayBuffer(state.project.logo.data) : state.project.logo.data;
      const logoExt = getFileExtension(state.project.logo.type);
      mediaFolder.file(`logo.${logoExt}`, logoData);
    }

    for (let sceneIndex = 0; sceneIndex < state.scenes.length; sceneIndex++) {
      const scene = state.scenes[sceneIndex];
      const sceneFolderName = `scene${sceneIndex + 1}`;
      const sceneFolder = mediaFolder.folder(sceneFolderName);
      if (!sceneFolder) throw new Error(`Failed to create folder for scene ${sceneFolderName}`);

      for (let shotIndex = 0; shotIndex < scene.shots.length; shotIndex++) {
        const shot = scene.shots[shotIndex];
        if (shot.media && shot.media.data) {
          const mediaData = typeof shot.media.data === 'string' ? dataURLToArrayBuffer(shot.media.data) : shot.media.data;
          const ext = getFileExtension(shot.media.type);
          sceneFolder.file(`shot${shotIndex + 1}.${ext}`, mediaData);
        }
      }
    }

    const projectDataForJson = {
      project: {
        movieName: state.project.movieName,
        clientName: state.project.clientName,
        styles: state.project.styles,
        hasLogo: !!state.project.logo,
      },
      scenes: state.scenes.map(scene => ({
        title: scene.title,
        description: scene.description,
        shots: scene.shots.map(shot => ({
          title: shot.title,
          description: shot.description,
          hasMedia: !!shot.media,
          mediaType: shot.media?.type,
          inPoint: shot.inPoint,
          outPoint: shot.outPoint,
        })),
      })),
      isDarkMode: state.isDarkMode,
    };
    zip.file('storyboard_data.json', JSON.stringify(projectDataForJson, null, 2));

    const htmlContent = buildStaticHtml(state, './media', cssPathInZip);
    zip.file('storyboard.html', htmlContent);

    const blob = await zip.generateAsync({ type: 'blob' });
    const fileName = `${state.project.movieName.replace(/\s+/g, '-').toLowerCase() || 'storyboard'}-export.zip`;
    saveAs(blob, fileName);
  } catch (error) {
    console.error('Error creating ZIP file:', error);
    throw new Error(`Failed to create ZIP file: ${error instanceof Error ? error.message : String(error)}`);
  }
}; 