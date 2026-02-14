import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  AgendaNote,
  CreateAgendaNotePayload,
  UpdateAgendaNotePayload,
  AssignAgendaNotePayload,
  ShareAgendaNotePayload,
} from '../interfaces/agenda-note.interface';

export interface AgendaListFilters {
  createdBy?: string;
  assignedTo?: string;
  /** Si es true, el backend filtra por "creadas por mí O asignadas a mí" usando el usuario del token. */
  forUser?: boolean;
  type?: string;
  startDate?: string;
  endDate?: string;
  q?: string;
}

export interface PresignedUrlResponse {
  presignedUrl: string;
  publicUrl: string;
  key: string;
}

/**
 * Servicio responsable únicamente de las llamadas HTTP al API de Agenda.
 * No contiene lógica de negocio ni estado de UI.
 */
@Injectable({
  providedIn: 'root',
})
export class AgendaApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/agenda`;

  list(filters?: AgendaListFilters): Observable<AgendaNote[]> {
    const params = new URLSearchParams();
    if (filters?.createdBy) params.set('createdBy', filters.createdBy);
    if (filters?.assignedTo) params.set('assignedTo', filters.assignedTo);
    if (filters?.forUser) params.set('forUser', '1');
    if (filters?.type) params.set('type', filters.type);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.q) params.set('q', filters.q);
    const query = params.toString();
    const url = query ? `${this.baseUrl}?${query}` : this.baseUrl;
    return this.http.get<AgendaNote[]>(url);
  }

  getById(id: string): Observable<AgendaNote> {
    return this.http.get<AgendaNote>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateAgendaNotePayload): Observable<AgendaNote> {
    return this.http.post<AgendaNote>(this.baseUrl, payload);
  }

  update(id: string, payload: UpdateAgendaNotePayload): Observable<AgendaNote> {
    return this.http.patch<AgendaNote>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/${id}`);
  }

  assign(id: string, payload: AssignAgendaNotePayload): Observable<AgendaNote> {
    return this.http.patch<AgendaNote>(`${this.baseUrl}/${id}/assign`, payload);
  }

  share(id: string, payload: ShareAgendaNotePayload): Observable<AgendaNote> {
    return this.http.post<AgendaNote>(`${this.baseUrl}/${id}/share`, payload);
  }

  generateVoicePresignedUrl(
    noteId: string,
    fileName: string,
    contentType: string,
    expirationTime?: number,
  ): Observable<PresignedUrlResponse> {
    return this.http.post<PresignedUrlResponse>(`${this.baseUrl}/${noteId}/voice/presigned-url`, {
      fileName,
      contentType,
      ...(expirationTime && { expirationTime }),
    });
  }

  confirmVoiceUpload(noteId: string, voiceUrl: string): Observable<AgendaNote> {
    return this.http.post<AgendaNote>(`${this.baseUrl}/${noteId}/voice/confirm`, { voiceUrl });
  }

  generateDrawingPresignedUrl(
    noteId: string,
    fileName: string,
    contentType: string,
    expirationTime?: number,
  ): Observable<PresignedUrlResponse> {
    return this.http.post<PresignedUrlResponse>(`${this.baseUrl}/${noteId}/drawing/presigned-url`, {
      fileName,
      contentType,
      ...(expirationTime && { expirationTime }),
    });
  }

  confirmDrawingUpload(noteId: string, drawingUrl: string): Observable<AgendaNote> {
    return this.http.post<AgendaNote>(`${this.baseUrl}/${noteId}/drawing/confirm`, { drawingUrl });
  }

  removeVoice(noteId: string, voiceUrl: string): Observable<AgendaNote> {
    return this.http.delete<AgendaNote>(`${this.baseUrl}/${noteId}/voice`, {
      body: { voiceUrl },
    });
  }

  removeDrawing(noteId: string, drawingUrl: string): Observable<AgendaNote> {
    return this.http.delete<AgendaNote>(`${this.baseUrl}/${noteId}/drawing`, {
      body: { drawingUrl },
    });
  }

  /**
   * Transcribe un archivo de audio a texto (Whisper).
   */
  transcribe(file: File): Observable<{ text: string }> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<{ text: string }>(`${this.baseUrl}/transcribe`, formData);
  }

  /**
   * Sube un archivo a S3 usando la Presigned URL (sin enviar por el backend).
   */
  async uploadFileToS3(presignedUrl: string, file: File, contentType?: string): Promise<void> {
    const finalContentType = contentType || file.type || 'application/octet-stream';
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': finalContentType },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error S3: ${response.status} ${response.statusText}. ${text}`);
    }
  }
}
