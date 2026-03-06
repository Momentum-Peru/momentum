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
import { RfqsService, Rfq } from '../../../shared/services/rfqs.service';
import { ProvidersService, Provider } from '../../../shared/services/providers.service';

/**
 * Vista "Solicitar cotización a proveedor".
 * Lista las solicitudes de cotización (RFQ) en estado Borrador — aquellas que
 * el equipo de logística creó en "Solicitudes de cotización" pero aún no han
 * sido enviadas a ningún proveedor.
 * Desde aquí se seleccionan proveedores y se abre el cliente de correo con el
 * detalle de la solicitud; al enviar, el RFQ pasa a estado "Publicada".
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
  private readonly rfqsService = inject(RfqsService);
  private readonly providersService = inject(ProvidersService);
  readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  rfqs = signal<Rfq[]>([]);
  providers = signal<Provider[]>([]);
  loading = signal<boolean>(true);

  /** Diálogo "Enviar a proveedor" */
  dialogVisible = signal<boolean>(false);
  selectedRfq = signal<Rfq | null>(null);
  selectedProviderList: Provider[] = [];
  sending = signal<boolean>(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.rfqsService.getRfqs().subscribe({
      next: (list) => {
        // Mostramos Aprobadas (listas para enviar) y Publicadas (ya enviadas, pueden reenviarse)
        this.rfqs.set(list.filter((r) => r.status === 'Aprobada' || r.status === 'Publicada'));
      },
      error: (err) => {
        this.rfqs.set([]);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message || 'Error al cargar solicitudes de cotización.',
        });
      },
      complete: () => this.loading.set(false),
    });

    this.providersService.getProviders({ isActive: true }).subscribe({
      next: (list) => this.providers.set(list),
      error: () => this.providers.set([]),
    });
  }

  openSendDialog(rfq: Rfq): void {
    this.selectedRfq.set(rfq);
    this.selectedProviderList = [];
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.selectedRfq.set(null);
    this.selectedProviderList = [];
  }

  viewRfq(rfq: Rfq): void {
    this.router.navigate(['/logistics/quotes/view', rfq._id]);
  }

  private buildEmailBody(rfq: Rfq): string {
    const items =
      rfq.items
        ?.map((it, i) => {
          const name = typeof it.productId === 'object' ? (it.productId as any).name : 'Ítem';
          return `${i + 1}. ${name} — Cantidad: ${it.quantity}${it.notes ? ` (${it.notes})` : ''}`;
        })
        .join('\n') ?? '';

    return (
      `Solicitud de cotización: ${rfq.title}\n\n` +
      (rfq.description ? `${rfq.description}\n\n` : '') +
      'Ítems solicitados:\n' +
      items +
      (rfq.deadline
        ? `\n\nFecha límite: ${new Date(rfq.deadline).toLocaleDateString('es-PE')}`
        : '') +
      (rfq.termsAndConditions ? `\n\nTérminos y condiciones:\n${rfq.termsAndConditions}` : '') +
      '\n\nPor favor, envíe su cotización respondiendo este correo o ingresando al sistema Momentum.'
    );
  }

  sendToProviders(): void {
    const rfq = this.selectedRfq();
    const providers = this.selectedProviderList;

    if (!rfq || providers.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Seleccione proveedores',
        detail: 'Elija al menos un proveedor para enviar la solicitud.',
      });
      return;
    }

    this.sending.set(true);
    const body = encodeURIComponent(this.buildEmailBody(rfq));
    const subject = encodeURIComponent(`Solicitud de cotización: ${rfq.code} — ${rfq.title}`);

    const emails: string[] = [];
    providers.forEach((p) => {
      const contact = p.contacts?.find((c) => c.email);
      if (contact?.email) emails.push(contact.email);
    });

    if (emails.length > 0) {
      window.location.href = `mailto:${emails.join(',')}?subject=${subject}&body=${body}`;
      this.messageService.add({
        severity: 'success',
        summary: 'Correo preparado',
        detail: `Cliente de correo abierto con ${emails.length} destinatario(s).`,
      });
    } else {
      this.messageService.add({
        severity: 'info',
        summary: 'Sin correo de contacto',
        detail:
          'Los proveedores seleccionados no tienen email registrado. Agréguelo en la ficha del proveedor.',
      });
    }

    // Publicar el RFQ: Aprobada → Publicada (queda en la lista con el nuevo estado)
    if (rfq._id && rfq.status === 'Aprobada') {
      this.rfqsService.publishRfq(rfq._id).subscribe({
        next: (updated) => {
          this.rfqs.update((list) => list.map((r) => (r._id === updated._id ? updated : r)));
        },
      });
    }

    this.sending.set(false);
    this.closeDialog();
  }

  getStatusSeverity(status: string): 'secondary' | 'info' | 'success' | 'danger' | 'warn' {
    if (status === 'Borrador') return 'secondary';
    if (status === 'Publicada') return 'info';
    if (status === 'Cerrada') return 'success';
    if (status === 'Cancelada') return 'danger';
    return 'secondary';
  }
}
