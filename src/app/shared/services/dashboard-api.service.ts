import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    DashboardResponse,
    DashboardFiltersParams,
    DashboardData,
    DashboardKpis,
    DashboardCharts,
    DashboardTables
} from '../interfaces/dashboard.interface';

/**
 * Servicio para obtener datos del Dashboard
 * Principio de Responsabilidad Única: Solo maneja las llamadas HTTP al endpoint de dashboard
 */
@Injectable({ providedIn: 'root' })
export class DashboardApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    /**
     * Obtiene todos los datos del dashboard en una sola consulta optimizada
     * @param filters Parámetros de filtrado opcionales
     * @returns Observable con todos los datos del dashboard
     */
    getDashboardData(filters?: DashboardFiltersParams): Observable<DashboardResponse> {
        return this.http.get<DashboardResponse>(`${this.baseUrl}/dashboard`, {
            params: filters as any
        });
    }

    /**
     * Obtiene solo los KPIs del dashboard
     * @param filters Parámetros de filtrado opcionales
     * @returns Observable con los KPIs
     */
    getKpis(filters?: DashboardFiltersParams): Observable<DashboardKpis> {
        return this.http.get<DashboardKpis>(`${this.baseUrl}/dashboard/kpis`, {
            params: filters as any
        });
    }

    /**
     * Obtiene solo los datos de gráficos del dashboard
     * @param filters Parámetros de filtrado opcionales
     * @returns Observable con los datos de gráficos
     */
    getCharts(filters?: DashboardFiltersParams): Observable<DashboardCharts> {
        return this.http.get<DashboardCharts>(`${this.baseUrl}/dashboard/charts`, {
            params: filters as any
        });
    }

    /**
     * Obtiene solo los datos de tablas del dashboard
     * @param filters Parámetros de filtrado opcionales
     * @returns Observable con los datos de tablas
     */
    getTables(filters?: DashboardFiltersParams): Observable<DashboardTables> {
        return this.http.get<DashboardTables>(`${this.baseUrl}/dashboard/tables`, {
            params: filters as any
        });
    }

    /**
     * Obtiene datos del dashboard con período específico
     * @param period Período de tiempo (7d, 30d, 90d, 1y)
     * @returns Observable con datos del dashboard
     */
    getDashboardByPeriod(period: '7d' | '30d' | '90d' | '1y'): Observable<DashboardResponse> {
        return this.getDashboardData({ period });
    }

    /**
     * Obtiene datos del dashboard con filtros personalizados
     * @param startDate Fecha de inicio
     * @param endDate Fecha de fin
     * @returns Observable con datos del dashboard
     */
    getDashboardByCustomPeriod(startDate: string, endDate: string): Observable<DashboardResponse> {
        return this.getDashboardData({
            period: 'custom',
            startDate,
            endDate
        });
    }

    /**
     * Obtiene datos del dashboard filtrados por proyecto
     * @param projectId ID del proyecto
     * @param period Período opcional
     * @returns Observable con datos del dashboard
     */
    getDashboardByProject(projectId: string, period?: string): Observable<DashboardResponse> {
        return this.getDashboardData({
            projectId,
            period: period as any
        });
    }

    /**
     * Obtiene datos del dashboard filtrados por cliente
     * @param clientId ID del cliente
     * @param period Período opcional
     * @returns Observable con datos del dashboard
     */
    getDashboardByClient(clientId: string, period?: string): Observable<DashboardResponse> {
        return this.getDashboardData({
            clientId,
            period: period as any
        });
    }
}
