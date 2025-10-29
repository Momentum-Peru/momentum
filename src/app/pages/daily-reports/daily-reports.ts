import { Component, OnInit, signal, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DailyExpensesApiService } from '../../shared/services/daily-reports-api.service';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { AuthService } from '../login/services/auth.service';
import { DailyReport } from '../../shared/interfaces/daily-report.interface';
import { ProjectOption, Project } from '../../shared/interfaces/project.interface';

@Component({
  selector: 'app-daily-expenses',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    SelectModule,
    DatePickerModule,
    TextareaModule,
    TooltipModule,
    ToastModule,
  ],
  templateUrl: './daily-reports.html',
  styleUrl: './daily-reports.scss',
})
export class DailyExpensesPage implements OnInit {
  private readonly dailyExpensesApi = inject(DailyExpensesApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  items = signal<DailyReport[]>([]);
  projects = signal<ProjectOption[]>([]);
  query = signal('');
  filterDate = signal<string | null>(null);
  showDialog = signal(false);
  showViewDialog = signal(false);
  editing = signal<DailyReport | null>(null);
  viewing = signal<DailyReport | null>(null);
  // Estado de expansión para vista móvil (accordion)
  private expandedRowKeys = signal<Set<string>>(new Set());

  // Archivos seleccionados (pendientes) cuando aún no existe el reporte
  pendingAudio = signal<File | null>(null);
  pendingVideo = signal<File | null>(null);
  pendingPhoto = signal<File | null>(null);
  pendingDocuments = signal<File[]>([]);

  // Filtrado simple por texto
  filteredItems = computed(() => {
    const searchQuery = this.query().toLowerCase().trim();
    const list = this.items()
      .slice()
      .sort((a, b) => {
        const aDt = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
        const bDt = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
        return bDt - aDt; // DESC
      });

    if (!searchQuery) return list;
    return list.filter((item) => {
      const descriptionMatch = item.description?.toLowerCase().includes(searchQuery) ?? false;
      const dateMatch = item.date?.toLowerCase().includes(searchQuery) ?? false;
      const timeMatch = item.time?.toLowerCase().includes(searchQuery) ?? false;
      return descriptionMatch || dateMatch || timeMatch;
    });
  });

  ngOnInit() {
    this.load();
    this.loadProjects();
  }

  constructor() {
    // Efecto para manejar el cierre del diálogo
    effect(() => {
      if (!this.showDialog()) {
        this.editing.set(null);
        this.pendingAudio.set(null);
        this.pendingVideo.set(null);
        this.pendingPhoto.set(null);
        this.pendingDocuments.set([]);
      }
      if (!this.showViewDialog()) this.viewing.set(null);
    });
  }

  load() {
    const fd = this.filterDate();
    if (fd) {
      this.dailyExpensesApi
        .listWithFilters({ startDate: fd, endDate: fd })
        .subscribe({
          next: (data) => {
            this.items.set(data);
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al cargar los reportes diarios',
            });
          },
        });
      return;
    }

    this.dailyExpensesApi.list().subscribe({
      next: (data) => {
        this.items.set(data);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los reportes diarios',
        });
      },
    });
  }

  onFilterDateChange(value: Date | null) {
    if (!value) {
      this.filterDate.set(null);
      this.load();
      return;
    }
    const y = value.getFullYear();
    const m = (value.getMonth() + 1).toString().padStart(2, '0');
    const d = value.getDate().toString().padStart(2, '0');
    this.filterDate.set(`${y}-${m}-${d}`);
    this.load();
  }

  loadProjects() {
    this.projectsApi.getOptions().subscribe({
      next: (data) => this.projects.set(data),
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los proyectos',
        });
      },
    });
  }

  // Helpers de accordion móvil
  private buildRowKey(item: DailyReport, index: number): string {
    const base = `${item.date}T${item.time || '00:00'}`;
    return item._id ? String(item._id) : `${base}#${index}`;
  }

  isRowExpandedByKey(key: string): boolean {
    return this.expandedRowKeys().has(key);
  }

  toggleRowByKey(key: string): void {
    const set = new Set(this.expandedRowKeys());
    if (set.has(key)) set.delete(key);
    else set.add(key);
    this.expandedRowKeys.set(set);
  }

  setQuery(value: string) {
    this.query.set(value);
  }

  newItem() {
    const currentUser = this.authService.getCurrentUser();
    this.editing.set({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      description: '',
      audioDescription: null,
      videoDescription: null,
      photoDescription: null,
      documents: [],
      userId: currentUser?.id || '',
      projectId: '',
    });
    this.pendingAudio.set(null);
    this.pendingVideo.set(null);
    this.pendingPhoto.set(null);
    this.pendingDocuments.set([]);
    this.showDialog.set(true);
  }

  editItem(item: DailyReport) {
    // Crear una copia del item para editar
    const editedItem = { ...item };

    // Si projectId es un objeto (populado), extraer el _id
    if (
      editedItem.projectId &&
      typeof editedItem.projectId === 'object' &&
      '_id' in editedItem.projectId &&
      editedItem.projectId._id
    ) {
      editedItem.projectId = editedItem.projectId._id;
    }

    // Si el proyecto ha sido eliminado, limpiar el projectId para que el usuario pueda seleccionar uno nuevo
    if (editedItem.projectId && typeof editedItem.projectId === 'string') {
      const projectExists = this.projects().some((p) => p.value === editedItem.projectId);
      if (!projectExists) {
        // El proyecto ya no existe, establecer a string vacío para que el usuario seleccione uno nuevo
        editedItem.projectId = '';
      }
    }

    this.editing.set(editedItem);
    this.showDialog.set(true);
    return;
  }

  closeDialog() {
    this.pendingAudio.set(null);
    this.pendingVideo.set(null);
    this.pendingPhoto.set(null);
    this.pendingDocuments.set([]);
    this.showDialog.set(false);
  }

  viewItem(item: DailyReport) {
    this.viewing.set(item);
    this.showViewDialog.set(true);
  }

  closeViewDialog() {
    this.showViewDialog.set(false);
  }

  onEditChange(field: keyof DailyReport, value: any) {
    const current = this.editing();
    if (current) {
      this.editing.set({ ...current, [field]: value });
    }
  }

  onDateChange(value: Date | Date[] | null) {
    if (Array.isArray(value)) {
      return;
    }

    if (value instanceof Date) {
      // Guardar fecha en formato local YYYY-MM-DD para evitar desfase por zona horaria
      const y = value.getFullYear();
      const m = (value.getMonth() + 1).toString().padStart(2, '0');
      const d = value.getDate().toString().padStart(2, '0');
      this.onEditChange('date', `${y}-${m}-${d}`);
    } else if (value === null) {
      this.onEditChange('date', '');
    }
  }

  // Captura de archivos (mobile friendly)
  onAudioSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;
    if (this.editing()?._id) {
      this.dailyExpensesApi.uploadAudio(this.editing()!._id!, file).subscribe({
        next: (updated) => this.editing.set(updated),
        error: () => this.toastError('No se pudo subir el audio'),
      });
    } else {
      this.pendingAudio.set(file);
    }
    input.value = '';
  }

  onVideoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;
    if (this.editing()?._id) {
      this.dailyExpensesApi.uploadVideo(this.editing()!._id!, file).subscribe({
        next: (updated) => this.editing.set(updated),
        error: () => this.toastError('No se pudo subir el video'),
      });
    } else {
      this.pendingVideo.set(file);
    }
    input.value = '';
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;
    if (this.editing()?._id) {
      this.dailyExpensesApi.uploadPhoto(this.editing()!._id!, file).subscribe({
        next: (updated) => this.editing.set(updated),
        error: () => this.toastError('No se pudo subir la foto'),
      });
    } else {
      this.pendingPhoto.set(file);
    }
    input.value = '';
  }

  onDocumentsSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;
    if (this.editing()?._id) {
      // subir en serie para mantener feedback
      files.forEach((file) => {
        this.dailyExpensesApi.uploadDocument(this.editing()!._id!, file).subscribe({
          next: (updated) => this.editing.set(updated),
          error: () => this.toastError(`No se pudo subir ${file.name}`),
        });
      });
    } else {
      this.pendingDocuments.set([...this.pendingDocuments(), ...files]);
    }
    input.value = '';
  }

  save() {
    const item = this.editing();
    if (!item) return;

    const errors = this.validateForm(item);
    if (errors.length) {
      errors.forEach((e) => this.toastError(e));
      return;
    }

    const payload: Partial<DailyReport> = {
      date: item.date,
      time: item.time,
      description: item.description.trim(),
      projectId:
        item.projectId && typeof item.projectId === 'string' && item.projectId.trim() !== ''
          ? item.projectId.trim()
          : undefined,
    };

    const upsert$ = item._id
      ? this.dailyExpensesApi.update(item._id, payload)
      : this.dailyExpensesApi.create({
        ...payload,
        userId: typeof item.userId === 'object' && item.userId && '_id' in item.userId
          ? (item.userId as any)._id
          : (item.userId as string),
        documents: [],
      } as DailyReport);

    upsert$.subscribe({
      next: (saved) => {
        const id = saved._id!;
        // Si había archivos pendientes (nuevo), súbelos
        const tasks: Array<Promise<any>> = [];
        if (this.pendingAudio()) tasks.push(this.uploadAudioPromise(id, this.pendingAudio()!));
        if (this.pendingVideo()) tasks.push(this.uploadVideoPromise(id, this.pendingVideo()!));
        if (this.pendingPhoto()) tasks.push(this.uploadPhotoPromise(id, this.pendingPhoto()!));
        if (this.pendingDocuments().length)
          tasks.push(this.uploadDocumentsPromise(id, this.pendingDocuments()));

        if (tasks.length) {
          Promise.allSettled(tasks).finally(() => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Reporte guardado' });
            this.load();
            this.closeDialog();
          });
        } else {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Reporte guardado' });
          this.load();
          this.closeDialog();
        }
      },
      error: (error) => this.toastError(this.getErrorMessage(error)),
    });
  }

  private uploadAudioPromise(id: string, file: File) {
    return new Promise((resolve, reject) => {
      this.dailyExpensesApi.uploadAudio(id, file).subscribe({ next: resolve, error: reject });
    });
  }
  private uploadVideoPromise(id: string, file: File) {
    return new Promise((resolve, reject) => {
      this.dailyExpensesApi.uploadVideo(id, file).subscribe({ next: resolve, error: reject });
    });
  }
  private uploadPhotoPromise(id: string, file: File) {
    return new Promise((resolve, reject) => {
      this.dailyExpensesApi.uploadPhoto(id, file).subscribe({ next: resolve, error: reject });
    });
  }
  private uploadDocumentsPromise(id: string, files: File[]) {
    return new Promise((resolve) => {
      let remaining = files.length;
      files.forEach((f) => {
        this.dailyExpensesApi.uploadDocument(id, f).subscribe({
          next: () => {
            remaining -= 1;
            if (remaining === 0) resolve(true);
          },
          error: () => {
            remaining -= 1;
            if (remaining === 0) resolve(true);
          },
        });
      });
    });
  }

  // Eliminado: lógica de observaciones y compras

  remove(item: DailyReport) {
    if (!item._id) return;
    if (confirm('¿Estás seguro de eliminar este reporte diario?')) {
      this.dailyExpensesApi.delete(item._id).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Reporte diario eliminado correctamente',
          });
          this.load();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error),
          });
        },
      });
    }
  }
  // Obtener la fecha como Date para el datepicker
  getEditDate = computed(() => {
    const editing = this.editing();
    if (!editing || !editing.date) return null;
    try {
      // Construir Date desde componentes locales para evitar conversiones a UTC
      const [year, month, day] = editing.date.split('-').map((x) => parseInt(x, 10));
      if (!year || !month || !day) return null;
      return new Date(year, month - 1, day);
    } catch {
      return null;
    }
  });

  getProjectName(projectId: string | Project | null | undefined): string {
    if (!projectId) {
      return 'Sin proyecto';
    }

    // Si projectId es un objeto Project (populado), usar el nombre directamente
    if (typeof projectId === 'object' && 'name' in projectId) {
      return projectId.name || 'Sin proyecto';
    }

    // Si projectId es un string, buscar en la lista de proyectos
    if (typeof projectId === 'string') {
      const project = this.projects().find((p) => p.value === projectId);
      return project?.label || 'Sin proyecto';
    }

    return 'Sin proyecto';
  }

  // Verificar si el proyecto en edición ha sido eliminado
  isProjectDeleted(): boolean {
    const editing = this.editing();
    if (!editing || !editing._id) {
      return false;
    }
    if (!editing.projectId) {
      return true;
    }

    // Si projectId es un objeto, no está eliminado
    if (typeof editing.projectId === 'object') {
      return false;
    }

    // Si projectId es un string, verificar si existe en la lista de proyectos
    if (typeof editing.projectId === 'string') {
      const projectExists = this.projects().some((p) => p.value === editing.projectId);
      return !projectExists;
    }

    return true;
  }

  // Verificar si el reporte pertenece al usuario actual
  isMyReport(item: DailyReport): boolean {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser || !currentUser.id) {
      return false;
    }

    // Si userId es un objeto (populado), extraer el _id
    let userId: string | null = null;

    if (item.userId) {
      if (typeof item.userId === 'object' && '_id' in item.userId) {
        // El userId es un objeto, extraer el _id
        userId = (item.userId as any)._id;
      } else if (typeof item.userId === 'string') {
        // El userId es un string
        userId = item.userId;
      }
    }

    if (!userId) {
      return false;
    }

    return userId === currentUser.id;
  }


  // eliminado: lógica de observaciones; no aplica en DailyReport simplificado


  // Métodos auxiliares para documentos
  getFileIcon(url: string): string {
    // Validar que la URL existe y es una cadena válida
    if (!url || typeof url !== 'string') {
      return 'pi pi-file'; // Icono por defecto para URLs inválidas
    }

    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'pi pi-file-pdf';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'pi pi-image';
      case 'doc':
      case 'docx':
        return 'pi pi-file-word';
      case 'xls':
      case 'xlsx':
        return 'pi pi-file-excel';
      default:
        return 'pi pi-file';
    }
  }

  getFileTypeColor(url: string): string {
    // Validar que la URL existe y es una cadena válida
    if (!url || typeof url !== 'string') {
      return 'text-gray-600'; // Color por defecto para URLs inválidas
    }

    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'text-red-600';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'text-green-600';
      case 'doc':
      case 'docx':
        return 'text-blue-600';
      case 'xls':
      case 'xlsx':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  }

  viewDocument(url: string): void {
    if (!url || typeof url !== 'string') {
      return;
    }
    window.open(url, '_blank');
  }

  downloadDocument(url: string): void {
    if (!url || typeof url !== 'string') {
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = url.split('/').pop() || 'documento';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Validación
  private validateForm(item: DailyReport): string[] {
    const errors: string[] = [];

    // Fecha
    if (!item.date) {
      errors.push('La fecha es requerida');
    }

    // Hora
    if (!item.time || item.time.trim() === '') {
      errors.push('La hora es requerida');
    }

    // Descripción
    if (!item.description || item.description.trim() === '') {
      errors.push('La descripción es requerida');
    }

    // Proyecto (si se provee) debe existir
    if (item.projectId && typeof item.projectId === 'string' && item.projectId.trim() !== '') {
      const projectExists = this.projects().some((p) => p.value === item.projectId);
      if (!projectExists) {
        errors.push('El proyecto seleccionado ya no está disponible. Selecciona otro.');
      }
    }

    return errors;
  }

  // Método para obtener mensaje de error de la API
  private getErrorMessage(error: any): string {
    // Manejar errores de permisos primero
    if (error.status === 403) {
      if (error.error?.message?.includes('No puedes enviar gastos de otros usuarios')) {
        return 'No puedes enviar reportes de otros usuarios';
      }
      if (error.error?.message?.includes('No puedes aprobar')) {
        return 'No tienes permisos para aprobar este reporte';
      }
      return 'No tienes permisos para realizar esta acción';
    }

    // Manejar errores de validación específicos
    if (error.error?.message) {
      const message = error.error.message;

      // Traducir mensajes comunes de validación
      if (message.includes('date should not be empty')) {
        return 'La fecha es requerida';
      }
      if (message.includes('time should not be empty')) return 'La hora es requerida';
      if (message.includes('description should not be empty')) return 'La descripción es requerida';

      return message;
    }

    if (error.error?.error) {
      return error.error.error;
    }

    if (error.message) {
      return error.message;
    }

    return 'Ha ocurrido un error inesperado';
  }

  private toastError(detail: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail });
  }
}
