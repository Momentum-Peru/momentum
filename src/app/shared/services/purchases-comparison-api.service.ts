import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PurchaseCompareResponse, AdjudicateRequest } from '../interfaces/purchase.interface';

export interface AdjudicateResponse {
  requirementId: string;
  orders: unknown[];
}

/**
 * Servicio API del comparador de cotizaciones y adjudicación.
 * Responsabilidad única: comunicación HTTP con compare y adjudicate.
 */
@Injectable({ providedIn: 'root' })
export class PurchasesComparisonApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/purchases`;

  getCompare(requirementId: string): Observable<PurchaseCompareResponse> {
    return this.http.get<PurchaseCompareResponse>(
      `${this.baseUrl}/requirements/${requirementId}/compare`,
    );
  }

  adjudicate(requirementId: string, data: AdjudicateRequest): Observable<AdjudicateResponse> {
    return this.http.post<AdjudicateResponse>(
      `${this.baseUrl}/requirements/${requirementId}/adjudicate`,
      data,
    );
  }
}
