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

interface QuoteItem { description: string; qty: number; price: number; }
interface Quote { _id?: string; clientId: string; clientName: string; number?: string; items: QuoteItem[]; total?: number; status?: string; documents?: string[]; }

@Component({
    selector: 'app-quotes',
    standalone: true,
    imports: [CommonModule, HttpClientModule, FormsModule, InputTextModule, ButtonModule, TableModule, DialogModule, SelectModule],
    templateUrl: './quotes.html',
    styleUrls: ['./quotes.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotesPage {
    private readonly http = inject(HttpClient);
    private readonly upload = inject(UploadService);
    private readonly clientsApi = inject(ClientsApiService);
    private readonly baseUrl = environment.apiUrl;

    items = signal<Quote[]>([]);
    clients = signal<ClientOption[]>([]);
    query = signal<string>('');
    showDialog = signal<boolean>(false);
    editing = signal<Quote | null>(null);

    ngOnInit() { this.load(); this.clientsApi.list().subscribe(v => this.clients.set(v)); }
    load() {
        const q = this.query();
        const url = q ? `${this.baseUrl}/quotes?q=${encodeURIComponent(q)}` : `${this.baseUrl}/quotes`;
        this.http.get<Quote[]>(url).subscribe(v => this.items.set(v));
    }
    setQuery(v: string) { this.query.set(v); this.load(); }
    newItem() { this.editing.set({ clientId: '', clientName: '', items: [] }); this.showDialog.set(true); }
    editItem(item: Quote) { this.editing.set({ ...item }); this.showDialog.set(true); }
    closeDialog() { this.showDialog.set(false); this.editing.set(null); }
    onEditChange<K extends keyof Quote>(key: K, value: Quote[K]) {
        const cur = this.editing(); if (!cur) return;
        this.editing.set({ ...cur, [key]: value });
    }
    addItem() {
        const s = this.editing(); if (!s) return;
        s.items = [...(s.items || []), { description: '', qty: 1, price: 0 }];
        this.editing.set({ ...s });
    }
    save() {
        const item = this.editing(); if (!item) return;
        const req = item._id ? this.http.patch<Quote>(`${this.baseUrl}/quotes/${item._id}`, item) : this.http.post<Quote>(`${this.baseUrl}/quotes`, item);
        req.subscribe(() => { this.closeDialog(); this.load(); });
    }
    remove(item: Quote) { this.http.delete(`${this.baseUrl}/quotes/${item._id}`).subscribe(() => this.load()); }
    onFileChange(ev: Event, item: Quote) {
        const input = ev.target as HTMLInputElement;
        const file = input.files && input.files[0];
        if (!file) return;
        this.upload.upload('quotes', item._id!, file).subscribe(() => this.load());
        input.value = '';
    }
    setStatus(item: Quote, status: string) { this.http.post(`${this.baseUrl}/quotes/${item._id}/status/${status}`, {}).subscribe(() => this.load()); }
    openPdf(item: Quote) { window.open(`${this.baseUrl}/quotes/${item._id}/pdf`, '_blank'); }
}


