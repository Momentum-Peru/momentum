export interface UserInfo {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface AreaInfo {
  _id: string;
  nombre: string;
  codigo?: string;
}

export interface Employee {
  _id?: string;
  nombre: string;
  apellido: string;
  dni: string;
  correo: string;
  telefono?: string;
  direccion?: string;
  numeroSeguroSocial: string;
  userId: string | UserInfo;
  areaId?: string | AreaInfo;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEmployeeRequest {
  nombre: string;
  apellido: string;
  dni: string;
  correo: string;
  telefono?: string;
  direccion?: string;
  numeroSeguroSocial: string;
  userId: string;
  areaId?: string;
}

export interface UpdateEmployeeRequest {
  nombre?: string;
  apellido?: string;
  dni?: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
  numeroSeguroSocial?: string;
  userId?: string;
  areaId?: string | null;
}

export interface EmployeeQueryParams {
  q?: string;
  userId?: string;
}

export interface UserOption {
  _id: string;
  name: string;
  email: string;
}

