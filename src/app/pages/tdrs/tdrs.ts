import { ChangeDetectionStrategy, Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { UploadService } from '../../shared/services/upload.service';
import { ClientsApiService, ClientOption } from '../../shared/services/clients-api.service';
import { SelectModule } from 'primeng/select';

interface TdrItem {
  _id?: string;
  clientId: string;
  type: 'client' | 'tecmeing';
  summary?: string;
  approved?: boolean;
  documents?: string[];
}

@Component({
  selector: 'app-tdrs',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    SelectButtonModule,
    SelectModule,
  ],
  templateUrl: './tdrs.html',
  styleUrls: ['./tdrs.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TdrsPage {
  private readonly http = inject(HttpClient);
  private readonly upload = inject(UploadService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly baseUrl = environment.apiUrl;

  items = signal<TdrItem[]>([]);
  query = signal<string>('');
  showDialog = signal<boolean>(false);
  editing = signal<TdrItem | null>(null);
  clients = signal<ClientOption[]>([]);
  tdrTypeOptions = [
    { label: 'Cliente', value: 'client' },
    { label: 'Tecmeing', value: 'tecmeing' },
  ];

  ngOnInit() {
    this.load();
    this.clientsApi.list().subscribe((v) => this.clients.set(v));
  }

  constructor() {
    // Efecto para manejar el cierre del diálogo
    effect(() => {
      if (!this.showDialog()) {
        this.editing.set(null);
      }
    });
  }
  load() {
    const q = this.query();
    const url = q ? `${this.baseUrl}/tdrs?q=${encodeURIComponent(q)}` : `${this.baseUrl}/tdrs`;
    this.http.get<TdrItem[]>(url).subscribe((v) => this.items.set(v));
  }
  setQuery(v: string) {
    this.query.set(v);
    this.load();
  }
  newItem() {
    this.editing.set({ clientId: '', type: 'client' });
    this.showDialog.set(true);
  }
  editItem(item: TdrItem) {
    this.editing.set({ ...item });
    this.showDialog.set(true);
  }
  closeDialog() {
    this.showDialog.set(false);
  }
  onEditChange<K extends keyof TdrItem>(key: K, value: TdrItem[K]) {
    const cur = this.editing();
    if (!cur) return;
    this.editing.set({ ...cur, [key]: value });
  }
  save() {
    const item = this.editing();
    if (!item) return;
    const req = item._id
      ? this.http.patch<TdrItem>(`${this.baseUrl}/tdrs/${item._id}`, item)
      : this.http.post<TdrItem>(`${this.baseUrl}/tdrs`, item);
    req.subscribe(() => {
      this.closeDialog();
      this.load();
    });
  }
  remove(item: TdrItem) {
    this.http.delete(`${this.baseUrl}/tdrs/${item._id}`).subscribe(() => this.load());
  }
  approve(item: TdrItem) {
    this.http.post(`${this.baseUrl}/tdrs/${item._id}/approve`, {}).subscribe(() => this.load());
  }
  onFileChange(ev: Event, item: TdrItem) {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.upload.upload('tdrs', item._id!, file).subscribe(() => this.load());
    input.value = '';
  }
}
