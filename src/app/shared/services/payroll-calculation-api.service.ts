import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PayrollCalculation,
  CreatePayrollCalculationRequest,
  UpdatePayrollCalculationRequest,
  CalculatePayrollRequest,
  CalculatePayrollResponse,
  PayrollCalculationQueryParams,
} from '../interfaces/payroll-calculation.interface';

/**
 * Servicio para gestionar Cálculo de Planilla
 * Principio de Responsabilidad Única: Solo maneja las llamadas HTTP al endpoint de payroll-calculation
 */
@Injectable({
  providedIn: 'root',
})
export class PayrollCalculationApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/payroll-calculation`;

  /**
   * Calcula automáticamente las horas trabajadas para un rango de fechas
   */
  calculate(request: CalculatePayrollRequest): Observable<CalculatePayrollResponse> {
    return this.http.post<CalculatePayrollResponse>(`${this.baseUrl}/calculate`, request);
  }

  /**
   * Crea un nuevo registro manual de cálculo de planilla
   */
  create(request: CreatePayrollCalculationRequest): Observable<PayrollCalculation> {
    return this.http.post<PayrollCalculation>(this.baseUrl, request);
  }

  /**
   * Obtiene la lista de registros de cálculo de planilla con filtros opcionales
   */
  list(params?: PayrollCalculationQueryParams): Observable<PayrollCalculation[]> {
    let httpParams = new HttpParams();

    if (params?.employeeId) {
      httpParams = httpParams.set('employeeId', params.employeeId);
    }

    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }

    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }

    if (params?.isAbsent !== undefined) {
      httpParams = httpParams.set('isAbsent', params.isAbsent.toString());
    }

    const url = httpParams.toString() ? `${this.baseUrl}?${httpParams.toString()}` : this.baseUrl;
    return this.http.get<PayrollCalculation[]>(url);
  }

  /**
   * Obtiene registros de cálculo de planilla por empleado
   */
  getByEmployee(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Observable<PayrollCalculation[]> {
    let httpParams = new HttpParams();

    if (startDate) {
      httpParams = httpParams.set('startDate', startDate);
    }

    if (endDate) {
      httpParams = httpParams.set('endDate', endDate);
    }

    const params = httpParams.toString() ? `?${httpParams.toString()}` : '';
    return this.http.get<PayrollCalculation[]>(`${this.baseUrl}/employee/${employeeId}${params}`);
  }

  /**
   * Obtiene un registro de cálculo de planilla por ID
   */
  getById(id: string): Observable<PayrollCalculation> {
    return this.http.get<PayrollCalculation>(`${this.baseUrl}/${id}`);
  }

  /**
   * Actualiza un registro de cálculo de planilla existente
   */
  update(id: string, request: UpdatePayrollCalculationRequest): Observable<PayrollCalculation> {
    return this.http.patch<PayrollCalculation>(`${this.baseUrl}/${id}`, request);
  }

  /**
   * Elimina un registro de cálculo de planilla
   */
  delete(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/${id}`);
  }
}
