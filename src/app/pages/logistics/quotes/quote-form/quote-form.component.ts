import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { StepsModule } from 'primeng/steps';
import { DialogModule } from 'primeng/dialog';
import { MenuItem } from 'primeng/api';
import { RfqsService, Rfq, RfqItem } from '../../../../shared/services/rfqs.service';
import { ProductsService, Product } from '../../../../shared/services/products.service';
import { ProvidersService, Provider } from '../../../../shared/services/providers.service';
import { ProjectsApiService } from '../../../../shared/services/projects-api.service';
import { Project } from '../../../../shared/interfaces/project.interface';
import { ClientsApiService, ClientOption } from '../../../../shared/services/clients-api.service';

@Component({
  selector: 'app-quote-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    SelectModule,
    MultiSelectModule,
    InputNumberModule,
    DatePickerModule,
    CardModule,
    ToastModule,
    StepsModule,
    DialogModule,
  ],
  templateUrl: './quote-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteFormComponent implements OnInit {
  private readonly rfqsService = inject(RfqsService);
  private readonly productsService = inject(ProductsService);
  private readonly providersService = inject(ProvidersService);
  private readonly projectsService = inject(ProjectsApiService);
  private readonly clientsService = inject(ClientsApiService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  items: MenuItem[] | undefined;
  activeIndex: number = 0;

  isEditMode = signal<boolean>(false);
  rfqId = signal<string | null>(null);

  // Form Data
  title = signal<string>('');
  description = signal<string>('');
  deadline = signal<Date | null>(null);
  termsAndConditions = signal<string>('');
  rfqItems = signal<
    {
      typeFilter: 'bien' | 'servicio' | null;
      productId: Product | null;
      quantity: number;
      notes: string;
    }[]
  >([]);
  selectedProviderIds = signal<string[]>([]);

  // Catalogs
  products = signal<Product[]>([]);
  providers = signal<Provider[]>([]);
  projects = signal<Project[]>([]);
  clients = signal<ClientOption[]>([]);
  selectedProjectId = signal<string | null>(null);

  productTypes = [
    { label: 'Bien', value: 'bien' },
    { label: 'Servicio', value: 'servicio' },
  ];

  // Quick Creation Modals
  showProjectDialog = signal<boolean>(false);
  newProject = signal({
    name: '',
    description: '',
    clientId: '',
    startDate: null as Date | null,
    status: 'EN_EJECUCION',
  });

  showProviderDialog = signal<boolean>(false);
  newProvider = signal({
    name: '',
    taxIdType: 'RUC',
    taxId: '',
    contactName: '',
    email: '',
    phone: '',
  });

  docTypes = signal<any[]>([
    { label: 'RUC', value: 'RUC' },
    { label: 'DNI', value: 'DNI' },
    { label: 'CE', value: 'CE' },
    { label: 'Pasaporte', value: 'Pasaporte' },
  ]);

  ngOnInit() {
    this.items = [
      { label: 'Productos/Servicios' },
      { label: 'Detalles' },
      { label: 'Proveedores' },
    ];

    const state = this.router.getCurrentNavigation()?.extras?.state as
      | { newProductId?: string }
      | undefined;
    const newProductId = state?.newProductId;

    this.loadCatalogs(newProductId);

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.isEditMode.set(true);
        this.rfqId.set(id);
        this.loadRfq(id);
      } else {
        // Initialize one empty item
        this.addRfqItem();
      }
    });
  }

  loadCatalogs(newProductId?: string) {
    // Solo productos y proveedores activos
    this.clientsService.list().subscribe((data) => this.clients.set(data));
    this.productsService.getProducts({ isActive: true }).subscribe((data) => {
      this.products.set(data);
      if (newProductId && data?.length) {
        const product = data.find((p) => p._id === newProductId);
        if (product) {
          const items = this.rfqItems();
          const idx = items.findIndex((i) => !i.productId);
          if (idx >= 0) {
            this.updateRfqItem(idx, 'productId', product);
          } else {
            this.addRfqItem();
            this.updateRfqItem(this.rfqItems().length - 1, 'productId', product);
          }
          this.messageService.add({
            severity: 'success',
            summary: 'Producto agregado',
            detail: `"${product.name}" se ha agregado a la solicitud.`,
          });
        }
      }
    });
    this.providersService
      .getProviders({ isActive: true })
      .subscribe((data) => this.providers.set(data));
    this.projectsService.listActive().subscribe((data) => this.projects.set(data));
  }

  getFilteredProducts(typeFilter: 'bien' | 'servicio' | null): Product[] {
    if (!typeFilter) return this.products();
    return this.products().filter((p) => p.type === typeFilter);
  }

  loadRfq(id: string) {
    this.rfqsService.getRfq(id).subscribe({
      next: (rfq) => {
        this.title.set(rfq.title);
        this.description.set(rfq.description);
        this.deadline.set(rfq.deadline ? new Date(rfq.deadline) : null);
        this.termsAndConditions.set(rfq.termsAndConditions || '');
        if (rfq.projectId) {
          this.selectedProjectId.set(
            typeof rfq.projectId === 'string' ? rfq.projectId : rfq.projectId._id,
          );
        }

        // Map items back
        const items = rfq.items.map((i) => {
          const prod =
            typeof i.productId === 'object'
              ? (i.productId as Product)
              : this.products().find((p) => p._id === i.productId) || null;
          return {
            typeFilter: prod?.type || null,
            productId: prod,
            quantity: i.quantity,
            notes: i.notes || '',
          };
        });
        this.rfqItems.set(items);

        // Disable editing items or providers if it's already published to prevent mismatch?
        // Wait, if editing, they shouldn't change providers. Only when creating.
      },
      error: () => this.goBack(),
    });
  }

  next() {
    if (this.activeIndex === 0) {
      if (
        this.rfqItems().length === 0 ||
        this.rfqItems().some((i) => !i.productId || i.quantity <= 0)
      ) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Debe agregar al menos un producto válido y cantidad > 0',
        });
        return;
      }
    } else if (this.activeIndex === 1) {
      if (!this.title() || !this.description() || !this.selectedProjectId()) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Debe ingresar el título, descripción y seleccionar un proyecto',
        });
        return;
      }
    }
    this.activeIndex++;
  }

  prev() {
    this.activeIndex--;
  }

  addRfqItem() {
    this.rfqItems.update((items) => [
      ...items,
      { typeFilter: 'bien', productId: null, quantity: 1, notes: '' },
    ]);
  }

  removeRfqItem(index: number) {
    this.rfqItems.update((items) => items.filter((_, i) => i !== index));
    if (this.rfqItems().length === 0) {
      this.addRfqItem();
    }
  }

  updateRfqItem(index: number, field: string, value: any) {
    this.rfqItems.update((items) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], [field]: value };
      if (field === 'typeFilter') {
        newItems[index].productId = null; // reset selection when type changes
      }
      return newItems;
    });
  }

  // Navega al formulario completo de producto (logistics/products/new) y vuelve aquí con el producto creado
  openNewProduct() {
    const returnTo = this.router.url;
    this.router.navigate(['/logistics/products/new'], {
      queryParams: { returnTo },
    });
  }

  openNewProvider() {
    this.newProvider.set({
      name: '',
      taxIdType: 'RUC',
      taxId: '',
      contactName: '',
      email: '',
      phone: '',
    });
    this.showProviderDialog.set(true);
  }

  saveNewProvider() {
    const payload = this.newProvider();
    if (!payload.name) return;

    const providerPayload = {
      name: payload.name,
      taxIdType: payload.taxIdType,
      taxId: payload.taxId,
      isActive: true,
      services: [],
      contacts:
        payload.contactName || payload.email
          ? [
              {
                name: payload.contactName || 'Contacto',
                email: payload.email,
                phone: payload.phone,
                area: 'Ventas',
              },
            ]
          : [],
    };

    this.providersService.createProvider(providerPayload).subscribe({
      next: (provider) => {
        this.providers.update((list) => [...list, provider]);
        this.selectedProviderIds.update((ids) => [...ids, provider._id!]);
        this.showProviderDialog.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Proveedor agregado',
        });
      },
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo crear el proveedor',
        }),
    });
  }

  openNewProject() {
    this.newProject.set({
      name: '',
      description: '',
      clientId: '',
      startDate: null,
      status: 'EN_EJECUCION',
    });
    this.showProjectDialog.set(true);
  }

  saveNewProject() {
    const payload = this.newProject();
    if (!payload.name || !payload.clientId || !payload.startDate) return;

    this.projectsService
      .create({
        name: payload.name,
        description: payload.description,
        clientId: payload.clientId,
        startDate: (payload.startDate as Date).toISOString(),
        status: payload.status as Project['status'],
      } as Partial<Project>)
      .subscribe({
        next: (project) => {
          this.projects.update((list) => [...list, project]);
          this.selectedProjectId.set(project._id!);
          this.showProjectDialog.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Proyecto agregado',
          });
        },
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear el proyecto',
          }),
      });
  }

  save() {
    if (!this.title() || this.rfqItems().length === 0) return;

    const payload = {
      title: this.title(),
      description: this.description(),
      projectId: this.selectedProjectId() || undefined,
      deadline: this.deadline() ? this.deadline()!.toISOString() : undefined,
      termsAndConditions: this.termsAndConditions(),
      items: this.rfqItems().map((i) => ({
        productId: i.productId!._id!,
        quantity: i.quantity,
        notes: i.notes,
      })),
      providerIds: this.isEditMode() ? undefined : this.selectedProviderIds(), // Only send providers on create
    };

    const req = this.isEditMode()
      ? this.rfqsService.updateRfq(this.rfqId()!, payload)
      : this.rfqsService.createRfq(payload);

    req.subscribe({
      next: (rfq) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'RFQ guardada correctamente',
        });
        setTimeout(() => this.router.navigate(['/logistics/quotes/view', rfq._id]), 1000);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'Error al guardar',
        });
      },
    });
  }

  goBack() {
    this.router.navigate(['/logistics/quotes']);
  }
}
