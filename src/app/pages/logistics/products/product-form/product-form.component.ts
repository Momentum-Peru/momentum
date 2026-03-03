import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProductsService, Product } from '../../../../shared/services/products.service';

@Component({
    selector: 'app-product-form',
    standalone: true,
    imports: [
        CommonModule, FormsModule, ReactiveFormsModule, InputTextModule, ButtonModule,
        SelectModule, CheckboxModule, InputNumberModule, CardModule, ToastModule
    ],
    templateUrl: './product-form.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormComponent implements OnInit {
    private readonly productsService = inject(ProductsService);
    private readonly messageService = inject(MessageService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    editing = signal<Product>({
        name: '',
        type: 'bien',
        isActive: true,
    });

    isEditMode = signal<boolean>(false);

    productTypes = [
        { label: 'Bien', value: 'bien' },
        { label: 'Servicio', value: 'servicio' }
    ];

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.isEditMode.set(true);
                this.productsService.getProduct(id).subscribe({
                    next: (product) => {
                        this.editing.set(product);
                    },
                    error: () => this.goBack()
                });
            }
        });
    }

    onEditChange<K extends keyof Product>(key: K, value: Product[K]) {
        const cur = this.editing();
        if (!cur) return;
        this.editing.set({ ...cur, [key]: value });
    }

    save() {
        const item = this.editing();
        if (!item) return;

        if (!item.name || item.name.trim() === '') {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'El nombre es obligatorio' });
            return;
        }

        const payload: Omit<Product, '_id' | 'createdAt' | 'updatedAt'> = {
            name: item.name,
            type: item.type,
            category: item.category,
            description: item.description,
            basePrice: item.basePrice,
            isActive: item.isActive,
        };

        const req = item._id
            ? this.productsService.updateProduct(item._id, payload)
            : this.productsService.createProduct(payload);

        req.subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success', summary: 'Éxito',
                    detail: item._id ? 'Item actualizado' : 'Item creado',
                });
                setTimeout(() => this.goBack(), 1000);
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error', summary: 'Error',
                    detail: 'Error al guardar. ' + (error.error?.message || ''),
                });
            }
        });
    }

    goBack() {
        this.router.navigate(['/logistics/products']);
    }
}
