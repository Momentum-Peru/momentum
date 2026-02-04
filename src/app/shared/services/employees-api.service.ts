import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EmployeeQueryParams,
} from '../interfaces/employee.interface';

/**
 * Servicio para gestionar Empleados
 * Principio de Responsabilidad Única: Solo maneja las llamadas HTTP al endpoint de employees
 */
@Injectable({
  providedIn: 'root',
})
export class EmployeesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/employees`;

  /**
   * Crea un nuevo empleado
   */
  create(employee: CreateEmployeeRequest): Observable<Employee> {
    return this.http.post<Employee>(this.baseUrl, employee);
  }

  /**
   * Obtiene la lista de empleados con filtros opcionales
   */
  list(params?: EmployeeQueryParams): Observable<Employee[]> {
    let httpParams = new HttpParams();

    if (params?.q) {
      httpParams = httpParams.set('q', params.q);
    }

    if (params?.userId) {
      httpParams = httpParams.set('userId', params.userId);
    }

    const url = httpParams.toString() ? `${this.baseUrl}?${httpParams.toString()}` : this.baseUrl;
    return this.http.get<Employee[]>(url);
  }

  /**
   * Obtiene un empleado por ID
   */
  getById(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.baseUrl}/${id}`);
  }

  /**
   * Obtiene empleados por ID de usuario
   */
  getByUserId(userId: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.baseUrl}/user/${userId}`);
  }

  /**
   * Obtiene un empleado por DNI
   */
  getByDni(dni: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.baseUrl}/dni/${dni}`);
  }

  /**
   * Actualiza un empleado existente
   */
  update(id: string, employee: UpdateEmployeeRequest): Observable<Employee> {
    return this.http.patch<Employee>(`${this.baseUrl}/${id}`, employee);
  }

  /**
   * Elimina un empleado
   */
  delete(id: string): Observable<{ deleted: boolean; id: string }> {
    return this.http.delete<{ deleted: boolean; id: string }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Sube un archivo de contrato para un empleado
   */
  uploadContrato(id: string, file: File): Observable<Employee> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Employee>(`${this.baseUrl}/${id}/contratos`, formData);
  }

  /**
   * Sube un archivo de antecedentes policiales para un empleado
   */
  uploadAntecedentePolicial(id: string, file: File): Observable<Employee> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Employee>(`${this.baseUrl}/${id}/antecedentes-policiales`, formData);
  }

  /**
   * Elimina un archivo de contrato de un empleado
   */
  removeContrato(id: string, url: string): Observable<Employee> {
    const params = new HttpParams().set('url', url);
    return this.http.delete<Employee>(`${this.baseUrl}/${id}/contratos`, { params });
  }

  /**
   * Elimina un archivo de antecedentes policiales de un empleado
   */
  removeAntecedentePolicial(id: string, url: string): Observable<Employee> {
    const params = new HttpParams().set('url', url);
    return this.http.delete<Employee>(`${this.baseUrl}/${id}/antecedentes-policiales`, { params });
  }

  /**
   * Sube una foto de perfil para un empleado
   */
  uploadFotoPerfil(id: string, file: File): Observable<Employee> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Employee>(`${this.baseUrl}/${id}/foto-perfil`, formData);
  }
}
