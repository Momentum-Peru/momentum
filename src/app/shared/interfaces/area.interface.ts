export interface Area {
  _id?: string;
  nombre: string;
  codigo?: string;
  descripcion?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAreaRequest {
  nombre: string;
  codigo?: string;
  descripcion?: string;
  isActive?: boolean;
}

export interface UpdateAreaRequest {
  nombre?: string;
  codigo?: string;
  descripcion?: string;
  isActive?: boolean;
}

export interface AreaQueryParams {
  q?: string;
  isActive?: boolean;
}

