import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MomentumRegistrationService } from '../../core/services/momentum-registration.service';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-sergionolasco',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    SelectModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
    TableModule,
    TextareaModule,
    TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './sergionolasco.html',
  styleUrls: ['./sergionolasco.scss'],
})
export class SergioNolascoPage implements OnInit {
  // Manejo de Vistas: 'login' | 'register' | 'app'
  viewState: 'login' | 'register' | 'app' = 'login';
  isLoading = false;

  // Login Data
  loginData = {
    email: '',
    password: ''
  };

  // Registration form data
  registrationData: any = {
    nombreCompleto: '',
    correo: '',
    telefono: '',
    pais: 'Perú',
    departamento: '',
    provincia: '',
    distrito: '',
    facebook: '',
    instagram: '',
    ocupacion: '',
    capitulo: 'Recién Inscrito',
    nombreIMO: '',
    password: '', // New field
    enrolados: [],
  };

  // CRM form data
  contactData: any = {
    userId: '',
    nombreCompleto: '',
    telefono: '',
    dondeConocio: 'Evento',
    dondeConocioOtros: '',
    ocupacion: 'Empresario',
    ocupacionOtros: '',
    estadoProspeccion: 'Frio',
    notas: '',
  };

  // Lists
  registeredUser: any = null;
  contactsList: any[] = [];
  stats: any = null;

  newEnrolado = { nombre: '', telefono: '' };

  constructor(
    private momentumService: MomentumRegistrationService,
    private messageService: MessageService,
  ) {}

  ngOnInit() {
    // Check if user is already logged in (optional persistence)
    const storedUser = localStorage.getItem('momentum_user');
    if (storedUser) {
      this.registeredUser = JSON.parse(storedUser);
      this.viewState = 'app';
      this.loadContacts();
    }
  }

  // ========== AUTHENTICATION ==========

  async login() {
    this.isLoading = true;
    try {
      const user = await this.momentumService.login(this.loginData);
      
      this.registeredUser = user;
      localStorage.setItem('momentum_user', JSON.stringify(user));
      
      this.messageService.add({
        severity: 'success',
        summary: 'Bienvenido',
        detail: `Hola ${user.nombreCompleto}`,
      });
      
      this.viewState = 'app';
      await this.loadContacts();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de acceso',
        detail: error?.error?.message || 'Credenciales inválidas',
      });
    } finally {
      this.isLoading = false;
    }
  }

  logout() {
    localStorage.removeItem('momentum_user');
    this.registeredUser = null;
    this.viewState = 'login';
    this.loginData = { email: '', password: '' };
  }

  toggleView(view: 'login' | 'register') {
    this.viewState = view;
  }

  // ========== REGISTRO ==========

  addEnrolado() {
    if (this.newEnrolado.nombre && this.newEnrolado.telefono) {
      this.registrationData.enrolados.push({ ...this.newEnrolado });
      this.newEnrolado = { nombre: '', telefono: '' };
    }
  }

  removeEnrolado(index: number) {
    this.registrationData.enrolados.splice(index, 1);
  }

  async submitRegistration() {
    this.isLoading = true;

    try {
      const result = await this.momentumService.createRegistration(this.registrationData);
      this.registeredUser = result;
      this.contactData.userId = result._id;
      
      // Auto login after registration
      localStorage.setItem('momentum_user', JSON.stringify(result));
      
      this.messageService.add({
        severity: 'success',
        summary: '¡Bienvenido!',
        detail: 'Registro completado. Ahora puedes gestionar tus contactos.',
      });
      
      this.viewState = 'app';
      await this.loadContacts();
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error?.message || 'Error al registrar.',
      });
    } finally {
      this.isLoading = false;
    }
  }

  // ========== CRM ==========

  async submitContact() {
    this.isLoading = true;

    try {
      // Ensure userId is set
      if (!this.contactData.userId && this.registeredUser) {
        this.contactData.userId = this.registeredUser._id;
      }

      await this.momentumService.createContact(this.contactData);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Contacto Agregado',
        detail: 'El contacto se ha guardado exitosamente.',
      });
      
      // Reset form keeping userId
      this.contactData = {
        userId: this.registeredUser._id,
        nombreCompleto: '',
        telefono: '',
        dondeConocio: 'Evento',
        dondeConocioOtros: '',
        ocupacion: 'Empresario',
        ocupacionOtros: '',
        estadoProspeccion: 'Frio',
        notas: '',
      };
      
      await this.loadContacts();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error?.message || 'Error al guardar contacto.',
      });
    } finally {
      this.isLoading = false;
    }
  }

  async loadContacts() {
    if (!this.registeredUser || !this.registeredUser._id) return;
    
    try {
      this.contactsList = await this.momentumService.getContactsByUser(this.registeredUser._id);
      // Optional: Load stats if needed
      // this.stats = await this.momentumService.getContactsStats(this.registeredUser._id);
    } catch (error) {
      console.error('Error loading contacts', error);
    }
  }

  async updateContactEstado(id: string, estado: string) {
    try {
      await this.momentumService.updateContactEstado(id, estado);
      this.messageService.add({
        severity: 'info',
        summary: 'Estado Actualizado',
        detail: `El estado ahora es: ${estado}`,
      });
      // No need to reload all if just updating state locally is enough, 
      // but reloading ensures sync.
      await this.loadContacts(); 
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar el estado.',
      });
    }
  }

  async deleteContact(id: string) {
    if (!confirm('¿Estás seguro de eliminar este contacto?')) return;
    
    try {
      await this.momentumService.deleteContact(id);
      this.messageService.add({
        severity: 'success',
        summary: 'Eliminado',
        detail: 'Contacto eliminado.',
      });
      await this.loadContacts();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al eliminar el contacto.',
      });
    }
  }

  resetForm() {
    // Used when inside APP to register another person? Or cleared?
    // Given the context, this might not be needed anymore or behaves differently
    this.logout();
  }
}
