import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  WorkShift,
  CreateWorkShiftRequest,
  UpdateWorkShiftRequest,
  WorkShiftQueryParams,
} from '../interfaces/work-shift.interface';

/**
 * Service for managing Work Shifts
 * Single Responsibility Principle: Only handles HTTP calls to work-shifts endpoint
 */
@Injectable({
  providedIn: 'root',
})
export class WorkShiftsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/work-shifts`;

  /**
   * Create a new work shift
   */
  create(workShift: CreateWorkShiftRequest): Observable<WorkShift> {
    return this.http.post<WorkShift>(this.baseUrl, workShift);
  }

  /**
   * Get list of work shifts with optional filters
   */
  list(params?: WorkShiftQueryParams): Observable<WorkShift[]> {
    let httpParams = new HttpParams();

    if (params?.q) {
      httpParams = httpParams.set('q', params.q);
    }

    if (params?.isActive !== undefined) {
      httpParams = httpParams.set('isActive', String(params.isActive));
    }

    const url = httpParams.toString() ? `${this.baseUrl}?${httpParams.toString()}` : this.baseUrl;
    return this.http.get<WorkShift[]>(url);
  }

  /**
   * Get a work shift by ID
   */
  getById(id: string): Observable<WorkShift> {
    return this.http.get<WorkShift>(`${this.baseUrl}/${id}`);
  }

  /**
   * Update an existing work shift
   */
  update(id: string, workShift: UpdateWorkShiftRequest): Observable<WorkShift> {
    return this.http.patch<WorkShift>(`${this.baseUrl}/${id}`, workShift);
  }

  /**
   * Delete a work shift
   */
  delete(id: string): Observable<{ deleted: boolean; id: string }> {
    return this.http.delete<{ deleted: boolean; id: string }>(`${this.baseUrl}/${id}`);
  }
}
