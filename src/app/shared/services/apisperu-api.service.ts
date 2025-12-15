import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Interfaces para las respuestas de APIsPERU
 */
export interface ApisPeruDniResponse {
  success?: boolean;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto?: string;
  codVerifica?: string;
  codVerificaLetra?: string;
}

export interface ApisPeruRucResponse {
  success?: boolean;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string | null;
  tipo?: string | null;
  estado?: string;
  condicion?: string;
  direccion?: string | null;
  ubigeo?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  direccionCompleta?: string;
  telefonos?: string[];
  fechaInscripcion?: string | null;
  fechaBaja?: string | null;
  actEconomicas?: any[];
  sistElectronica?: any[];
  cpeElectronico?: any[];
  cpPago?: any[];
  padrones?: any[];
  actExterior?: any | null;
  capital?: string | null;
  profesion?: string | null;
  sistContabilidad?: string | null;
  sistEmsion?: string | null;
  fechaEmisorFe?: string | null;
  fechaPle?: string | null;
}

/**
 * Servicio para consultar información de DNI y RUC mediante APIsPERU
 * Principio de Responsabilidad Única: Solo maneja las llamadas HTTP a APIsPERU
 */
@Injectable({ providedIn: 'root' })
export class ApisPeruApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/apisperu`;

  /**
   * Consulta información de un DNI
   * @param dni Número de DNI (8 dígitos)
   * @returns Información del DNI
   */
  consultDni(dni: string): Observable<ApisPeruDniResponse> {
    return this.http.get<ApisPeruDniResponse>(`${this.baseUrl}/dni/${dni}`);
  }

  /**
   * Consulta información de un RUC
   * @param ruc Número de RUC (11 dígitos)
   * @returns Información del RUC
   */
  consultRuc(ruc: string): Observable<ApisPeruRucResponse> {
    return this.http.get<ApisPeruRucResponse>(`${this.baseUrl}/ruc/${ruc}`);
  }

  /**
   * Consulta información de un documento automáticamente (DNI o RUC)
   * @param document Número de documento (8 dígitos para DNI, 11 para RUC)
   * @returns Información del documento
   */
  consultDocument(document: string): Observable<ApisPeruDniResponse | ApisPeruRucResponse> {
    return this.http.get<ApisPeruDniResponse | ApisPeruRucResponse>(
      `${this.baseUrl}/consult`,
      { params: { document } }
    );
  }
}

