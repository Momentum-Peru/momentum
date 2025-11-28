import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SupplierQuote } from '../interfaces/supplier-quote.interface';

@Injectable({
  providedIn: 'root',
})
export class SupplierQuotesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Lista todas las cotizaciones de proveedores
   * @param projectId Opcional: Filtrar por proyecto
   */
  list(projectId?: string): Observable<SupplierQuote[]> {
    let params = new HttpParams();
    if (projectId) {
      params = params.set('projectId', projectId);
    }
    return this.http.get<SupplierQuote[]>(`${this.baseUrl}/supplier-quotes`, { params });
  }

  /**
   * Crea una nueva cotización de proveedor
   */
  create(quote: Partial<SupplierQuote>): Observable<SupplierQuote> {
    return this.http.post<SupplierQuote>(`${this.baseUrl}/supplier-quotes`, quote);
  }

  /**
   * Actualiza una cotización de proveedor
   */
  update(id: string, quote: Partial<SupplierQuote>): Observable<SupplierQuote> {
    return this.http.patch<SupplierQuote>(`${this.baseUrl}/supplier-quotes/${id}`, quote);
  }

  /**
   * Obtiene una cotización por ID
   */
  getById(id: string): Observable<SupplierQuote> {
    return this.http.get<SupplierQuote>(`${this.baseUrl}/supplier-quotes/${id}`);
  }
}

