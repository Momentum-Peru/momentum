import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product } from './products.service';
import { Provider } from './providers.service';

export type RfqStatus = 'Borrador' | 'Aprobada' | 'Publicada' | 'Cerrada' | 'Cancelada';

export interface RfqItem {
  productId: Product | string;
  quantity: number;
  notes?: string;
}

export interface SupplierQuoteItem {
  productId: Product | string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SupplierQuote {
  _id?: string;
  providerId: Provider | string;
  rfqId?: string;
  items: SupplierQuoteItem[];
  totalCost?: number;
  deadline?: string;
  status: 'Pendiente' | 'Aprobada' | 'Rechazada';
  notes?: string;
}

export interface Rfq {
  _id?: string;
  projectId?: any; // To hold populated Project or ID
  code: string;
  title: string;
  description: string;
  items: RfqItem[];
  status: RfqStatus;
  deadline?: string;
  termsAndConditions?: string;
  createdAt?: string;
  supplierQuotes?: SupplierQuote[]; // Populated when getting one
}

@Injectable({
  providedIn: 'root',
})
export class RfqsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getRfqs(projectId?: string): Observable<Rfq[]> {
    const params: any = {};
    if (projectId) params.projectId = projectId;
    return this.http.get<Rfq[]>(`${this.baseUrl}/rfqs`, { params });
  }

  getRfq(id: string): Observable<Rfq> {
    return this.http.get<Rfq>(`${this.baseUrl}/rfqs/${id}`);
  }

  createRfq(payload: {
    title: string;
    description: string;
    projectId?: string;
    items: { productId: string; quantity: number; notes?: string }[];
    providerIds?: string[];
    deadline?: string;
    termsAndConditions?: string;
  }): Observable<Rfq> {
    return this.http.post<Rfq>(`${this.baseUrl}/rfqs`, payload);
  }

  updateRfq(id: string, payload: Partial<Rfq> & { projectId?: string }): Observable<Rfq> {
    return this.http.patch<Rfq>(`${this.baseUrl}/rfqs/${id}`, payload);
  }

  deleteRfq(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/rfqs/${id}`);
  }

  /** Aprueba la RFQ (Borrador → Aprobada). Esto permite que sea publicada y enviada a los proveedores. */
  approveRfq(id: string): Observable<Rfq> {
    return this.http.post<Rfq>(`${this.baseUrl}/rfqs/${id}/approve`, {});
  }

  /** Publica la RFQ (Aprobada → Publicada). Se llama al enviar la solicitud a proveedores. */
  publishRfq(id: string): Observable<Rfq> {
    return this.http.post<Rfq>(`${this.baseUrl}/rfqs/${id}/publish`, {});
  }
}
