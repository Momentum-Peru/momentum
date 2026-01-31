import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PettyCashBalance,
  PettyCashMovement,
  PettyCashPaginatedMovements,
  PettyCashCategoryStat,
  CreateExpenseRequest,
  CreateRechargeRequest,
  MovementQueryParams,
} from '../interfaces/petty-cash.interface';

/**
 * Servicio de API de Caja Chica.
 * Responsabilidad única: comunicación HTTP con el backend de petty-cash.
 */
@Injectable({
  providedIn: 'root',
})
export class PettyCashApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/petty-cash`;

  getBalance(): Observable<PettyCashBalance> {
    return this.http.get<PettyCashBalance>(`${this.baseUrl}/balance`);
  }

  createExpense(dto: CreateExpenseRequest, createdBy: string): Observable<PettyCashMovement> {
    const params = new HttpParams().set('createdBy', createdBy);
    return this.http.post<PettyCashMovement>(`${this.baseUrl}/movements/expense`, dto, { params });
  }

  createRecharge(dto: CreateRechargeRequest, createdBy: string): Observable<PettyCashMovement> {
    const params = new HttpParams().set('createdBy', createdBy);
    return this.http.post<PettyCashMovement>(`${this.baseUrl}/movements/recharge`, dto, { params });
  }

  getMovements(params?: MovementQueryParams): Observable<PettyCashPaginatedMovements> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.q) httpParams = httpParams.set('q', params.q);
      if (params.type) httpParams = httpParams.set('type', params.type);
      if (params.category) httpParams = httpParams.set('category', params.category);
      if (params.dateFrom) httpParams = httpParams.set('dateFrom', params.dateFrom);
      if (params.dateTo) httpParams = httpParams.set('dateTo', params.dateTo);
      if (params.includeVoided !== undefined)
        httpParams = httpParams.set('includeVoided', String(params.includeVoided));
      if (params.page) httpParams = httpParams.set('page', String(params.page));
      if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
      if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
      if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);
    }
    return this.http.get<PettyCashPaginatedMovements>(`${this.baseUrl}/movements`, {
      params: httpParams,
    });
  }

  getAudit(params?: MovementQueryParams): Observable<PettyCashPaginatedMovements> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.q) httpParams = httpParams.set('q', params.q);
      if (params.type) httpParams = httpParams.set('type', params.type);
      if (params.category) httpParams = httpParams.set('category', params.category);
      if (params.dateFrom) httpParams = httpParams.set('dateFrom', params.dateFrom);
      if (params.dateTo) httpParams = httpParams.set('dateTo', params.dateTo);
      if (params.includeVoided !== undefined)
        httpParams = httpParams.set('includeVoided', String(params.includeVoided));
      if (params.page) httpParams = httpParams.set('page', String(params.page));
      if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
      if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
      if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);
    }
    return this.http.get<PettyCashPaginatedMovements>(`${this.baseUrl}/movements/audit`, {
      params: httpParams,
    });
  }

  getStatsByCategory(dateFrom?: string, dateTo?: string): Observable<PettyCashCategoryStat[]> {
    let httpParams = new HttpParams();
    if (dateFrom) httpParams = httpParams.set('dateFrom', dateFrom);
    if (dateTo) httpParams = httpParams.set('dateTo', dateTo);
    return this.http.get<PettyCashCategoryStat[]>(`${this.baseUrl}/movements/stats-by-category`, {
      params: httpParams,
    });
  }

  getMovementById(id: string): Observable<PettyCashMovement> {
    return this.http.get<PettyCashMovement>(`${this.baseUrl}/movements/${id}`);
  }

  voidMovement(id: string, voidedBy: string): Observable<PettyCashMovement> {
    const params = new HttpParams().set('voidedBy', voidedBy);
    return this.http.post<PettyCashMovement>(
      `${this.baseUrl}/movements/${id}/void`,
      {},
      { params },
    );
  }
}
