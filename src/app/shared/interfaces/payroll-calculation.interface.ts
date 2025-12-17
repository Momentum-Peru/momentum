export interface EmployeeInfo {
  _id: string;
  nombre: string;
  apellido: string;
  dni: string;
  cargo?: string;
}

export interface AttendanceRecordInfo {
  _id: string;
  type: 'ENTRADA' | 'SALIDA';
  timestamp: string;
  location?: string;
}

export interface TimeTrackingInfo {
  _id: string;
  date: string;
  type: 'INGRESO' | 'SALIDA';
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface PayrollCalculation {
  _id: string;
  tenantId: string;
  employeeId: string | EmployeeInfo;
  date: string;
  entryTime?: string;
  exitTime?: string;
  workedHours?: number;
  isAbsent: boolean;
  isManual: boolean;
  attendanceRecordId?: string | AttendanceRecordInfo;
  timeTrackingId?: string | TimeTrackingInfo;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayrollCalculationRequest {
  employeeId: string;
  date: string;
  entryTime?: string;
  exitTime?: string;
  workedHours?: number;
  notes?: string;
}

export interface UpdatePayrollCalculationRequest {
  entryTime?: string;
  exitTime?: string;
  workedHours?: number;
  notes?: string;
}

export interface CalculatePayrollRequest {
  startDate: string;
  endDate: string;
  userId?: string;
  recalculate?: boolean;
}

export interface CalculatePayrollResponse {
  processed: number;
  created: number;
  updated: number;
}

export interface PayrollCalculationQueryParams {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  isAbsent?: boolean;
}
