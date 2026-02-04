
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DigitalSignature } from '../interfaces/digital-signature.interface';

/**
 * Servicio para gestionar la firma digital del usuario
 * Principio de Responsabilidad Única: Solo maneja las llamadas HTTP al endpoint de firma digital
 */
@Injectable({ providedIn: 'root' })
export class DigitalSignatureApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/digital-signature`;

  /**
   * Sube o actualiza la firma digital
   * @param file Archivo de imagen
   * @param companyId ID de la empresa
   */
  uploadSignature(file: File, companyId: string): Observable<DigitalSignature> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('companyId', companyId);

    return this.http.post<DigitalSignature>(this.baseUrl, formData);
  }

  /**
   * Obtiene la firma digital del usuario para una empresa
   * @param companyId ID de la empresa
   */
  getSignature(companyId: string): Observable<DigitalSignature> {
    const params = new HttpParams().set('companyId', companyId);
    return this.http.get<DigitalSignature>(this.baseUrl, { params });
  }
  /**
   * Elimina la firma digital
   * @param companyId ID de la empresa
   */
  deleteSignature(companyId: string): Observable<void> {
    const params = new HttpParams().set('companyId', companyId);
    return this.http.delete<void>(this.baseUrl, { params });
  }
}
