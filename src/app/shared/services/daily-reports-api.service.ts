import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, timeout, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DailyReport } from '../interfaces/daily-report.interface';

interface DailyReportStats {
    total: number;
    byProject: { projectId: string; projectName: string; count: number }[];
    byUser: { userId: string; userName: string; count: number }[];
    byDate: { date: string; count: number }[];
}

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
  }): Observable<DailyReportStats> {
    let url = `${this.baseUrl}/daily-reports/stats`;
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (params.toString()) url += `?${params.toString()}`;
    return this.http.get<DailyReportStats>(url);
  }

  listWithFilters(filters?: {
    userId?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
    q?: string;
    tenantId?: string; // Para filtrar por empresa (rol gerencia)
  }): Observable<DailyReport[]> {
    let url = `${this.baseUrl}/daily-reports`;
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.q) params.append('q', filters.q);
    if (filters?.tenantId) params.append('tenantId', filters.tenantId);
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
    
    // Calcular timeout basado en el tamaño del archivo
    const fileSizeMB = file.size / (1024 * 1024);
    const timeoutMs = Math.max(30000, 30000 + (fileSizeMB * 5000)); // Mínimo 30s, +5s por MB
    const maxTimeout = 300000; // Máximo 5 minutos
    const finalTimeout = Math.min(timeoutMs, maxTimeout);

    return this.http.post<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/documents`, formData, {
      headers: new HttpHeaders({}),
      reportProgress: false,
    }).pipe(
      timeout(finalTimeout),
      catchError((error) => {
        console.error('Error en uploadDocument:', { fileName: file.name, error });
        return throwError(() => error);
      })
    );
  }

  deleteDocument(reportId: string, documentUrl: string): Observable<DailyReport> {
    return this.http.delete<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/documents`, {
      body: { documentUrl },
    });
  }

  uploadAudio(reportId: string, file: File): Observable<DailyReport> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Calcular timeout basado en el tamaño del archivo
    const fileSizeMB = file.size / (1024 * 1024);
    const timeoutMs = Math.max(30000, 30000 + (fileSizeMB * 5000)); // Mínimo 30s, +5s por MB
    const maxTimeout = 300000; // Máximo 5 minutos
    const finalTimeout = Math.min(timeoutMs, maxTimeout);

    return this.http.post<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/audio`, formData, {
      headers: new HttpHeaders({}),
      reportProgress: false,
    }).pipe(
      timeout(finalTimeout),
      catchError((error) => {
        console.error('Error en uploadAudio:', { fileName: file.name, error });
        return throwError(() => error);
      })
    );
  }

  uploadVideo(reportId: string, file: File): Observable<DailyReport> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Calcular timeout basado en el tamaño del archivo
    const fileSizeMB = file.size / (1024 * 1024);
    const timeoutMs = Math.max(60000, 60000 + (fileSizeMB * 10000)); // Mínimo 60s, +10s por MB (videos son más grandes)
    const maxTimeout = 600000; // Máximo 10 minutos para videos
    const finalTimeout = Math.min(timeoutMs, maxTimeout);

    return this.http.post<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/video`, formData, {
      headers: new HttpHeaders({}),
      reportProgress: false,
    }).pipe(
      timeout(finalTimeout),
      catchError((error) => {
        console.error('Error en uploadVideo:', { fileName: file.name, error });
        return throwError(() => error);
      })
    );
  }

  uploadPhoto(reportId: string, file: File): Observable<DailyReport> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Calcular timeout basado en el tamaño del archivo
    const fileSizeMB = file.size / (1024 * 1024);
    const timeoutMs = Math.max(30000, 30000 + (fileSizeMB * 5000)); // Mínimo 30s, +5s por MB
    const maxTimeout = 300000; // Máximo 5 minutos
    const finalTimeout = Math.min(timeoutMs, maxTimeout);

    return this.http.post<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/photo`, formData, {
      headers: new HttpHeaders({}),
      reportProgress: false,
    }).pipe(
      timeout(finalTimeout),
      catchError((error) => {
        console.error('Error en uploadPhoto:', { fileName: file.name, error });
        return throwError(() => error);
      })
    );
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
