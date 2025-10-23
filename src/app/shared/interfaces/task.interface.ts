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

export interface TaskComment {
  _id: string;
  taskId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  files: TaskFile[];
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  assignedTo: string; // User ID
  assignedToName?: string; // User name for display
  createdBy: string; // User ID
  createdByName?: string; // User name for display
  dueDate?: Date | string;
  tags: string[];
  comments: TaskComment[];
  files: TaskFile[];
  createdAt: Date | string;
  updatedAt: Date | string;
  isActive: boolean;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  assignedTo: string;
  createdBy: string;
  dueDate?: Date | string;
  tags?: string[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  assignedTo?: string;
  dueDate?: Date | string;
  tags?: string[];
  isActive?: boolean;
}

export interface CreateTaskCommentRequest {
  content: string;
  taskId: string;
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
  assignedTo?: string;
  createdBy?: string;
  tags?: string[];
  dueDateFrom?: Date | string;
  dueDateTo?: Date | string;
  page?: number;
  limit?: number;
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
