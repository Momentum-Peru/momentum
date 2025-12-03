import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Respuesta de una Presigned URL generada por el backend
 */
export interface PresignedUrlResponse {
  presignedUrl: string;
  publicUrl: string;
  key: string;
}

/**
 * Request para generar una Presigned URL
 */
export interface PresignedUrlRequest {
  fileName: string;
  contentType: string;
  expirationTime?: number;
  prefix?: string;
}

/**
 * Opciones para subir un archivo usando Presigned URL
 */
export interface UploadFileOptions {
  /**
   * Prefijo para la ruta en S3 (opcional)
   * Por defecto: 'uploads'
   */
  prefix?: string;
  /**
   * Tiempo de expiración en segundos (opcional)
   * Por defecto: 300 (5 minutos)
   */
  expirationTime?: number;
  /**
   * Callback opcional para reportar progreso
   */
  onProgress?: (progress: number) => void;
}

/**
 * Resultado de la subida de un archivo
 */
export interface UploadResult {
  publicUrl: string;
  key: string;
  fileName: string;
}

/**
 * Servicio genérico para manejar el flujo completo de Presigned URLs
 * 
 * Flujo:
 * 1. Solicitar Presigned URL al backend (solo nombre y tipo de archivo)
 * 2. Subir archivo directamente a S3 usando la URL firmada
 * 3. Confirmar subida al backend (opcional)
 */
@Injectable({ providedIn: 'root' })
export class PresignedUploadService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Genera una Presigned URL para subir un archivo
   * @param fileName Nombre del archivo con extensión
   * @param contentType Tipo MIME del archivo
   * @param options Opciones adicionales (prefix, expirationTime)
   * @returns Observable con la Presigned URL y URL pública
   */
  generatePresignedUrl(
    fileName: string,
    contentType: string,
    options?: { prefix?: string; expirationTime?: number }
  ): Observable<PresignedUrlResponse> {
    const body = {
      fileName,
      contentType,
      ...(options?.prefix && { prefix: options.prefix }),
      ...(options?.expirationTime && { expirationTime: options.expirationTime }),
    };

    return this.http.post<PresignedUrlResponse>(
      `${this.baseUrl}/upload/presigned-url`,
      body
    );
  }

  /**
   * Genera múltiples Presigned URLs para subir varios archivos
   * @param files Array de archivos con nombre y tipo
   * @param expirationTime Tiempo de expiración en segundos (opcional)
   * @returns Observable con array de Presigned URLs
   */
  generateMultiplePresignedUrls(
    files: Array<{ fileName: string; contentType: string; prefix?: string }>,
    expirationTime?: number
  ): Observable<PresignedUrlResponse[]> {
    const body: {
      files: PresignedUrlRequest[];
      expirationTime?: number;
    } = {
      files: files.map((f) => ({
        fileName: f.fileName,
        contentType: f.contentType,
        ...(f.prefix && { prefix: f.prefix }),
      })),
      ...(expirationTime && { expirationTime }),
    };

    return this.http.post<PresignedUrlResponse[]>(
      `${this.baseUrl}/upload/presigned-urls`,
      body
    );
  }

  /**
   * Sube un archivo directamente a S3 usando una Presigned URL
   * IMPORTANTE: No incluye headers de Authorization (la URL ya está firmada)
   * IMPORTANTE: El contentType debe coincidir exactamente con el usado para generar la Presigned URL
   * @param presignedUrl URL firmada de S3
   * @param file Archivo a subir
   * @param contentType Tipo MIME del archivo (debe coincidir con el usado en la Presigned URL)
   * @param onProgress Callback opcional para reportar progreso
   * @returns Promise que se resuelve cuando la subida es exitosa
   */
  async uploadFileToS3(
    presignedUrl: string,
    file: File,
    contentType?: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      // Usar el contentType proporcionado o el del archivo como fallback
      // Es importante que coincida con el usado para generar la Presigned URL
      const finalContentType = contentType || file.type || 'application/octet-stream';

      // Usar XMLHttpRequest para soportar progreso
      if (onProgress) {
        return new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percentComplete = (e.loaded / e.total) * 100;
              onProgress(percentComplete);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
              resolve();
            } else {
              const errorText = xhr.responseText || xhr.statusText;
              this.handleUploadError(xhr.status, errorText, reject);
            }
          });

          xhr.addEventListener('error', () => {
            const currentOrigin = window.location.origin;
            reject(
              new Error(
                `Error de red/CORS: No se pudo conectar a S3 desde "${currentOrigin}". ` +
                  `Verifica que el bucket tenga configurado CORS para permitir este origen.`
              )
            );
          });

          xhr.open('PUT', presignedUrl);
          xhr.setRequestHeader('Content-Type', finalContentType);
          xhr.send(file);
        });
      } else {
        // Usar fetch si no se necesita progreso
        const response = await fetch(presignedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': finalContentType,
            // NO incluir Authorization - la URL ya está firmada
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Error al subir archivo a S3: ${response.status} ${response.statusText}. ${errorText}`
          );
        }
      }
    } catch (error) {
      // Si es un error de red (CORS bloqueado), mejorar el mensaje
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        const currentOrigin = window.location.origin;
        throw new Error(
          `Error de red/CORS: No se pudo conectar a S3 desde "${currentOrigin}". ` +
            `Verifica que el bucket tenga configurado CORS para permitir este origen.`
        );
      }
      throw error;
    }
  }

  /**
   * Maneja errores de subida
   */
  private handleUploadError(
    status: number,
    errorText: string,
    reject: (reason?: any) => void
  ): void {
    // Detectar errores CORS específicamente
    if (
      status === 0 ||
      errorText.includes('CORS') ||
      errorText.includes('Access-Control')
    ) {
      const currentOrigin = window.location.origin;
      reject(
        new Error(
          `Error CORS: El bucket de S3 no permite el origen "${currentOrigin}". ` +
            `Configura CORS en el bucket para permitir este origen.`
        )
      );
      return;
    }

    reject(
      new Error(
        `Error al subir archivo a S3: ${status} ${errorText || 'Error desconocido'}`
      )
    );
  }

  /**
   * Confirma la subida de un archivo al backend
   * @param fileUrl URL pública del archivo subido a S3
   * @param key Clave (ruta) del archivo en S3 (opcional)
   * @returns Observable con la confirmación
   */
  confirmUpload(fileUrl: string, key?: string): Observable<{ message: string; fileUrl: string; key?: string }> {
    return this.http.post<{ message: string; fileUrl: string; key?: string }>(
      `${this.baseUrl}/upload/confirm`,
      {
        fileUrl,
        ...(key && { key }),
      }
    );
  }

  /**
   * Flujo completo: Solicita Presigned URL, sube el archivo a S3 y confirma
   * @param file Archivo a subir
   * @param options Opciones de subida
   * @returns Promise con el resultado de la subida
   */
  async uploadFile(
    file: File,
    options?: UploadFileOptions
  ): Promise<UploadResult> {
    try {
      // Paso 1: Generar Presigned URL
      const presignedResponse = await firstValueFrom(
        this.generatePresignedUrl(
          file.name,
          file.type || 'application/octet-stream',
          {
            prefix: options?.prefix,
            expirationTime: options?.expirationTime || 300, // 5 minutos por defecto
          }
        )
      );

      // Paso 2: Subir directamente a S3
      await this.uploadFileToS3(
        presignedResponse.presignedUrl,
        file,
        file.type || 'application/octet-stream',
        options?.onProgress
      );

      // Paso 3: Confirmar subida (opcional, puede ser omitido si no se necesita)
      // await firstValueFrom(this.confirmUpload(presignedResponse.publicUrl, presignedResponse.key));

      return {
        publicUrl: presignedResponse.publicUrl,
        key: presignedResponse.key,
        fileName: file.name,
      };
    } catch (error) {
      console.error('Error al subir archivo:', error);
      throw error;
    }
  }

  /**
   * Flujo completo para múltiples archivos
   * @param files Array de archivos a subir
   * @param options Opciones de subida
   * @returns Promise con array de resultados
   */
  async uploadMultipleFiles(
    files: File[],
    options?: UploadFileOptions
  ): Promise<UploadResult[]> {
    try {
      // Paso 1: Generar múltiples Presigned URLs
      const presignedResponses = await firstValueFrom(
        this.generateMultiplePresignedUrls(
          files.map((f) => ({
            fileName: f.name,
            contentType: f.type || 'application/octet-stream',
            prefix: options?.prefix,
          })),
          options?.expirationTime || 300
        )
      );

      // Paso 2: Subir todos los archivos a S3
      const uploadPromises = presignedResponses.map((presignedResponse: PresignedUrlResponse, index: number) => {
        const file = files[index];
        return this.uploadFileToS3(
          presignedResponse.presignedUrl,
          file,
          file.type || 'application/octet-stream',
          options?.onProgress
        ).then(() => ({
          publicUrl: presignedResponse.publicUrl,
          key: presignedResponse.key,
          fileName: file.name,
        }));
      });

      const results = await Promise.all(uploadPromises);

      // Paso 3: Confirmar subidas (opcional)
      // Puedes confirmar cada uno individualmente o crear un endpoint batch

      return results;
    } catch (error) {
      console.error('Error al subir archivos:', error);
      throw error;
    }
  }
}

