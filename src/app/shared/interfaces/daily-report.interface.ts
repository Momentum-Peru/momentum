import { Project } from './project.interface';

export interface DailyReport {
  _id?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  description: string;
  audioDescription?: string | null; // URL
  videoDescription?: string | null; // URL
  photoDescription?: string | null; // URL
  documents?: string[]; // URLs
  userId: string | any; // puede venir populado
  projectId?: string | Project | null; // opcional
  createdAt?: string;
  updatedAt?: string;
}
