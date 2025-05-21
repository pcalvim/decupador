import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// Configuration
const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

// Singleton FFmpeg instance
let ffmpegInstance: FFmpeg | null = null;

// Initialize FFmpeg
export const initializeFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }
  
  const ffmpeg = new FFmpeg();
  
  if (!ffmpeg.loaded) {
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
      });
      console.log('FFmpeg loaded successfully');
    } catch (error) {
      console.error('Error loading FFmpeg:', error);
      throw error;
    }
  }
  
  ffmpegInstance = ffmpeg;
  return ffmpeg;
};

// Get video metadata (duration, dimensions, etc.)
export const getVideoMetadata = async (
  file: File
): Promise<{ duration: number; width: number; height: number }> => {
  const ffmpeg = await initializeFFmpeg();
  
  try {
    // Load the file into FFmpeg's virtual file system
    await ffmpeg.writeFile('input.mp4', await fetchFile(file));
    
    // Run the ffprobe command to get video metadata
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,duration',
      '-of', 'json',
      'output.json'
    ]);
    
    // Read the output JSON file
    const data = await ffmpeg.readFile('output.json');
    const decoder = new TextDecoder();
    const metadataJson = decoder.decode(data);
    const metadata = JSON.parse(metadataJson);
    
    // Extract the video information
    const stream = metadata.streams[0];
    const duration = parseFloat(stream.duration || '0');
    const width = parseInt(stream.width || '0', 10);
    const height = parseInt(stream.height || '0', 10);
    
    return { duration, width, height };
  } catch (error) {
    console.error('Error getting video metadata:', error);
    // Return some defaults if metadata extraction fails
    return { duration: 0, width: 0, height: 0 };
  }
};

// Trim video to specified in/out points
export const trimVideo = async (
  file: File,
  inPoint: number,
  outPoint: number
): Promise<Blob> => {
  const ffmpeg = await initializeFFmpeg();
  
  try {
    // Load the file into FFmpeg's virtual file system
    await ffmpeg.writeFile('input.mp4', await fetchFile(file));
    
    // Calculate duration
    const duration = outPoint - inPoint;
    
    // Run FFmpeg command to trim the video
    await ffmpeg.exec([
      '-ss', inPoint.toString(),
      '-i', 'input.mp4',
      '-t', duration.toString(),
      '-c', 'copy', // Use copy mode for faster processing
      'output.mp4'
    ]);
    
    // Read the output file
    const data = await ffmpeg.readFile('output.mp4');
    
    // Convert to blob and return
    return new Blob([data], { type: file.type });
  } catch (error) {
    console.error('Error trimming video:', error);
    throw error;
  }
};

// Generate a thumbnail from a video at a specific time point
export const generateThumbnail = async (
  file: File,
  timePoint: number
): Promise<Blob> => {
  const ffmpeg = await initializeFFmpeg();
  
  try {
    // Load the file into FFmpeg's virtual file system
    await ffmpeg.writeFile('input.mp4', await fetchFile(file));
    
    // Run FFmpeg command to extract a frame as a thumbnail
    await ffmpeg.exec([
      '-ss', timePoint.toString(),
      '-i', 'input.mp4',
      '-vframes', '1',
      '-q:v', '2',
      'thumbnail.jpg'
    ]);
    
    // Read the output file
    const data = await ffmpeg.readFile('thumbnail.jpg');
    
    // Convert to blob and return
    return new Blob([data], { type: 'image/jpeg' });
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw error;
  }
};