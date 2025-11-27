import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UploadService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    upload(entity: 'clients' | 'requirements' | 'tdrs' | 'quotes' | 'orders' | 'payrolls', id: string, file: File) {
        const form = new FormData();
        form.append('file', file);
        return this.http.post<string>(`${this.baseUrl}/${entity}/${id}/documents`, form);
    }
}


