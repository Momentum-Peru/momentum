import { Injectable, inject, signal, computed } from '@angular/core';
import {
    DashboardResponse,
    DashboardData,
    DashboardKpis,
    DashboardCharts,
    ChartData,
    LineChartData,
    BarChartData,
    PieChartData,
    DoughnutChartData
} from '../interfaces/dashboard.interface';
import { DashboardApiService } from './dashboard-api.service';

/**
 * Servicio para el manejo y transformación de datos del Dashboard
 * Principio de Responsabilidad Única: Solo maneja la transformación y procesamiento de datos
 */
@Injectable({ providedIn: 'root' })
export class DashboardDataService {
    private readonly dashboardApiService = inject(DashboardApiService);

    // Signals para el estado reactivo del dashboard
    private readonly dashboardData = signal<DashboardData | null>(null);
    private readonly isLoading = signal<boolean>(false);
    private readonly error = signal<string | null>(null);

    // Computed signals para datos procesados
    readonly kpis = computed(() => this.dashboardData()?.kpis || null);
    readonly charts = computed(() => this.dashboardData()?.charts || null);
    readonly tables = computed(() => this.dashboardData()?.tables || null);
    readonly loading = computed(() => this.isLoading());
    readonly hasError = computed(() => this.error() !== null);
    readonly errorMessage = computed(() => this.error());

    /**
     * Carga los datos del dashboard
     * @param filters Filtros opcionales
     */
    async loadDashboardData(filters?: any): Promise<void> {
        try {
            this.isLoading.set(true);
            this.error.set(null);

            const response = await this.dashboardApiService.getDashboardData(filters).toPromise();

            if (response?.success && response.data) {
                this.dashboardData.set(response.data);
            } else {
                throw new Error('Error al cargar datos del dashboard');
            }
        } catch (err) {
            this.error.set(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            this.isLoading.set(false);
        }
    }

    /**
     * Transforma datos de gráfico para Chart.js Line Chart
     * @param chartData Datos del gráfico
     * @returns Datos formateados para Line Chart
     */
    transformToLineChart(chartData: ChartData): LineChartData {
        return {
            ...chartData,
            datasets: chartData.datasets.map(dataset => ({
                ...dataset,
                fill: false,
                tension: 0.4,
                pointBackgroundColor: dataset.borderColor,
                pointBorderColor: dataset.borderColor,
                pointRadius: 4,
                borderWidth: 2
            }))
        };
    }

    /**
     * Transforma datos de gráfico para Chart.js Bar Chart
     * @param chartData Datos del gráfico
     * @returns Datos formateados para Bar Chart
     */
    transformToBarChart(chartData: ChartData): BarChartData {
        return {
            ...chartData,
            datasets: chartData.datasets.map(dataset => ({
                ...dataset,
                barThickness: 40,
                maxBarThickness: 50,
                borderWidth: 1
            }))
        };
    }

    /**
     * Transforma datos de gráfico para Chart.js Pie Chart
     * @param chartData Datos del gráfico
     * @returns Datos formateados para Pie Chart
     */
    transformToPieChart(chartData: ChartData): PieChartData {
        return {
            ...chartData,
            datasets: chartData.datasets.map(dataset => ({
                ...dataset,
                hoverOffset: 4,
                borderWidth: 2
            }))
        };
    }

    /**
     * Transforma datos de gráfico para Chart.js Doughnut Chart
     * @param chartData Datos del gráfico
     * @returns Datos formateados para Doughnut Chart
     */
    transformToDoughnutChart(chartData: ChartData): DoughnutChartData {
        return {
            ...chartData,
            datasets: chartData.datasets.map(dataset => ({
                ...dataset,
                hoverOffset: 4,
                cutout: '60%',
                borderWidth: 2
            }))
        };
    }

    /**
     * Obtiene configuración de opciones para gráficos de línea
     * @returns Opciones para Line Chart
     */
    getLineChartOptions(): any {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: false
                    }
                },
                y: {
                    display: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        };
    }

    /**
     * Obtiene configuración de opciones para gráficos de barras
     * @returns Opciones para Bar Chart
     */
    getBarChartOptions(): any {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: false
                    }
                },
                y: {
                    display: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        };
    }

    /**
     * Obtiene configuración de opciones para gráficos de pastel
     * @returns Opciones para Pie Chart
     */
    getPieChartOptions(): any {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            }
        };
    }

    /**
     * Obtiene configuración de opciones para gráficos de dona
     * @returns Opciones para Doughnut Chart
     */
    getDoughnutChartOptions(): any {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            }
        };
    }

    /**
     * Resetea el estado del dashboard
     */
    reset(): void {
        this.dashboardData.set(null);
        this.isLoading.set(false);
        this.error.set(null);
    }
}
