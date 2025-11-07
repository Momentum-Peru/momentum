import { Project } from './project.interface';

interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
}

export interface DailyReport {
  _id?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  description: string;
  audioDescription?: string | string[] | null; // URL o URLs
  videoDescription?: string | string[] | null; // URL o URLs
  photoDescription?: string | string[] | null; // URL o URLs
  documents?: string[]; // URLs
  userId: string | PopulatedUser; // puede venir populado
  projectId?: string | Project | null; // opcional
  createdAt?: string;
  updatedAt?: string;
}
