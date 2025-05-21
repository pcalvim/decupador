import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { StoryboardState, Scene, Shot } from '../types/models';

// Helper to convert File objects to ArrayBuffer
const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = (error) => reject(error);
  });
};

// Get file extension from media type
const getFileExtension = (mediaType: string): string => {
  const extensions: { [key: string]: string } = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov'
  };
  return extensions[mediaType] || 'jpg';
};

// Generate static HTML for the storyboard
const buildStaticHtml = (state: StoryboardState, mediaBasePath: string = ''): string => {
  let html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${state.project.movieName} - Storyboard</title>
    <style>
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        background-color: ${state.isDarkMode ? '#121212' : '#f9f9f9'};
        color: ${state.isDarkMode ? '#ffffff' : '#333333'};
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 40px;
        border-bottom: 1px solid ${state.isDarkMode ? '#333' : '#ddd'};
        padding-bottom: 20px;
      }
      .project-info h1 {
        color: ${state.project.styles.movieColor};
        margin-bottom: 8px;
        font-size: ${state.project.styles.fontSize + 16}px;
      }
      .project-info h2 {
        color: ${state.project.styles.clientColor};
        font-size: ${state.project.styles.fontSize + 4}px;
        font-weight: normal;
      }
      .scene {
        margin-bottom: 48px;
        padding: 16px;
        border-radius: 8px;
        background-color: ${state.isDarkMode ? '#1e1e1e' : '#ffffff'};
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      .scene h3 {
        margin-top: 0;
        margin-bottom: 16px;
        color: ${state.isDarkMode ? '#ffffff' : '#333333'};
        border-bottom: 1px solid ${state.isDarkMode ? '#333' : '#eee'};
        padding-bottom: 8px;
      }
      .shots {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: ${state.project.styles.spacing * 2}px;
      }
      .shot {
        padding: 12px;
        border-radius: 6px;
        background-color: ${state.isDarkMode ? '#252525' : '#f5f5f5'};
      }
      .shot h4 {
        margin-top: 8px;
        margin-bottom: 6px;
      }
      .shot-media {
        width: 100%;
        aspect-ratio: 16/9;
        background-color: ${state.isDarkMode ? '#333' : '#eee'};
        border-radius: 4px;
        overflow: hidden;
      }
      .shot-media img, .shot-media video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .shot p {
        margin-top: 6px;
        font-size: 14px;
        color: ${state.isDarkMode ? '#ccc' : '#666'};
      }
      .logo {
        max-width: 120px;
        max-height: 80px;
        object-fit: contain;
      }
    </style>
  </head>
  <body>
    <header>
      <div class="project-info">
        <h1>${state.project.movieName}</h1>
        <h2>Clienter: ${state.project.clientName}</h2>
      </div>`;

  if (state.project.logo) {
    const logoExt = getFileExtension(state.project.logo.type);
    html += `
      <div class="logo-container">
        <img class="logo" src="${mediaBasePath}/logo.${logoExt}" alt="Project Logo">
      </div>`;
  }

  html += `
    </header>
    <main>`;

  state.scenes.forEach((scene, sceneIndex) => {
    const sceneNumber = sceneIndex + 1;
    html += `
      <div class="scene">
        <h3>${scene.title}</h3>
        ${scene.description ? `<p class="scene-description">${scene.description}</p>` : ''}
        <div class="shots">`;

    scene.shots.forEach((shot, shotIndex) => {
      const shotNumber = shotIndex + 1;
      html += `
          <div class="shot">
            <div class="shot-media">`;

      if (shot.media) {
        const ext = getFileExtension(shot.media.type);
        const mediaPath = `${mediaBasePath}/scene${sceneNumber}/shot${shotNumber}.${ext}`;
        
        if (shot.media.type.startsWith('video/')) {
          html += `
              <video autoplay loop muted playsinline${shot.inPoint || shot.outPoint ? ` data-in="${shot.inPoint || 0}" data-out="${shot.outPoint || ''}"` : ''}>
                <source src="${mediaPath}" type="${shot.media.type}">
                Your browser does not support video playback.
              </video>`;
        } else {
          html += `
              <img src="${mediaPath}" alt="${shot.title}">`;
        }
      } else {
        html += `
              <div class="empty-media">No media</div>`;
      }

      html += `
            </div>
            <h4>${shot.title}</h4>
            ${shot.description ? `<p>${shot.description}</p>` : ''}
          </div>`;
    });

    html += `
        </div>
      </div>`;
  });

  html += `
    </main>
    <script>
      // Handle video trimming
      document.addEventListener('DOMContentLoaded', () => {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          const inPoint = parseFloat(video.dataset.in || '0');
          const outPoint = parseFloat(video.dataset.out || '0');
          
          if (inPoint > 0 || outPoint > 0) {
            video.addEventListener('loadedmetadata', () => {
              video.currentTime = inPoint;
            });
            
            video.addEventListener('timeupdate', () => {
              if (outPoint && video.currentTime >= outPoint) {
                video.currentTime = inPoint;
              }
            });
          }
        });
      });
    </script>
  </body>
  </html>`;

  return html;
};

// Main export function
export const exportZip = async (state: StoryboardState): Promise<void> => {
  try {
    const zip = new JSZip();
    const mediaFolder = zip.folder('media');

    // Add project logo if it exists
    if (state.project.logo) {
      const logoData = await fileToArrayBuffer(state.project.logo);
      const logoExt = getFileExtension(state.project.logo.type);
      mediaFolder.file(`logo.${logoExt}`, logoData);
    }

    // Process scenes and their media
    for (let sceneIndex = 0; sceneIndex < state.scenes.length; sceneIndex++) {
      const scene = state.scenes[sceneIndex];
      const sceneNumber = sceneIndex + 1;
      const sceneFolder = mediaFolder.folder(`scene${sceneNumber}`);

      // Process shots in the scene
      for (let shotIndex = 0; shotIndex < scene.shots.length; shotIndex++) {
        const shot = scene.shots[shotIndex];
        const shotNumber = shotIndex + 1;

        if (shot.media) {
          const mediaData = await fileToArrayBuffer(shot.media);
          const ext = getFileExtension(shot.media.type);
          sceneFolder.file(`shot${shotNumber}.${ext}`, mediaData);
        }
      }
    }

    // Add project data as JSON
    const projectData = {
      ...state,
      project: {
        ...state.project,
        logo: null,
        logoUrl: ''
      },
      scenes: state.scenes.map(scene => ({
        ...scene,
        shots: scene.shots.map(shot => ({
          ...shot,
          media: null,
          mediaUrl: ''
        }))
      }))
    };

    zip.file('storyboard.json', JSON.stringify(projectData, null, 2));

    // Add HTML file with relative paths to media
    const html = buildStaticHtml(state, './media');
    zip.file('index.html', html);

    // Generate and download the ZIP file
    const blob = await zip.generateAsync({ type: 'blob' });
    const fileName = `${state.project.movieName.replace(/\s+/g, '-').toLowerCase()}-storyboard.zip`;
    saveAs(blob, fileName);
  } catch (error) {
    console.error('Error creating ZIP file:', error);
    throw new Error('Failed to create ZIP file. Please try again.');
  }
};