import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PurchaseQuote, RegisterQuoteRequest } from '../interfaces/purchase.interface';

/**
 * Servicio API de cotizaciones de compras.
 * Responsabilidad única: comunicación HTTP con /purchases/requirements/:id/quotes y /purchases/quotes.
 */
@Injectable({ providedIn: 'root' })
export class PurchasesQuotesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/purchases`;

  listByRequirement(requirementId: string): Observable<PurchaseQuote[]> {
    return this.http.get<PurchaseQuote[]>(`${this.baseUrl}/requirements/${requirementId}/quotes`);
  }

  listAll(): Observable<PurchaseQuote[]> {
    return this.http.get<PurchaseQuote[]>(`${this.baseUrl}/quotes`);
  }

  getById(id: string): Observable<PurchaseQuote> {
    return this.http.get<PurchaseQuote>(`${this.baseUrl}/quotes/${id}`);
  }

  register(requirementId: string, data: RegisterQuoteRequest): Observable<PurchaseQuote> {
    return this.http.post<PurchaseQuote>(
      `${this.baseUrl}/requirements/${requirementId}/quotes`,
      data,
    );
  }

  update(id: string, data: { status?: string; notes?: string }): Observable<PurchaseQuote> {
    return this.http.patch<PurchaseQuote>(`${this.baseUrl}/quotes/${id}`, data);
  }
}
