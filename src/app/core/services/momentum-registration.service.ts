import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Registration {
  _id?: string;
  nombreCompleto: string;
  correo: string;
  password?: string;
  telefono: string;
  pais: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  facebook?: string;
  instagram?: string;
  ocupacion?: string;
  capitulo: string;
  nombreIMO?: string;
  enrolados?: Array<{
    nombre: string;
    telefono: string;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Contact {
  _id?: string;
  userId: string;
  nombreCompleto: string;
  telefono: string;
  dondeConocio: string;
  dondeConocioOtros?: string;
  ocupacion: string;
  ocupacionOtros?: string;
  estadoProspeccion: string;
  notas?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root',
})
export class MomentumRegistrationService {
  private readonly baseUrl = `${environment.apiUrl}/momentum-registration`;

  constructor(private http: HttpClient) {}

  // ========== REGISTRATIONS ==========

  login(credentials: { email: string; password: string }): Promise<Registration> {
    return firstValueFrom(
      this.http.post<Registration>(`${this.baseUrl}/auth/login`, credentials)
    );
  }

  createRegistration(data: Registration): Promise<Registration> {
    return firstValueFrom(
      this.http.post<Registration>(`${this.baseUrl}/registrations`, data)
    );
  }

  getAllRegistrations(): Promise<Registration[]> {
    return firstValueFrom(
      this.http.get<Registration[]>(`${this.baseUrl}/registrations`)
    );
  }

  getRegistrationsByCapitulo(capitulo: string): Promise<Registration[]> {
    return firstValueFrom(
      this.http.get<Registration[]>(`${this.baseUrl}/registrations?capitulo=${capitulo}`)
    );
  }

  getRegistrationById(id: string): Promise<Registration> {
    return firstValueFrom(
      this.http.get<Registration>(`${this.baseUrl}/registrations/${id}`)
    );
  }

  updateRegistration(id: string, data: Partial<Registration>): Promise<Registration> {
    return firstValueFrom(
      this.http.patch<Registration>(`${this.baseUrl}/registrations/${id}`, data)
    );
  }

  deleteRegistration(id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/registrations/${id}`)
    );
  }

  getRegistrationStatistics(): Promise<any> {
    return firstValueFrom(
      this.http.get<any>(`${this.baseUrl}/registrations/statistics`)
    );
  }

  // ========== CONTACTS ==========

  createContact(data: Contact): Promise<Contact> {
    return firstValueFrom(
      this.http.post<Contact>(`${this.baseUrl}/contacts`, data)
    );
  }

  getAllContacts(): Promise<Contact[]> {
    return firstValueFrom(
      this.http.get<Contact[]>(`${this.baseUrl}/contacts`)
    );
  }

  getContactsByUser(userId: string): Promise<Contact[]> {
    return firstValueFrom(
      this.http.get<Contact[]>(`${this.baseUrl}/contacts?userId=${userId}`)
    );
  }

  getContactsByEstado(estado: string): Promise<Contact[]> {
    return firstValueFrom(
      this.http.get<Contact[]>(`${this.baseUrl}/contacts?estado=${estado}`)
    );
  }

  getContactById(id: string): Promise<Contact> {
    return firstValueFrom(
      this.http.get<Contact>(`${this.baseUrl}/contacts/${id}`)
    );
  }

  updateContact(id: string, data: Partial<Contact>): Promise<Contact> {
    return firstValueFrom(
      this.http.patch<Contact>(`${this.baseUrl}/contacts/${id}`, data)
    );
  }

  updateContactEstado(id: string, estadoProspeccion: string): Promise<Contact> {
    return firstValueFrom(
      this.http.patch<Contact>(`${this.baseUrl}/contacts/${id}/estado`, { estadoProspeccion })
    );
  }

  deleteContact(id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/contacts/${id}`)
    );
  }

  getContactStatistics(userId?: string): Promise<any> {
    const url = userId 
      ? `${this.baseUrl}/contacts/statistics?userId=${userId}`
      : `${this.baseUrl}/contacts/statistics`;
    
    return firstValueFrom(
      this.http.get<any>(url)
    );
  }
}
