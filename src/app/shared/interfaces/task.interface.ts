export type TaskStatus = 'Pendiente' | 'En curso' | 'Terminada';

export interface TaskFile {
  _id: string;
  taskId: string;
  commentId?: string; // Si el archivo está asociado a un comentario específico
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  uploadedBy: string;
  uploadedAt: Date | string;
}

export interface TaskAttachment {
  _id?: string;
  fileName: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  description?: string;
}

export interface TaskComment {
  _id: string;
  taskId: string;
  content: string;
  createdBy: string; // ID del usuario que creó el comentario
  createdAt: Date | string;
  updatedAt: Date | string;
  attachments?: TaskAttachment[];
}

export interface TaskSubtask {
  _id?: string;
  title: string;
  completed: boolean;
  order?: number;
}

export interface Task {
  _id: string;
  /** Ítem jerárquico (ej: 1.2, 3.1) */
  item?: string;
  title: string;
  description?: string;
  /** Responsable(s) de ejecución (texto, ej: "SERGIO", "AXEL Y CRISTHIAN") */
  ejecutor?: string;
  /** Proveedor externo responsable */
  proveedorResponsable?: string;
  /** Conclusiones o notas */
  conclusiones?: string;
  status: TaskStatus;
  priority: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  assignedTo: string | { _id?: string; name?: string; email?: string; profilePicture?: string }; // User ID o objeto poblado
  assignedToName?: string; // User name for display
  createdBy: string | { _id?: string; name?: string; email?: string; profilePicture?: string }; // User ID o objeto poblado
  createdByName?: string; // User name for display
  startDate?: Date | string;
  dueDate?: Date | string;
  completedDate?: Date | string;
  /** Porcentaje de avance 0-100 */
  progress?: number;
  tags: string[];
  boardId?: string | { _id?: string; title?: string }; // Board ID (opcional) o objeto poblado
  areaId?: string | { _id?: string; nombre?: string }; // Area ID o objeto poblado
  projectId?: string | { _id?: string; name?: string; code?: string }; // Project ID o objeto poblado (opcional)
  info?: TaskComment[]; // Comentarios/información de la tarea
  files?: TaskFile[];
  subtasks?: TaskSubtask[];
  attachments?: TaskAttachment[];
  incompleteReason?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  isActive: boolean;
}

export interface CreateTaskRequest {
  item?: string;
  title: string;
  description?: string;
  ejecutor?: string;
  proveedorResponsable?: string;
  conclusiones?: string;
  status?: TaskStatus;
  priority?: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  assignedTo: string;
  createdBy: string;
  startDate?: Date | string;
  dueDate?: Date | string;
  progress?: number;
  tags?: string[];
  boardId?: string;
  areaId?: string;
  projectId?: string;
  subtasks?: TaskSubtask[];
  attachments?: TaskAttachment[];
  incompleteReason?: string;
}

export interface UpdateTaskRequest {
  item?: string;
  title?: string;
  description?: string;
  ejecutor?: string;
  proveedorResponsable?: string;
  conclusiones?: string;
  status?: TaskStatus;
  priority?: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  assignedTo?: string;
  startDate?: Date | string;
  dueDate?: Date | string;
  completedDate?: Date | string;
  progress?: number;
  tags?: string[];
  boardId?: string;
  projectId?: string;
  subtasks?: TaskSubtask[];
  attachments?: TaskAttachment[];
  incompleteReason?: string;
  isActive?: boolean;
}

export interface CreateTaskCommentRequest {
  content: string;
  taskId: string;
  createdBy: string;
}

export interface UpdateTaskCommentRequest {
  content: string;
}

export interface TasksListResponse {
  data: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TasksSearchParams {
  search?: string;
  status?: TaskStatus;
  priority?: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  assignedTo?: string | string[];
  createdBy?: string | string[];
  boardId?: string | string[];
  tags?: string[];
  dueDateFrom?: Date | string;
  dueDateTo?: Date | string;
  page?: number;
  limit?: number;
  q?: string;
  areaId?: string | string[];
}

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  color: string;
}

export interface DragDropEvent {
  taskId: string;
  newStatus: TaskStatus;
  fromStatus?: TaskStatus;
  toStatus?: TaskStatus;
  newPosition?: number;
}
