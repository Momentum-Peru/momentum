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
import { DatePickerModule } from 'primeng/datepicker'; 
import { ActivatedRoute } from '@angular/router'; 
import { AutoCompleteModule } from 'primeng/autocomplete'; 

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
    DatePickerModule,
    AutoCompleteModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './sergionolasco.html',
  styleUrls: ['./sergionolasco.scss'],
})
export class SergioNolascoPage implements OnInit {
  // Manejo de Vistas: 'login' | 'register' | 'app'
  viewState: 'login' | 'register' | 'app' = 'register'; // Changed default to register
  isLoading = false;

  // Login Data
  loginData = {
    email: '',
    password: ''
  };

  // Registration form data
  // Registration form data (LEAD)
  registrationData: any = {
    nombreCompleto: '',
    dni: '',
    fechaNacimiento: '',
    direccion: '',
    correo: '',
    telefono: '',
    nickname: '',
    // Optional/Legacy fields (can be hidden or removed from form)
    pais: 'Perú',
    capitulo: 'Recién Inscrito', 
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
  registrationsList: any[] = []; // List of all leads for admin
  filteredLeads: any[] = []; // For autocomplete
  selectedLead: any = null; // Currently selected lead in "Registro Datos"
  stats: any = null;

  newEnrolado = { nombre: '', telefono: '' };

  // Note inputs for each column
  frioNoteInput = '';
  tibioNoteInput = '';
  calienteNoteInput = '';
  cierreNoteInput = '';

  constructor(
    private momentumService: MomentumRegistrationService,
    private messageService: MessageService,
    private route: ActivatedRoute
  ) {}

  isAdminMode = true; // Always true as requested

  ngOnInit() {
    // Check if route is /admin or normal login, both lead to Admin CRM view now
    if (this.route.snapshot.url.toString().includes('admin')) {
      this.viewState = 'app'; 
      this.loadAllRegistrations();
    } else {
      // Check login
      const storedUser = localStorage.getItem('momentum_user');
      if (storedUser) {
        this.registeredUser = JSON.parse(storedUser);
        this.viewState = 'app';
        this.loadAllRegistrations(); // Always load all for CRM
      }
    }
  }

  async loadAllRegistrations() {
    this.isLoading = true;
    try {
      // In Admin Mode, we treat Registrations as Contacts for the Kanban
      const regs = await this.momentumService.getAllRegistrations();
      this.registrationsList = regs;
      this.contactsList = regs.map((r: any) => ({
        ...r,
        // Ensure fields map correctly if they differ, specifically mainly needed properties
        // The schema update added estadoProspeccion to Registration so it should be there.
        // Default to 'Frio' if missing
        estadoProspeccion: r.estadoProspeccion || 'Frio',
        dondeConocio: r.dondeConocio || 'Evento', 
        ocupacion: r.ocupacion || 'Empresario'
      }));

      // Auto-select first lead
      if (this.contactsList.length > 0 && !this.selectedLead) {
        this.selectedLead = this.contactsList[0];
        this.onLeadSelect(this.selectedLead);
      }
    } catch (error) {
      console.error('Error loading registrations', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los registros.' });
    } finally {
      this.isLoading = false;
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
      await this.loadAllRegistrations();
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
      // Lead created (no auto login for lead)
      
      this.messageService.add({
        severity: 'success',
        summary: '¡Éxito!',
        detail: 'finalizar su registro ha sido exito',
      });
      
      // Clear form (or at least the sensitive parts)
      this.registrationData = {
        nombreCompleto: '',
        dni: '',
        fechaNacimiento: '',
        direccion: '',
        correo: '',
        telefono: '',
        nickname: '',
        pais: 'Perú',
        capitulo: 'Recién Inscrito', 
        enrolados: [],
      };
      
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

      // Check if updating existing Registration (Admin Mode) or Creating new Contact
      if (this.isAdminMode && this.contactData._id) {
           await this.momentumService.updateRegistration(this.contactData._id, this.contactData);
           this.messageService.add({
             severity: 'success',
             summary: 'Lead Actualizado',
             detail: 'Información del lead actualizada.',
           });
           
           // Update local item in list to reflect changes immediately
           const index = this.contactsList.findIndex(c => c._id === this.contactData._id);
           if (index !== -1) {
             this.contactsList[index] = { ...this.contactsList[index], ...this.contactData };
           }

      } else {
          // Normal User Mode: Create Contact
          await this.momentumService.createContact(this.contactData);
          this.messageService.add({
            severity: 'success',
            summary: 'Contacto Agregado',
            detail: 'El contacto se ha guardado exitosamente.',
          });
          await this.loadContacts();
      }
      
      this.resetForm();

    } catch (error: any) {
      console.error(error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error?.message || 'Error al guardar contacto.',
      });
    } finally {
      this.isLoading = false;
    }
  }

  // Admin: Search Leads
  searchLeads(event: any) {
    const query = event.query.toLowerCase();
    this.filteredLeads = this.registrationsList.filter(l => 
      (l.nombreCompleto && l.nombreCompleto.toLowerCase().includes(query)) ||
      (l.telefono && l.telefono.toString().includes(query)) ||
      (l.dni && l.dni.includes(query))
    );
  }

  onLeadSelect(event: any) {
    const lead = event.value || event;
    this.selectedLead = lead; // Set selected
    
    // Populate form with lead data (Admin Mode)
    this.contactData = {
      ...this.contactData, // Keep defaults or overwrite? Overwrite specific fields.
      _id: lead._id, // Important for update
      userId: lead.userId || lead._id, // Reuse ID
      nombreCompleto: lead.nombreCompleto,
      telefono: lead.telefono,
      dondeConocio: lead.dondeConocio || 'Evento',
      dondeConocioOtros: lead.dondeConocioOtros || '',
      ocupacion: lead.ocupacion || 'Empresario',
      ocupacionOtros: lead.ocupacionOtros || '',
      estadoProspeccion: lead.estadoProspeccion || 'Frio',
      notas: lead.notas || '',
      direccion: lead.direccion || lead.pais || '', // Map location
    };
  }

  // Helper to parse notes string into array of note objects
  parseNotes(notasString: string): any[] {
    if (!notasString || !notasString.trim()) return [];
    
    const notes: any[] = [];
    const regex = /Seguimiento \((\d+)\) - \[(.*?)\]\s*\n([\s\S]*?)(?=\n\nSeguimiento \(\d+\)|$)/g;
    let match;
    
    while ((match = regex.exec(notasString)) !== null) {
      notes.push({
        id: parseInt(match[1], 10),
        timestamp: match[2],
        text: match[3].trim()
      });
    }
    
    return notes;
  }

  // Helper to convert notes array back to string
  notesToString(notes: any[]): string {
    return notes.map(note => 
      `Seguimiento (${note.id}) - [${note.timestamp}] \n${note.text}`
    ).join('\n\n');
  }

  // Helper to append note
  addFollowUpNote(contact: any, newNote: string) {
    if (!newNote || !newNote.trim()) return;
    
    const notes = this.parseNotes(contact.notas || '');
    const nextNum = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;
    
    const timestamp = new Date().toLocaleString('es-PE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    notes.push({
      id: nextNum,
      timestamp: timestamp,
      text: newNote.trim()
    });
    
    const updatedNotas = this.notesToString(notes);
    this.updateContactEstado(contact._id, contact.estadoProspeccion, updatedNotas);
  }

  // Edit a specific note
  editFollowUpNote(contact: any, noteId: number, newText: string) {
    if (!newText || !newText.trim()) return;
    
    const notes = this.parseNotes(contact.notas || '');
    const noteIndex = notes.findIndex(n => n.id === noteId);
    
    if (noteIndex !== -1) {
      notes[noteIndex].text = newText.trim();
      const updatedNotas = this.notesToString(notes);
      this.updateContactEstado(contact._id, contact.estadoProspeccion, updatedNotas);
    }
  }

  // Delete a specific note
  deleteFollowUpNote(contact: any, noteId: number) {
    const notes = this.parseNotes(contact.notas || '');
    const filteredNotes = notes.filter(n => n.id !== noteId);
    
    const updatedNotas = filteredNotes.length > 0 ? this.notesToString(filteredNotes) : '';
    this.updateContactEstado(contact._id, contact.estadoProspeccion, updatedNotas);
  }

  resetForm() {
      this.selectedLead = null;
      this.contactData = {
        userId: this.registeredUser ? this.registeredUser._id : '',
        nombreCompleto: '',
        telefono: '',
        dondeConocio: 'Evento',
        dondeConocioOtros: '',
        ocupacion: 'Empresario',
        ocupacionOtros: '',
        estadoProspeccion: 'Frio',
        notas: '',
        direccion: '',
      };
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

  getContactsByStatus(status: string): any[] {
    // If a lead is selected, only show THAT lead in its respective status column.
    // If NO lead is selected, show NOTHING (as requested: "no deben salir todo los leads").
    if (!this.selectedLead) {
      return [];
    }
    // Only show if the selected lead matches the status
    // Use the one from contactsList to ensure updates reflect (selectedLead might be stale locally)
    const current = this.contactsList.find(c => c._id === this.selectedLead._id);
    
    if (current && current.estadoProspeccion === status) {
       return [current];
    }
    return [];
  }

  async updateContactEstado(id: string, estado: string, newNotas?: string) {
    try {
      const item = this.contactsList.find(c => c._id === id);
      const notas = newNotas !== undefined ? newNotas : (item ? item.notas : '');

      if (this.isAdminMode) {
        // Update Registration Status and Notes
        await this.momentumService.updateRegistration(id, { estadoProspeccion: estado, notas });
        
        // Update local list
        if (item) {
           item.estadoProspeccion = estado;
           item.notas = notas;
        }

      } else {
        // Update Contact Status (User Mode)
        // Check if just status update or we need generic update for notes
        // We will use generic update to cover both
        if (item) {
             await this.momentumService.updateContact(id, { estadoProspeccion: estado, notas });
        }
        await this.loadContacts(); 
      }

      this.messageService.add({
        severity: 'info',
        summary: 'Actualizado',
        detail: `Lead actualizado correctamente`,
      });
      
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar.',
      });
    }
  }

  async deleteContact(id: string) {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;
    
    try {
      if (this.isAdminMode) {
        await this.momentumService.deleteRegistration(id);
        // Remove from local lists
        this.contactsList = this.contactsList.filter(c => c._id !== id);
        this.registrationsList = this.registrationsList.filter(r => r._id !== id);
      } else {
        await this.momentumService.deleteContact(id);
        await this.loadContacts();
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Eliminado',
        detail: 'Registro eliminado correctamente.',
      });
      
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al eliminar el registro.',
      });
    }
  }


}
