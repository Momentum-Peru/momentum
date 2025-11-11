export type AccionableEstado = 'pendiente' | 'cumplido';

export interface FiPlan {
	descripcion: string;
	fechaInicio: string; // ISO Date (YYYY-MM-DD o ISO completo)
	fechaFin: string; // ISO Date
}

export interface Fi {
	_id: string;
	titulo: string;
	atravesar: string;
	plan: FiPlan;
	isActive: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export interface CreateFiRequest {
	titulo: string;
	atravesar: string;
	plan: {
		descripcion: string;
		fechaInicio: string;
		fechaFin: string;
	};
	isActive: boolean;
}

export interface UpdateFiRequest {
	titulo?: string;
	atravesar?: string;
	plan?: {
		descripcion?: string;
		fechaInicio?: string;
		fechaFin?: string;
	};
	isActive?: boolean;
}

export interface Accionable {
	_id: string;
	fiId: string;
	fecha: string; // ISO
	descripcion: string;
	estado: AccionableEstado;
	createdAt?: string;
	updatedAt?: string;
}

export interface CreateAccionableRequest {
	fecha: string; // ISO
	descripcion: string;
}

export interface UpdateAccionableRequest {
	fecha?: string;
	descripcion?: string;
	estado?: AccionableEstado;
}

export interface UpdateAccionableEstadoRequest {
	estado: AccionableEstado;
}

export interface CalendarDay {
	fecha: string; // YYYY-MM-DD
	accionable: Accionable | null;
}

export interface CalendarResponse {
	fiId: string;
	rango: { from: string; to: string };
	dias: CalendarDay[];
}


