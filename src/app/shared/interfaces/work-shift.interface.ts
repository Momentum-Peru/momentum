export interface WorkShift {
  _id?: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  toleranceMinutes: number;
  breakMinutes: number;
  days: string[];
  isActive: boolean;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateWorkShiftRequest = Omit<WorkShift, '_id' | 'tenantId' | 'createdAt' | 'updatedAt'>;

export type UpdateWorkShiftRequest = Partial<CreateWorkShiftRequest>;

export interface WorkShiftQueryParams {
  q?: string;
  isActive?: boolean;
}
