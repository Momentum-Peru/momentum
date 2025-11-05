import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DailyReport } from '../interfaces/daily-report.interface';

@Injectable({
  providedIn: 'root',
})
export class DailyExpensesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<DailyReport[]> {
    return this.http.get<DailyReport[]>(`${this.baseUrl}/daily-reports`);
  }

  getStats(filters?: {
    userId?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<any> {
    let url = `${this.baseUrl}/daily-reports/stats`;
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (params.toString()) url += `?${params.toString()}`;
    return this.http.get<any>(url);
  }

  listWithFilters(filters?: {
    userId?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
    q?: string;
  }): Observable<DailyReport[]> {
    let url = `${this.baseUrl}/daily-reports`;
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.q) params.append('q', filters.q);
    if (params.toString()) url += `?${params.toString()}`;
    return this.http.get<DailyReport[]>(url);
  }

  getByUser(
    userId: string,
    filters?: { startDate?: string; endDate?: string }
  ): Observable<DailyReport[]> {
    let url = `${this.baseUrl}/daily-reports/user/${userId}`;
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (params.toString()) url += `?${params.toString()}`;
    return this.http.get<DailyReport[]>(url);
  }

  getByProject(
    projectId: string,
    filters?: { startDate?: string; endDate?: string }
  ): Observable<DailyReport[]> {
    let url = `${this.baseUrl}/daily-reports/project/${projectId}`;
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (params.toString()) url += `?${params.toString()}`;
    return this.http.get<DailyReport[]>(url);
  }

  getById(id: string): Observable<DailyReport> {
    return this.http.get<DailyReport>(`${this.baseUrl}/daily-reports/${id}`);
  }

  create(report: DailyReport): Observable<DailyReport> {
    return this.http.post<DailyReport>(`${this.baseUrl}/daily-reports`, report);
  }

  update(id: string, report: Partial<DailyReport>): Observable<DailyReport> {
    return this.http.patch<DailyReport>(`${this.baseUrl}/daily-reports/${id}`, report);
  }

  delete(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/daily-reports/${id}`);
  }

  /**
   * Subir documento a observación
   */
  /**
   * Subida de archivos al reporte (según API)
   */
  uploadDocument(reportId: string, file: File): Observable<DailyReport> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/documents`, formData);
  }

  deleteDocument(reportId: string, documentUrl: string): Observable<DailyReport> {
    return this.http.delete<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/documents`, {
      body: { documentUrl },
    });
  }

  uploadAudio(reportId: string, file: File): Observable<DailyReport> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/audio`, formData);
  }

  uploadVideo(reportId: string, file: File): Observable<DailyReport> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/video`, formData);
  }

  uploadPhoto(reportId: string, file: File): Observable<DailyReport> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/photo`, formData);
  }

  deleteAudio(reportId: string, audioUrl: string): Observable<DailyReport> {
    return this.http.delete<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/audio`, {
      body: { audioUrl },
    });
  }

  deleteVideo(reportId: string, videoUrl: string): Observable<DailyReport> {
    return this.http.delete<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/video`, {
      body: { videoUrl },
    });
  }

  deletePhoto(reportId: string, photoUrl: string): Observable<DailyReport> {
    return this.http.delete<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/photo`, {
      body: { photoUrl },
    });
  }
}
