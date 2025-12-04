import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LeadsApiService } from '../../../shared/services/leads-api.service';
import { CreateLeadRequest, Lead } from '../../../shared/interfaces/lead.interface';

/**
 * Interfaz para los datos del formulario
 */
export interface LeadFormData {
  name: string;
  email: string;
  phone: string;
  address?: string;
  referredBy?: string;
  hasCompany?: boolean;
  company?: string;
  dni?: string;
  ruc?: string;
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
  submitLead(formData: LeadFormData): Observable<Lead> {
    // Construir las notas con información adicional
    const notesParts: string[] = [];
    if (formData.dni) {
      notesParts.push(`DNI: ${formData.dni}`);
    }
    if (formData.referredBy) {
      notesParts.push(`Referido por: ${formData.referredBy}`);
    }
    const notes = notesParts.length > 0 ? notesParts.join(' | ') : undefined;

    const leadRequest: CreateLeadRequest = {
      name: formData.name,
      contact: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      },
      company: formData.hasCompany
        ? {
          name: formData.company,
          taxId: formData.ruc
        }
        : undefined,
      location: formData.address
        ? {
          direccion: formData.address
        }
        : undefined,
      source: formData.referredBy ? 'REFERRAL' : 'WEBSITE',
      notes: notes,
      status: 'NEW'
    };

    return this.leadsApiService.create(leadRequest);
  }
}

