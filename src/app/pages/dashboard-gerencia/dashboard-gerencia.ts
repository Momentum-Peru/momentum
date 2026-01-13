import {
  Component,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { DatePickerModule } from 'primeng/datepicker'
import { ButtonModule } from 'primeng/button'
import { PanelModule } from 'primeng/panel'
import { ProgressSpinnerModule } from 'primeng/progressspinner'
import { MessageModule } from 'primeng/message'
import { ToastModule } from 'primeng/toast'
import { TableModule } from 'primeng/table'
import { CardModule } from 'primeng/card'
import { MessageService } from 'primeng/api'
import { FormsModule } from '@angular/forms'
import { DashboardGerenciaApiService } from '../../shared/services/dashboard-gerencia-api.service'
import { GerenciaDashboardResponse, MarcacionDiaria } from '../../shared/interfaces/dashboard-gerencia.interface'
import { AuthService } from '../login/services/auth.service'

/**
 * Componente principal del Dashboard de Gerencia
 * Principio de Responsabilidad Única: Coordina la vista y carga de datos del dashboard de gerencia
 */
@Component({
  selector: 'app-dashboard-gerencia',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePickerModule,
    ButtonModule,
    PanelModule,
    ProgressSpinnerModule,
    MessageModule,
    ToastModule,
    TableModule,
    CardModule,
  ],
  providers: [MessageService],
  templateUrl: './dashboard-gerencia.html',
  styleUrl: './dashboard-gerencia.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardGerenciaPage implements OnInit {
  private readonly apiService = inject(DashboardGerenciaApiService)
  private readonly messageService = inject(MessageService)
  private readonly authService = inject(AuthService)

  // Signals para el estado
  public readonly loading = signal<boolean>(false)
  public readonly error = signal<string | null>(null)
  public readonly dashboardData = signal<GerenciaDashboardResponse | null>(null)

  // Propiedades para two-way binding con Calendar
  public startDateValue: Date | null = null
  public endDateValue: Date | null = null

  // Signals para fechas
  private readonly _startDate = signal<Date | null>(null)
  private readonly _endDate = signal<Date | null>(null)

  // Getters para acceder a los signals
  public readonly startDate = computed(() => this._startDate())
  public readonly endDate = computed(() => this._endDate())

  // Computed para verificar si el usuario es gerencia
  public readonly isGerencia = computed(() => this.authService.isGerencia())

  // Computed para datos derivados
  public readonly dailyTimeTrackings = computed(() => this.dashboardData()?.marcacionesDiarias ?? [])
  public readonly dailyReports = computed(() => this.dashboardData()?.reportesDiarios ?? [])
  public readonly invoices = computed(() => this.dashboardData()?.facturasIngresadas ?? [])
  public readonly ticketsByStatus = computed(() => this.dashboardData()?.ticketsPorEstado ?? [])
  public readonly tickets = computed(() => this.dashboardData()?.tickets ?? [])
  public readonly sales = computed(() => this.dashboardData()?.ventas ?? [])

  // Agrupar marcaciones por usuario y día (similar a payroll-calculation)
  public readonly groupedTimeTrackings = computed(() => {
    const timeTrackings = this.dailyTimeTrackings()
    const grouped = new Map<string, {
      userId: string
      userName: string
      userEmail: string
      date: string
      entry?: { time: string; date: string }
      exit?: { time: string; date: string }
    }>()

    timeTrackings.forEach((timeTracking) => {
      const key = `${timeTracking.userId}_${timeTracking.fecha}`
      if (!grouped.has(key)) {
        grouped.set(key, {
          userId: timeTracking.userId,
          userName: timeTracking.userName,
          userEmail: timeTracking.userEmail,
          date: timeTracking.fecha,
        })
      }

      const dayData = grouped.get(key)!
      // El campo puede venir como 'tipo' o 'type' desde el backend
      const timeTrackingWithType = timeTracking as MarcacionDiaria & { type?: string }
      const trackingType: string = timeTrackingWithType.tipo || timeTrackingWithType.type || ''
      
      // Debug: Log si no hay tipo
      if (!trackingType) {
        console.warn('Time tracking without type:', timeTracking)
      }
      
      // Normalizar el tipo a mayúsculas para comparación
      const normalizedType = trackingType.toUpperCase()
      
      if (normalizedType === 'INGRESO' || normalizedType === 'ENTRADA') {
        // Formatear hora para mostrar solo HH:mm
        const formattedTime = timeTracking.hora ? timeTracking.hora.substring(0, 5) : '00:00'
        dayData.entry = {
          time: formattedTime,
          date: `${timeTracking.fecha}T${timeTracking.hora || '00:00:00'}`,
        }
      } else if (normalizedType === 'SALIDA' || normalizedType === 'EXIT') {
        // Formatear hora para mostrar solo HH:mm
        const formattedTime = timeTracking.hora ? timeTracking.hora.substring(0, 5) : '00:00'
        dayData.exit = {
          time: formattedTime,
          date: `${timeTracking.fecha}T${timeTracking.hora || '00:00:00'}`,
        }
      }
    })

    return Array.from(grouped.values()).sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date)
      if (dateCompare !== 0) return dateCompare
      return a.userName.localeCompare(b.userName)
    })
  })

  // Columnas para tablas (mantenidas para compatibilidad con el template)
  public readonly timeTrackingColumns = [
    { field: 'fecha', header: 'Fecha', sortable: true },
    { field: 'hora', header: 'Hora', sortable: true },
    { field: 'userName', header: 'Usuario', sortable: true },
    { field: 'tipo', header: 'Tipo', sortable: true },
  ]

  public readonly reportColumns = [
    { field: 'fecha', header: 'Fecha', sortable: true },
    { field: 'hora', header: 'Hora', sortable: true },
    { field: 'userName', header: 'Usuario', sortable: true },
    { field: 'descripcion', header: 'Descripción', sortable: true },
    { field: 'cantidadReportes', header: 'Cantidad', sortable: true },
  ]

  ngOnInit(): void {
    // Inicializar fechas por defecto (último mes)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 1)

    this.startDateValue = startDate
    this.endDateValue = endDate
    this._startDate.set(startDate)
    this._endDate.set(endDate)

    // Cargar datos iniciales
    this.loadDashboard()
  }

  /**
   * Carga los datos del dashboard con las fechas seleccionadas
   */
  async loadDashboard(): Promise<void> {
    const start = this.startDateValue
    const end = this.endDateValue

    if (!start || !end) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Fechas requeridas',
        detail: 'Por favor seleccione un rango de fechas',
      })
      return
    }

    if (start > end) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de fechas',
        detail: 'La fecha de inicio no puede ser mayor que la fecha de fin',
      })
      return
    }

    this.loading.set(true)
    this.error.set(null)

    try {
      const params = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      }

      const data = await this.apiService.getDashboardData(params).toPromise()
      this.dashboardData.set(data ?? null)
    } catch (err: unknown) {
      const errorMessage =
        (err && typeof err === 'object' && 'error' in err
          ? (err.error as { message?: string })?.message
          : null) || 'Error al cargar los datos del dashboard'
      this.error.set(errorMessage)
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
      })
    } finally {
      this.loading.set(false)
    }
  }

  /**
   * Maneja el cambio de fecha de inicio
   */
  onStartDateChange(): void {
    this._startDate.set(this.startDateValue)
  }

  /**
   * Maneja el cambio de fecha de fin
   */
  onEndDateChange(): void {
    this._endDate.set(this.endDateValue)
  }

  /**
   * Gets badge class based on time tracking type
   */
  getTimeTrackingBadgeClass(type: string): string {
    switch (type) {
      case 'INGRESO':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'SALIDA':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  /**
   * Gets badge class based on ticket status
   */
  getTicketBadgeClass(status: string): string {
    switch (status) {
      case 'abierto':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'cerrado':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  /**
   * Gets badge class based on invoice type
   */
  getInvoiceBadgeClass(type: string): string {
    switch (type) {
      case 'compra':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'venta':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  /**
   * Gets badge class based on sale type
   */
  getSaleBadgeClass(type: string): string {
    switch (type) {
      case 'requerimiento':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
      case 'cotizacion':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
      case 'tdr':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  /**
   * Formatea un número como moneda
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(value)
  }

  /**
   * Formats date in readable format
   */
  formatDate(dateString: string): string {
    try {
      const [year, month, day] = dateString.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return date.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  /**
   * Gets the day of the week
   */
  getDayOfWeek(dateString: string): string {
    try {
      const [year, month, day] = dateString.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return date.toLocaleDateString('es-PE', { weekday: 'long' })
    } catch {
      return ''
    }
  }

  /**
   * Calculates worked hours between entry and exit
   */
  calculateWorkedHours(entry?: { time: string; date: string }, exit?: { time: string; date: string }): number {
    if (!entry || !exit) return 0

    try {
      const entryTime = new Date(entry.date)
      const exitTime = new Date(exit.date)

      if (exitTime.getTime() <= entryTime.getTime()) return 0

      const diffMs = exitTime.getTime() - entryTime.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      return Math.round(diffHours * 100) / 100
    } catch {
      return 0
    }
  }

  /**
   * Formatea horas trabajadas
   */
  formatWorkedHours(hours: number): string {
    if (hours <= 0) return '-'
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h === 0 && m > 0) return `${m}m`
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0 && m === 0) return `${h}h`
    return '0h 0m'
  }

  /**
   * Checks if has complete attendance
   */
  hasCompleteAttendance(dayData: {
    entry?: { time: string; date: string }
    exit?: { time: string; date: string }
  }): boolean {
    return !!(dayData.entry && dayData.exit)
  }

  /**
   * Gets attendance status
   */
  getAttendanceStatus(dayData: {
    entry?: { time: string; date: string }
    exit?: { time: string; date: string }
  }): string {
    if (dayData.entry && dayData.exit) return 'Completo'
    if (dayData.entry || dayData.exit) return 'Incompleto'
    return 'Sin registro'
  }

  /**
   * Gets badge class based on attendance status
   */
  getAttendanceBadgeClass(status: string): string {
    switch (status) {
      case 'Completo':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'Incompleto':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'Sin registro':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  /**
   * Formatea fecha y hora para mostrar
   */
  formatDateTime(dateString: string): string {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  /**
   * Descarga el PDF del dashboard
   */
  async downloadPdf(): Promise<void> {
    const start = this.startDateValue
    const end = this.endDateValue

    if (!start || !end) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Fechas requeridas',
        detail: 'Por favor seleccione un rango de fechas',
      })
      return
    }

    if (start > end) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de fechas',
        detail: 'La fecha de inicio no puede ser mayor que la fecha de fin',
      })
      return
    }

    this.loading.set(true)

    try {
      const params = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      }

      const blob = await this.apiService.downloadPdf(params).toPromise()
      
      if (!blob) {
        throw new Error('No se pudo descargar el PDF')
      }

      // Crear URL del blob y descargar
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generar nombre del archivo
      const startDateStr = start.toISOString().split('T')[0]
      const endDateStr = end.toISOString().split('T')[0]
      link.download = `dashboard-gerencia_${startDateStr}_${endDateStr}.pdf`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      this.messageService.add({
        severity: 'success',
        summary: 'PDF descargado',
        detail: 'El PDF del dashboard se ha descargado exitosamente',
      })
    } catch (err: unknown) {
      const errorMessage =
        (err && typeof err === 'object' && 'error' in err
          ? (err.error as { message?: string })?.message
          : null) || 'Error al descargar el PDF'
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
      })
    } finally {
      this.loading.set(false)
    }
  }
}
