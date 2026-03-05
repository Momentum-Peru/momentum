import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ProductsService, Product } from '../../../shared/services/products.service';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [
    CommonModule, CardModule, TableModule, ButtonModule, InputTextModule, TagModule, TooltipModule,
    IconFieldModule, InputIconModule
  ],
  templateUrl: './products.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsPage implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly router = inject(Router);

  products = signal<Product[]>([]);
  loading = signal<boolean>(false);
  globalFilter = signal<string>('');

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.loading.set(true);
    this.productsService.getProducts().subscribe({
      next: (data) => {
        this.products.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  newItem() {
    this.router.navigate(['/logistics/products/new']);
  }

  editItem(item: Product) {
    this.router.navigate(['/logistics/products/edit', item._id]);
  }

  onGlobalFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.globalFilter.set(value);
  }

  getTypeSeverity(type: string): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    return type === 'bien' ? 'info' : 'success';
  }
}
