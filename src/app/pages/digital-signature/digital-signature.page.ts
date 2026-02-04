
import {
  Component,
  OnInit,
  inject,
  signal,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ImageModule } from 'primeng/image';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DigitalSignatureApiService } from '../../shared/services/digital-signature-api.service';
import { TenantService } from '../../core/services/tenant.service';
import { DigitalSignature } from '../../shared/interfaces/digital-signature.interface';

@Component({
  selector: 'app-digital-signature',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    CardModule,
    DialogModule,
    ImageModule,
    ToastModule,
    TooltipModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './digital-signature.html',
  styleUrls: ['./digital-signature.scss'],
})
export class DigitalSignaturePage implements OnInit, AfterViewInit {
  private readonly signatureApi = inject(DigitalSignatureApiService);
  private readonly tenantService = inject(TenantService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  @ViewChild('signatureCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  signature = signal<DigitalSignature | null>(null);
  loading = signal<boolean>(false);
  uploading = signal<boolean>(false);
  visibleDialog = signal<boolean>(false);

  // Lógica de Canvas
  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;

  ngOnInit(): void {
    this.loadSignature();
  }

  ngAfterViewInit(): void {
    // El canvas se inicializa cuando se abre el diálogo
  }

  loadSignature(): void {
    const companyId = this.tenantService.tenantId();
    if (!companyId) return;

    this.loading.set(true);
    this.signatureApi.getSignature(companyId).subscribe({
      next: (data) => {
        this.signature.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        if (err.status !== 404) {
          console.error('Error loading signature', err);
        }
        this.signature.set(null);
        this.loading.set(false);
      },
    });
  }

  showDialog(): void {
    this.visibleDialog.set(true);
    this.initCanvas();
  }

  // Inicializar canvas cuando se hace visible
  initCanvas(): void {
    // Pequeño timeout para permitir que el DOM se actualice y el diálogo se renderice
    setTimeout(() => {
      const canvas = this.canvasRef?.nativeElement;
      if (canvas) {
        this.ctx = canvas.getContext('2d')!;
        
        // Ajustar tamaño del canvas al contenedor
        // Es importante establecer width/height atributos, no solo estilos CSS
        const parent = canvas.parentElement;
        if (parent) {
             canvas.width = parent.clientWidth;
             canvas.height = 300; // Altura fija definida en el diseño
        }
        
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = '#000000';
        
        this.clearCanvas();
      }
    }, 150); // Incrementado ligeramente para asegurar renderizado del p-dialog
  }

  // --- Lógica de Dibujo ---

  startDrawing(event: MouseEvent | TouchEvent): void {
    this.isDrawing = true;
    const { x, y } = this.getCoordinates(event);
    this.lastX = x;
    this.lastY = y;
  }

  draw(event: MouseEvent | TouchEvent): void {
    if (!this.isDrawing) return;
    event.preventDefault(); // Prevenir scroll en móviles

    const { x, y } = this.getCoordinates(event);

    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();

    this.lastX = x;
    this.lastY = y;
  }

  stopDrawing(): void {
    this.isDrawing = false;
  }

  clearCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas && this.ctx) {
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  getCoordinates(event: MouseEvent | TouchEvent): { x: number; y: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  // --- Lógica de Guardado ---

  saveDrawing(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    // Verificar si está vacío (opcional)
    // Se asume que si el usuario da guardar, quiere guardar lo que ve.
    // Podríamos verificar si todos los pixeles son transparentes, pero es costoso.

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'signature_drawing.png', { type: 'image/png' });
        this.uploadFile(file);
      }
    }, 'image/png');
  }

  uploadFile(file: File): void {
    const companyId = this.tenantService.tenantId();

    if (!file || !companyId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Información incompleta',
      });
      return;
    }

    this.uploading.set(true);
    this.signatureApi.uploadSignature(file, companyId).subscribe({
      next: (data) => {
        this.signature.set(data);
        this.uploading.set(false);
        this.visibleDialog.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Firma actualizada correctamente',
        });
      },
      error: (err) => {
        console.error('Upload error', err);
        this.uploading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo subir la firma',
        });
      },
    });
  }




  confirmDelete(event: Event): void {
    event.stopPropagation();
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: '¿Estás seguro de que deseas eliminar tu firma digital?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger p-button-text',
      rejectButtonStyleClass: 'p-button-text p-button-plain',
      accept: () => {
        this.deleteSignature();
      },
      reject: () => {
          // No action needed
      }
    });
  }

  deleteSignature(): void {
    const companyId = this.tenantService.tenantId();
    if (!companyId) return;

    this.loading.set(true);
    this.signatureApi.deleteSignature(companyId).subscribe({
      next: () => {
        this.signature.set(null);
        this.loading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Firma eliminada correctamente',
        });
      },
      error: (err) => {
        console.error('Delete error', err);
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar la firma',
        });
      },
    });
  }
}
