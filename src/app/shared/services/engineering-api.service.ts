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
   * Actualiza la información de ingeniería de un proyecto
   */
  update(projectId: string, engineering: Partial<Engineering>): Observable<Engineering> {
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
   * Sube un documento con categoría
   * @param projectId ID del proyecto
   * @param file Archivo a subir
   * @param categoryId ID de la categoría existente (opcional si se proporciona newCategoryName)
   * @param newCategoryName Nombre para crear una nueva categoría (opcional si se proporciona categoryId)
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
