/**
 * Interfaz para el perfil de usuario
 * Principio de Responsabilidad Única: Define únicamente la estructura de datos del perfil
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'gerencia';
  isActive: boolean;
  profilePicture?: string | null;
  lastLogin?: string | null;
  tenantIds?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Interfaz para actualizar el perfil
 * Solo permite actualizar campos editables (name)
 */
export interface UpdateProfileRequest {
  name?: string;
}
