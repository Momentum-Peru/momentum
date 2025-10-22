import { Component, OnInit, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { DailyExpensesApiService } from '../../shared/services/daily-reports-api.service';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { ExpenseCategoriesApiService } from '../../shared/services/categories-api.service';
import { AuthService } from '../login/services/auth.service';
import {
    DailyExpense,
    Purchase,
    Observation,
} from '../../shared/interfaces/daily-report.interface';
import { ProjectOption } from '../../shared/interfaces/project.interface';
import { CategoryOption } from '../../shared/interfaces/category.interface';

@Component({
    selector: 'app-daily-expenses',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        InputTextModule,
        ButtonModule,
        TableModule,
        DialogModule,
        SelectModule,
        DatePickerModule,
        TextareaModule,
        TooltipModule,
    ],
    templateUrl: './daily-reports.html',
    styleUrl: './daily-reports.scss',
})
export class DailyExpensesPage implements OnInit {
    private readonly dailyExpensesApi = inject(DailyExpensesApiService);
    private readonly projectsApi = inject(ProjectsApiService);
    private readonly categoriesApi = inject(ExpenseCategoriesApiService);
    private readonly authService = inject(AuthService);

    items = signal<DailyExpense[]>([]);
    projects = signal<ProjectOption[]>([]);
    categories = signal<CategoryOption[]>([]);
    query = signal('');
    showDialog = signal(false);
    editing = signal<DailyExpense | null>(null);
    selectedPurchases = signal<Purchase[]>([]);

    statusOptions = [
        { label: 'Borrador', value: 'DRAFT' },
        { label: 'Enviado', value: 'SUBMITTED' },
        { label: 'Aprobado', value: 'APPROVED' },
        { label: 'Rechazado', value: 'REJECTED' },
    ];

    ngOnInit() {
        this.load();
        this.loadProjects();
        this.loadCategories();
    }

    constructor() {
        // Efecto para manejar el cierre del diálogo
        effect(() => {
            if (!this.showDialog()) {
                this.editing.set(null);
                this.selectedPurchases.set([]);
            }
        });
    }

    load() {
        this.dailyExpensesApi.list().subscribe({
            next: (data) => this.items.set(data),
            error: (error) => console.error('Error loading daily reports:', error),
        });
    }

    loadProjects() {
        this.projectsApi.getOptions().subscribe({
            next: (data) => this.projects.set(data),
            error: (error) => console.error('Error loading projects:', error),
        });
    }

    loadCategories() {
        this.categoriesApi.getOptions().subscribe({
            next: (data) => this.categories.set(data),
            error: (error) => console.error('Error loading categories:', error),
        });
    }

    setQuery(event: Event) {
        const target = event.target as HTMLInputElement;
        this.query.set(target.value);
    }

    newItem() {
        const currentUser = this.authService.getCurrentUser();
        this.editing.set({
            title: '',
            date: new Date().toISOString().split('T')[0],
            observations: [],
            purchases: [],
            totalAmount: 0,
            dailySummary: '',
            userId: currentUser?.id || '',
            projectId: '',
            status: 'DRAFT',
        });
        this.selectedPurchases.set([]);
        this.showDialog.set(true);
    }

    editItem(item: DailyExpense) {
        this.editing.set({ ...item });
        this.selectedPurchases.set([...item.purchases]);
        this.showDialog.set(true);
    }

    closeDialog() {
        this.showDialog.set(false);
    }

    onEditChange(field: keyof DailyExpense, value: any) {
        const current = this.editing();
        if (current) {
            this.editing.set({ ...current, [field]: value });
        }
    }

    addPurchase() {
        const newPurchase: Purchase = {
            description: '',
            amount: 0,
            categoryId: '',
            notes: '',
            vendor: '',
            purchaseDate: new Date().toISOString(),
            documents: [],
        };
        this.selectedPurchases.set([...this.selectedPurchases(), newPurchase]);
    }

    removePurchase(index: number) {
        const purchases = this.selectedPurchases();
        purchases.splice(index, 1);
        this.selectedPurchases.set([...purchases]);
        this.updateTotalAmount();
    }

    updatePurchase(index: number, field: keyof Purchase, value: any) {
        const purchases = this.selectedPurchases();
        purchases[index] = { ...purchases[index], [field]: value };
        this.selectedPurchases.set([...purchases]);
        this.updateTotalAmount();
    }

    updateTotalAmount() {
        // El totalAmount se calcula en el backend, no se envía desde el frontend
    }

    calculateTotalAmount(): number {
        return this.dailyExpensesApi.calculateTotal(this.selectedPurchases());
    }

    save() {
        const item = this.editing();
        if (!item) return;

        const payload = {
            title: item.title.trim(),
            date: item.date,
            observations: item.observations || [],
            purchases: this.selectedPurchases().map((p) => ({
                description: p.description.trim(),
                amount: p.amount,
                categoryId: p.categoryId,
                notes: p.notes?.trim() || '',
                vendor: p.vendor?.trim() || '',
                purchaseDate: p.purchaseDate || new Date().toISOString(),
                documents: p.documents || [],
            })),
            dailySummary: item.dailySummary.trim(),
            userId: item.userId,
            projectId: item.projectId,
            status: item.status,
        };

        if (item._id) {
            this.dailyExpensesApi.update(item._id, payload).subscribe({
                next: () => {
                    this.load();
                    this.closeDialog();
                },
                error: (error) => console.error('Error updating daily report:', error),
            });
        } else {
            this.dailyExpensesApi.create(payload as DailyExpense).subscribe({
                next: () => {
                    this.load();
                    this.closeDialog();
                },
                error: (error) => console.error('Error creating daily report:', error),
            });
        }
    }

    remove(item: DailyExpense) {
        if (!item._id) return;
        if (confirm('¿Estás seguro de eliminar este reporte diario?')) {
            this.dailyExpensesApi.delete(item._id).subscribe({
                next: () => this.load(),
                error: (error) => console.error('Error deleting daily report:', error),
            });
        }
    }

    submitForApproval(item: DailyExpense) {
        if (!item._id) return;
        this.dailyExpensesApi.submit(item._id).subscribe({
            next: () => this.load(),
            error: (error) => console.error('Error submitting report:', error),
        });
    }

    approve(item: DailyExpense) {
        if (!item._id) return;
        this.dailyExpensesApi.approve(item._id, 'APPROVED').subscribe({
            next: () => this.load(),
            error: (error) => console.error('Error approving report:', error),
        });
    }

    reject(item: DailyExpense) {
        if (!item._id) return;
        const reason = prompt('Razón del rechazo:');
        if (reason) {
            this.dailyExpensesApi.approve(item._id, 'REJECTED', reason).subscribe({
                next: () => this.load(),
                error: (error) => console.error('Error rejecting report:', error),
            });
        }
    }

    getStatusLabel(status: string): string {
        const option = this.statusOptions.find((opt) => opt.value === status);
        return option?.label || status;
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'DRAFT':
                return 'bg-gray-100 text-gray-800';
            case 'SUBMITTED':
                return 'bg-blue-100 text-blue-800';
            case 'APPROVED':
                return 'bg-green-100 text-green-800';
            case 'REJECTED':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }

    getProjectName(projectId: string): string {
        const project = this.projects().find((p) => p.value === projectId);
        return project?.label || 'Proyecto no encontrado';
    }

    getCategoryName(categoryId: string): string {
        const category = this.categories().find((c) => c.value === categoryId);
        return category?.label || 'Categoría no encontrada';
    }

    // Métodos para manejar observaciones
    addObservation(): void {
        const editing = this.editing();
        if (!editing) return;

        const newObservation: Observation = {
            description: '',
            notes: '',
            observationDate: new Date().toISOString(),
            observationTime: '',
            documents: [],
        };

        editing.observations = [...editing.observations, newObservation];
        this.editing.set({ ...editing });
    }

    removeObservation(index: number): void {
        const editing = this.editing();
        if (!editing) return;

        editing.observations.splice(index, 1);
        this.editing.set({ ...editing });
    }

    // Métodos para manejar documentos de observaciones
    onObservationFileSelect(event: Event, observationIndex: number): void {
        const target = event.target as HTMLInputElement;
        const files = target.files;
        if (!files || files.length === 0) return;

        const editing = this.editing();
        if (!editing || !editing._id) return;

        const file = files[0];
        this.dailyExpensesApi.uploadObservationDocument(editing._id, observationIndex, file).subscribe({
            next: (response) => {
                // Actualizar la observación con el nuevo documento
                editing.observations[observationIndex].documents.push(response.url);
                this.editing.set({ ...editing });
                target.value = ''; // Limpiar el input
            },
            error: (error) => {
                console.error('Error uploading observation document:', error);
                alert('Error al subir el documento');
            },
        });
    }

    removeObservationDocument(observationIndex: number, documentUrl: string): void {
        const editing = this.editing();
        if (!editing || !editing._id) return;

        this.dailyExpensesApi
            .deleteObservationDocument(editing._id, observationIndex, documentUrl)
            .subscribe({
                next: () => {
                    editing.observations[observationIndex].documents = editing.observations[
                        observationIndex
                    ].documents.filter((url) => url !== documentUrl);
                    this.editing.set({ ...editing });
                },
                error: (error) => {
                    console.error('Error deleting observation document:', error);
                    alert('Error al eliminar el documento');
                },
            });
    }

    // Métodos para manejar documentos de compras
    onPurchaseFileSelect(event: Event, purchaseIndex: number): void {
        const target = event.target as HTMLInputElement;
        const files = target.files;
        if (!files || files.length === 0) return;

        const editing = this.editing();
        if (!editing || !editing._id) return;

        const file = files[0];
        this.dailyExpensesApi.uploadPurchaseDocument(editing._id, purchaseIndex, file).subscribe({
            next: (response) => {
                // Actualizar la compra con el nuevo documento
                editing.purchases[purchaseIndex].documents.push(response.url);
                this.editing.set({ ...editing });
                target.value = ''; // Limpiar el input
            },
            error: (error) => {
                console.error('Error uploading purchase document:', error);
                alert('Error al subir el documento');
            },
        });
    }

    removePurchaseDocument(purchaseIndex: number, documentUrl: string): void {
        const editing = this.editing();
        if (!editing || !editing._id) return;

        this.dailyExpensesApi
            .deletePurchaseDocument(editing._id, purchaseIndex, documentUrl)
            .subscribe({
                next: () => {
                    editing.purchases[purchaseIndex].documents = editing.purchases[
                        purchaseIndex
                    ].documents.filter((url) => url !== documentUrl);
                    this.editing.set({ ...editing });
                },
                error: (error) => {
                    console.error('Error deleting purchase document:', error);
                    alert('Error al eliminar el documento');
                },
            });
    }

    // Métodos auxiliares para documentos
    getFileIcon(url: string): string {
        const extension = url.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'pdf':
                return 'pi pi-file-pdf';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                return 'pi pi-image';
            case 'doc':
            case 'docx':
                return 'pi pi-file-word';
            case 'xls':
            case 'xlsx':
                return 'pi pi-file-excel';
            default:
                return 'pi pi-file';
        }
    }

    getFileTypeColor(url: string): string {
        const extension = url.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'pdf':
                return 'text-red-600';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                return 'text-green-600';
            case 'doc':
            case 'docx':
                return 'text-blue-600';
            case 'xls':
            case 'xlsx':
                return 'text-green-600';
            default:
                return 'text-gray-600';
        }
    }

    viewDocument(url: string): void {
        window.open(url, '_blank');
    }

    downloadDocument(url: string): void {
        const link = document.createElement('a');
        link.href = url;
        link.download = url.split('/').pop() || 'documento';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
