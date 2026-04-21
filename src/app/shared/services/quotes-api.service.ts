import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Quote,
  QuoteQueryParams,
  QuoteListResponse,
  QuoteStatistics,
  QuoteState,
} from '../interfaces/quote.interface';

@Injectable({
  providedIn: 'root',
})
export class QuotesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(params?: QuoteQueryParams): Observable<QuoteListResponse> {
    let url = `${this.baseUrl}/quotes`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }
    return this.http.get<QuoteListResponse>(url);
  }

  getById(id: string): Observable<Quote> {
    return this.http.get<Quote>(`${this.baseUrl}/quotes/${id}`);
  }

  create(quote: Partial<Quote>): Observable<Quote> {
    return this.http.post<Quote>(`${this.baseUrl}/quotes`, quote);
  }

  calculate(quote: Partial<Quote>): Observable<Quote> {
    return this.http.post<Quote>(`${this.baseUrl}/quotes/calculate`, quote);
  }

  update(id: string, quote: Partial<Quote>): Observable<Quote> {
    return this.http.patch<Quote>(`${this.baseUrl}/quotes/${id}`, quote);
  }

  updateState(id: string, state: QuoteState): Observable<Quote> {
    return this.http.patch<Quote>(`${this.baseUrl}/quotes/${id}/state`, { state });
  }

  delete(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/quotes/${id}`);
  }

  getByClient(clientId: string, state?: QuoteState): Observable<Quote[]> {
    let url = `${this.baseUrl}/quotes/client/${clientId}`;
    if (state) {
      url += `?state=${state}`;
    }
    return this.http.get<Quote[]>(url);
  }

  getByProject(projectId: string, state?: QuoteState): Observable<Quote[]> {
    let url = `${this.baseUrl}/quotes/project/${projectId}`;
    if (state) {
      url += `?state=${state}`;
    }
    return this.http.get<Quote[]>(url);
  }

  getStatistics(): Observable<QuoteStatistics> {
    return this.http.get<QuoteStatistics>(`${this.baseUrl}/quotes/statistics`);
  }

  uploadDocuments(id: string, files: File[]): Observable<Quote> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    return this.http.post<Quote>(`${this.baseUrl}/quotes/${id}/documents`, formData);
  }

  addDocumentUrls(id: string, documentUrls: string[]): Observable<Quote> {
    return this.http.post<Quote>(`${this.baseUrl}/quotes/${id}/documents/urls`, { documentUrls });
  }

  removeDocument(id: string, documentUrl: string): Observable<Quote> {
    return this.http.delete<Quote>(
      `${this.baseUrl}/quotes/${id}/documents?url=${encodeURIComponent(documentUrl)}`
    );
  }

  clone(id: string): Observable<Quote> {
    return this.http.post<Quote>(`${this.baseUrl}/quotes/${id}/clone`, {});
  }

  generatePdf(id: string): string {
    return `${this.baseUrl}/quotes/${id}/pdf`;
  }
}
