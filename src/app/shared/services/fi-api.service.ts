import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Accionable,
  AccionableEstado,
  CalendarResponse,
  CreateAccionableRequest,
  CreateFiRequest,
  Fi,
  UpdateAccionableEstadoRequest,
  UpdateAccionableRequest,
  UpdateFiRequest,
} from '../interfaces/fi';

@Injectable({ providedIn: 'root' })
export class FiApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/fi`;

  // FI
  list(params?: { q?: string; isActive?: boolean }): Observable<Fi[]> {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.isActive !== undefined) search.set('isActive', String(params.isActive));
    const query = search.toString();
    return this.http.get<Fi[]>(query ? `${this.baseUrl}?${query}` : this.baseUrl);
  }

  getById(id: string): Observable<Fi> {
    return this.http.get<Fi>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateFiRequest): Observable<Fi> {
    return this.http.post<Fi>(this.baseUrl, payload);
  }

  update(id: string, payload: UpdateFiRequest): Observable<Fi> {
    return this.http.patch<Fi>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<{ deleted: boolean; id: string }> {
    return this.http.delete<{ deleted: boolean; id: string }>(`${this.baseUrl}/${id}`);
  }

  // Accionables
  listActionables(fiId: string, range?: { from?: string; to?: string }): Observable<Accionable[]> {
    const search = new URLSearchParams();
    if (range?.from) search.set('from', range.from);
    if (range?.to) search.set('to', range.to);
    const query = search.toString();
    return this.http.get<Accionable[]>(
      query ? `${this.baseUrl}/${fiId}/actionables?${query}` : `${this.baseUrl}/${fiId}/actionables`
    );
  }

  createActionable(fiId: string, payload: CreateAccionableRequest): Observable<Accionable> {
    return this.http.post<Accionable>(`${this.baseUrl}/${fiId}/actionables`, payload);
  }

  updateActionable(
    fiId: string,
    actionableId: string,
    payload: UpdateAccionableRequest
  ): Observable<Accionable> {
    return this.http.patch<Accionable>(
      `${this.baseUrl}/${fiId}/actionables/${actionableId}`,
      payload
    );
  }

  updateActionableEstado(
    fiId: string,
    actionableId: string,
    estado: AccionableEstado
  ): Observable<Accionable> {
    const body: UpdateAccionableEstadoRequest = { estado };
    return this.http.put<Accionable>(
      `${this.baseUrl}/${fiId}/actionables/${actionableId}/status`,
      body
    );
  }

  deleteActionable(
    fiId: string,
    actionableId: string
  ): Observable<{ deleted: boolean; id: string }> {
    return this.http.delete<{ deleted: boolean; id: string }>(
      `${this.baseUrl}/${fiId}/actionables/${actionableId}`
    );
  }

  // Calendario
  getCalendar(fiId: string, range?: { from?: string; to?: string }): Observable<CalendarResponse> {
    const search = new URLSearchParams();
    if (range?.from) search.set('from', range.from);
    if (range?.to) search.set('to', range.to);
    const query = search.toString();
    return this.http.get<CalendarResponse>(
      query ? `${this.baseUrl}/${fiId}/calendar?${query}` : `${this.baseUrl}/${fiId}/calendar`
    );
  }

  // Obtener accionable por fecha
  getActionableByDate(fiId: string, fecha: string): Observable<Accionable> {
    return this.http.get<Accionable>(`${this.baseUrl}/${fiId}/actionables/by-date/${fecha}`);
  }

  // Archivos adjuntos
  generateActionableAttachmentPresignedUrls(
    fiId: string,
    actionableId: string,
    body: { files: Array<{ fileName: string; contentType: string }>; expirationTime?: number }
  ): Observable<any[]> {
    return this.http.post<any[]>(
      `${this.baseUrl}/${fiId}/actionables/${actionableId}/attachments/presigned-urls`,
      body
    );
  }

  confirmActionableAttachments(
    fiId: string,
    actionableId: string,
    body: { attachments: any[] }
  ): Observable<Accionable> {
    return this.http.post<Accionable>(
      `${this.baseUrl}/${fiId}/actionables/${actionableId}/attachments/confirm`,
      body
    );
  }

  deleteActionableAttachment(
    fiId: string,
    actionableId: string,
    attachmentId: string
  ): Observable<{ deleted: boolean; id: string }> {
    return this.http.delete<{ deleted: boolean; id: string }>(
      `${this.baseUrl}/${fiId}/actionables/${actionableId}/attachments/${attachmentId}`
    );
  }

  // Tareas (checklist)
  addActionableTask(
    fiId: string,
    actionableId: string,
    payload: { title: string; order?: number }
  ): Observable<Accionable> {
    return this.http.post<Accionable>(
      `${this.baseUrl}/${fiId}/actionables/${actionableId}/tasks`,
      payload
    );
  }

  updateActionableTask(
    fiId: string,
    actionableId: string,
    taskId: string,
    payload: { title?: string; completed?: boolean; order?: number }
  ): Observable<Accionable> {
    return this.http.patch<Accionable>(
      `${this.baseUrl}/${fiId}/actionables/${actionableId}/tasks/${taskId}`,
      payload
    );
  }

  deleteActionableTask(
    fiId: string,
    actionableId: string,
    taskId: string
  ): Observable<{ deleted: boolean; id: string }> {
    return this.http.delete<{ deleted: boolean; id: string }>(
      `${this.baseUrl}/${fiId}/actionables/${actionableId}/tasks/${taskId}`
    );
  }
}
