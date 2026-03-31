import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { ProductsService, Product } from '../../../../shared/services/products.service';

export const CATEGORY_LABELS: Record<string, string> = {
  informatica: 'Informática y Tecnología',
  electronica: 'Electrónica',
  papeleria: 'Papelería y Oficina',
  limpieza: 'Limpieza e Higiene',
  herramientas: 'Herramientas y Equipos',
  muebles: 'Muebles y Enseres',
  materiales_construccion: 'Materiales de Construcción',
  repuestos: 'Repuestos y Mantenimiento',
  quimicos: 'Químicos y Laboratorio',
  alimentos: 'Alimentos y Bebidas',
  ropa_epp: 'Ropa y EPP',
  electrico: 'Material Eléctrico',
  mecanico: 'Material Mecánico',
  medico: 'Material Médico',
  agricola: 'Agrícola',
  automotriz: 'Automotriz',
  packaging: 'Embalaje y Empaque',
  combustible: 'Combustible y Lubricantes',
  seguridad: 'Seguridad Industrial',
  otro: 'Otro',
};

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TooltipModule],
  templateUrl: './product-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  product = signal<Product | null>(null);
  loading = signal<boolean>(true);
  selectedImageIndex = signal<number>(0);

  readonly categoryLabels = CATEGORY_LABELS;

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) { this.goBack(); return; }
      this.productsService.getProduct(id).subscribe({
        next: (p) => {
          this.product.set(p);
          this.loading.set(false);
        },
        error: () => this.goBack(),
      });
    });
  }

  get mainImage(): string | null {
    const p = this.product();
    if (!p?.images?.length) return null;
    return p.images[this.selectedImageIndex()] ?? p.images[0];
  }

  selectImage(index: number) {
    this.selectedImageIndex.set(index);
  }

  getCategoryLabel(category?: string): string {
    if (!category) return '-';
    return this.categoryLabels[category] ?? category;
  }

  editProduct() {
    const p = this.product();
    if (p?._id) this.router.navigate(['/logistics/products/edit', p._id]);
  }

  goBack() {
    this.router.navigate(['/logistics/products']);
  }
}
