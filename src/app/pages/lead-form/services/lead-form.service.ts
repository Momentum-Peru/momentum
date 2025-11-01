import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LeadsApiService } from '../../../shared/services/leads-api.service';
import { CreateLeadRequest } from '../../../shared/interfaces/lead.interface';

/**
 * Interfaz para los datos del formulario
 */
export interface LeadFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  taxId: string;
}

/**
 * Servicio para manejar la lógica de negocio del formulario de leads
 * Principio de Responsabilidad Única: Solo maneja la transformación y envío de datos
 */
@Injectable({
  providedIn: 'root'
})
export class LeadFormService {
  private readonly leadsApiService = inject(LeadsApiService);

  /**
   * Transforma los datos del formulario en el formato requerido por la API
   * y envía el lead al servidor
   */
  submitLead(formData: LeadFormData): Observable<any> {
    const leadRequest: CreateLeadRequest = {
      name: formData.name,
      contact: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      },
      company: {
        name: formData.company,
        taxId: formData.taxId
      },
      source: 'WEBSITE',
      status: 'NEW'
    };

    return this.leadsApiService.create(leadRequest);
  }
}

