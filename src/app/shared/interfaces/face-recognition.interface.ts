export interface FaceDescriptor {
  _id: string;
  tenantId: string;
  userId: string | any; // puede venir populado
  descriptor: number[]; // Array de 128 números
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  _id: string;
  tenantId: string;
  userId: string | any; // puede venir populado
  type: 'ENTRADA' | 'SALIDA';
  timestamp: string;
  imageUrl?: string;
  confidence?: number;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterFaceRequest {
  userId: string;
}

export interface MarkAttendanceRequest {
  type?: 'ENTRADA' | 'SALIDA';
  location?: string;
  notes?: string;
}

export interface FaceDescriptorResponse {
  _id: string;
  tenantId: string;
  userId: string | any;
  descriptor: number[];
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

