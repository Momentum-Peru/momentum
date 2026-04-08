import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ServiceOrder, ServiceOrderQueryParams } from '../interfaces/service-order.interface';

@Injectable({
  providedIn: 'root',
})
export class ServiceOrderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/operations/service-orders`;

  list(params: ServiceOrderQueryParams = {}): Observable<ServiceOrder[]> {
    let httpParams = new HttpParams();
    if (params.projectId) httpParams = httpParams.set('projectId', params.projectId);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.q) httpParams = httpParams.set('q', params.q);

    return this.http.get<ServiceOrder[]>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<ServiceOrder> {
    return this.http.get<ServiceOrder>(`${this.baseUrl}/${id}`);
  }

  create(os: Partial<ServiceOrder>): Observable<ServiceOrder> {
    return this.http.post<ServiceOrder>(this.baseUrl, os);
  }

  update(id: string, os: Partial<ServiceOrder>): Observable<ServiceOrder> {
    return this.http.patch<ServiceOrder>(`${this.baseUrl}/${id}`, os);
  }

  delete(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/${id}`);
  }
}
