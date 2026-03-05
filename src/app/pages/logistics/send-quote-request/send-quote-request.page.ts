import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { ListboxModule } from 'primeng/listbox';
import { PurchasesRequirementsApiService } from '../../../shared/services/purchases-requirements-api.service';
import { PurchasesQuotesApiService } from '../../../shared/services/purchases-quotes-api.service';
import { ProvidersService, Provider } from '../../../shared/services/providers.service';
import { TenantService } from '../../../core/services/tenant.service';
import { PurchaseRequirement } from '../../../shared/interfaces/purchase.interface';

/**
 * Vista para enviar la solicitud de cotización a uno o más proveedores.
 * Lista requerimientos que pueden ser enviados; al hacer clic en "Enviar a proveedor"
 * se abre un diálogo para elegir proveedores y enviar (por ahora abre el cliente de correo).
 */
@Component({
  selector: 'app-send-quote-request-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    CardModule,
    DialogModule,
    ListboxModule,
  ],
  providers: [MessageService],
  templateUrl: './send-quote-request.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendQuoteRequestPage implements OnInit {
  private readonly requirementsApi = inject(PurchasesRequirementsApiService);
  private readonly quotesApi = inject(PurchasesQuotesApiService);
  private readonly providersService = inject(ProvidersService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly tenantService = inject(TenantService);

  requirements = signal<PurchaseRequirement[]>([]);
  quotesCountByRequirement = signal<Record<string, number>>({});
  providers = signal<Provider[]>([]);
  loading = signal<boolean>(true);

  /** Diálogo "Enviar a proveedor" */
  dialogVisible = signal<boolean>(false);
  selectedRequirement = signal<PurchaseRequirement | null>(null);
  /** Selección en el listbox (para ngModel) */
  selectedProviderList: Provider[] = [];
  sending = signal<boolean>(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!this.tenantService.tenantId()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Empresa no seleccionada',
        detail: 'Seleccione una empresa para ver los requerimientos.',
      });
      this.requirements.set([]);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.requirementsApi.list({ sortBy: 'createdAt', sortOrder: 'desc' }).subscribe({
      next: (list) => {
        const canSend = list.filter(
          (r) => r.status === 'borrador' || r.status === 'cotizaciones_pendientes',
        );
        this.requirements.set(canSend);
        this.loadQuotesCounts(canSend.map((r) => r._id));
      },
      error: (err) => {
        this.requirements.set([]);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message || err?.message || 'Error al cargar requerimientos.',
        });
      },
      complete: () => this.loading.set(false),
    });

    this.providersService.getProviders({ isActive: true }).subscribe({
      next: (list) => this.providers.set(list),
      error: () => this.providers.set([]),
    });
  }

  private loadQuotesCounts(ids: string[]): void {
    const counts: Record<string, number> = {};
    if (ids.length === 0) {
      this.quotesCountByRequirement.set(counts);
      return;
    }
    let done = 0;
    ids.forEach((id) => {
      this.quotesApi.listByRequirement(id).subscribe({
        next: (quotes) => {
          counts[id] = quotes?.length ?? 0;
          done++;
          if (done === ids.length) this.quotesCountByRequirement.set(counts);
        },
        error: () => {
          counts[id] = 0;
          done++;
          if (done === ids.length) this.quotesCountByRequirement.set(counts);
        },
      });
    });
  }

  getQuotesCount(id: string): number {
    return this.quotesCountByRequirement()[id] ?? 0;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      borrador: 'Borrador',
      cotizaciones_pendientes: 'Cotizaciones pendientes',
      listo_para_comparar: 'Listo para comparar',
      adjudicado: 'Adjudicado',
      cerrado: 'Cerrado',
    };
    return labels[status] ?? status;
  }

  statusSeverity(status: string): 'success' | 'info' | 'warn' | 'secondary' {
    if (status === 'borrador') return 'secondary';
    if (status === 'cotizaciones_pendientes') return 'warn';
    return 'info';
  }

  openSendDialog(req: PurchaseRequirement): void {
    this.selectedRequirement.set(req);
    this.selectedProviderList = [];
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.selectedRequirement.set(null);
    this.selectedProviderList = [];
  }

  /** Construye el cuerpo del correo con el detalle del requerimiento. */
  private buildEmailBody(req: PurchaseRequirement): string {
    const items =
      req.items
        ?.map((it, i) => `${i + 1}. ${it.description} - Cantidad: ${it.quantity} ${it.unit}`)
        .join('\n') ?? '';
    return (
      `Solicitud de cotización: ${req.title}\n\n` +
      (req.description ? `${req.description}\n\n` : '') +
      'Ítems solicitados:\n' +
      items +
      '\n\nPor favor envíe su cotización a este correo o ingrese a la plataforma Momentum.'
    );
  }

  sendToProviders(): void {
    const req = this.selectedRequirement();
    const providers = this.selectedProviderList;
    if (!req || providers.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Seleccione proveedores',
        detail: 'Elija al menos un proveedor para enviar la solicitud.',
      });
      return;
    }

    this.sending.set(true);
    const body = encodeURIComponent(this.buildEmailBody(req));
    const subject = encodeURIComponent(`Solicitud de cotización: ${req.title}`);

    const emails: string[] = [];
    providers.forEach((p) => {
      const contact = p.contacts?.find((c) => c.email);
      if (contact?.email) emails.push(contact.email);
    });

    if (emails.length > 0) {
      const mailto = `mailto:${emails.join(',')}?subject=${subject}&body=${body}`;
      window.location.href = mailto;
      this.messageService.add({
        severity: 'success',
        summary: 'Correo preparado',
        detail: `Se abrió su cliente de correo con ${emails.length} destinatario(s). Si algún proveedor no tiene email asignado, agregue el destinatario manualmente.`,
      });
    } else {
      this.messageService.add({
        severity: 'info',
        summary: 'Sin correo de contacto',
        detail:
          'Los proveedores seleccionados no tienen email en su ficha. Puede copiar el detalle y enviar por otro medio, o agregar el contacto en Proveedores.',
      });
    }

    this.sending.set(false);
    this.closeDialog();
  }

  goToRequirementDetail(id: string): void {
    this.router.navigate(['/purchases/requirements', id]);
  }
}
