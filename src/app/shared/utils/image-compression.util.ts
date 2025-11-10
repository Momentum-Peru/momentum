/**
 * Utilidad para comprimir y redimensionar imágenes antes de subirlas
 * Esto ayuda a evitar errores de CORS y timeouts con archivos grandes
 */

export interface ImageCompressionOptions {
  /** Ancho máximo en píxeles (por defecto: 1920) */
  maxWidth?: number;
  /** Alto máximo en píxeles (por defecto: 1920) */
  maxHeight?: number;
  /** Calidad de compresión JPEG (0-1, por defecto: 0.85) */
  quality?: number;
  /** Tamaño máximo del archivo en MB (por defecto: 2) */
  maxSizeMB?: number;
  /** Tipo MIME de salida (por defecto: 'image/jpeg') */
  outputType?: string;
}

const DEFAULT_OPTIONS: Required<ImageCompressionOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  maxSizeMB: 2,
  outputType: 'image/jpeg',
};

/**
 * Comprime y redimensiona una imagen
 * @param file Archivo de imagen original
 * @param options Opciones de compresión
 * @returns Promise con el archivo comprimido
 */
export async function compressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Si el archivo ya es pequeño y es JPEG, comprimir de todas formas si es mayor a 500KB
  // para asegurar que esté dentro del límite del servidor
  const fileSizeMB = file.size / (1024 * 1024);
  const fileSizeKB = file.size / 1024;
  if (fileSizeMB <= opts.maxSizeMB && file.type === 'image/jpeg' && fileSizeKB <= 500) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Calcular nuevas dimensiones manteniendo la proporción
          let { width, height } = img;
          const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);

          if (ratio < 1) {
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // Crear canvas y redimensionar
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo obtener el contexto del canvas'));
            return;
          }

          // Configurar calidad de renderizado
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Dibujar imagen redimensionada
          ctx.drawImage(img, 0, 0, width, height);

          // Convertir a blob con compresión
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Error al comprimir la imagen'));
                return;
              }

              // Verificar tamaño final y aplicar compresión iterativa si es necesario
              const finalSizeMB = blob.size / (1024 * 1024);
              
              // Compresión iterativa: reducir calidad progresivamente hasta alcanzar el tamaño objetivo
              const compressIteratively = (currentBlob: Blob, currentQuality: number, attempts: number = 0): void => {
                if (attempts >= 3) {
                  // Después de 3 intentos, usar el blob más pequeño que tengamos
                  const compressedFile = new File(
                    [currentBlob],
                    file.name.replace(/\.[^/.]+$/, '.jpg'),
                    { type: opts.outputType, lastModified: Date.now() }
                  );
                  resolve(compressedFile);
                  return;
                }

                const currentSizeMB = currentBlob.size / (1024 * 1024);
                
                if (currentSizeMB <= opts.maxSizeMB) {
                  // Tamaño aceptable
                  const compressedFile = new File(
                    [currentBlob],
                    file.name.replace(/\.[^/.]+$/, '.jpg'),
                    { type: opts.outputType, lastModified: Date.now() }
                  );
                  resolve(compressedFile);
                  return;
                }

                // Reducir calidad más agresivamente
                const newQuality = Math.max(0.4, currentQuality - 0.1);
                canvas.toBlob(
                  (newBlob) => {
                    if (!newBlob) {
                      // Si falla, usar el blob anterior
                      const compressedFile = new File(
                        [currentBlob],
                        file.name.replace(/\.[^/.]+$/, '.jpg'),
                        { type: opts.outputType, lastModified: Date.now() }
                      );
                      resolve(compressedFile);
                      return;
                    }
                    compressIteratively(newBlob, newQuality, attempts + 1);
                  },
                  opts.outputType,
                  newQuality
                );
              };

              compressIteratively(blob, opts.quality);
            },
            opts.outputType,
            opts.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Error al cargar la imagen'));
      };

      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        reject(new Error('Error al leer el archivo'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Comprime múltiples imágenes en paralelo
 * @param files Array de archivos de imagen
 * @param options Opciones de compresión
 * @returns Promise con array de archivos comprimidos
 */
export async function compressImages(
  files: File[],
  options: ImageCompressionOptions = {}
): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file, options)));
}

