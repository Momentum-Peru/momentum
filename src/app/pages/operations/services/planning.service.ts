import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TechnicalFile, ProjectCharter, ProjectRoster, SafetyDocument } from '../interfaces/planning.interface';

@Injectable({ providedIn: 'root' })
export class PlanningApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/operations`;

  // ─── Technical Files ──────────────────────────────────────────────
  getTechnicalFiles(serviceOrderId: string): Observable<TechnicalFile[]> {
    return this.http.get<TechnicalFile[]>(`${this.base}/service-orders/${serviceOrderId}/technical-files`);
  }

  createTechnicalFile(data: Partial<TechnicalFile>): Observable<TechnicalFile> {
    return this.http.post<TechnicalFile>(`${this.base}/technical-files`, data);
  }

  deleteTechnicalFile(id: string): Observable<any> {
    return this.http.delete(`${this.base}/technical-files/${id}`);
  }

  // ─── Project Charter ──────────────────────────────────────────────
  getCharter(serviceOrderId: string): Observable<ProjectCharter | null> {
    return this.http.get<ProjectCharter | null>(`${this.base}/service-orders/${serviceOrderId}/charter`);
  }

  upsertCharter(data: Partial<ProjectCharter>): Observable<ProjectCharter> {
    return this.http.post<ProjectCharter>(`${this.base}/charters`, data);
  }

  // ─── Roster ───────────────────────────────────────────────────────
  getRoster(serviceOrderId: string): Observable<ProjectRoster[]> {
    return this.http.get<ProjectRoster[]>(`${this.base}/service-orders/${serviceOrderId}/roster`);
  }

  addToRoster(data: Partial<ProjectRoster>): Observable<ProjectRoster> {
    return this.http.post<ProjectRoster>(`${this.base}/roster`, data);
  }

  removeFromRoster(id: string): Observable<any> {
    return this.http.delete(`${this.base}/roster/${id}`);
  }

  // ─── Safety Docs ──────────────────────────────────────────────────
  getSafetyDocs(serviceOrderId: string): Observable<SafetyDocument[]> {
    return this.http.get<SafetyDocument[]>(`${this.base}/service-orders/${serviceOrderId}/safety-docs`);
  }

  createSafetyDoc(data: Partial<SafetyDocument>): Observable<SafetyDocument> {
    return this.http.post<SafetyDocument>(`${this.base}/safety-docs`, data);
  }

  sendToReview(id: string): Observable<SafetyDocument> {
    return this.http.patch<SafetyDocument>(`${this.base}/safety-docs/${id}/review`, {});
  }

  approveSafetyDoc(id: string): Observable<SafetyDocument> {
    return this.http.patch<SafetyDocument>(`${this.base}/safety-docs/${id}/approve`, {});
  }

  rejectSafetyDoc(id: string, reason: string): Observable<SafetyDocument> {
    return this.http.patch<SafetyDocument>(`${this.base}/safety-docs/${id}/reject`, { reason });
  }

  deleteSafetyDoc(id: string): Observable<any> {
    return this.http.delete(`${this.base}/safety-docs/${id}`);
  }
}
