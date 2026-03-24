import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { ERP_BRAND_LOGO_SRC, ERP_TOAST_KEY } from '../../../core/constants/erp-notify.constants';

@Component({
  selector: 'app-erp-toast-host',
  standalone: true,
  imports: [CommonModule, ToastModule],
  templateUrl: './erp-toast-host.component.html',
  styleUrl: './erp-toast-host.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErpToastHostComponent {
  readonly toastKey = ERP_TOAST_KEY;
  readonly logoSrc = ERP_BRAND_LOGO_SRC;
  readonly defaultLife = 4800;

  accentClass(severity: string | undefined): string {
    switch (severity) {
      case 'success':
        return 'border-l-[3px] border-l-emerald-500 pl-2 -ml-0.5';
      case 'error':
        return 'border-l-[3px] border-l-red-500 pl-2 -ml-0.5';
      case 'warn':
        return 'border-l-[3px] border-l-amber-500 pl-2 -ml-0.5';
      case 'info':
        return 'border-l-[3px] border-l-sky-600 pl-2 -ml-0.5';
      case 'secondary':
        return 'border-l-[3px] border-l-slate-400 pl-2 -ml-0.5';
      default:
        return 'border-l-[3px] border-l-slate-400 pl-2 -ml-0.5';
    }
  }
}
