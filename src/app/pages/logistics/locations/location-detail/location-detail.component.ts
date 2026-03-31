import { ChangeDetectionStrategy, Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { WarehouseLocationsService, WarehouseLocation } from '../../../../shared/services/warehouse-locations.service';
import { StockService, StockItem } from '../../../../shared/services/stock.service';
import { ProductsService, Product } from '../../../../shared/services/products.service';

@Component({
  selector: 'app-location-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CardModule, ButtonModule, InputNumberModule,
    InputTextModule, TableModule, TooltipModule, DialogModule, ToastModule,
    ConfirmDialogModule, SelectModule, TagModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './location-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly locationsService = inject(WarehouseLocationsService);
  private readonly stockService = inject(StockService);
  private readonly productsService = inject(ProductsService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  location = signal<WarehouseLocation | null>(null);
  stock = signal<StockItem[]>([]);
  allProducts = signal<Product[]>([]);
  loading = signal(true);
  loadingStock = signal(false);
  searchQuery = signal('');

  showAddDialog = signal(false);
  showEditDialog = signal(false);
  saving = signal(false);

  addForm = signal<{ productId: string | null; quantity: number; notes: string }>({
    productId: null,
    quantity: 1,
    notes: '',
  });

  editForm = signal<{ id: string; quantity: number; notes: string }>({
    id: '',
    quantity: 0,
    notes: '',
  });

  /** Stock filtered by search query */
  filteredStock = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.stock();
    return this.stock().filter((item) => {
      const p = item.productId as Product;
      return (
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    });
  });

  /** Products not yet in stock at this location */
  availableProducts = computed(() => {
    const stockProductIds = new Set(
      this.stock().map((s) => {
        const p = s.productId as Product;
        return p._id ?? s.productId;
      })
    );
    return this.allProducts().filter((p) => p._id && !stockProductIds.has(p._id));
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.locationsService.getLocation(id).subscribe({
      next: (loc) => { this.location.set(loc); this.loading.set(false); this.loadStock(id); },
      error: () => this.router.navigate(['/logistics/locations']),
    });
    this.productsService.getProducts().subscribe({
      next: (products) => this.allProducts.set(products),
    });
  }

  loadStock(locationId: string) {
    this.loadingStock.set(true);
    this.stockService.getStockByLocation(locationId).subscribe({
      next: (data) => { this.stock.set(data); this.loadingStock.set(false); },
      error: () => this.loadingStock.set(false),
    });
  }

  getProduct(item: StockItem): Product {
    return item.productId as Product;
  }

  openAddDialog() {
    this.addForm.set({ productId: null, quantity: 1, notes: '' });
    this.showAddDialog.set(true);
  }

  updateAddForm(field: keyof ReturnType<typeof this.addForm>, value: any) {
    this.addForm.set({ ...this.addForm(), [field]: value });
  }

  saveAdd() {
    const f = this.addForm();
    if (!f.productId) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Selecciona un producto' });
      return;
    }
    if (f.quantity < 0) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'La cantidad no puede ser negativa' });
      return;
    }
    const loc = this.location();
    if (!loc?._id) return;
    this.saving.set(true);
    this.stockService.addToLocation({ locationId: loc._id, productId: f.productId, quantity: f.quantity, notes: f.notes || undefined }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Agregado', detail: 'Producto agregado al stock' });
        this.saving.set(false);
        this.showAddDialog.set(false);
        this.loadStock(loc._id!);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'No se pudo agregar' });
        this.saving.set(false);
      },
    });
  }

  openEditDialog(item: StockItem) {
    this.editForm.set({ id: item._id!, quantity: item.quantity, notes: item.notes ?? '' });
    this.showEditDialog.set(true);
  }

  updateEditForm(field: keyof ReturnType<typeof this.editForm>, value: any) {
    this.editForm.set({ ...this.editForm(), [field]: value });
  }

  saveEdit() {
    const f = this.editForm();
    if (f.quantity < 0) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'La cantidad no puede ser negativa' });
      return;
    }
    const loc = this.location();
    this.saving.set(true);
    this.stockService.adjust(f.id, { quantity: f.quantity, notes: f.notes || undefined }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Actualizado' });
        this.saving.set(false);
        this.showEditDialog.set(false);
        this.loadStock(loc!._id!);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar' });
        this.saving.set(false);
      },
    });
  }

  confirmRemove(item: StockItem) {
    const p = this.getProduct(item);
    this.confirmationService.confirm({
      message: `¿Quitar "${p.name}" del stock de esta ubicación?`,
      header: 'Confirmar',
      icon: 'pi pi-trash',
      acceptLabel: 'Quitar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.stockService.remove(item._id!).subscribe({
          next: () => { this.messageService.add({ severity: 'success', summary: 'Eliminado' }); this.loadStock(this.location()!._id!); },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' }),
        });
      },
    });
  }

  goBack() {
    this.router.navigate(['/logistics/locations']);
  }
}
