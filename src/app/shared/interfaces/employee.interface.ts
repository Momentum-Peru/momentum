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
  cargo?: string;
  numeroSeguroSocial: string;
  userId: string | UserInfo;
  areaId?: string | AreaInfo;
  accountNumber?: string;
  bank?: string;
  bankCode?: string;
  accountType?: 'Ahorro' | 'Corriente';
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
  cargo?: string;
  numeroSeguroSocial: string;
  userId: string;
  areaId?: string;
  accountNumber?: string;
  bank?: string;
  bankCode?: string;
  accountType?: 'Ahorro' | 'Corriente';
}

export interface UpdateEmployeeRequest {
  nombre?: string;
  apellido?: string;
  dni?: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
  cargo?: string;
  numeroSeguroSocial?: string;
  userId?: string;
  areaId?: string | null;
  accountNumber?: string;
  bank?: string;
  bankCode?: string;
  accountType?: 'Ahorro' | 'Corriente';
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

