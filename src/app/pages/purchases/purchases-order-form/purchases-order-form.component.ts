import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService } from 'primeng/api';
import { PurchasesOrdersApiService } from '../../../shared/services/purchases-orders-api.service';
import { ProvidersService, Provider } from '../../../shared/services/providers.service';
import { PurchasesQuotesApiService } from '../../../shared/services/purchases-quotes-api.service';
import { ProjectsApiService } from '../../../shared/services/projects-api.service';
import { Project } from '../../../shared/interfaces/project.interface';
import { ProductsService, Product } from '../../../shared/services/products.service';
import {
  CreatePurchaseOrderRequest,
  PurchaseOrderLine,
  PurchaseQuote,
} from '../../../shared/interfaces/purchase.interface';
import { AuthService } from '../../login/services/auth.service';

@Component({
  selector: 'app-purchases-order-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    Select,
    CheckboxModule,
    CardModule,
    ToastModule,
    TooltipModule,
    DatePickerModule,
    InputNumberModule,
  ],
  templateUrl: './purchases-order-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchasesOrderFormComponent implements OnInit {
  private readonly ordersApi = inject(PurchasesOrdersApiService);
  private readonly quotesApi = inject(PurchasesQuotesApiService);
  private readonly providersService = inject(ProvidersService);
  private readonly messageService = inject(MessageService); // Trigger re-save
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly projectsService = inject(ProjectsApiService);
  private readonly productsService = inject(ProductsService);

  isEditMode = signal<boolean>(false);
  isDragging = signal<boolean>(false);
  uploadingFiles = signal<boolean>(false);
  providers = signal<Provider[]>([]);
  quotes = signal<PurchaseQuote[]>([]);
  selectedProvider = signal<Provider | null>(null);
  selectedQuote = signal<PurchaseQuote | null>(null);
  selectedFiles = signal<File[]>([]);
  attachmentUrls = signal<string[]>([]);
  projects = signal<Project[]>([]);
  selectedProject = signal<Project | null>(null);
  catalogProducts = signal<Product[]>([]);

  orderForm = signal<any>({
    providerId: '',
    providerName: '',
    providerRuc: '',
    providerAddress: '',
    currency: 'PEN',
    issueDate: new Date(),
    dueDate: null,
    paymentTerms: '',
    lines: [],
    subtotal: 0,
    igvAmount: 0,
    totalAmount: 0,
    projectId: '',
  });

  currencies = signal<any[]>([
    { label: 'Soles (PEN)', value: 'PEN' },
    { label: 'Dólares (USD)', value: 'USD' },
  ]);

  ngOnInit() {
    this.loadProviders();
    this.loadQuotes();
    this.loadProjects();
    this.loadCatalogProducts();
    // Check for edit mode
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.isEditMode.set(true);
        // Implementation for edit mode would go here, fetching the order and hydrating the form
        // Currently focused on creation
      }
    });
  }

  loadProviders() {
    this.providersService.getProviders({}).subscribe({
      next: (data) => this.providers.set(data),
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los proveedores',
        }),
    });
  }

  loadQuotes() {
    this.quotesApi.listAll().subscribe({
      next: (data) => {
        console.log('Quotes loaded:', data);
        this.quotes.set(data);
      },
      error: (err) => {
        console.error('Error loading quotes:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las cotizaciones',
        });
      },
    });
  }

  loadCatalogProducts() {
    this.productsService.getProducts({ isActive: true }).subscribe({
      next: (data) => this.catalogProducts.set(data),
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los productos/servicios',
        }),
    });
  }

  /** Unidad de medida válida para el API (máx. 20 caracteres; vacío → UND). */
  private normalizeLineUnit(value: unknown): string {
    if (value === undefined || value === null) return 'UND';
    const s = String(value).trim();
    if (s.length === 0) return 'UND';
    return s.length > 20 ? s.slice(0, 20) : s;
  }

  loadProjects() {
    this.projectsService.listActive().subscribe({
      next: (data) => this.projects.set(data),
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los centros de costo',
        }),
    });
  }

  onProviderSelect(provider: Provider) {
    this.selectedProvider.set(provider);
    const cur = this.orderForm();
    this.orderForm.set({
      ...cur,
      providerId: provider._id,
      providerName: provider.name,
      providerRuc: provider.taxId || '',
      providerAddress: provider.ubicacion?.direccion || '',
    });
  }

  onQuoteSelect(quote: PurchaseQuote) {
    this.selectedQuote.set(quote);
    
    // Fetch full quote details to ensure everything is populated in a single call
    this.quotesApi.getById(quote._id).subscribe({
      next: (fullQuote: any) => {
        const providerId = typeof fullQuote.providerId === 'object' ? fullQuote.providerId._id : fullQuote.providerId;
        const providerObj = typeof fullQuote.providerId === 'object' ? fullQuote.providerId : null;
        
        const providerName = providerObj?.name || '';
        const providerRuc = providerObj?.taxId || '';
        const providerAddress = providerObj?.address || providerObj?.ubicacion?.direccion || '';

        if (providerObj) {
          // Update selectedProvider signal for the dropdown
          this.selectedProvider.set(providerObj);
        }

        const lines: PurchaseOrderLine[] = fullQuote.lines.map((l: any) => ({
          requirementItemIndex: l.requirementItemIndex,
          description: (l.description ?? '').trim() || '',
          quantity: l.quantity,
          unit: this.normalizeLineUnit(l.unit),
          unitPrice: l.unitPrice,
          includesIgv: l.includesIgv ?? true,
          discount: l.discount ?? 0,
          productId: l.productId?._id || l.productId,
        }));

        // Las líneas de cotización no guardan und./descripción: completar desde el requerimiento
        if (typeof fullQuote.requirementId === 'object' && fullQuote.requirementId.items) {
          const items = fullQuote.requirementId.items as Array<{
            description?: string;
            unit?: unknown;
          }>;
          lines.forEach((line) => {
            const reqItem = items[line.requirementItemIndex];
            if (reqItem) {
              if (!line.description?.trim()) {
                line.description = (reqItem.description ?? '').trim() || '';
              }
              line.unit = this.normalizeLineUnit(reqItem.unit ?? line.unit);
            } else {
              line.unit = this.normalizeLineUnit(line.unit);
            }
          });
        } else {
          lines.forEach((line) => {
            line.unit = this.normalizeLineUnit(line.unit);
          });
        }

        // Handle Project
        let projectId = fullQuote.projectId; // If legacy mapping has it
        if (!projectId && typeof fullQuote.requirementId === 'object') {
          projectId = fullQuote.requirementId.projectId;
        }

        if (projectId) {
          const projId = typeof projectId === 'object' ? projectId._id : projectId;
          const projObj = typeof projectId === 'object' ? projectId : this.projects().find(p => p._id === projId);
          if (projObj) this.selectedProject.set(projObj);
          projectId = projId;
        }

        this.orderForm.set({
          ...this.orderForm(),
          providerId: providerId,
          providerName,
          providerRuc,
          providerAddress,
          paymentTerms: fullQuote.paymentTerms || '',
          lines: lines,
          quoteId: fullQuote._id,
          projectId: projectId || '',
          attachments: fullQuote.attachmentUrls || [],
        });

        this.attachmentUrls.set(fullQuote.attachmentUrls || []);
        this.calculateTotals();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los detalles de la cotización'
        });
      }
    });
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files) {
      this.addFiles(Array.from(files));
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files) {
      this.addFiles(Array.from(files));
    }
  }

  addFiles(files: File[]) {
    this.selectedFiles.set([...this.selectedFiles(), ...files]);
  }

  removeFile(index: number) {
    const files = [...this.selectedFiles()];
    files.splice(index, 1);
    this.selectedFiles.set(files);
  }

  uploadFiles(): Observable<string[]> {
    if (this.selectedFiles().length === 0) return of([]);
    this.uploadingFiles.set(true);
    // This is a placeholder for actual upload logic. 
    // In a real app, you'd use an UploadService.
    // For now, I'll simulate it by returning dummy URLs if there's no service.
    return of(this.selectedFiles().map(f => `https://storage.tecmeing.com/uploads/${f.name}`));
  }

  onProjectSelect(project: Project) {
    this.selectedProject.set(project);
    this.onEditChange('projectId', project._id);
  }

  onEditChange(key: string, value: any) {
    const cur = this.orderForm();
    this.orderForm.set({ ...cur, [key]: value });
  }

  addLine() {
    const cur = this.orderForm();
    this.orderForm.set({
      ...cur,
      lines: [
        ...cur.lines,
        {
          requirementItemIndex: cur.lines.length,
          description: '',
          quantity: 1,
          unit: 'UND',
          unitPrice: 0,
          includesIgv: true,
          discount: 0,
        },
      ],
    });
    this.calculateTotals();
  }

  removeLine(index: number) {
    const cur = this.orderForm();
    const lines = [...cur.lines];
    lines.splice(index, 1);
    this.orderForm.set({ ...cur, lines });
    this.calculateTotals();
  }

  updateLine(index: number, field: keyof PurchaseOrderLine | string, value: any) {
    const cur = this.orderForm();
    const lines = [...cur.lines];
    lines[index] = { ...lines[index], [field]: value };

    if (field === 'productId' && value) {
      const product = this.catalogProducts().find(p => p._id === value);
      if (product) {
        lines[index].description = product.name;
        lines[index].unit = this.normalizeLineUnit(product.unitOfMeasure);
        if (product.basePrice) {
          lines[index].unitPrice = product.basePrice;
        }
      }
    }

    if (field === 'unit') {
      lines[index].unit = this.normalizeLineUnit(value);
    }

    this.orderForm.set({ ...cur, lines });

    if (
      field === 'quantity' ||
      field === 'unitPrice' ||
      field === 'includesIgv' ||
      field === 'discount'
    ) {
      this.calculateTotals();
    }
  }

  calculateTotals() {
    const cur = this.orderForm();
    let subtotal = 0;
    let igv = 0;

    cur.lines.forEach((line: PurchaseOrderLine) => {
      const q = line.quantity || 0;
      const p = line.unitPrice || 0;
      const lineTotal = q * p;

      if (line.includesIgv) {
        const lineSubtotal = lineTotal / 1.18;
        subtotal += lineSubtotal;
        igv += lineTotal - lineSubtotal;
      } else {
        subtotal += lineTotal;
        igv += lineTotal * 0.18;
      }
    });

    this.orderForm.set({
      ...cur,
      subtotal: Number(subtotal.toFixed(2)),
      igvAmount: Number(igv.toFixed(2)),
      totalAmount: Number((subtotal + igv).toFixed(2)),
    });
  }

  validateForm(form: any): string[] {
    const errors: string[] = [];
    if (!form.providerId) errors.push('Debe seleccionar un proveedor');
    if (!form.issueDate) errors.push('La fecha de emisión es requerida');
    if (!form.lines || form.lines.length === 0) errors.push('Debe agregar al menos un artículo');

    form.lines.forEach((line: any, i: number) => {
      if (!line.description?.trim()) errors.push(`El artículo ${i + 1} requiere una descripción`);
      if (line.quantity <= 0) errors.push(`La cantidad del artículo ${i + 1} debe ser mayor a 0`);
    });

    return errors;
  }

  save() {
    const form = this.orderForm();
    const validationErrors = this.validateForm(form);

    if (validationErrors.length > 0) {
      validationErrors.forEach((error) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error });
      });
      return;
    }

    this.uploadFiles().subscribe({
      next: (newUrls) => {
        this.attachmentUrls.set([...this.attachmentUrls(), ...newUrls]);
        this.completeSave();
      },
      error: () => {
        this.uploadingFiles.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron subir los archivos',
        });
      },
    });
  }

  private completeSave() {
    const form = this.orderForm();
    const currentUser = this.authService.getCurrentUser();

    const payload: CreatePurchaseOrderRequest = {
      providerId: form.providerId,
      createdBy: currentUser?.id,
      providerName: form.providerName,
      providerRuc: form.providerRuc,
      providerAddress: form.providerAddress,
      lines: form.lines.map((l: PurchaseOrderLine) => ({
        ...l,
        unit: this.normalizeLineUnit(l.unit),
      })),
      subtotal: form.subtotal,
      igvAmount: form.igvAmount,
      totalAmount: form.totalAmount,
      currency: form.currency,
      issueDate: form.issueDate.toISOString(),
      dueDate: form.dueDate ? form.dueDate.toISOString() : undefined,
      paymentTerms: form.paymentTerms,
      quoteId: form.quoteId,
      projectId: form.projectId,
      attachments: this.attachmentUrls(),
    };

    if (this.isEditMode()) {
      // Edit logic could go here
    } else {
      this.ordersApi.create(payload).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Orden de compra generada',
          });
          setTimeout(() => this.goBack(), 1500);
        },
        error: (error: any) => {
          this.uploadingFiles.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.message || 'Error al generar la orden',
          });
        },
      });
    }
  }

  goBack() {
    this.router.navigate(['/purchases/orders']);
  }
}
