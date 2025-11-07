import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  effect,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
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
export class QuotesPage implements OnInit {
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

  // Formulario reactivo
  quoteForm = this.fb.group({
    clientId: ['', Validators.required],
    projectId: ['', Validators.required],
    state: ['Pendiente' as QuoteState],
    createDate: [new Date(), Validators.required],
    sendDate: [null as Date | null],
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

  // Método para calcular el total - REMOVIDO: Ya no se manejan items
  // calculateTotal() {
  //   const items = this.quoteForm.get('items')?.value || [];
  //   const total = items.reduce((sum: number, item: any) => {
  //     const qty = Number(item.qty) || 0;
  //     const price = Number(item.price) || 0;
  //     return sum + qty * price;
  //   }, 0);
  //   this.total.set(total);
  //   return total;
  // }

  // Computed para items del formulario - REMOVIDO: Ya no se manejan items
  // get itemsFormArray() {
  //   return this.quoteForm.get('items') as FormArray;
  // }

  constructor() {
    // Efecto para manejar el cierre del diálogo
    effect(() => {
      if (!this.showDialog()) {
        this.editing.set(null);
        this.quoteForm.reset();
        // this.itemsFormArray.clear(); // REMOVIDO: Ya no se manejan items
      }
    });

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

  setQuery(value: string) {
    this.query.set(value);
    this.pagination.update((p) => ({ ...p, page: 1 }));
    this.loadQuotes();
  }

  newQuote() {
    this.editing.set(null);
    this.selectedFiles.set([]);
    this.existingDocuments.set([]);
    this.quoteForm.reset({
      state: 'Pendiente',
      createDate: new Date(),
      // items: [], // REMOVIDO: Ya no se manejan items
      documents: [],
    });
    // this.itemsFormArray.clear(); // REMOVIDO: Ya no se manejan items
    // this.addItem(); // REMOVIDO: Ya no se manejan items
    this.showDialog.set(true);
  }

  editQuote(quote: Quote) {
    this.editing.set(quote);
    this.selectedFiles.set([]); // Limpiar archivos seleccionados al editar

    // Convertir clientId y projectId si vienen como objetos
    const clientId = typeof quote.clientId === 'object' ? quote.clientId._id : quote.clientId;
    const projectId = typeof quote.projectId === 'object' ? quote.projectId._id : quote.projectId;

    // Asegurar que los documentos estén disponibles
    const documents = quote.documents || [];

    // Cargar documentos existentes
    this.existingDocuments.set(documents);

    this.quoteForm.patchValue({
      clientId,
      projectId,
      state: quote.state,
      createDate: new Date(quote.createDate),
      sendDate: quote.sendDate ? new Date(quote.sendDate) : null,
      notes: quote.notes || '',
      documents: documents,
    });

    // Asegurar que el objeto de edición tenga los documentos
    this.editing.update((quote) => (quote ? { ...quote, documents } : null));

    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  viewDetails(quote: Quote) {
    this.viewingQuote.set(quote);
    this.showDetailsDialog.set(true);
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

  saveQuote() {
    if (this.quoteForm.invalid) {
      const validationErrors = this.validateForm();
      validationErrors.forEach((error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error de validación',
          detail: error,
        });
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
      // items: formValue.items as QuoteItem[], // REMOVIDO: Ya no se manejan items
      // total: this.calculateTotal(), // REMOVIDO: Ya no se calcula total automáticamente
      notes: formValue.notes || undefined,
      // No incluir documents en la actualización para evitar sobrescribir los existentes
    };

    const operation = this.editing()?._id
      ? this.quotesApi.update(this.editing()!._id!, quoteData)
      : this.quotesApi.create(quoteData);

    operation.subscribe({
      next: (savedQuote) => {
        // Si hay archivos seleccionados, subirlos
        const filesToUpload = this.selectedFiles();

        if (filesToUpload.length > 0) {
          const quoteId = this.editing()?._id || savedQuote._id!;
          this.quotesApi.uploadDocuments(quoteId, filesToUpload).subscribe({
            next: (result) => {
              // Si estamos editando, actualizar la lista de documentos existentes
              if (this.editing()?._id) {
                const newDocuments = result.documents || [];
                this.existingDocuments.set(newDocuments);
              }

              this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: this.editing()?._id
                  ? 'Cotización actualizada y documentos subidos correctamente'
                  : 'Cotización creada y documentos subidos correctamente',
              });
              this.closeDialog();
              this.loadQuotes();
            },
            error: (uploadError) => {
              console.error('Error uploading files:', uploadError);
              this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: this.editing()?._id
                  ? 'Cotización actualizada pero hubo un error al subir algunos documentos'
                  : 'Cotización creada pero hubo un error al subir algunos documentos',
              });
              this.closeDialog();
              this.loadQuotes();
            },
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: this.editing()?._id ? 'Cotización actualizada' : 'Cotización creada',
          });
          this.closeDialog();
          this.loadQuotes();
        }
      },
      error: (error) => {
        console.error('Error saving quote:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.getErrorMessage(error),
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

  onFileUpload(event: { files?: File[] }, quote: Quote) {
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
            detail: this.getErrorMessage(error),
          });
        },
      });
    }
  }

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

  onFileSelect(event: { files?: File[] | FileList; currentFiles?: File[]; target?: { files?: FileList } }) {
    // El p-fileUpload puede enviar los archivos en diferentes estructuras
    let files: File[] = [];

    if (event.files && Array.isArray(event.files)) {
      files = event.files;
    } else if (event.files instanceof FileList) {
      // Convertir FileList a Array
      files = Array.from(event.files);
    } else if (event.currentFiles && Array.isArray(event.currentFiles)) {
      files = event.currentFiles;
    } else if (event.target && event.target.files) {
      files = Array.from(event.target.files);
    }

    if (files && files.length > 0) {
      // Validar tamaño de archivos (10MB máximo)
      const maxSize = 10 * 1024 * 1024; // 10MB en bytes
      const validFiles = files.filter((file: File) => {
        if (file.size > maxSize) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error de validación',
            detail: `El archivo ${file.name} es demasiado grande. Máximo 10MB.`,
          });
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        // Almacenar los archivos seleccionados
        const currentFiles = this.selectedFiles();
        const updatedFiles = [...currentFiles, ...validFiles];
        this.selectedFiles.set(updatedFiles);

        // Actualizar el FormControl con los nombres de archivos para mostrar en el formulario
        const currentDocuments = this.quoteForm.get('documents')?.value || [];
        const newDocumentNames = validFiles.map((file: File) => file.name);
        const updatedDocuments = [...currentDocuments, ...newDocumentNames];

        this.quoteForm.patchValue({
          documents: updatedDocuments,
        });

        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `${validFiles.length} archivo(s) seleccionado(s) correctamente`,
        });
      }
    }
  }

  onFileError(event: unknown) {
    console.error('Error en selección de archivos:', event);
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error al seleccionar archivos. Verifique el formato y tamaño.',
    });
  }

  removeSelectedFile(index: number) {
    const currentFiles = this.selectedFiles();
    const currentDocuments = this.quoteForm.get('documents')?.value || [];

    // Remover archivo de la lista
    const updatedFiles = currentFiles.filter((_, i) => i !== index);
    const updatedDocuments = currentDocuments.filter((_, i) => i !== index);

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

  onPageChange(event: { page: number; rows: number }) {
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

    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
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
