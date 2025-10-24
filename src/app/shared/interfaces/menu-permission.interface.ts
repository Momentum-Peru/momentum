export interface MenuPermission {
  _id?: string;
  userId: string;
  route: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface MenuPermissionWithUser extends Omit<MenuPermission, 'userId'> {
  userId: User;
}

export interface AssignPermissionsRequest {
  userId: string;
  permissions: Omit<MenuPermission, '_id' | 'userId' | 'createdAt' | 'updatedAt'>[];
}

export interface MenuPermissionQuery {
  userId?: string;
  route?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MenuPermissionResponse {
  data: MenuPermissionWithUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MenuPermissionStats {
  totalPermissions: number;
  activePermissions: number;
  inactivePermissions: number;
  usersWithPermissions: number;
}

export interface UserOption {
  _id: string;
  name: string;
  email: string;
  role: string;
}
