import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from '../../../environments/environment'
import { GerenciaDashboardResponse, GerenciaDashboardQueryParams } from '../interfaces/dashboard-gerencia.interface'

/**
 * Servicio para obtener datos del Dashboard de Gerencia
 * Principio de Responsabilidad Única: Solo maneja las llamadas HTTP al endpoint de dashboard-gerencia
 */
@Injectable({ providedIn: 'root' })
export class DashboardGerenciaApiService {
  private readonly http = inject(HttpClient)
  private readonly baseUrl = environment.apiUrl

  /**
   * Obtiene todos los datos del dashboard de gerencia
   * @param params Parámetros de consulta (startDate, endDate, tenantId opcional)
   * @returns Observable con todos los datos del dashboard de gerencia
   */
  getDashboardData(params: GerenciaDashboardQueryParams): Observable<GerenciaDashboardResponse> {
    const queryParams: Record<string, string> = {
      startDate: params.startDate,
      endDate: params.endDate,
    }

    const tenantId = params['tenantId']
    const companyId = params['companyId']

    if (tenantId) {
      queryParams['tenantId'] = tenantId
    } else if (companyId) {
      queryParams['companyId'] = companyId
    }

    return this.http.get<GerenciaDashboardResponse>(`${this.baseUrl}/dashboard-gerencia`, {
      params: queryParams,
    })
  }
}
