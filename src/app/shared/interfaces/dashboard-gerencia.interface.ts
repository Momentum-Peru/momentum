/**
 * Interfaces para el Dashboard de Gerencia
 * Basado en la API de dashboard-gerencia-api.md
 */

export interface MarcacionDiaria {
  userId: string
  userName: string
  userEmail: string
  fecha: string
  hora: string
  tipo: 'INGRESO' | 'SALIDA'
  location?: {
    latitude: number
    longitude: number
  }
}

export interface ReporteDiario {
  userId: string
  userName: string
  userEmail: string
  fecha: string
  hora: string
  descripcion: string
  projectId?: string
  projectName?: string
  cantidadReportes: number
}

export interface FacturaIngresada {
  tipo: 'compra' | 'venta'
  cantidad: number
  monto: number
}

export interface TicketPorEstado {
  estado: 'abierto' | 'cerrado'
  cantidad: number
}

export interface TicketIndividual {
  _id: string
  reportedBy: string
  reportedByName: string
  reportedByEmail: string
  problem: string
  status: 'abierto' | 'cerrado'
  createdAt: string
  updatedAt: string
  closedAt?: string
}

export interface Venta {
  tipo: 'requerimiento' | 'cotizacion' | 'tdr'
  cantidad: number
}

export interface GerenciaDashboardResponse {
  marcacionesDiarias: MarcacionDiaria[]
  reportesDiarios: ReporteDiario[]
  facturasIngresadas: FacturaIngresada[]
  ticketsPorEstado: TicketPorEstado[]
  tickets: TicketIndividual[]
  ventas: Venta[]
  rangoFechas: {
    startDate: string
    endDate: string
  }
  tenantId?: string | null
}

export interface GerenciaDashboardQueryParams {
  startDate: string
  endDate: string
  tenantId?: string
  companyId?: string
}
