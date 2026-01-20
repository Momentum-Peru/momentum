import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Engineering,
  EngineeringDocumentType,
  DocumentCategory,
  EngineeringDocument,
  DocumentsByCategory,
} from '../interfaces/engineering.interface';

@Injectable({
  providedIn: 'root',
})
export class EngineeringApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Crea un registro de ingeniería para un proyecto
   */
  create(engineering: Partial<Engineering>): Observable<Engineering> {
    return this.http.post<Engineering>(`${this.baseUrl}/engineering`, engineering);
  }

  /**
   * Obtiene la información de ingeniería asociada a un proyecto
   */
  getByProject(projectId: string): Observable<Engineering> {
    return this.http.get<Engineering>(`${this.baseUrl}/engineering/project/${projectId}`);
  }

  /**
   * Obtiene la información completa de ingeniería con documentos agrupados por categoría
   */
  getByProjectFull(projectId: string): Observable<Engineering> {
    return this.http.get<Engineering>(`${this.baseUrl}/engineering/project/${projectId}/full`);
  }

  /**
   * Obtiene todos los proyectos de ingeniería con sus documentos agrupados por categoría
   */
  getAllWithDocuments(): Observable<Engineering[]> {
    return this.http.get<Engineering[]>(`${this.baseUrl}/engineering/all`);
  }

  /**
   * Actualiza la información de ingeniería por su ID (permite cambiar projectId)
   */
  update(id: string, engineering: Partial<Engineering>): Observable<Engineering> {
    return this.http.patch<Engineering>(
      `${this.baseUrl}/engineering/${id}`,
      engineering
    );
  }

  /**
   * @deprecated Usar update() con el _id del registro en su lugar
   * Actualiza la información de ingeniería buscando por projectId (legacy)
   */
  updateByProject(projectId: string, engineering: Partial<Engineering>): Observable<Engineering> {
    return this.http.patch<Engineering>(
      `${this.baseUrl}/engineering/project/${projectId}`,
      engineering
    );
  }

  // ==================== ENDPOINTS LEGACY (compatibilidad) ====================

  /**
   * @deprecated Usar uploadDocument con categoría en su lugar
   * Sube un archivo de ingeniería al proyecto (sistema legacy de tipos)
   */
  uploadFile(
    projectId: string,
    file: File,
    type: EngineeringDocumentType
  ): Observable<Engineering> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return this.http.post<Engineering>(
      `${this.baseUrl}/engineering/project/${projectId}/files`,
      formData
    );
  }

  /**
   * @deprecated Usar deleteDocument en su lugar
   * Elimina un archivo de ingeniería del proyecto (sistema legacy)
   */
  deleteFile(projectId: string, url: string): Observable<Engineering> {
    return this.http.delete<Engineering>(`${this.baseUrl}/engineering/project/${projectId}/files`, {
      params: { url },
    });
  }

  // ==================== CATEGORÍAS DE DOCUMENTOS ====================

  /**
   * Crea una nueva categoría de documentos
   */
  createCategory(category: Partial<DocumentCategory>): Observable<DocumentCategory> {
    return this.http.post<DocumentCategory>(`${this.baseUrl}/engineering/categories`, category);
  }

  /**
   * Obtiene todas las categorías de documentos
   * @param includeInactive Si es true, incluye categorías inactivas
   */
  getCategories(includeInactive = false): Observable<DocumentCategory[]> {
    const params: Record<string, string> = includeInactive ? { includeInactive: 'true' } : {};
    return this.http.get<DocumentCategory[]>(`${this.baseUrl}/engineering/categories`, { params });
  }

  /**
   * Obtiene una categoría por su ID
   */
  getCategoryById(id: string): Observable<DocumentCategory> {
    return this.http.get<DocumentCategory>(`${this.baseUrl}/engineering/categories/${id}`);
  }

  /**
   * Actualiza una categoría de documentos
   */
  updateCategory(id: string, category: Partial<DocumentCategory>): Observable<DocumentCategory> {
    return this.http.patch<DocumentCategory>(
      `${this.baseUrl}/engineering/categories/${id}`,
      category
    );
  }

  /**
   * Elimina una categoría de documentos
   */
  deleteCategory(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/engineering/categories/${id}`);
  }

  // ==================== DOCUMENTOS CON CATEGORÍA ====================

  /**
   * @deprecated Usar uploadDocumentWithPresignedUrl para archivos grandes
   * Sube un documento con categoría (pasa por el servidor, límite ~1MB en producción)
   */
  uploadDocument(
    projectId: string,
    file: File,
    categoryId?: string,
    newCategoryName?: string
  ): Observable<EngineeringDocument> {
    const formData = new FormData();
    formData.append('file', file);
    if (categoryId) {
      formData.append('categoryId', categoryId);
    }
    if (newCategoryName) {
      formData.append('newCategoryName', newCategoryName);
    }
    return this.http.post<EngineeringDocument>(
      `${this.baseUrl}/engineering/project/${projectId}/documents`,
      formData
    );
  }

  /**
   * Genera una Presigned URL para subir un documento directamente a S3
   */
  generatePresignedUrl(
    projectId: string,
    fileName: string,
    contentType: string,
    categoryId: string
  ): Observable<{
    presignedUrl: string;
    publicUrl: string;
    key: string;
    fileName: string;
    categoryId: string;
  }> {
    return this.http.post<{
      presignedUrl: string;
      publicUrl: string;
      key: string;
      fileName: string;
      categoryId: string;
    }>(`${this.baseUrl}/engineering/project/${projectId}/documents/presigned`, {
      fileName,
      contentType,
      categoryId,
    });
  }

  /**
   * Confirma y registra un documento después de subirlo a S3
   */
  confirmDocumentUpload(
    projectId: string,
    fileName: string,
    fileUrl: string,
    categoryId: string,
    fileSize?: number
  ): Observable<EngineeringDocument> {
    return this.http.post<EngineeringDocument>(
      `${this.baseUrl}/engineering/project/${projectId}/documents/confirm`,
      {
        fileName,
        fileUrl,
        categoryId,
        fileSize,
      }
    );
  }

  /**
   * Sube un documento usando Presigned URL (recomendado para archivos grandes)
   * Flujo: 1) Obtener presigned URL, 2) Subir a S3, 3) Confirmar subida
   */
  async uploadDocumentWithPresignedUrl(
    projectId: string,
    file: File,
    categoryId: string,
    onProgress?: (progress: number) => void
  ): Promise<EngineeringDocument> {
    // Paso 1: Obtener presigned URL
    const presignedData = await this.http
      .post<{
        presignedUrl: string;
        publicUrl: string;
        key: string;
        fileName: string;
        categoryId: string;
      }>(`${this.baseUrl}/engineering/project/${projectId}/documents/presigned`, {
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        categoryId,
      })
      .toPromise();

    if (!presignedData) {
      throw new Error('No se pudo obtener la URL de subida');
    }

    // Paso 2: Subir directamente a S3
    await this.uploadToS3(presignedData.presignedUrl, file, onProgress);

    // Paso 3: Confirmar la subida
    const document = await this.http
      .post<EngineeringDocument>(
        `${this.baseUrl}/engineering/project/${projectId}/documents/confirm`,
        {
          fileName: file.name,
          fileUrl: presignedData.publicUrl,
          categoryId,
          fileSize: file.size,
        }
      )
      .toPromise();

    if (!document) {
      throw new Error('No se pudo confirmar la subida del documento');
    }

    return document;
  }

  /**
   * Sube un archivo directamente a S3 usando la presigned URL
   */
  private uploadToS3(
    presignedUrl: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Error al subir archivo: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Error de red al subir el archivo'));
      });

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });
  }

  /**
   * Obtiene los documentos de un proyecto agrupados por categoría
   */
  getDocumentsByProject(projectId: string): Observable<DocumentsByCategory[]> {
    return this.http.get<DocumentsByCategory[]>(
      `${this.baseUrl}/engineering/project/${projectId}/documents`
    );
  }

  /**
   * Elimina un documento por su ID
   */
  deleteDocument(projectId: string, documentId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/engineering/project/${projectId}/documents/${documentId}`
    );
  }
}
