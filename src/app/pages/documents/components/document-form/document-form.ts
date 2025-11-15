import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  signal,
  inject,
  ChangeDetectionStrategy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { FileUploadModule, FileUpload, FileSelectEvent } from 'primeng/fileupload';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';

import {
  DocumentsApiService,
  PaymentVoucher,
} from '../../../../shared/services/documents-api.service';
import { ProjectsApiService } from '../../../../shared/services/projects-api.service';
import { Document } from '../../../../shared/interfaces/document.interface';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-document-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    DatePickerModule,
    FileUploadModule,
    CardModule,
    DividerModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
  ],
  templateUrl: './document-form.html',
  styleUrl: './document-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService, ConfirmationService],
})
export class DocumentFormComponent implements OnInit, OnChanges {
  @Input({ required: true }) document: Document | null = null;
  @Output() documentSaved = new EventEmitter<Document | null>();
  @Output() formCancel = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly documentsApi = inject(DocumentsApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  @ViewChild('fileUpload') fileUploadComponent!: FileUpload;

  documentForm!: FormGroup;
  loading = signal(false);
  loadingProjects = signal(false);
  uploadedFiles = signal<File[]>([]);
  existingFiles = signal<string[]>([]);
  paymentVouchers = signal<PaymentVoucher[]>([]);
  editingVoucherId = signal<string | null>(null);
  editingVoucherNumeroOperacion = signal<string>('');

  // Opciones para el dropdown de proyectos
  projectOptions = signal<{ label: string; fullLabel?: string; value: string }[]>([]);

  // Opciones para categorías
  categoryOptions = [
    { label: 'Factura', value: 'Factura' },
    { label: 'Boleta', value: 'Boleta' },
    { label: 'Nota de Crédito', value: 'Nota de Crédito' },
    { label: 'Nota de Débito', value: 'Nota de Débito' },
    { label: 'Recibo por Honorarios', value: 'Recibo por Honorarios' },
    { label: 'Otros', value: 'Otros' },
  ];

  ngOnInit(): void {
    this.initializeForm();
    this.loadProjects();
    this.setupCategoryValidation();

    if (this.document) {
      this.populateForm();
      // Cargar vouchers si es edición
      if (this.document._id) {
        this.loadPaymentVouchers(this.document._id);
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Cuando cambia el documento (al abrir el diálogo de edición)
    if (changes['document'] && this.documentForm) {
      // Esperar a que los proyectos se carguen antes de poblar el formulario
      if (this.document) {
        // Si los proyectos ya están cargados, poblar directamente
        // Si no, esperar a que se carguen (el populateForm se llama desde loadProjects)
        const projectsLoaded = this.projectOptions().length > 0;
        if (projectsLoaded) {
          // Usar setTimeout para asegurar que el cambio de detección se ejecute
          setTimeout(() => {
            this.populateForm();
          }, 0);
        } else {
          // Si los proyectos no están cargados, poblar después de cargarlos
          this.loadingProjects.set(true);
          this.projectsApi.listActive().subscribe({
            next: (projects) => {
              const options = projects.map((project) => {
                const fullLabel = `${project.name} (${project.code})`;
                return {
                  label: this.truncateText(fullLabel, 40),
                  fullLabel: fullLabel, // Guardar el texto completo para el tooltip
                  value: project._id!,
                };
              });
              this.projectOptions.set(options);
              this.loadingProjects.set(false);
              setTimeout(() => {
                this.populateForm();
              }, 0);
            },
            error: (error: unknown) => {
              console.error('Error al cargar proyectos:', error);
              this.loadingProjects.set(false);
              // Poblar el formulario de todos modos
              setTimeout(() => {
                this.populateForm();
              }, 0);
            },
          });
        }
      } else {
        // Si el documento es null, limpiar el formulario (crear nuevo)
        this.resetForm();
      }
    }
  }

  /**
   * Configurar validaciones del campo categoría
   */
  private setupCategoryValidation(): void {
    // Escuchar cambios en el campo categoría para actualizar validaciones
    this.documentForm.get('categoria')?.valueChanges.subscribe((categoria) => {
      const categoriaOtrosControl = this.documentForm.get('categoriaOtros');
      if (categoria === 'Otros') {
        // Si se selecciona "Otros", hacer el campo requerido
        categoriaOtrosControl?.setValidators([Validators.required]);
      } else {
        // Si se selecciona otra opción, limpiar el campo y quitar validaciones
        categoriaOtrosControl?.setValue('');
        categoriaOtrosControl?.clearValidators();
      }
      categoriaOtrosControl?.updateValueAndValidity({ emitEvent: false });
    });
  }

  /**
   * Inicializar formulario reactivo
   */
  private initializeForm(): void {
    this.documentForm = this.fb.group({
      numeroDocumento: ['', [Validators.required, Validators.min(1)]],
      serie: [''],
      proyectoId: [''],
      categoria: [''],
      categoriaOtros: [''], // Campo para escribir cuando se selecciona "Otros"
      fechaEmision: [''],
      fechaVencimiento: [''],
      documentoReferencia: ['', [Validators.min(1)]],
      total: ['', [Validators.required, Validators.min(0)]],
    });
  }

  /**
   * Trunca un texto a una longitud máxima
   */
  private truncateText(text: string, maxLength = 40): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Cargar proyectos desde el backend
   */
  private loadProjects(): void {
    this.loadingProjects.set(true);
    this.projectsApi.listActive().subscribe({
      next: (projects) => {
        const options = projects.map((project) => {
          const fullLabel = `${project.name} (${project.code})`;
          return {
            label: this.truncateText(fullLabel, 40),
            fullLabel: fullLabel, // Guardar el texto completo para el tooltip
            value: project._id!,
          };
        });
        this.projectOptions.set(options);
        this.loadingProjects.set(false);
      },
      error: (error: unknown) => {
        console.error('Error al cargar proyectos:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los proyectos',
        });
        this.loadingProjects.set(false);
      },
    });
  }

  /**
   * Poblar formulario con datos del documento a editar
   */
  private populateForm(): void {
    if (this.document) {
      // Verificar si la categoría está en las opciones predefinidas
      const categoriaExiste = this.categoryOptions.some(
        (opt) => opt.value === this.document!.categoria
      );

      const esOtros = !categoriaExiste;

      this.documentForm.patchValue({
        numeroDocumento: this.document.numeroDocumento,
        serie: this.document.serie,
        proyectoId: this.document.proyectoId
          ? typeof this.document.proyectoId === 'string'
            ? this.document.proyectoId
            : this.document.proyectoId._id
          : '',
        categoria: categoriaExiste ? this.document.categoria : 'Otros',
        categoriaOtros: categoriaExiste ? '' : this.document.categoria || '',
        fechaEmision: this.document.fechaEmision ? new Date(this.document.fechaEmision) : null,
        fechaVencimiento: this.document.fechaVencimiento
          ? new Date(this.document.fechaVencimiento)
          : null,
        documentoReferencia: this.document.documentoReferencia,
        total: this.document.total,
      });

      // Si es "Otros", aplicar validación requerida
      if (esOtros) {
        const categoriaOtrosControl = this.documentForm.get('categoriaOtros');
        categoriaOtrosControl?.setValidators([Validators.required]);
        categoriaOtrosControl?.updateValueAndValidity({ emitEvent: false });
      }

      this.existingFiles.set(this.document.documentos || []);
      // Cargar vouchers si es edición
      if (this.document._id) {
        this.loadPaymentVouchers(this.document._id);
      }
    }
  }

  /**
   * Cargar vouchers de pago de un documento
   */
  loadPaymentVouchers(documentId: string): void {
    this.documentsApi.getPaymentVouchers(documentId).subscribe({
      next: (vouchers) => {
        this.paymentVouchers.set(vouchers);
      },
      error: (error: unknown) => {
        console.error('Error al cargar vouchers:', error);
        this.paymentVouchers.set([]);
      },
    });
  }

  /**
   * Iniciar edición del número de operación de un voucher
   */
  startEditingVoucher(voucher: PaymentVoucher): void {
    this.editingVoucherId.set(voucher._id);
    this.editingVoucherNumeroOperacion.set(voucher.numeroOperacion || '');
  }

  /**
   * Cancelar edición del voucher
   */
  cancelEditingVoucher(): void {
    this.editingVoucherId.set(null);
    this.editingVoucherNumeroOperacion.set('');
  }

  /**
   * Guardar número de operación del voucher
   */
  saveVoucherNumeroOperacion(voucherId: string): void {
    const numeroOperacion = this.editingVoucherNumeroOperacion()?.trim() || undefined;

    this.documentsApi.updatePaymentVoucher(voucherId, numeroOperacion).subscribe({
      next: (updatedVoucher) => {
        // Actualizar el voucher en la lista
        const vouchers = this.paymentVouchers();
        const index = vouchers.findIndex((v) => v._id === voucherId);
        if (index !== -1) {
          vouchers[index] = updatedVoucher;
          this.paymentVouchers.set([...vouchers]);
        }
        this.editingVoucherId.set(null);
        this.editingVoucherNumeroOperacion.set('');
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Número de operación actualizado correctamente',
        });
      },
      error: (error: unknown) => {
        console.error('Error al actualizar voucher:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el número de operación',
        });
      },
    });
  }

  /**
   * Eliminar voucher de pago
   */
  deletePaymentVoucher(voucherId: string): void {
    this.confirmationService.confirm({
      message: '¿Está seguro de que desea eliminar este voucher de pago?',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.documentsApi.deletePaymentVoucher(voucherId).subscribe({
          next: () => {
            // Remover el voucher de la lista
            const vouchers = this.paymentVouchers();
            this.paymentVouchers.set(vouchers.filter((v) => v._id !== voucherId));
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Voucher eliminado correctamente',
            });
          },
          error: (error: unknown) => {
            console.error('Error al eliminar voucher:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar el voucher',
            });
          },
        });
      },
    });
  }

  /**
   * Manejar selección de archivos
   */
  onFileSelect(event: FileSelectEvent): void {
    const newFiles: File[] = Array.from(event.files ?? []);
    const currentFiles = this.uploadedFiles();

    // Filtrar archivos duplicados por nombre
    const existingFileNames = currentFiles.map((file) => file.name);
    const uniqueNewFiles = newFiles.filter((file) => !existingFileNames.includes(file.name));

    // Combinar archivos existentes con los nuevos únicos
    const allFiles = [...currentFiles, ...uniqueNewFiles];
    this.uploadedFiles.set(allFiles);

    // Mostrar mensaje si hay archivos duplicados
    const duplicateCount = newFiles.length - uniqueNewFiles.length;
    if (duplicateCount > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Archivos duplicados',
        detail: `${duplicateCount} archivo(s) ya estaban seleccionados y fueron omitidos`,
      });
    }
  }

  /**
   * Eliminar archivo seleccionado
   */
  removeFile(file: File): void {
    const currentFiles = this.uploadedFiles();
    const updatedFiles = currentFiles.filter((f) => f !== file);
    this.uploadedFiles.set(updatedFiles);
  }

  /**
   * Eliminar archivo existente
   */
  removeExistingFile(fileUrl: string): void {
    const currentFiles = this.existingFiles();
    const updatedFiles = currentFiles.filter((f) => f !== fileUrl);
    this.existingFiles.set(updatedFiles);
  }

  /**
   * Enviar formulario
   */
  onSubmit(): void {
    if (this.documentForm.valid) {
      this.loading.set(true);

      const formData = this.prepareFormData();

      if (this.document) {
        this.updateDocument(formData);
      } else {
        this.createDocument(formData);
      }
    } else {
      this.markFormGroupTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Inválido',
        detail: 'Por favor complete todos los campos requeridos',
      });
    }
  }

  /**
   * Preparar datos del formulario
   */
  private prepareFormData(): Partial<Document> {
    const formValue = this.documentForm.value;

    const formData: Partial<Document> = {
      numeroDocumento: formValue.numeroDocumento,
      total: formValue.total,
      documentos: this.existingFiles(),
    };

    // Solo incluir campos opcionales si tienen valor
    if (formValue.serie && formValue.serie.trim()) {
      formData.serie = formValue.serie.trim();
    }

    if (formValue.proyectoId && formValue.proyectoId.trim()) {
      formData.proyectoId = formValue.proyectoId.trim();
    }

    // Manejar categoría: si es "Otros", usar el valor del campo categoriaOtros
    if (
      formValue.categoria === 'Otros' &&
      formValue.categoriaOtros &&
      formValue.categoriaOtros.trim()
    ) {
      formData.categoria = formValue.categoriaOtros.trim();
    } else if (
      formValue.categoria &&
      formValue.categoria !== 'Otros' &&
      formValue.categoria.trim()
    ) {
      formData.categoria = formValue.categoria.trim();
    }

    if (formValue.fechaEmision) {
      formData.fechaEmision = formValue.fechaEmision;
    }

    if (formValue.fechaVencimiento) {
      formData.fechaVencimiento = formValue.fechaVencimiento;
    }

    if (formValue.documentoReferencia) {
      formData.documentoReferencia = formValue.documentoReferencia;
    }

    return formData;
  }

  /**
   * Crear nuevo documento
   */
  private createDocument(formData: Partial<Document>): void {
    this.documentsApi.create(formData).subscribe({
      next: (document) => {
        this.handleDocumentSaved(document);
      },
      error: (error: unknown) => {
        this.handleError('Error al crear documento', error);
      },
    });
  }

  /**
   * Actualizar documento existente
   */
  private updateDocument(formData: Partial<Document>): void {
    this.documentsApi.update(this.document!._id!, formData).subscribe({
      next: (document) => {
        this.handleDocumentSaved(document);
      },
      error: (error: unknown) => {
        this.handleError('Error al actualizar documento', error);
      },
    });
  }

  /**
   * Manejar documento guardado exitosamente
   */
  private handleDocumentSaved(document: Document): void {
    // Si hay archivos nuevos para subir
    const filesToUpload = this.uploadedFiles();
    if (filesToUpload.length > 0) {
      this.uploadFiles(document._id!, filesToUpload, document);
    } else {
      this.finishSave(document);
    }
  }

  /**
   * Subir archivos al documento
   */
  private uploadFiles(documentId: string, files: File[], document: Document): void {
    this.documentsApi.uploadFiles(documentId, files).subscribe({
      next: () => {
        this.finishSave(document);
      },
      error: (error: unknown) => {
        this.handleError('Error al subir archivos', error);
      },
    });
  }

  /**
   * Finalizar proceso de guardado
   */
  private finishSave(savedDocument?: Document): void {
    this.loading.set(false);

    const isNewDocument = !this.document;

    // Si es creación, limpiar el formulario
    if (isNewDocument) {
      this.resetForm();
    }

    // Emitir el documento guardado solo si es creación (nuevo documento)
    // Si es actualización, emitir null
    this.documentSaved.emit(isNewDocument ? savedDocument || null : null);
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: this.document
        ? 'Documento actualizado correctamente'
        : 'Documento creado correctamente',
    });
  }

  /**
   * Manejar errores
   */
  private handleError(message: string, error: unknown): void {
    console.error(message, error);
    this.loading.set(false);

    // Intentar extraer el mensaje de error del backend
    let errorMessage = message; // Mensaje por defecto

    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      const errorObject = error as { message?: unknown; error?: unknown };

      if (
        errorObject.error &&
        typeof errorObject.error === 'object' &&
        errorObject.error !== null
      ) {
        const nestedError = errorObject.error as { message?: unknown };
        if (typeof nestedError.message === 'string') {
          errorMessage = nestedError.message;
        }
      }

      if (errorMessage === message && typeof errorObject.message === 'string') {
        errorMessage = errorObject.message;
      }
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage,
    });
  }

  /**
   * Marcar todos los campos como tocados para mostrar errores
   */
  private markFormGroupTouched(): void {
    Object.keys(this.documentForm.controls).forEach((key) => {
      this.documentForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Cancelar formulario
   */
  onCancel(): void {
    this.resetForm();
    this.formCancel.emit();
  }

  /**
   * Limpiar/resetear el formulario
   */
  private resetForm(): void {
    // Resetear el formulario
    this.documentForm.reset();

    // Limpiar archivos subidos y existentes
    this.uploadedFiles.set([]);
    this.existingFiles.set([]);

    // Limpiar el componente de carga de archivos
    if (this.fileUploadComponent) {
      this.fileUploadComponent.clear();
    }

    // Restablecer validaciones del campo categoriaOtros
    const categoriaOtrosControl = this.documentForm.get('categoriaOtros');
    categoriaOtrosControl?.clearValidators();
    categoriaOtrosControl?.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Verificar si se debe mostrar el campo "Otros" para categoría
   */
  showCategoriaOtros(): boolean {
    return this.documentForm.get('categoria')?.value === 'Otros';
  }

  /**
   * Verificar si un campo tiene error
   */
  hasError(fieldName: string): boolean {
    const field = this.documentForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Obtener mensaje de error para un campo
   */
  getErrorMessage(fieldName: string): string {
    const field = this.documentForm.get(fieldName);
    if (field?.errors?.['required']) {
      return 'Este campo es requerido';
    }
    if (field?.errors?.['min']) {
      return `El valor mínimo es ${field.errors['min'].min}`;
    }
    return '';
  }

  /**
   * Obtener nombre del archivo desde URL
   */
  getFileName(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1] || 'Archivo';
  }

  /**
   * Formatear tamaño de archivo
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
