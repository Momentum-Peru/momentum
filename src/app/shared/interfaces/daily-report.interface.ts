import { Project } from './project.interface';
import { ExpenseCategory } from './category.interface';

export interface Observation {
  _id?: string;
  description: string;
  notes?: string;
  observationDate: string; // Fecha específica de la observación
  observationTime?: string; // Hora específica de la observación (formato HH:mm)
  documents: string[]; // URLs de documentos/fotos
}

export interface Purchase {
  _id?: string;
  description: string;
  amount: number;
  categoryId: string | ExpenseCategory; // Puede venir populado como objeto
  category?: ExpenseCategory; // Para enriquecimiento de datos
  notes?: string;
  vendor?: string;
  purchaseDate?: string; // Fecha específica de la compra
  documents: string[]; // URLs de documentos/fotos
}

export interface DailyExpense {
  _id?: string;
  title: string;
  date: string; // Formato ISO string (YYYY-MM-DD)
  observations: Observation[]; // Múltiples observaciones
  purchases: Purchase[];
  totalAmount: number; // Calculado automáticamente
  dailySummary: string; // Resumen en texto de lo que se hizo en el día
  userId: string | any; // _id del usuario que ha rellenado (puede venir populado)
  projectId: string | Project; // _id del proyecto asociado (puede venir populado)
  project?: Project; // Para enriquecimiento de datos
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string; // Razón del rechazo si aplica
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyExpenseOption {
  _id: string;
  title: string;
  date: string;
  totalAmount: number;
  projectId: string;
  status: string;
}
