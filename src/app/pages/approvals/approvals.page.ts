import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersApiService } from '../../shared/services/users-api.service';
import { ApprovalsApiService, ApprovalPermission } from '../../shared/services/approvals-api.service';
import { TenantService } from '../../core/services/tenant.service';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { SkeletonModule } from 'primeng/skeleton';

interface UserApprovalRow {
    userId: string;
    userName: string;
    email: string;
    roles: string[];
    purchase_order: boolean;
    delivery_confirmation: boolean;
    purchase_invoice: boolean;
}

@Component({
    selector: 'app-approvals',
    standalone: true,
    imports: [CommonModule, TableModule, ButtonModule, ToastModule, CheckboxModule, FormsModule, SkeletonModule],
    templateUrl: './approvals.page.html',
})
export class ApprovalsPage implements OnInit {
    private readonly usersApi = inject(UsersApiService);
    private readonly approvalsApi = inject(ApprovalsApiService);
    private readonly tenantService = inject(TenantService);
    private readonly messageService = inject(MessageService);

    dummyRows = Array.from({ length: 5 });
    loading = signal(false);
    usersData = signal<UserApprovalRow[]>([]);
    readonly hasTenant = computed(() => !!this.tenantService.tenantId());

    ngOnInit(): void {
        if (this.hasTenant()) {
            this.loadData();
        }
    }

    loadData(): void {
        this.loading.set(true);

        // Call users and permissions simultaneously
        Promise.all([
            this.usersApi.listAll(this.tenantService.tenantId() ?? undefined).toPromise(),
            this.approvalsApi.getPermissions().toPromise()
        ]).then(([users, permissions]) => {
            const permsDict: Record<string, string[]> = {};
            (permissions || []).forEach((p: any) => {
                permsDict[p.userId] = p.permissions;
            });

            const rows: UserApprovalRow[] = (users || []).map((u: any) => {
                const userPerms = permsDict[u._id] || [];
                return {
                    userId: u._id,
                    userName: u.name || '',
                    email: u.email || '',
                    roles: u.role ? [u.role] : [],
                    purchase_order: userPerms.includes('purchase_order'),
                    delivery_confirmation: userPerms.includes('delivery_confirmation'),
                    purchase_invoice: userPerms.includes('purchase_invoice')
                };
            });
            this.usersData.set(rows);
        }).catch(err => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la información de aprobaciones.' });
        }).finally(() => {
            this.loading.set(false);
        });
    }

    savePermissions(row: UserApprovalRow): void {
        const permissions: string[] = [];
        if (row.purchase_order) permissions.push('purchase_order');
        if (row.delivery_confirmation) permissions.push('delivery_confirmation');
        if (row.purchase_invoice) permissions.push('purchase_invoice');

        this.approvalsApi.setPermissions({
            userId: row.userId,
            userName: row.userName,
            permissions
        }).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Permisos actualizados para ' + row.userName });
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error al guardar los permisos de ' + row.userName });
            }
        });
    }
}
