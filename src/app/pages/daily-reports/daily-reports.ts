import { Component, OnInit, signal, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
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
import { ExpenseCategoriesApiService } from '../../shared/services/categories-api.service';
import { AuthService } from '../login/services/auth.service';
import {
  DailyExpense,
  Purchase,
  Observation,
} from '../../shared/interfaces/daily-report.interface';
import { ProjectOption, Project } from '../../shared/interfaces/project.interface';
import { CategoryOption, ExpenseCategory } from '../../shared/interfaces/category.interface';

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
  private readonly categoriesApi = inject(ExpenseCategoriesApiService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  items = signal<DailyExpense[]>([]);
  projects = signal<ProjectOption[]>([]);
  categories = signal<CategoryOption[]>([]);
  query = signal('');
  showDialog = signal(false);
  showViewDialog = signal(false);
  editing = signal<DailyExpense | null>(null);
  viewing = signal<DailyExpense | null>(null);
  selectedPurchases = signal<Purchase[]>([]);

  // Sistema de archivos pendientes para reportes nuevos
  pendingObservationFiles = signal<Map<number, File[]>>(new Map());
  pendingPurchaseFiles = signal<Map<number, File[]>>(new Map());

  // Filtrar items basado en la búsqueda
  filteredItems = computed(() => {
    const searchQuery = this.query().toLowerCase().trim();
    if (!searchQuery) {
      return this.items();
    }
    return this.items().filter((item) => {
      const titleMatch = item.title?.toLowerCase().includes(searchQuery) ?? false;
      const summaryMatch = item.dailySummary?.toLowerCase().includes(searchQuery) ?? false;
      const dateMatch = item.date?.toLowerCase().includes(searchQuery) ?? false;

      // Buscar en observaciones
      const observationsMatch =
        item.observations?.some(
          (obs) =>
            obs.description?.toLowerCase().includes(searchQuery) ||
            obs.notes?.toLowerCase().includes(searchQuery)
        ) ?? false;

      // Buscar en compras
      const purchasesMatch =
        item.purchases?.some(
          (purchase) =>
            purchase.description?.toLowerCase().includes(searchQuery) ||
            purchase.vendor?.toLowerCase().includes(searchQuery) ||
            purchase.notes?.toLowerCase().includes(searchQuery)
        ) ?? false;

      return titleMatch || summaryMatch || dateMatch || observationsMatch || purchasesMatch;
    });
  });

  statusOptions = [
    { label: 'Borrador', value: 'DRAFT' },
    { label: 'Enviado', value: 'SUBMITTED' },
    { label: 'Aprobado', value: 'APPROVED' },
    { label: 'Rechazado', value: 'REJECTED' },
  ];

  ngOnInit() {
    this.load();
    this.loadProjects();
    this.loadCategories();
  }

  constructor() {
    // Efecto para manejar el cierre del diálogo
    effect(() => {
      if (!this.showDialog()) {
        this.editing.set(null);
        this.selectedPurchases.set([]);
      }
      if (!this.showViewDialog()) {
        this.viewing.set(null);
      }
    });
  }

  load() {
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

  loadCategories() {
    this.categoriesApi.getOptions().subscribe({
      next: (data) => this.categories.set(data),
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar las categorías',
        });
      },
    });
  }

  setQuery(value: string) {
    this.query.set(value);
  }

  newItem() {
    const currentUser = this.authService.getCurrentUser();
    this.editing.set({
      title: '',
      date: new Date().toISOString().split('T')[0],
      observations: [],
      purchases: [],
      totalAmount: 0,
      dailySummary: '',
      userId: currentUser?.id || '',
      projectId: '',
      status: 'DRAFT',
    });
    this.selectedPurchases.set([]);

    // Limpiar archivos pendientes al crear nuevo item
    this.pendingObservationFiles.set(new Map());
    this.pendingPurchaseFiles.set(new Map());

    this.showDialog.set(true);
  }

  editItem(item: DailyExpense) {
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

    // Convertir la fecha a formato Date si viene como string ISO
    if (editedItem.date && typeof editedItem.date === 'string') {
      try {
        // Si la fecha viene en formato ISO, convertirla a formato Date
        const dateObj = new Date(editedItem.date);
        editedItem.date = dateObj.toISOString();
      } catch (e) {
        // Si hay error al parsear la fecha, usar la fecha actual
        return new Date();
      }
    }

    // Normalizar las compras para asegurar que categoryId sea un string
    const normalizedPurchases = item.purchases.map((purchase) => {
      const normalizedPurchase = { ...purchase };

      // Si categoryId está como objeto poblado, extraer el _id
      if (
        purchase.categoryId &&
        typeof purchase.categoryId === 'object' &&
        '_id' in purchase.categoryId
      ) {
        normalizedPurchase.categoryId = (purchase.categoryId as any)._id;
      }

      // Asegurar que categoryId sea un string válido
      if (normalizedPurchase.categoryId && typeof normalizedPurchase.categoryId !== 'string') {
        normalizedPurchase.categoryId = String(normalizedPurchase.categoryId);
      }

      // Verificar que la categoría existe en la lista actual
      if (normalizedPurchase.categoryId && typeof normalizedPurchase.categoryId === 'string') {
        const categoryExists = this.categories().some(
          (c) => c.value === normalizedPurchase.categoryId
        );
        if (!categoryExists) {
          // La categoría ya no existe, mantener el categoryId pero se mostrará como "Categoría no encontrada"
        }
      }

      return normalizedPurchase;
    });

    // Normalizar las observaciones para convertir fechas a objetos Date
    editedItem.observations = editedItem.observations?.map((observation) => {
      const normalizedObservation = {
        ...observation,
        observationDate: (observation.observationDate
          ? new Date(observation.observationDate)
          : new Date()) as any, // Tipo temporal para el datepicker
      };
      return normalizedObservation;
    });

    this.editing.set(editedItem);
    this.selectedPurchases.set(normalizedPurchases);
    this.showDialog.set(true);
    return;
  }

  closeDialog() {
    // Limpiar archivos pendientes al cerrar el diálogo
    this.pendingObservationFiles.set(new Map());
    this.pendingPurchaseFiles.set(new Map());
    this.showDialog.set(false);
  }

  viewItem(item: DailyExpense) {
    this.viewing.set(item);
    this.showViewDialog.set(true);
  }

  closeViewDialog() {
    this.showViewDialog.set(false);
  }

  onEditChange(field: keyof DailyExpense, value: any) {
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
      const dateString = value.toISOString().split('T')[0];
      this.onEditChange('date', dateString);
    } else if (value === null) {
      this.onEditChange('date', '');
    }
  }

  addPurchase() {
    const newPurchase: Purchase = {
      description: '',
      amount: 0,
      categoryId: '',
      notes: '',
      vendor: '',
      purchaseDate: new Date().toISOString(),
      documents: [],
    };
    this.selectedPurchases.set([...this.selectedPurchases(), newPurchase]);
  }

  removePurchase(index: number) {
    const purchases = this.selectedPurchases();
    purchases.splice(index, 1);
    this.selectedPurchases.set([...purchases]);
    this.updateTotalAmount();
  }

  updatePurchase(index: number, field: keyof Purchase, value: any) {
    const purchases = this.selectedPurchases();
    purchases[index] = { ...purchases[index], [field]: value };
    this.selectedPurchases.set([...purchases]);
    this.updateTotalAmount();
  }

  updateTotalAmount() {
    // El totalAmount se calcula en el backend, no se envía desde el frontend
  }

  calculateTotalAmount(): number {
    return this.dailyExpensesApi.calculateTotal(this.selectedPurchases());
  }

  save() {
    const item = this.editing();
    if (!item) return;

    // Validar campos requeridos
    const validationErrors = this.validateForm(item);
    if (validationErrors.length > 0) {
      validationErrors.forEach((error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error de validación',
          detail: error,
        });
      });
      return;
    }

    // Validar que el proyecto existe en la lista de proyectos disponibles (solo si se proporciona)
    if (item.projectId && typeof item.projectId === 'string' && item.projectId.trim() !== '') {
      const projectExists = this.projects().some((p) => p.value === item.projectId);
      if (!projectExists) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error de validación',
          detail:
            'El proyecto seleccionado ya no está disponible. Por favor, seleccione otro proyecto.',
        });
        return;
      }
    }

    // Función para convertir fechas de Date a string ISO si es necesario
    const formatObservationDate = (date: string | Date | undefined): string => {
      if (!date) return new Date().toISOString();
      if (date instanceof Date) {
        return date.toISOString();
      }
      return date;
    };

    // Crear payload base
    const basePayload: any = {
      title: item.title.trim(),
      date: item.date,
      observations: item.observations
        ? item.observations.map((obs) => ({
            ...obs,
            observationDate: formatObservationDate(obs.observationDate),
            // Filtrar documentos pendientes (que empiezan con "pending:")
            documents: obs.documents?.filter((doc) => !doc.startsWith('pending:')) || [],
          }))
        : [],
      purchases: this.selectedPurchases().map((p) => ({
        description: p.description.trim(),
        amount: p.amount,
        categoryId: p.categoryId,
        notes: p.notes?.trim() || '',
        vendor: p.vendor?.trim() || '',
        purchaseDate: p.purchaseDate || new Date().toISOString(),
        // Filtrar documentos pendientes (que empiezan con "pending:")
        documents: p.documents?.filter((doc) => !doc.startsWith('pending:')) || [],
      })),
      dailySummary: item.dailySummary.trim(),
      status: item.status,
    };

    // Solo incluir projectId si no está vacío
    if (item.projectId && typeof item.projectId === 'string' && item.projectId.trim() !== '') {
      basePayload.projectId = item.projectId.trim();
    }

    if (item._id) {
      // Para actualización, no incluir userId
      this.dailyExpensesApi.update(item._id, basePayload).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Reporte diario actualizado correctamente',
          });
          this.load();
          this.closeDialog();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error),
          });
        },
      });
    } else {
      // Para creación, incluir userId
      const createPayload = {
        ...basePayload,
        userId: (() => {
          // Extraer userId si es un objeto
          if (typeof item.userId === 'object' && item.userId !== null && '_id' in item.userId) {
            return item.userId._id;
          }
          return item.userId as string;
        })(),
      };

      this.dailyExpensesApi.create(createPayload as DailyExpense).subscribe({
        next: (createdReport) => {
          // Subir archivos pendientes después de crear el reporte
          this.uploadPendingFiles(createdReport._id!)
            .then(() => {
              this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Reporte diario creado correctamente',
              });
              this.load();
              this.closeDialog();
            })
            .catch((error) => {
              this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Reporte creado pero algunos archivos no se pudieron subir',
              });
              this.load();
              this.closeDialog();
            });
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

  // Método para subir archivos pendientes después de crear el reporte
  private async uploadPendingFiles(reportId: string): Promise<void> {
    const pendingObservationFiles = this.pendingObservationFiles();
    const pendingPurchaseFiles = this.pendingPurchaseFiles();

    const uploadPromises: Promise<any>[] = [];

    // Subir archivos de observaciones pendientes
    for (const [observationIndex, files] of pendingObservationFiles) {
      for (const file of files) {
        const promise = firstValueFrom(
          this.dailyExpensesApi.uploadObservationDocument(reportId, observationIndex, file)
        );
        uploadPromises.push(promise);
      }
    }

    // Subir archivos de compras pendientes
    for (const [purchaseIndex, files] of pendingPurchaseFiles) {
      for (const file of files) {
        const promise = firstValueFrom(
          this.dailyExpensesApi.uploadPurchaseDocument(reportId, purchaseIndex, file)
        );
        uploadPromises.push(promise);
      }
    }

    // Esperar a que todos los archivos se suban
    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }

    // Limpiar archivos pendientes
    this.pendingObservationFiles.set(new Map());
    this.pendingPurchaseFiles.set(new Map());
  }

  remove(item: DailyExpense) {
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

  submitForApproval(item: DailyExpense) {
    if (!item._id) return;
    this.dailyExpensesApi.submit(item._id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Reporte enviado para aprobación correctamente',
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

  approve(item: DailyExpense) {
    if (!item._id) return;
    this.dailyExpensesApi.approve(item._id, 'APPROVED').subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Reporte aprobado correctamente',
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

  reject(item: DailyExpense) {
    if (!item._id) return;
    const reason = prompt('Razón del rechazo:');
    if (reason) {
      this.dailyExpensesApi.approve(item._id, 'REJECTED', reason).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Reporte rechazado correctamente',
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

  getStatusLabel(status: string): string {
    const option = this.statusOptions.find((opt) => opt.value === status);
    return option?.label || status;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      case 'SUBMITTED':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'APPROVED':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'REJECTED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  }

  // Obtener la fecha en formato Date para el datepicker
  getEditDate = computed(() => {
    const editing = this.editing();
    if (!editing || !editing.date) {
      return null;
    }

    try {
      // Convertir string ISO a objeto Date
      return new Date(editing.date);
    } catch (e) {
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

  getCategoryName(categoryId: string | ExpenseCategory | null | undefined): string {
    if (!categoryId) {
      return 'Categoría eliminada';
    }

    // Si es un objeto ExpenseCategory, usar el nombre directamente
    if (typeof categoryId === 'object' && 'name' in categoryId) {
      return categoryId.name || 'Categoría no encontrada';
    }

    // Si es un string, buscar en la lista de categorías
    if (typeof categoryId === 'string') {
      const category = this.categories().find((c) => c.value === categoryId);
      return category?.label || 'Categoría no encontrada';
    }

    return 'Categoría eliminada';
  }

  // Verificar si el proyecto en edición ha sido eliminado
  isProjectDeleted(): boolean {
    const editing = this.editing();
    // Solo mostrar alerta si estamos editando (tiene _id) y el proyecto fue eliminado
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
  isMyReport(item: DailyExpense): boolean {
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

  // Métodos para manejar observaciones
  addObservation(): void {
    const editing = this.editing();
    if (!editing) return;

    const newObservation: Observation = {
      description: '',
      notes: '',
      observationDate: new Date().toISOString(),
      observationTime: '',
      documents: [],
    };

    editing.observations = [...editing.observations, newObservation];
    this.editing.set({ ...editing });
  }

  removeObservation(index: number): void {
    const editing = this.editing();
    if (!editing) return;

    editing.observations.splice(index, 1);
    this.editing.set({ ...editing });
  }

  // Método para verificar sincronización con el backend
  private async verifyBackendSync(reportId: string): Promise<boolean> {
    try {
      const backendReport = await firstValueFrom(this.dailyExpensesApi.getById(reportId));
      const localReport = this.editing();

      if (!localReport) return false;

      const backendObservationsCount = backendReport.observations?.length || 0;
      const localObservationsCount = localReport.observations?.length || 0;

      return backendObservationsCount === localObservationsCount;
    } catch (error) {
      return false;
    }
  }

  // Métodos para manejar documentos de observaciones
  onObservationFileSelect(event: Event, observationIndex: number): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (!files || files.length === 0) return;

    const editing = this.editing();
    if (!editing) return;

    const file = files[0];
    target.value = ''; // Limpiar el input

    // Si el reporte ya existe en el backend, subir inmediatamente
    if (editing._id) {
      // Validar que la observación existe en el estado local
      if (!editing.observations[observationIndex]) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'La observación no existe en el índice especificado',
        });
        return;
      }

      // Verificar si hay inconsistencias potenciales con el backend
      // Si el índice es mayor que 0, verificar sincronización
      if (observationIndex > 0) {
        // Verificar sincronización de forma asíncrona
        this.verifyBackendSync(editing._id)
          .then((isSynced) => {
            if (!isSynced) {
              // La observación es nueva (agregada durante la edición)
              this.saveFileAsPending(observationIndex, file, 'observation');
            } else {
              // La observación existe en el backend, proceder con subida normal
              this.uploadFileToBackend(editing._id!, observationIndex, file, 'observation');
            }
          })
          .catch((error) => {
            // En caso de error, tratar como nueva observación
            this.saveFileAsPending(observationIndex, file, 'observation');
          });
      } else {
        // Índice 0, debería existir en el backend
        this.uploadFileToBackend(editing._id!, observationIndex, file, 'observation');
      }
    } else {
      // Si el reporte es nuevo, guardar el archivo como pendiente
      this.saveFileAsPending(observationIndex, file, 'observation');
    }
  }

  // Método para guardar archivos como pendientes
  private saveFileAsPending(index: number, file: File, type: 'observation' | 'purchase'): void {
    if (type === 'observation') {
      const pendingFiles = this.pendingObservationFiles();
      const currentFiles = pendingFiles.get(index) || [];
      currentFiles.push(file);
      pendingFiles.set(index, currentFiles);
      this.pendingObservationFiles.set(new Map(pendingFiles));

      // Mostrar el archivo en la interfaz como pendiente
      const editing = this.editing();
      if (editing) {
        editing.observations[index].documents.push(`pending:${file.name}`);
        this.editing.set({ ...editing });
      }
    } else {
      const pendingFiles = this.pendingPurchaseFiles();
      const currentFiles = pendingFiles.get(index) || [];
      currentFiles.push(file);
      pendingFiles.set(index, currentFiles);
      this.pendingPurchaseFiles.set(new Map(pendingFiles));

      // Mostrar el archivo en la interfaz como pendiente
      const editing = this.editing();
      if (editing) {
        editing.purchases[index].documents.push(`pending:${file.name}`);
        this.editing.set({ ...editing });
      }
    }

    this.messageService.add({
      severity: 'info',
      summary: 'Archivo preparado',
      detail: 'El archivo se subirá al guardar el reporte',
    });
  }

  // Método para subir archivos al backend
  private uploadFileToBackend(
    reportId: string,
    index: number,
    file: File,
    type: 'observation' | 'purchase'
  ): void {
    const uploadObservable =
      type === 'observation'
        ? this.dailyExpensesApi.uploadObservationDocument(reportId, index, file)
        : this.dailyExpensesApi.uploadPurchaseDocument(reportId, index, file);

    uploadObservable.subscribe({
      next: (response) => {
        const editing = this.editing();
        if (!editing) return;

        if (type === 'observation') {
          // Extraer la nueva URL del documento de la observación actualizada
          const updatedObservation = response.observations[index];
          if (updatedObservation && updatedObservation.documents) {
            const previousDocuments = editing.observations[index].documents;
            const newDocuments = updatedObservation.documents;

            const newDocumentUrls = newDocuments.filter(
              (doc: string) => !previousDocuments.includes(doc) && !doc.startsWith('pending:')
            );

            if (newDocumentUrls.length > 0) {
              editing.observations[index].documents.push(...newDocumentUrls);
            }
          }
        } else {
          // Extraer la nueva URL del documento de la compra actualizada
          const updatedPurchase = response.purchases[index];
          if (updatedPurchase && updatedPurchase.documents) {
            const previousDocuments = editing.purchases[index].documents;
            const newDocuments = updatedPurchase.documents;

            const newDocumentUrls = newDocuments.filter(
              (doc: string) => !previousDocuments.includes(doc) && !doc.startsWith('pending:')
            );

            if (newDocumentUrls.length > 0) {
              editing.purchases[index].documents.push(...newDocumentUrls);
            }
          }
        }

        this.editing.set({ ...editing });

        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Documento subido correctamente',
        });
      },
      error: (error) => {
        if (error.status === 404) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Sincronización requerida',
            detail: `La ${type} ${
              index + 1
            } no existe en el servidor. Recargando datos para sincronizar...`,
          });
          this.load();
          this.closeDialog();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al subir el documento',
          });
        }
      },
    });
  }

  removeObservationDocument(observationIndex: number, documentUrl: string): void {
    const editing = this.editing();
    if (!editing || !editing._id) return;

    const observation = editing.observations[observationIndex];

    // Verificar que la observación existe
    if (!observation) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'La observación no existe en el índice especificado',
      });
      return;
    }

    // Verificar que el documento existe en la observación
    if (!observation.documents.includes(documentUrl)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El documento no existe en esta observación',
      });
      return;
    }

    this.dailyExpensesApi
      .deleteObservationDocument(editing._id, observationIndex, documentUrl)
      .subscribe({
        next: () => {
          // Recargar los datos del backend para sincronizar
          this.load();

          // Actualizar el estado local también
          editing.observations[observationIndex].documents = editing.observations[
            observationIndex
          ].documents.filter((url) => url !== documentUrl);
          this.editing.set({ ...editing });

          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Documento eliminado correctamente',
          });
        },
        error: (error) => {
          // Si la observación no existe, recargar los datos y cerrar el diálogo
          if (error.status === 404) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Advertencia',
              detail: 'La observación no existe. Recargando datos...',
            });
            this.load();
            this.closeDialog(); // Cerrar el diálogo para evitar inconsistencias
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al eliminar el documento',
            });
          }
        },
      });
  }

  // Métodos para manejar documentos de compras
  onPurchaseFileSelect(event: Event, purchaseIndex: number): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (!files || files.length === 0) return;

    const editing = this.editing();
    if (!editing) return;

    const file = files[0];
    target.value = ''; // Limpiar el input

    // Si el reporte ya existe en el backend, subir inmediatamente
    if (editing._id) {
      // Validar que la compra existe en el estado local
      if (!editing.purchases[purchaseIndex]) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'La compra no existe en el índice especificado',
        });
        return;
      }

      // Verificar si la compra existe en el backend
      // Si el índice es mayor que 0, podría ser una nueva compra agregada durante la edición
      if (purchaseIndex > 0) {
        // Verificar sincronización para determinar si es una nueva compra
        this.verifyBackendSync(editing._id)
          .then((isSynced) => {
            if (!isSynced) {
              // La compra es nueva (agregada durante la edición)
              this.saveFileAsPending(purchaseIndex, file, 'purchase');
            } else {
              // La compra existe en el backend, proceder con subida normal
              this.uploadFileToBackend(editing._id!, purchaseIndex, file, 'purchase');
            }
          })
          .catch((error) => {
            // En caso de error, tratar como nueva compra
            this.saveFileAsPending(purchaseIndex, file, 'purchase');
          });
      } else {
        // Índice 0, debería existir en el backend
        this.uploadFileToBackend(editing._id!, purchaseIndex, file, 'purchase');
      }
    } else {
      // Si el reporte es nuevo, guardar el archivo como pendiente
      this.saveFileAsPending(purchaseIndex, file, 'purchase');
    }
  }

  removePurchaseDocument(purchaseIndex: number, documentUrl: string): void {
    const editing = this.editing();
    if (!editing || !editing._id) return;

    const purchase = editing.purchases[purchaseIndex];

    // Verificar que la compra existe
    if (!purchase) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'La compra no existe en el índice especificado',
      });
      return;
    }

    // Verificar que el documento existe en la compra
    if (!purchase.documents.includes(documentUrl)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El documento no existe en esta compra',
      });
      return;
    }

    this.dailyExpensesApi
      .deletePurchaseDocument(editing._id, purchaseIndex, documentUrl)
      .subscribe({
        next: () => {
          // Recargar los datos del backend para sincronizar
          this.load();

          // Actualizar el estado local también
          editing.purchases[purchaseIndex].documents = editing.purchases[
            purchaseIndex
          ].documents.filter((url) => url !== documentUrl);
          this.editing.set({ ...editing });

          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Documento eliminado correctamente',
          });
        },
        error: (error) => {
          // Si la compra no existe, recargar los datos y cerrar el diálogo
          if (error.status === 404) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Advertencia',
              detail: 'La compra no existe. Recargando datos...',
            });
            this.load();
            this.closeDialog(); // Cerrar el diálogo para evitar inconsistencias
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al eliminar el documento',
            });
          }
        },
      });
  }

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

  // Método para validar el formulario
  private validateForm(item: DailyExpense): string[] {
    const errors: string[] = [];

    // Validar título
    if (!item.title || item.title.trim() === '') {
      errors.push('El título del reporte es requerido');
    }

    // Validar fecha
    if (!item.date) {
      errors.push('La fecha es requerida');
    }

    // Validar proyecto (opcional)
    // Solo validar si se proporciona un proyecto
    if (item.projectId && typeof item.projectId === 'string' && item.projectId.trim() !== '') {
      // Verificar que el proyecto existe en la lista de proyectos disponibles
      const projectExists = this.projects().some((p) => p.value === item.projectId);
      if (!projectExists) {
        errors.push(
          'El proyecto seleccionado ya no está disponible. Por favor, seleccione otro proyecto.'
        );
      }
    }

    // Validar resumen del día
    if (!item.dailySummary || item.dailySummary.trim() === '') {
      errors.push('El resumen del día es requerido');
    }

    // Validar compras (opcional)
    if (this.selectedPurchases().length > 0) {
      this.selectedPurchases().forEach((purchase, index) => {
        if (!purchase.description || purchase.description.trim() === '') {
          errors.push(`La descripción de la compra ${index + 1} es requerida`);
        }
        if (!purchase.amount || purchase.amount <= 0) {
          errors.push(`El monto de la compra ${index + 1} debe ser mayor a 0`);
        }
        // Validar categoría
        if (
          !purchase.categoryId ||
          typeof purchase.categoryId !== 'string' ||
          purchase.categoryId.trim() === ''
        ) {
          errors.push(`La categoría de la compra ${index + 1} es requerida`);
        } else {
          // Verificar que la categoría existe en la lista de categorías disponibles
          const categoryExists = this.categories().some((c) => c.value === purchase.categoryId);
          if (!categoryExists) {
            errors.push(
              `La categoría de la compra ${
                index + 1
              } ya no está disponible. Por favor, seleccione otra categoría.`
            );
          }
        }
      });
    }

    // Validar observaciones si existen
    if (item.observations && item.observations.length > 0) {
      item.observations.forEach((observation, index) => {
        if (!observation.description || observation.description.trim() === '') {
          errors.push(`La descripción de la observación ${index + 1} es requerida`);
        }
      });
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
      if (message.includes('title should not be empty')) {
        return 'El título del reporte es requerido';
      }
      if (message.includes('date should not be empty')) {
        return 'La fecha es requerida';
      }
      if (message.includes('projectId should not be empty')) {
        return 'El proyecto es requerido';
      }
      if (message.includes('dailySummary should not be empty')) {
        return 'El resumen del día es requerido';
      }
      if (message.includes('purchases should not be empty')) {
        return 'Debe agregar al menos una compra';
      }
      if (message.includes('amount must be a positive number')) {
        return 'El monto debe ser un número positivo';
      }
      if (message.includes('description should not be empty')) {
        return 'La descripción es requerida';
      }
      if (message.includes('categoryId should not be empty')) {
        return 'La categoría es requerida';
      }

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
}
