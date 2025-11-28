import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Engineering, EngineeringDocumentType } from '../interfaces/engineering.interface';

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
   * Actualiza la información de ingeniería de un proyecto
   */
  update(projectId: string, engineering: Partial<Engineering>): Observable<Engineering> {
    return this.http.patch<Engineering>(`${this.baseUrl}/engineering/project/${projectId}`, engineering);
  }

  /**
   * Sube un archivo de ingeniería al proyecto
   * @param projectId ID del proyecto
   * @param file Archivo a subir
   * @param type Tipo de documento (structural, schedule, fabrication, assembly, bom, other)
   */
  uploadFile(projectId: string, file: File, type: EngineeringDocumentType): Observable<Engineering> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return this.http.post<Engineering>(`${this.baseUrl}/engineering/project/${projectId}/files`, formData);
  }

  /**
   * Elimina un archivo de ingeniería del proyecto
   * @param projectId ID del proyecto
   * @param url URL completa del documento a eliminar
   */
  deleteFile(projectId: string, url: string): Observable<Engineering> {
    return this.http.delete<Engineering>(`${this.baseUrl}/engineering/project/${projectId}/files`, {
      params: { url },
    });
  }
}

