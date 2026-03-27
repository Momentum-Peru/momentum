export interface AssociationMember {
  _id: string;
  nombres?: string;
  apellidos?: string;
  nombreCompleto?: string;
  dni?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePublicAssociationMemberRequest {
  nombreCompleto?: string;
  dni?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

export interface AssociationMemberQueryParams {
  search?: string;
  dni?: string;
  email?: string;
  telefono?: string;
  dateFrom?: string;
  dateTo?: string;
}
