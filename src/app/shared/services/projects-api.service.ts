import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Project, ProjectOption } from '../interfaces/project.interface';
import { PresignedUrlResponse } from './presigned-upload.service';
import { PresignedUploadService } from './presigned-upload.service';

interface ProjectStats {
  total: number;
  active: number;
  inactive: number;
  byStatus: { status: string; count: number }[];
  byClient: { clientId: string; clientName: string; count: number }[];
}

@Injectable({
  providedIn: 'root',
})
export class ProjectsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly presignedUpload = inject(PresignedUploadService);

  list(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/projects`);
  }

  listActive(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/projects/active`);
  }

  getStats(): Observable<ProjectStats> {
    return this.http.get<ProjectStats>(`${this.baseUrl}/projects/stats`);
  }

  listWithFilters(filters?: {
    clientId?: string;
    status?: string;
    activeOnly?: boolean;
    q?: string;
  }): Observable<Project[]> {
    let url = `${this.baseUrl}/projects`;
    const params = new URLSearchParams();
    if (filters?.clientId) params.append('clientId', filters.clientId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.activeOnly) params.append('activeOnly', filters.activeOnly.toString());
    if (filters?.q) params.append('q', filters.q);
    if (params.toString()) url += `?${params.toString()}`;
    return this.http.get<Project[]>(url);
  }

  getOptions(): Observable<ProjectOption[]> {
    return this.http.get<ProjectOption[]>(`${this.baseUrl}/projects/options`);
  }

  getById(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.baseUrl}/projects/${id}`);
  }

  getByCode(code: string): Observable<Project> {
    return this.http.get<Project>(`${this.baseUrl}/projects/code/${code}`);
  }

  getNextCode(): Observable<{ nextCode: number }> {
    return this.http.get<{ nextCode: number }>(`${this.baseUrl}/projects/next-code`);
  }

  create(project: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(`${this.baseUrl}/projects`, project);
  }

  update(id: string, project: Partial<Project>): Observable<Project> {
    return this.http.patch<Project>(`${this.baseUrl}/projects/${id}`, project);
  }

  updateStatus(id: string, status: string): Observable<Project> {
    return this.http.patch<Project>(`${this.baseUrl}/projects/${id}/status`, { status });
  }

  toggleActive(id: string): Observable<Project> {
    return this.http.patch<Project>(`${this.baseUrl}/projects/${id}/toggle-active`, {});
  }

  delete(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/projects/${id}`);
  }

  getByClient(clientId: string, activeOnly?: boolean): Observable<Project[]> {
    let url = `${this.baseUrl}/projects/client/${clientId}`;
    if (activeOnly) url += '?activeOnly=true';
    return this.http.get<Project[]>(url);
  }

  /**
   * Sube archivos a un proyecto usando Presigned URLs
   */
  async uploadProjectAttachments(
    projectId: string,
    files: File[],
    uploadedBy: string,
    description?: string,
    onProgress?: (progress: number) => void
  ): Promise<Project> {
    try {
      // Paso 1: Generar Presigned URLs
      const presignedResponses: PresignedUrlResponse[] = await firstValueFrom(
        this.http.post<PresignedUrlResponse[]>(
          `${this.baseUrl}/projects/${projectId}/attachments/presigned-urls`,
          {
            files: files.map((f) => ({
              fileName: f.name,
              contentType: f.type || 'application/octet-stream',
            })),
            expirationTime: 300, // 5 minutos
          }
        )
      );

      // Paso 2: Subir archivos directamente a S3
      const uploadPromises = presignedResponses.map(
        (presignedResponse: PresignedUrlResponse, index: number) => {
          const file = files[index];
          return this.presignedUpload
            .uploadFileToS3(
              presignedResponse.presignedUrl,
              file,
              file.type || 'application/octet-stream',
              onProgress
            )
            .then(() => presignedResponse);
        }
      );

      await Promise.all(uploadPromises);

      // Paso 3: Confirmar subida al backend
      const attachments = presignedResponses.map(
        (presignedResponse: PresignedUrlResponse, index: number) => {
          const file = files[index];
          return {
            publicUrl: presignedResponse.publicUrl,
            key: presignedResponse.key,
            originalName: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            uploadedBy,
            description,
          };
        }
      );

      const updatedProject = await firstValueFrom(
        this.http.post<Project>(`${this.baseUrl}/projects/${projectId}/attachments/confirm`, {
          attachments,
        })
      );

      return updatedProject;
    } catch (error) {
      console.error('Error uploading project attachments:', error);
      throw error;
    }
  }

  deleteProjectAttachment(projectId: string, attachmentId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/projects/${projectId}/attachments/${attachmentId}`
    );
  }

  assignEmployee(projectId: string, employeeId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/projects/${projectId}/assign/${employeeId}`, {});
  }

  removeAssignment(projectId: string, employeeId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/projects/${projectId}/assign/${employeeId}`);
  }

  getProjectEmployees(projectId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/projects/${projectId}/employees`);
  }
}
