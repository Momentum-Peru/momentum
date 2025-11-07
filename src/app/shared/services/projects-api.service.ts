import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Project, ProjectOption } from '../interfaces/project.interface';

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
}
