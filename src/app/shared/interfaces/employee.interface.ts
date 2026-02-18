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

import { WorkShift } from './work-shift.interface';

export interface Employee {
  _id?: string;
  nombre?: string;
  apellido?: string;
  tipoDocumento?: 'DNI' | 'Carné de Extranjería' | 'PTP' | 'Pasaporte';
  dni?: string;
  fotoPerfil?: string;
  correo?: string;
  correoCorporativo?: string;
  telefono?: string;
  direccion?: string;
  geoReferencia?: { lat: number; lng: number };
  conyugeConcubino?: {
    nombre: string;
    tipoDocumento: string;
    numeroDocumento: string;
  };
  hijos?: {
    nombre: string;
    fechaNacimiento: string | Date;
    tipoDocumento: string;
    numeroDocumento: string;
  }[];
  cargo?: string;
  sueldoBasico?: number;
  tipoEmpleado?: 'Planilla' | 'Locador';
  userId?: string | UserInfo;
  areaId?: string | AreaInfo;
  workShiftId?: string | WorkShift;
  accountNumber?: string;
  bank?: string;
  bankCode?: string;
  cci?: string;
  accountType?: 'Ahorro' | 'Corriente' | 'Sueldo';
  // Datos Laborales
  tipoContrato?: string;
  fechaInicioLabores?: string | Date;
  fechaFinContrato?: string | Date;
  sistemaPensionario?: 'SNP/ONP' | 'SPP/AFP';
  afp?: 'Integra' | 'Prima' | 'Hábitat' | 'Profuturo';
  tipoComision?: 'Flujo' | 'Mixta';
  cuspp?: string;
  centroCostos?: string;
  proyectoObra?: string;
  // Datos Locadores
  ruc?: string;
  constanciaSuspensionRenta?: string[];
  fechaVencimientoSuspension?: string | Date;
  contratos?: string[];
  antecedentesPoliciales?: string[];
  // Personal de Campo - EPP
  tallaCalzado?: string;
  tallaCamisa?: string;
  tallaPantalon?: string;
  tallaCasco?: string;
  tallaGuantes?: string;
  tallaRespirador?: string;
  lentesMedida?: boolean;
  // Personal de Campo - Administrativo y Salud
  examenMedico?: {
    fechaVencimiento?: string | Date;
    aptoAltura?: boolean;
    archivo?: string;
  };
  sctr?: {
    salud?: boolean;
    pension?: boolean;
    fechaVencimiento?: string | Date;
    archivo?: string;
  };
  contactoEmergencia?: {
    nombre: string;
    parentesco: string;
    telefono: string;
  };
  grupoSanguineo?: string;
  alergias?: string;
  // Personal de Campo - Documentación
  licenciaConducir?: {
    numero: string;
    categoria: string;
    fechaVencimiento: string | Date;
    archivo?: string;
  };
  antecedentes?: {
    penales?: boolean;
    judiciales?: boolean;
    policiales?: boolean;
    fechaEmision?: string | Date;
    archivo?: string;
  };
  capacitaciones?: {
    curso: string;
    fecha: string | Date;
    horas: number;
    archivo?: string;
  }[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEmployeeRequest {
  nombre?: string;
  apellido?: string;
  tipoDocumento?: 'DNI' | 'Carné de Extranjería' | 'PTP' | 'Pasaporte';
  dni?: string;
  fotoPerfil?: string;
  correo?: string;
  correoCorporativo?: string;
  telefono?: string;
  direccion?: string;
  geoReferencia?: { lat: number; lng: number };
  conyugeConcubino?: {
    nombre: string;
    tipoDocumento: string;
    numeroDocumento: string;
  };
  hijos?: {
    nombre: string;
    fechaNacimiento: string;
    tipoDocumento: string;
    numeroDocumento: string;
  }[];
  cargo?: string;
  sueldoBasico?: number;
  tipoEmpleado?: 'Planilla' | 'Locador';
  userId?: string;
  areaId?: string;
  workShiftId?: string;
  accountNumber?: string;
  bank?: string;
  bankCode?: string;
  cci?: string;
  accountType?: 'Ahorro' | 'Corriente' | 'Sueldo';
  // Datos Laborales
  tipoContrato?: string;
  fechaInicioLabores?: string;
  fechaFinContrato?: string;
  sistemaPensionario?: 'SNP/ONP' | 'SPP/AFP';
  afp?: 'Integra' | 'Prima' | 'Hábitat' | 'Profuturo';
  tipoComision?: 'Flujo' | 'Mixta';
  cuspp?: string;
  centroCostos?: string;
  proyectoObra?: string;
  // Datos Locadores
  ruc?: string;
  fechaVencimientoSuspension?: string;
  // Personal de Campo - EPP
  tallaCalzado?: string;
  tallaCamisa?: string;
  tallaPantalon?: string;
  tallaCasco?: string;
  tallaGuantes?: string;
  tallaRespirador?: string;
  lentesMedida?: boolean;
  // Personal de Campo - Administrativo y Salud
  examenMedico?: {
    fechaVencimiento?: string;
    aptoAltura?: boolean;
    archivo?: string;
  };
  sctr?: {
    salud?: boolean;
    pension?: boolean;
    fechaVencimiento?: string;
    archivo?: string;
  };
  contactoEmergencia?: {
    nombre: string;
    parentesco: string;
    telefono: string;
  };
  grupoSanguineo?: string;
  alergias?: string;
  // Personal de Campo - Documentación
  licenciaConducir?: {
    numero: string;
    categoria: string;
    fechaVencimiento: string;
    archivo?: string;
  };
  antecedentes?: {
    penales?: boolean;
    judiciales?: boolean;
    policiales?: boolean;
    fechaEmision?: string;
    archivo?: string;
  };
  capacitaciones?: {
    curso: string;
    fecha: string;
    horas: number;
    archivo?: string;
  }[];
  isActive?: boolean;
}

export interface UpdateEmployeeRequest {
  nombre?: string;
  apellido?: string;
  tipoDocumento?: 'DNI' | 'Carné de Extranjería' | 'PTP' | 'Pasaporte';
  dni?: string;
  fotoPerfil?: string;
  correo?: string;
  correoCorporativo?: string;
  telefono?: string;
  direccion?: string;
  geoReferencia?: { lat: number; lng: number };
  conyugeConcubino?: {
    nombre: string;
    tipoDocumento: string;
    numeroDocumento: string;
  };
  hijos?: {
    nombre: string;
    fechaNacimiento: string;
    tipoDocumento: string;
    numeroDocumento: string;
  }[];
  cargo?: string;
  sueldoBasico?: number;
  tipoEmpleado?: 'Planilla' | 'Locador';
  userId?: string | null;
  areaId?: string | null;
  workShiftId?: string | null;
  accountNumber?: string;
  bank?: string;
  bankCode?: string;
  cci?: string;
  accountType?: 'Ahorro' | 'Corriente' | 'Sueldo';
  // Datos Laborales
  tipoContrato?: string;
  fechaInicioLabores?: string;
  fechaFinContrato?: string;
  sistemaPensionario?: 'SNP/ONP' | 'SPP/AFP';
  afp?: 'Integra' | 'Prima' | 'Hábitat' | 'Profuturo';
  tipoComision?: 'Flujo' | 'Mixta';
  cuspp?: string;
  centroCostos?: string;
  proyectoObra?: string;
  // Datos Locadores
  ruc?: string;
  fechaVencimientoSuspension?: string;
  isActive?: boolean;
}

export interface EmployeeQueryParams {
  q?: string;
  userId?: string;
}

export interface UserOption {
  _id: string;
  name: string;
  email: string;
  areaName?: string;
}
