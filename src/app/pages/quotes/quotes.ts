import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  effect,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MenuModule } from 'primeng/menu';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { QuotesApiService } from '../../shared/services/quotes-api.service';
import { ClientsApiService, ClientOption } from '../../shared/services/clients-api.service';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import {
  Quote,
  QuoteState,
  QuoteQueryParams,
  QuoteListResponse,
} from '../../shared/interfaces/quote.interface';
import { Project } from '../../shared/interfaces/project.interface';
import { TruncatePipe } from './truncate.pipe';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MenuService } from '../../shared/services/menu.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-quotes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MenuModule,
    ToastModule,
    ConfirmDialogModule,
    RouterModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './quotes.html',
  styleUrls: ['./quotes.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotesPage implements OnInit {
  private readonly quotesApi = inject(QuotesApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly menuService = inject(MenuService);
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  getPageEnd(): number {
    const p = this.pagination();
    return Math.min(p.page * p.limit, p.total);
  }

  // Verificar si el usuario tiene permiso de edición para este módulo
  readonly canEdit = computed(() => this.menuService.canEdit('/quotes'));

  // Signals para estado
  quotes = signal<Quote[]>([]);
  clients = signal<ClientOption[]>([]);
  projects = signal<Project[]>([]);
  requirements = signal<{ _id: string; codigo: string; title: string }[]>([]);
  query = signal<string>('');
  showDialog = signal<boolean>(false);
  showDetailsDialog = signal<boolean>(false);
  editing = signal<Quote | null>(null);
  viewingQuote = signal<Quote | null>(null);
  loading = signal<boolean>(false);
  pagination = signal({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  selectedFiles = signal<File[]>([]);
  existingDocuments = signal<string[]>([]);
  expandedRows = signal<Set<string>>(new Set());

  // Formulario reactivo para archivos/estados en la lista (si fuera necesario)
  // Aunque ahora mayormente se usa en el form component, algunos métodos locales lo referencian
  quoteForm = this.fb.group({
    documents: [[] as string[]],
  });

  // Estados disponibles
  stateOptions = [
    { label: 'Pendiente', value: 'Pendiente' as QuoteState },
    { label: 'Enviada', value: 'Enviada' as QuoteState },
    { label: 'Rechazada', value: 'Rechazada' as QuoteState },
    { label: 'Cancelada', value: 'Cancelada' as QuoteState },
    { label: 'Observada', value: 'Observada' as QuoteState },
    { label: 'Aprobada', value: 'Aprobada' as QuoteState },
  ];

  // Computed para items del formulario - REMOVIDO: Ya no se manejan items
  // get itemsFormArray() {
  //   return this.quoteForm.get('items') as FormArray;
  // }

  constructor() {
    // Efecto para manejar el cierre del diálogo de detalles
    effect(() => {
      if (!this.showDetailsDialog()) {
        this.viewingQuote.set(null);
      }
    });

    // Efecto para actualizar el total cuando cambian los items - REMOVIDO
    // effect(() => {
    //   // El total se calcula automáticamente en el computed
    //   // No necesitamos actualizar el formulario aquí
    // });
  }

  ngOnInit() {
    // Leer queryParams para filtrar por estado
    this.route.queryParams.subscribe((params) => {
      // Si hay un queryParam 'status', convertirlo a 'state' para el filtro
      // El menú usa 'status' pero la API usa 'state'
      if (params['status']) {
        // Convertir 'accepted' del menú a 'Aprobada' del tipo QuoteState
        const statusParam = params['status'];
        const stateValue = statusParam === 'accepted' ? 'Aprobada' : statusParam;
        // Solo aplicar si es un estado válido
        if (
          ['Pendiente', 'Enviada', 'Rechazada', 'Cancelada', 'Observada', 'Aprobada'].includes(
            stateValue
          )
        ) {
          // No necesitamos un signal separado, solo recargar con el filtro
        }
      }
      this.loadQuotes();
    });
    this.loadClients();
    this.loadProjects();
    this.loadRequirements();
  }

  loadQuotes() {
    this.loading.set(true);

    // Leer queryParams actuales
    const routeParams = this.route.snapshot.queryParams;
    let stateFilter: QuoteState | undefined = undefined;

    if (routeParams['status']) {
      const statusParam = routeParams['status'];
      // Convertir 'accepted' del menú a 'Aprobada' del tipo QuoteState
      if (statusParam === 'accepted') {
        stateFilter = 'Aprobada';
      } else if (
        ['Pendiente', 'Enviada', 'Rechazada', 'Cancelada', 'Observada', 'Aprobada'].includes(
          statusParam
        )
      ) {
        stateFilter = statusParam as QuoteState;
      }
    }

    const params: QuoteQueryParams = {
      q: this.query() || undefined,
      state: stateFilter,
      page: this.pagination().page,
      limit: this.pagination().limit,
    };

    this.quotesApi.list(params).subscribe({
      next: (response: QuoteListResponse) => {
        this.quotes.set(response.data);
        this.pagination.set(response.pagination);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading quotes:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar las cotizaciones',
        });
        this.loading.set(false);
      },
    });
  }

  loadClients() {
    this.clientsApi.list().subscribe({
      next: (clients) => this.clients.set(clients),
      error: (error) => {
        console.error('Error loading clients:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los clientes',
        });
      },
    });
  }

  loadProjects() {
    this.projectsApi.list().subscribe({
      next: (projects) => this.projects.set(projects),
      error: (error) => {
        console.error('Error loading projects:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los proyectos',
        });
      },
    });
  }

  loadRequirements() {
    this.http
      .get<{ _id: string; codigo: string; title: string }[]>(`${this.baseUrl}/requirements`)
      .subscribe({
        next: (requirements) => this.requirements.set(requirements),
        error: (error) => {
          console.error('Error loading requirements:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar los requerimientos',
          });
        },
      });
  }

  setQuery(value: string) {
    this.query.set(value);
    this.pagination.update((p) => ({ ...p, page: 1 }));
    this.loadQuotes();
  }

  newQuote() {
    this.router.navigate(['./new'], { relativeTo: this.route });
  }

  editQuote(quote: Quote) {
    this.router.navigate(['./edit', quote._id], { relativeTo: this.route });
  }

  cloneQuote(quote: Quote) {
    this.loading.set(true);
    this.quotesApi.getById(quote._id!).subscribe({
      next: (fullQuote) => {
        const cloneData: Partial<Quote> = {
          clientId: typeof fullQuote.clientId === 'object' ? fullQuote.clientId._id : fullQuote.clientId,
          projectId: typeof fullQuote.projectId === 'object' ? fullQuote.projectId._id : fullQuote.projectId,
          state: 'Pendiente',
          createDate: new Date(),
          location: fullQuote.location,
          area: fullQuote.area,
          notes: fullQuote.notes,
          costs: fullQuote.costs,
          items: fullQuote.items,
          documents: [],
          includeExpenses: fullQuote.includeExpenses,
          includeIgv: fullQuote.includeIgv,
          percentageGeneralExpenses: fullQuote.percentageGeneralExpenses,
          percentageAccommodationFood: fullQuote.percentageAccommodationFood,
          percentageUtilities: fullQuote.percentageUtilities,
          clientCompliance: fullQuote.clientCompliance,
          coordCompliance: fullQuote.coordCompliance,
          tecmeingCompliance: fullQuote.tecmeingCompliance,
        };
        this.quotesApi.create(cloneData).subscribe({
          next: (created) => {
            this.loading.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Cotización Clonada',
              detail: `Nueva cotización #${created.number} creada exitosamente`,
            });
            this.router.navigate(['./edit', created._id], { relativeTo: this.route });
          },
          error: () => {
            this.loading.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo clonar la cotización' });
          },
        });
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la cotización' });
      },
    });
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  viewDetails(quote: Quote) {
    this.router.navigate(['./', quote._id], { relativeTo: this.route });
  }

  closeDetails() {
    this.showDetailsDialog.set(false);
  }

  // Métodos para manejar items - REMOVIDOS: Ya no se manejan items
  // addItem(item?: QuoteItem) {
  //   const itemGroup = this.fb.group({
  //     description: [item?.description || '', Validators.required],
  //     qty: [item?.qty || 1, [Validators.required, Validators.min(1)]],
  //     price: [item?.price || 0, [Validators.required, Validators.min(0)]],
  //   });
  //   this.itemsFormArray.push(itemGroup);

  //   // Recalcular total cuando se agrega un item
  //   setTimeout(() => this.calculateTotal(), 0);
  // }

  // removeItem(index: number) {
  //   this.itemsFormArray.removeAt(index);
  //   // Recalcular total cuando se elimina un item
  //   setTimeout(() => this.calculateTotal(), 0);
  // }

  // onItemChange() {
  //   // Recalcular total cuando cambian los valores de los items
  //   setTimeout(() => this.calculateTotal(), 0);
  // }

  openPdf(quote: Quote) {
    // Si hay documentos subidos, abrir el primero
    if (quote.documents && quote.documents.length > 0) {
      const firstDocument = quote.documents[0];
      window.open(firstDocument, '_blank');
    } else {
      // Si no hay documentos, generar el PDF de la cotización
      const pdfUrl = this.quotesApi.generatePdf(quote._id!);
      window.open(pdfUrl, '_blank');
    }
  }

  updateQuoteState(quote: Quote, state: QuoteState) {
    this.quotesApi.updateState(quote._id!, state).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Estado actualizado correctamente',
        });
        this.loadQuotes();
      },
      error: (error) => {
        console.error('Error updating state:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.getErrorMessage(error),
        });
      },
    });
  }

  deleteQuote(quote: Quote) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de eliminar esta cotización?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.quotesApi.delete(quote._id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Cotización eliminada correctamente',
            });
            this.loadQuotes();
          },
          error: (error) => {
            console.error('Error deleting quote:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: this.getErrorMessage(error),
            });
          },
        });
      },
    });
  }

  onFileError(event: unknown) {
    console.error('Error en selección de archivos:', event);
    // this.messageService.add({
    //   severity: 'error',
    //   summary: 'Error',
    //   detail: 'Error al seleccionar archivos. Verifique el formato y tamaño.',
    // });
  }

  removeSelectedFile(index: number) {
    const currentFiles = this.selectedFiles();
    const currentDocuments = this.quoteForm.get('documents')?.value || [];

    // Remover archivo de la lista
    const updatedFiles = currentFiles.filter((_: any, i: number) => i !== index);
    const updatedDocuments = currentDocuments.filter((_: any, i: number) => i !== index);

    this.selectedFiles.set(updatedFiles);
    this.quoteForm.patchValue({
      documents: updatedDocuments,
    });
  }

  getDocumentName(documentUrl: string): string {
    // Extraer el nombre del archivo de la URL
    const urlParts = documentUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    // Remover parámetros de query si los hay
    return fileName.split('?')[0];
  }

  openDocument(documentUrl: string) {
    window.open(documentUrl, '_blank');
  }

  removeExistingDocument(index: number) {
    if (!this.editing()) return;

    const currentDocuments = this.existingDocuments();
    const documentToRemove = currentDocuments[index];

    // Confirmar eliminación
    this.confirmationService.confirm({
      message: '¿Estás seguro de eliminar este documento?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.quotesApi.removeDocument(this.editing()!._id!, documentToRemove).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Documento eliminado correctamente',
            });

            // Actualizar la lista de documentos existentes
            const updatedDocuments = currentDocuments.filter((_, i) => i !== index);
            this.existingDocuments.set(updatedDocuments);

            // Actualizar el formulario
            this.quoteForm.patchValue({
              documents: updatedDocuments,
            });

            // Actualizar el objeto de edición
            this.editing.update((quote) =>
              quote ? { ...quote, documents: updatedDocuments } : null
            );

            this.loadQuotes();
          },
          error: (error) => {
            console.error('Error removing document:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: this.getErrorMessage(error),
            });
          },
        });
      },
    });
  }

  getClientName(clientId: string | { _id: string; name: string; taxId?: string }): string {
    if (typeof clientId === 'object' && clientId !== null && 'name' in clientId) {
      return clientId.name;
    }
    const client = this.clients().find((c) => c._id === clientId);
    return client?.name || 'Cliente no encontrado';
  }

  getProjectName(projectId: string | { _id: string; name: string; code: string }): string {
    if (typeof projectId === 'object' && projectId !== null && 'name' in projectId) {
      return projectId.name;
    }
    const project = this.projects().find((p) => p._id === projectId);
    return project?.name || 'Proyecto no encontrado';
  }

  getStateSeverity(
    state: QuoteState
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | null | undefined {
    switch (state) {
      case 'Pendiente':
        return 'warn';
      case 'Enviada':
        return 'info';
      case 'Aprobada':
        return 'success';
      case 'Rechazada':
        return 'danger';
      case 'Cancelada':
        return 'secondary';
      case 'Observada':
        return 'warn';
      default:
        return 'secondary';
    }
  }

  getStateClass(state: QuoteState): string {
    switch (state) {
      case 'Pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'Enviada':
        return 'bg-blue-100 text-blue-800';
      case 'Aprobada':
        return 'bg-green-100 text-green-800';
      case 'Rechazada':
        return 'bg-red-100 text-red-800';
      case 'Cancelada':
        return 'bg-gray-100 text-gray-800';
      case 'Observada':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  onPageChange(event: { first?: number; rows?: number }) {
    const first: number = typeof event.first === 'number' ? event.first : 0;
    const rows: number = typeof event.rows === 'number' ? event.rows : this.pagination().limit;
    const pageCalculated = rows > 0 ? Math.floor(first / rows) : 0;
    this.pagination.update((p) => ({ ...p, page: pageCalculated + 1, limit: rows }));
    this.loadQuotes();
  }

  getStateMenuItems(quote: Quote) {
    return this.stateOptions
      .filter((option) => option.value !== quote.state)
      .map((option) => ({
        label: option.label,
        icon: this.getStateIcon(option.value),
        command: () => this.updateQuoteState(quote, option.value),
      }));
  }

  getStateIcon(state: QuoteState): string {
    switch (state) {
      case 'Pendiente':
        return 'pi pi-clock';
      case 'Enviada':
        return 'pi pi-send';
      case 'Aprobada':
        return 'pi pi-check';
      case 'Rechazada':
        return 'pi pi-times';
      case 'Cancelada':
        return 'pi pi-ban';
      case 'Observada':
        return 'pi pi-eye';
      default:
        return 'pi pi-circle';
    }
  }

  // Método para validar el formulario
  private validateForm(): string[] {
    const errors: string[] = [];
    const form = this.quoteForm;

    // Validar cliente
    if (!form.get('clientId')?.value) {
      errors.push('El cliente es requerido');
    }

    // Validar proyecto
    if (!form.get('projectId')?.value) {
      errors.push('El proyecto es requerido');
    }

    // Validar requerimiento
    /* if (!form.get('requirementId')?.value) {
      errors.push('El requerimiento es requerido');
    } */

    // Validar fecha de creación
    if (!form.get('createDate')?.value) {
      errors.push('La fecha de creación es requerida');
    }

    // Validar estado
    if (!form.get('state')?.value) {
      errors.push('El estado es requerido');
    }

    return errors;
  }

  // Método para obtener mensaje de error de la API
  private getErrorMessage(error: unknown): string {
    // Manejar errores de validación específicos
    if (error && typeof error === 'object' && 'error' in error) {
      const errorObj = error as { error?: { message?: string | string[] }; message?: string };
      if (errorObj.error?.message) {
        const message = errorObj.error.message;

        // Si es un array de mensajes, unirlos
        if (Array.isArray(message)) {
          return message.join(', ');
        }

        // Traducir mensajes comunes de validación
        if (typeof message === 'string') {
          if (message.includes('clientId should not be empty')) {
            return 'El cliente es requerido';
          }
          if (message.includes('projectId should not be empty')) {
            return 'El proyecto es requerido';
          }
          if (message.includes('state should not be empty')) {
            return 'El estado es requerido';
          }
          if (message.includes('createDate should not be empty')) {
            return 'La fecha de creación es requerida';
          }
          if (message.includes('clientId must be a valid ObjectId')) {
            return 'El cliente seleccionado no es válido';
          }
          if (message.includes('projectId must be a valid ObjectId')) {
            return 'El proyecto seleccionado no es válido';
          }
          if (message.includes('state must be one of the following values')) {
            return 'El estado seleccionado no es válido';
          }
          return message;
        }
      }
      const inner = (errorObj as { error?: unknown }).error as unknown;
      if (inner && typeof inner === 'object') {
        const innerRecord = inner as Record<string, unknown>;
        const innerError = innerRecord['error'];
        if (typeof innerError === 'string') {
          return innerError;
        }
      }
    }

    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }

    return 'Ha ocurrido un error inesperado';
  }

  /**
   * Alterna la expansión de una fila del accordion
   */
  toggleRow(rowId: string | undefined): void {
    if (!rowId) return;
    const expanded = new Set(this.expandedRows());
    if (expanded.has(rowId)) {
      expanded.delete(rowId);
    } else {
      expanded.add(rowId);
    }
    this.expandedRows.set(expanded);
  }

  /**
   * Verifica si una fila está expandida
   */
  isRowExpanded(rowId: string | undefined): boolean {
    if (!rowId) return false;
    return this.expandedRows().has(rowId);
  }
}
