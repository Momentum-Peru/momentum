/**
 * Interfaces para el Dashboard de Gerencia
 * Basado en la API de dashboard-gerencia-api.md
 */

export interface MarcacionDiaria {
  userId: string;
  userName: string;
  userEmail: string;
  fecha: string;
  hora: string;
  tipo: 'INGRESO' | 'SALIDA';
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface ReporteDiario {
  userId: string;
  userName: string;
  userEmail: string;
  fecha: string;
  hora: string;
  descripcion: string;
  projectId?: string;
  projectName?: string;
  cantidadReportes: number;
}

export interface FacturaIngresada {
  tipo: 'compra' | 'venta';
  cantidad: number;
  monto: number;
}

export interface TicketPorEstado {
  estado: 'abierto' | 'cerrado';
  cantidad: number;
}

export interface TicketIndividual {
  _id: string;
  reportedBy: string;
  reportedByName: string;
  reportedByEmail: string;
  problem: string;
  status: 'abierto' | 'cerrado';
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface Venta {
  tipo: 'requerimiento' | 'cotizacion' | 'tdr';
  cantidad: number;
}

export interface GerenciaDashboardResponse {
  marcacionesDiarias: MarcacionDiaria[];
  reportesDiarios: ReporteDiario[];
  facturasIngresadas: FacturaIngresada[];
  ticketsPorEstado: TicketPorEstado[];
  tickets: TicketIndividual[];
  ventas: Venta[];
  rangoFechas: {
    startDate: string;
    endDate: string;
  };
  tenantId?: string | null;
}

export interface GerenciaDashboardQueryParams {
  startDate: string;
  endDate: string;
  tenantId?: string;
  companyId?: string;
}

/**
 * Interfaz para datos de un día de marcación agrupado
 */
export interface DayTrackingData {
  date: string;
  entry?: { time: string; date: string; location?: { latitude: number; longitude: number } };
  exit?: { time: string; date: string; location?: { latitude: number; longitude: number } };
}

/**
 * Interfaz para datos agrupados por persona
 */
export interface UserTrackingData {
  userId: string;
  userName: string;
  userEmail: string;
  days: DayTrackingData[];
  totalDays: number;
  totalHours: number;
}

/**
 * Interfaz para datos de un día de reporte agrupado
 */
export interface DayReportData {
  date: string;
  reports: ReporteDiario[];
  totalReports: number;
}

/**
 * Interfaz para datos de reportes agrupados por persona
 */
export interface UserReportData {
  userId: string;
  userName: string;
  userEmail: string;
  days: DayReportData[];
  totalDays: number;
  totalReports: number;
}
