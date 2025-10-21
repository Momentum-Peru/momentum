import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  effect,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
} from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { FileUploadModule } from 'primeng/fileupload';
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
  QuoteItem,
  QuoteState,
  QuoteQueryParams,
  QuoteListResponse,
} from '../../shared/interfaces/quote.interface';
import { Project } from '../../shared/interfaces/project.interface';

@Component({
  selector: 'app-quotes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    SelectModule,
    DatePickerModule,
    InputNumberModule,
    TextareaModule,
    TagModule,
    TooltipModule,
    FileUploadModule,
    MenuModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './quotes.html',
  styleUrls: ['./quotes.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotesPage {
  private readonly quotesApi = inject(QuotesApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);

  // Signals para estado
  quotes = signal<Quote[]>([]);
  clients = signal<ClientOption[]>([]);
  projects = signal<Project[]>([]);
  query = signal<string>('');
  showDialog = signal<boolean>(false);
  editing = signal<Quote | null>(null);
  loading = signal<boolean>(false);
  pagination = signal({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  total = signal<number>(0);

  // Formulario reactivo
  quoteForm = this.fb.group({
    clientId: ['', Validators.required],
    projectId: ['', Validators.required],
    state: ['Pendiente' as QuoteState],
    createDate: [new Date(), Validators.required],
    sendDate: [null as Date | null],
    items: this.fb.array<
      FormGroup<{
        description: any;
        qty: any;
        price: any;
      }>
    >([]),
    notes: [''],
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

  // Método para calcular el total
  calculateTotal() {
    const items = this.quoteForm.get('items')?.value || [];
    const total = items.reduce((sum: number, item: any) => {
      const qty = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      return sum + qty * price;
    }, 0);
    this.total.set(total);
    return total;
  }

  // Computed para items del formulario
  get itemsFormArray() {
    return this.quoteForm.get('items') as FormArray;
  }

  constructor() {
    // Efecto para manejar el cierre del diálogo
    effect(() => {
      if (!this.showDialog()) {
        this.editing.set(null);
        this.quoteForm.reset();
        this.itemsFormArray.clear();
      }
    });

    // Efecto para actualizar el total cuando cambian los items
    effect(() => {
      // El total se calcula automáticamente en el computed
      // No necesitamos actualizar el formulario aquí
    });
  }

  ngOnInit() {
    this.loadQuotes();
    this.loadClients();
    this.loadProjects();
  }

  loadQuotes() {
    this.loading.set(true);
    const params: QuoteQueryParams = {
      q: this.query() || undefined,
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
      error: (error) => console.error('Error loading clients:', error),
    });
  }

  loadProjects() {
    this.projectsApi.list().subscribe({
      next: (projects) => this.projects.set(projects),
      error: (error) => console.error('Error loading projects:', error),
    });
  }

  setQuery(value: string) {
    this.query.set(value);
    this.pagination.update((p) => ({ ...p, page: 1 }));
    this.loadQuotes();
  }

  newQuote() {
    this.editing.set(null);
    this.quoteForm.reset({
      state: 'Pendiente',
      createDate: new Date(),
      items: [],
      documents: [],
    });
    this.itemsFormArray.clear();
    this.addItem();
    this.showDialog.set(true);
  }

  editQuote(quote: Quote) {
    this.editing.set(quote);

    // Convertir clientId y projectId si vienen como objetos
    const clientId = typeof quote.clientId === 'object' ? quote.clientId._id : quote.clientId;
    const projectId = typeof quote.projectId === 'object' ? quote.projectId._id : quote.projectId;

    // Limpiar y llenar el FormArray de items
    this.itemsFormArray.clear();
    quote.items.forEach((item) => this.addItem(item));

    this.quoteForm.patchValue({
      clientId,
      projectId,
      state: quote.state,
      createDate: new Date(quote.createDate),
      sendDate: quote.sendDate ? new Date(quote.sendDate) : null,
      notes: quote.notes || '',
      documents: quote.documents || [],
    });

    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  addItem(item?: QuoteItem) {
    const itemGroup = this.fb.group({
      description: [item?.description || '', Validators.required],
      qty: [item?.qty || 1, [Validators.required, Validators.min(1)]],
      price: [item?.price || 0, [Validators.required, Validators.min(0)]],
    });
    this.itemsFormArray.push(itemGroup);

    // Recalcular total cuando se agrega un item
    setTimeout(() => this.calculateTotal(), 0);
  }

  removeItem(index: number) {
    this.itemsFormArray.removeAt(index);
    // Recalcular total cuando se elimina un item
    setTimeout(() => this.calculateTotal(), 0);
  }

  onItemChange() {
    // Recalcular total cuando cambian los valores de los items
    setTimeout(() => this.calculateTotal(), 0);
  }

  saveQuote() {
    if (this.quoteForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'Por favor complete todos los campos requeridos',
      });
      return;
    }

    const formValue = this.quoteForm.value;
    const quoteData: Partial<Quote> = {
      clientId: formValue.clientId!,
      projectId: formValue.projectId!,
      state: formValue.state!,
      createDate: formValue.createDate!.toISOString(),
      sendDate: formValue.sendDate?.toISOString(),
      items: formValue.items as QuoteItem[],
      total: this.calculateTotal(),
      notes: formValue.notes || undefined,
      documents: formValue.documents || [],
    };

    const operation = this.editing()?._id
      ? this.quotesApi.update(this.editing()!._id!, quoteData)
      : this.quotesApi.create(quoteData);

    operation.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: this.editing()?._id ? 'Cotización actualizada' : 'Cotización creada',
        });
        this.closeDialog();
        this.loadQuotes();
      },
      error: (error) => {
        console.error('Error saving quote:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al guardar la cotización',
        });
      },
    });
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
          detail: 'Error al actualizar el estado',
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
              detail: 'Error al eliminar la cotización',
            });
          },
        });
      },
    });
  }

  onFileUpload(event: any, quote: Quote) {
    const files = event.files;
    if (files && files.length > 0) {
      this.quotesApi.uploadDocuments(quote._id!, files).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Documentos subidos correctamente',
          });
          this.loadQuotes();
        },
        error: (error) => {
          console.error('Error uploading files:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al subir los documentos',
          });
        },
      });
    }
  }

  openPdf(quote: Quote) {
    const pdfUrl = this.quotesApi.generatePdf(quote._id!);
    window.open(pdfUrl, '_blank');
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

  onPageChange(event: any) {
    this.pagination.update((p) => ({
      ...p,
      page: event.page + 1,
      limit: event.rows,
    }));
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
}
