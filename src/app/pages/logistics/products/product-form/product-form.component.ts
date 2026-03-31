import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProductsService, Product } from '../../../../shared/services/products.service';
import { PresignedUploadService } from '../../../../shared/services/presigned-upload.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    SelectModule,
    CheckboxModule,
    InputNumberModule,
    CardModule,
    ToastModule,
  ],
  templateUrl: './product-form.component.html',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormComponent implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly presignedUploadService = inject(PresignedUploadService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  returnTo = signal<string | null>(null);
  isEditMode = signal<boolean>(false);
  uploadingImages = signal<boolean>(false);

  editing = signal<Product>({
    name: '',
    unitOfMeasure: 'unidad',
    isActive: true,
    images: [],
  });

  categoryOptions = [
    { label: 'Informática y Tecnología', value: 'informatica' },
    { label: 'Electrónica', value: 'electronica' },
    { label: 'Papelería y Oficina', value: 'papeleria' },
    { label: 'Limpieza e Higiene', value: 'limpieza' },
    { label: 'Herramientas y Equipos', value: 'herramientas' },
    { label: 'Muebles y Enseres', value: 'muebles' },
    { label: 'Materiales de Construcción', value: 'materiales_construccion' },
    { label: 'Repuestos y Mantenimiento', value: 'repuestos' },
    { label: 'Químicos y Laboratorio', value: 'quimicos' },
    { label: 'Alimentos y Bebidas', value: 'alimentos' },
    { label: 'Ropa y EPP', value: 'ropa_epp' },
    { label: 'Material Eléctrico', value: 'electrico' },
    { label: 'Material Mecánico', value: 'mecanico' },
    { label: 'Material Médico', value: 'medico' },
    { label: 'Agrícola', value: 'agricola' },
    { label: 'Automotriz', value: 'automotriz' },
    { label: 'Embalaje y Empaque', value: 'packaging' },
    { label: 'Combustible y Lubricantes', value: 'combustible' },
    { label: 'Seguridad Industrial', value: 'seguridad' },
    { label: 'Otro', value: 'otro' },
  ];

  unitOptions = [
    { label: 'Unidad', value: 'unidad' },
    { label: 'Ciento', value: 'ciento' },
    { label: 'Docena', value: 'docena' },
    { label: 'Litros', value: 'litros' },
    { label: 'Galones', value: 'galones' },
    { label: 'mm', value: 'mm' },
    { label: 'ml', value: 'ml' },
    { label: 'Kg', value: 'kg' },
    { label: 'Global', value: 'global' },
  ];

  ngOnInit() {
    this.route.queryParamMap.subscribe((q) => {
      const returnTo = q.get('returnTo');
      if (returnTo) this.returnTo.set(returnTo);
    });
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.isEditMode.set(true);
        this.productsService.getProduct(id).subscribe({
          next: (product) => {
            this.editing.set({ ...product, images: product.images ?? [] });
          },
          error: () => this.goBack(),
        });
      }
    });
  }

  onEditChange<K extends keyof Product>(key: K, value: Product[K]) {
    this.editing.set({ ...this.editing(), [key]: value });
  }

  /** Redimensiona y recorta la imagen a un cuadrado de `size`×`size` px en JPEG. */
  private resizeImage(file: File, size = 800): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        // Center-crop cuadrado (igual que object-cover)
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('No se pudo procesar la imagen')); return; }
            const name = file.name.replace(/\.[^.]+$/, '.jpg');
            resolve(new File([blob], name, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Error al cargar imagen')); };
      img.src = objectUrl;
    });
  }

  async addImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    this.uploadingImages.set(true);
    try {
      const originals = Array.from(files);
      const resized = await Promise.all(originals.map((f) => this.resizeImage(f)));
      const results = await this.presignedUploadService.uploadMultipleFiles(resized, { prefix: 'products' });
      const newUrls = results.map((r) => r.publicUrl);
      const current = this.editing();
      this.editing.set({ ...current, images: [...(current.images ?? []), ...newUrls] });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron subir las imágenes. Intenta nuevamente.',
      });
    } finally {
      this.uploadingImages.set(false);
    }
  }

  removeImage(index: number) {
    const current = this.editing();
    const images = [...(current.images ?? [])];
    images.splice(index, 1);
    this.editing.set({ ...current, images });
  }

  save() {
    const item = this.editing();

    if (!item.name || item.name.trim() === '') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El nombre del producto es obligatorio',
      });
      return;
    }

    const payload = {
      name: item.name,
      unitOfMeasure: item.unitOfMeasure,
      category: item.category,
      description: item.description,
      basePrice: item.basePrice,
      images: item.images ?? [],
      isActive: item.isActive,
    };

    const req = item._id
      ? this.productsService.updateProduct(item._id, payload)
      : this.productsService.createProduct(payload);

    req.subscribe({
      next: (saved) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: item._id ? 'Producto actualizado' : 'Producto creado',
        });
        const returnUrl = this.returnTo();
        if (returnUrl && !item._id && saved?._id) {
          this.router.navigateByUrl(returnUrl, {
            state: { newProductId: saved._id },
          });
        } else {
          setTimeout(() => this.goBack(), 1000);
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al guardar. ' + (error.error?.message || ''),
        });
      },
    });
  }

  goBack() {
    const returnUrl = this.returnTo();
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
    } else {
      this.router.navigate(['/logistics/products']);
    }
  }
}
