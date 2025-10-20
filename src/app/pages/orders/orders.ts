import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { UploadService } from '../../shared/services/upload.service';
import { ClientsApiService, ClientOption } from '../../shared/services/clients-api.service';
import { SelectModule } from 'primeng/select';

interface OrderItem { _id?: string; clientId: string; clientName: string; number: string; type: 'purchase' | 'service'; documents?: string[]; }

@Component({
    selector: 'app-orders',
    standalone: true,
    imports: [CommonModule, HttpClientModule, FormsModule, InputTextModule, ButtonModule, TableModule, DialogModule, SelectModule],
    templateUrl: './orders.html',
    styleUrls: ['./orders.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersPage {
    private readonly http = inject(HttpClient);
    private readonly upload = inject(UploadService);
    private readonly clientsApi = inject(ClientsApiService);
    private readonly baseUrl = environment.apiUrl;

    items = signal<OrderItem[]>([]);
    clients = signal<ClientOption[]>([]);
    query = signal<string>('');
    showDialog = signal<boolean>(false);
    editing = signal<OrderItem | null>(null);

    ngOnInit() { this.load(); this.clientsApi.list().subscribe(v => this.clients.set(v)); }
    load() {
        const q = this.query();
        const url = q ? `${this.baseUrl}/orders?q=${encodeURIComponent(q)}` : `${this.baseUrl}/orders`;
        this.http.get<OrderItem[]>(url).subscribe(v => this.items.set(v));
    }
    setQuery(v: string) { this.query.set(v); this.load(); }
    newItem() { this.editing.set({ clientId: '', clientName: '', number: '', type: 'purchase' }); this.showDialog.set(true); }
    editItem(item: OrderItem) { this.editing.set({ ...item }); this.showDialog.set(true); }
    closeDialog() { this.showDialog.set(false); this.editing.set(null); }
    onEditChange<K extends keyof OrderItem>(key: K, value: OrderItem[K]) {
        const cur = this.editing(); if (!cur) return;
        this.editing.set({ ...cur, [key]: value });
    }
    save() {
        const item = this.editing(); if (!item) return;
        const req = item._id ? this.http.patch<OrderItem>(`${this.baseUrl}/orders/${item._id}`, item) : this.http.post<OrderItem>(`${this.baseUrl}/orders`, item);
        req.subscribe(() => { this.closeDialog(); this.load(); });
    }
    remove(item: OrderItem) { this.http.delete(`${this.baseUrl}/orders/${item._id}`).subscribe(() => this.load()); }
    onFileChange(ev: Event, item: OrderItem) {
        const input = ev.target as HTMLInputElement;
        const file = input.files && input.files[0];
        if (!file) return;
        this.upload.upload('orders', item._id!, file).subscribe(() => this.load());
        input.value = '';
    }
}


