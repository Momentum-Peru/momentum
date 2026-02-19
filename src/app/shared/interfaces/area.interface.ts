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

export interface AssignUsersRequest {
  userIds: string[];
}

import { User } from '../services/users-api.service';

export interface AreaWithUsers extends Area {
  users: User[];
}

