import { Component, Input, ChangeDetectionStrategy, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { ChartData, ChartOptions } from 'chart.js';

/**
 * Componente de gráfico del dashboard
 * Componente Dumb que solo presenta gráficos
 * Principio de Responsabilidad Única: Solo renderiza gráficos Chart.js
 */
@Component({
    selector: 'app-dashboard-chart',
    standalone: true,
    imports: [CommonModule, ChartModule],
    template: `
    <div class="relative">
      <!-- Estado de carga -->
      @if (loading) {
        <div class="flex justify-center items-center h-64">
          <div class="flex flex-col items-center space-y-4">
            <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
            <p class="text-gray-500 text-sm">Cargando gráfico...</p>
          </div>
        </div>
      }

      <!-- Gráfico -->
      @if (!loading && data) {
        <p-chart 
          #chartRef
          [type]="type" 
          [data]="data" 
          [options]="options"
          [style]="{ 'height': height }">
        </p-chart>
      }

      <!-- Estado de error -->
      @if (error) {
        <div class="flex justify-center items-center h-64">
          <div class="text-center">
            <i class="pi pi-exclamation-triangle text-red-500 text-2xl mb-2"></i>
            <p class="text-red-600 text-sm">{{ error }}</p>
          </div>
        </div>
      }

      <!-- Estado vacío -->
      @if (!loading && !error && !data) {
        <div class="flex justify-center items-center h-64">
          <div class="text-center">
            <i class="pi pi-chart-line text-gray-400 text-2xl mb-2"></i>
            <p class="text-gray-500 text-sm">No hay datos disponibles</p>
          </div>
        </div>
      }
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardChartComponent implements OnInit, OnDestroy {
    @Input({ required: true }) type!: 'line' | 'bar' | 'pie' | 'doughnut';
    @Input() data: ChartData | null = null;
    @Input() options: ChartOptions | null = null;
    @Input() loading = false;
    @Input() error: string | null = null;
    @Input() height = '300px';

    @ViewChild('chartRef') chartRef!: ElementRef;

    ngOnInit(): void {
        // Configuración inicial del gráfico
        this.setupChartDefaults();
    }

    // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
    ngOnDestroy(): void {
        // Chart.js se limpia automáticamente cuando el componente se destruye
        // No se requiere limpieza manual de recursos
        // Este método está presente para cumplir con la interfaz OnDestroy
    }

    /**
     * Configura valores por defecto para el gráfico
     */
    private setupChartDefaults(): void {
        if (!this.options) {
            this.options = this.getDefaultOptions();
        }
    }

    /**
     * Obtiene opciones por defecto según el tipo de gráfico
     */
    private getDefaultOptions(): ChartOptions {
        const baseOptions: ChartOptions = {
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

        switch (this.type) {
            case 'line':
                return {
                    ...baseOptions,
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

            case 'bar':
                return {
                    ...baseOptions,
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

            case 'pie':
            case 'doughnut':
                return {
                    ...baseOptions,
                    plugins: {
                        ...baseOptions.plugins,
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        }
                    }
                };

            default:
                return baseOptions;
        }
    }

    /**
     * Actualiza el gráfico con nuevos datos
     */
    updateChart(): void {
        if (this.chartRef && this.data) {
            // El gráfico se actualiza automáticamente con OnPush
            // y el binding de datos de Angular
        }
    }

    /**
     * Exporta el gráfico como imagen
     */
    exportChart(): void {
        if (this.chartRef) {
            const canvas = this.chartRef.nativeElement.querySelector('canvas');
            if (canvas) {
                const link = document.createElement('a');
                link.download = `chart-${this.type}-${Date.now()}.png`;
                link.href = canvas.toDataURL();
                link.click();
            }
        }
    }
}
