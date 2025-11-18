/**
 * Utilidad para comprimir videos antes de subirlos
 * Reduce el tamaño del archivo reduciendo resolución y calidad
 */

export interface VideoCompressionOptions {
  /** Ancho máximo en píxeles (por defecto: 1280) */
  maxWidth?: number;
  /** Alto máximo en píxeles (por defecto: 720) */
  maxHeight?: number;
  /** Bitrate objetivo en bits por segundo (por defecto: 2000000 = 2Mbps) */
  bitrate?: number;
  /** Tamaño máximo del archivo en MB (por defecto: 50) */
  maxSizeMB?: number;
  /** Frame rate máximo (por defecto: 30) */
  maxFPS?: number;
  /** Calidad de video (0-1, por defecto: 0.7) */
  quality?: number;
}

const DEFAULT_OPTIONS: Required<VideoCompressionOptions> = {
  maxWidth: 1280,
  maxHeight: 720,
  bitrate: 2000000, // 2Mbps
  maxSizeMB: 50,
  maxFPS: 30,
  quality: 0.7,
};

/**
 * Comprime un video reduciendo resolución y calidad
 * @param file Archivo de video original
 * @param options Opciones de compresión
 * @returns Promise con el archivo comprimido
 */
/**
 * Obtiene el mejor codec disponible para MediaRecorder
 */
function getBestVideoCodec(): string {
  const codecs = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];

  for (const codec of codecs) {
    if (MediaRecorder.isTypeSupported(codec)) {
      return codec;
    }
  }

  // Fallback a webm sin codec específico
  return 'video/webm';
}

export async function compressVideo(
  file: File,
  options: VideoCompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Si el archivo ya es pequeño, no comprimir
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB <= opts.maxSizeMB) {
    return file;
  }

  // Verificar que el archivo sea un video
  if (!file.type.startsWith('video/')) {
    console.warn('El archivo no es un video, se devuelve sin comprimir');
    return file;
  }

  // Verificar compatibilidad de MediaRecorder
  if (!window.MediaRecorder) {
    console.warn('MediaRecorder no está disponible, se devuelve el archivo original');
    return file;
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('No se pudo obtener el contexto del canvas'));
      return;
    }

    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true; // Necesario para reproducir en algunos navegadores
    video.playsInline = true;
    video.preload = 'metadata';

    let mediaRecorder: MediaRecorder | null = null;
    let animationFrameId: number | null = null;
    let timeoutId: number | null = null;

    const cleanup = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      URL.revokeObjectURL(url);
      video.remove();
      if (
        mediaRecorder &&
        (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')
      ) {
        try {
          mediaRecorder.stop();
        } catch {
          // Ignorar errores al detener
        }
      }
    };

    video.onloadedmetadata = () => {
      try {
        // Calcular nuevas dimensiones manteniendo la proporción
        let { videoWidth, videoHeight } = video;
        const ratio = Math.min(opts.maxWidth / videoWidth, opts.maxHeight / videoHeight);

        if (ratio < 1) {
          videoWidth = Math.round(videoWidth * ratio);
          videoHeight = Math.round(videoHeight * ratio);
        }

        canvas.width = videoWidth;
        canvas.height = videoHeight;

        // Obtener el mejor codec disponible
        const mimeType = getBestVideoCodec();

        // Configurar MediaRecorder
        const stream = canvas.captureStream(opts.maxFPS);

        try {
          mediaRecorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: opts.bitrate,
          });
        } catch (error) {
          cleanup();
          reject(new Error('No se pudo crear MediaRecorder: ' + (error as Error).message));
          return;
        }

        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          cleanup();

          if (chunks.length === 0) {
            reject(new Error('No se generaron datos de video'));
            return;
          }

          const compressedBlob = new Blob(chunks, { type: mimeType });
          const compressedSizeMB = compressedBlob.size / (1024 * 1024);

          // Si el video comprimido es más grande que el original, devolver el original
          if (compressedSizeMB >= fileSizeMB * 0.95) {
            console.warn(
              'El video comprimido es similar o más grande que el original, se devuelve el original'
            );
            resolve(file);
            return;
          }

          // Si aún es muy grande, intentar con más compresión
          if (compressedSizeMB > opts.maxSizeMB && opts.bitrate > 1000000) {
            // Reducir bitrate y reintentar
            const newOpts = { ...opts, bitrate: Math.floor(opts.bitrate * 0.7) };
            compressVideo(file, newOpts)
              .then(resolve)
              .catch(() => {
                // Si falla, devolver el comprimido actual
                const extension = mimeType.includes('mp4') ? '.mp4' : '.webm';
                const compressedFile = new File(
                  [compressedBlob],
                  file.name.replace(/\.[^/.]+$/, extension),
                  { type: mimeType, lastModified: Date.now() }
                );
                resolve(compressedFile);
              });
            return;
          }

          const extension = mimeType.includes('mp4') ? '.mp4' : '.webm';
          const compressedFile = new File(
            [compressedBlob],
            file.name.replace(/\.[^/.]+$/, extension),
            { type: mimeType, lastModified: Date.now() }
          );

          console.log('Video comprimido:', {
            originalSize: `${fileSizeMB.toFixed(2)}MB`,
            compressedSize: `${compressedSizeMB.toFixed(2)}MB`,
            reduction: `${((1 - compressedSizeMB / fileSizeMB) * 100).toFixed(1)}%`,
          });

          resolve(compressedFile);
        };

        mediaRecorder.onerror = () => {
          cleanup();
          reject(new Error('Error durante la compresión del video'));
        };

        // Iniciar grabación
        try {
          mediaRecorder.start(100); // Capturar datos cada 100ms
        } catch (error) {
          cleanup();
          reject(new Error('Error al iniciar MediaRecorder: ' + (error as Error).message));
          return;
        }

        // Reproducir video y capturar frames
        video.currentTime = 0;

        const drawFrame = () => {
          if (
            video.ended ||
            video.paused ||
            !mediaRecorder ||
            mediaRecorder.state !== 'recording'
          ) {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
            return;
          }

          try {
            ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
            animationFrameId = requestAnimationFrame(drawFrame);
          } catch (error) {
            console.error('Error al dibujar frame:', error);
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          }
        };

        video.onplay = () => {
          drawFrame();
        };

        video.play().catch((err) => {
          cleanup();
          reject(new Error('Error al reproducir el video: ' + err.message));
        });

        // Timeout de seguridad (máximo 5 minutos)
        timeoutId = window.setTimeout(() => {
          if (
            mediaRecorder &&
            (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')
          ) {
            mediaRecorder.stop();
          }
        }, 5 * 60 * 1000);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Error al cargar el video'));
    };

    // Cargar el video
    video.load();
  });
}

/**
 * Comprime múltiples videos en paralelo
 * @param files Array de archivos de video
 * @param options Opciones de compresión
 * @returns Promise con array de archivos comprimidos
 */
export async function compressVideos(
  files: File[],
  options: VideoCompressionOptions = {}
): Promise<File[]> {
  return Promise.all(files.map((file) => compressVideo(file, options)));
}
