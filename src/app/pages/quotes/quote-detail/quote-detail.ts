import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { QuotesApiService } from '../../../shared/services/quotes-api.service';
import { ClientsApiService } from '../../../shared/services/clients-api.service';
import { ProjectsApiService } from '../../../shared/services/projects-api.service';
import { QuotePdfService } from '../../../shared/services/quote-pdf.service';
import { Quote, QuoteState } from '../../../shared/interfaces/quote.interface';
import { MessageService } from 'primeng/api';

// PrimeNG
import { ToastModule } from 'primeng/toast';

import * as ExcelJS from 'exceljs';

@Component({
  selector: 'app-quote-detail',
  standalone: true,
  imports: [CommonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './quote-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuoteDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly quotesApi = inject(QuotesApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly quotePdfService = inject(QuotePdfService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  quote = signal<Quote | null>(null);
  clientName = signal<string>('Cargando...');
  projectName = signal<string>('Cargando...');
  loading = signal<boolean>(true);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
       const id = params.get('id');
       if (id) {
          this.loadQuote(id);
       }
    });
  }

  loadQuote(id: string) {
     this.loading.set(true);
     this.quotesApi.getById(id).subscribe({
        next: (res) => {
           this.quote.set(res);
           
           if (typeof res.clientId === 'object' && res.clientId !== null) {
              this.clientName.set((res.clientId as any).name);
           } else {
              this.clientsApi.getById(res.clientId as string).subscribe((c: any) => this.clientName.set(c.name));
           }

           if (typeof res.projectId === 'object' && res.projectId !== null) {
              this.projectName.set((res.projectId as any).name);
           } else {
              this.projectsApi.getById(res.projectId as string).subscribe((p: any) => this.projectName.set(p.name));
           }

           this.loading.set(false);
        },
        error: () => this.loading.set(false)
     });
  }

  expandedCosts = signal<Set<string>>(new Set());

  toggleCost(key: string) {
    const next = new Set(this.expandedCosts());
    next.has(key) ? next.delete(key) : next.add(key);
    this.expandedCosts.set(next);
  }

  goBack() {
     this.location.back();
  }

  goEdit() {
     const q = this.quote();
     if (q) {
        this.router.navigate(['/quotes/edit', q._id]);
     }
  }

  // --- Export Logic ---

  private readonly _TECMEING_RUC = '20548168393';
  private readonly _TECMEING_ADDR = 'AV. GUARDIA CIVIL 444 URB. LA CAMPIÑA - CHORRILLOS - LIMA';

  private _fmtDate(d?: string | Date): string {
    return d ? new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  }
  private _fmtN(n?: number): string {
    return (n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  private _getLevel(num: string): 1 | 2 | 3 {
    const p = num.split('.');
    if (p.length >= 3 && p[1] === '00') return 1;
    if (p.length >= 3 && p[2] === '00') return 2;
    return 3;
  }

  async exportXLSX() {
    const q = this.quote();
    if (!q) return;

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Presupuesto Comercial');

    const currSym = q.currency === 'USD' ? '$' : 'S/';
    const clientName = typeof q.clientId === 'object' ? (q.clientId as any).name : this.clientName();
    const clientTaxId = typeof q.clientId === 'object' ? ((q.clientId as any).taxId || '') : '';
    const projectName = typeof q.projectId === 'object' ? (q.projectId as any).name : this.projectName();
    const contactName = typeof q.clientId === 'object' ? ((q.clientId as any).contactName || '') : '';

    // Column widths
    ws.columns = [
      { key: 'A', width: 16 },
      { key: 'B', width: 50 },
      { key: 'C', width: 9  },
      { key: 'D', width: 9  },
      { key: 'E', width: 16 },
      { key: 'F', width: 18 },
    ];

    const O_ORANGE = 'FFF5A500';
    const O_YELLOW = 'FFFFFF00';
    const O_DARK   = 'FF1E1E1E';
    const O_RED    = 'FFDC2626';
    const O_BLUE   = 'FF0070C0';
    const O_WHITE  = 'FFFFFFFF';
    const O_BLACK  = 'FF000000';

    const border = (cell: ExcelJS.Cell) => {
      cell.border = {
        top:    { style: 'thin', color: { argb: O_BLACK } },
        left:   { style: 'thin', color: { argb: O_BLACK } },
        bottom: { style: 'thin', color: { argb: O_BLACK } },
        right:  { style: 'thin', color: { argb: O_BLACK } },
      };
    };
    const fillColor = (cell: ExcelJS.Cell, argb: string) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
    };

    // ── Rows 1-2: Company header ──────────────────────────────────────
    ws.getRow(1).height = 28;
    ws.getRow(2).height = 14;
    ws.mergeCells('A1:B2');
    const logoCell = ws.getCell('A1');
    logoCell.value = 'TECMEING — INGENIERÍA Y METALMECÁNICA';
    logoCell.font = { bold: true, size: 12, color: { argb: 'FFEA580C' } };
    logoCell.alignment = { vertical: 'middle', horizontal: 'left' };

    ws.mergeCells('C1:F1');
    const r1c = ws.getCell('C1');
    r1c.value = `FECHA: ${this._fmtDate(q.createDate)}`;
    r1c.font = { bold: true, size: 9 };
    r1c.alignment = { horizontal: 'right', vertical: 'middle' };

    ws.mergeCells('C2:F2');
    const r2c = ws.getCell('C2');
    r2c.value = `COTIZACION N°: ${q.number}     RUC: ${this._TECMEING_RUC}`;
    r2c.font = { bold: true, size: 9 };
    r2c.alignment = { horizontal: 'right', vertical: 'middle' };

    // ── Row 3: Address ────────────────────────────────────────────────
    ws.getRow(3).height = 13;
    ws.mergeCells('A3:F3');
    const addrCell = ws.getCell('A3');
    addrCell.value = `DIRECCIÓN: ${this._TECMEING_ADDR}`;
    addrCell.font = { size: 8 };
    addrCell.alignment = { horizontal: 'left', vertical: 'middle' };
    addrCell.border = { bottom: { style: 'thin', color: { argb: O_BLACK } } };

    // ── Rows 4-6: Client info ─────────────────────────────────────────
    const clientRows: [string, string, string, string][] = [
      ['CLIENTE / EMPRESA:', clientName, 'N° DE CONTACTO:', contactName],
      ['RUC / DNI:', clientTaxId, 'LUGAR:', q.location || ''],
      ['PROYECTO:', projectName, 'AREA:', q.area ? `${q.area} M2` : ''],
    ];
    clientRows.forEach(([l1, v1, l2, v2], i) => {
      const rn = 4 + i;
      ws.getRow(rn).height = 15;
      // label 1 (cols A)
      ws.mergeCells(`A${rn}:A${rn}`);
      const lc1 = ws.getCell(`A${rn}`);
      lc1.value = l1;
      lc1.font = { bold: true, size: 8, color: { argb: O_BLACK } };
      lc1.alignment = { vertical: 'middle', horizontal: 'left' };
      fillColor(lc1, O_ORANGE); border(lc1);

      // value 1 (cols B+C)
      ws.mergeCells(`B${rn}:C${rn}`);
      const vc1 = ws.getCell(`B${rn}`);
      vc1.value = v1;
      vc1.font = { size: 8 };
      vc1.alignment = { vertical: 'middle', horizontal: 'left' };
      fillColor(vc1, O_WHITE); border(vc1);

      // label 2 (col D)
      ws.mergeCells(`D${rn}:D${rn}`);
      const lc2 = ws.getCell(`D${rn}`);
      lc2.value = l2;
      lc2.font = { bold: true, size: 8, color: { argb: O_BLACK } };
      lc2.alignment = { vertical: 'middle', horizontal: 'left' };
      fillColor(lc2, O_ORANGE); border(lc2);

      // value 2 (cols E+F)
      ws.mergeCells(`E${rn}:F${rn}`);
      const vc2 = ws.getCell(`E${rn}`);
      vc2.value = v2;
      vc2.font = { size: 8 };
      vc2.alignment = { vertical: 'middle', horizontal: 'left' };
      fillColor(vc2, O_WHITE); border(vc2);
    });

    // ── Row 7: "FORMULARIO DE LA PROPUESTA" ───────────────────────────
    ws.getRow(7).height = 18;
    ws.mergeCells('A7:F7');
    const bannerCell = ws.getCell('A7');
    bannerCell.value = 'FORMULARIO DE LA PROPUESTA';
    bannerCell.font = { bold: true, size: 10, color: { argb: O_BLACK } };
    bannerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    fillColor(bannerCell, O_YELLOW);
    border(bannerCell);

    // ── Row 8: Column headers ─────────────────────────────────────────
    ws.getRow(8).height = 18;
    ['ITEM', 'DESCRIPCIÓN', 'CAN.', 'UND.', 'PRECIO', 'PARCIAL'].forEach((h, ci) => {
      const col = String.fromCharCode(65 + ci);
      const cell = ws.getCell(`${col}8`);
      cell.value = h;
      cell.font = { bold: true, size: 8.5, color: { argb: O_WHITE } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      fillColor(cell, O_DARK);
      border(cell);
    });

    // ── Rows 9+: Items ────────────────────────────────────────────────
    let rowIdx = 9;
    (q.items || []).forEach(item => {
      const level = this._getLevel(item.number);
      const total = item.finalTotal ?? item.subtotal ?? 0;
      const fontColor = level === 1 ? O_RED : level === 2 ? O_BLUE : O_BLACK;
      const isBold = level <= 2;
      const rowHeight = level <= 2 ? 16 : 14;

      ws.getRow(rowIdx).height = rowHeight;
      const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
      const values: (string | number)[] =
        level <= 2
          ? [item.number, item.description, '', '', currSym, `${currSym}  ${this._fmtN(total)}`]
          : [item.number, item.description, item.qty, item.unit, `${currSym}  ${this._fmtN(item.price)}`, `${currSym}  ${this._fmtN(item.finalTotal ?? item.subtotal)}`];
      const aligns: ExcelJS.Alignment['horizontal'][] = ['center', 'left', 'center', 'center', 'right', 'right'];

      cols.forEach((col, ci) => {
        const cell = ws.getCell(`${col}${rowIdx}`);
        cell.value = values[ci];
        cell.font = { bold: isBold, size: 8, color: { argb: fontColor } };
        cell.alignment = { vertical: 'middle', horizontal: aligns[ci] };
        border(cell);
      });
      rowIdx++;

      // Sub items
      (item.subItems || []).forEach(sub => {
        ws.getRow(rowIdx).height = 13;
        const sv: (string | number)[] = ['', '   ' + sub.description, sub.qty, sub.unit, `${currSym}  ${this._fmtN(sub.price)}`, `${currSym}  ${this._fmtN(sub.subtotal)}`];
        cols.forEach((col, ci) => {
          const cell = ws.getCell(`${col}${rowIdx}`);
          cell.value = sv[ci];
          cell.font = { size: 8, color: { argb: O_BLACK } };
          cell.alignment = { vertical: 'middle', horizontal: aligns[ci] };
          border(cell);
        });
        rowIdx++;
      });
    });

    // ── Totals block ──────────────────────────────────────────────────
    rowIdx++;
    const subtotalItems = (q.items || []).reduce((s, i) => s + (i.finalTotal ?? i.subtotal ?? 0), 0);
    const genExpPct  = q.percentageGeneralExpenses   || 0;
    const accomPct   = q.percentageAccommodationFood || 0;
    const utilPct    = q.percentageUtilities         || 0;
    const genExpAmt  = subtotalItems * genExpPct / 100;
    const accomAmt   = subtotalItems * accomPct  / 100;
    const utilAmt    = subtotalItems * utilPct   / 100;
    const preIgv     = subtotalItems + genExpAmt + accomAmt + utilAmt;
    const igvAmt     = q.includeIgv ? preIgv * 0.18 : 0;
    const finalTotal = q.grandTotalQuote ?? (preIgv + igvAmt);

    type XTotRow = { label: string; pct: string; amt: number; final?: boolean };
    const totRows: XTotRow[] = [{ label: 'SUB TOTAL', pct: '', amt: subtotalItems }];
    if (genExpPct > 0) totRows.push({ label: 'GASTOS GENERALES',                     pct: `${genExpPct}%`, amt: genExpAmt });
    if (accomPct  > 0) totRows.push({ label: 'GASTOS DE ALOJAMIENTO Y ALIMENTACIÓN',  pct: `${accomPct}%`,  amt: accomAmt  });
    if (utilPct   > 0) totRows.push({ label: 'UTILIDADES',                            pct: `${utilPct}%`,   amt: utilAmt   });
    if (q.includeIgv)  totRows.push({ label: 'IGV (18%)',                             pct: '18%',           amt: igvAmt    });
    totRows.push({ label: q.includeIgv ? 'TOTAL CON IGV' : 'COSTO DIRECTO SIN IGV', pct: '', amt: finalTotal, final: true });

    totRows.forEach(row => {
      ws.getRow(rowIdx).height = row.final ? 17 : 14;
      ws.mergeCells(`A${rowIdx}:C${rowIdx}`);
      const lc = ws.getCell(`A${rowIdx}`);
      const pc = ws.getCell(`D${rowIdx}`);
      const sc = ws.getCell(`E${rowIdx}`);
      const vc = ws.getCell(`F${rowIdx}`);
      const bgArgb = row.final ? 'FFFFFF00' : 'FFFFFFFF';

      lc.value = row.label;
      lc.font  = { bold: !!row.final, size: row.final ? 9 : 8.5, color: { argb: O_BLACK } };
      lc.alignment = { vertical: 'middle', horizontal: 'right' };
      fillColor(lc, bgArgb); border(lc);

      pc.value = row.pct;
      pc.font  = { bold: !!row.final, size: 8.5, color: { argb: O_BLACK } };
      pc.alignment = { vertical: 'middle', horizontal: 'center' };
      fillColor(pc, bgArgb); border(pc);

      sc.value = currSym;
      sc.font  = { bold: !!row.final, size: 8.5, color: { argb: O_BLACK } };
      sc.alignment = { vertical: 'middle', horizontal: 'center' };
      fillColor(sc, bgArgb); border(sc);

      vc.value = this._fmtN(row.amt);
      vc.font  = { bold: !!row.final, size: row.final ? 9 : 8.5, color: { argb: O_BLACK } };
      vc.alignment = { vertical: 'middle', horizontal: 'right' };
      fillColor(vc, bgArgb); border(vc);

      rowIdx++;
    });

    // ── Compliance sections ───────────────────────────────────────────────
    const compSections = [
      { title: 'EL CLIENTE DEBERA CUMPLIR CON LOS SIGUIENTES ACUERDOS', items: q.clientCompliance   },
      { title: 'COORDINACION, PLAZO Y STAND BY POR EQUIPOS DEL CLIENTE', items: q.coordCompliance    },
      { title: 'LA EMPRESA TECMEING DEBERÁ CUMPLIR CON LOS SIGUIENTES',  items: q.tecmeingCompliance },
    ].filter(s => s.items && s.items.length > 0);

    if (compSections.length > 0) {
      rowIdx++;
      ws.getRow(rowIdx).height = 14;
      ws.mergeCells(`A${rowIdx}:F${rowIdx}`);
      const titleCell = ws.getCell(`A${rowIdx}`);
      titleCell.value = 'CONDICIONES DE VENTA:';
      titleCell.font = { bold: true, size: 9, color: { argb: O_BLACK } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
      rowIdx++;
    }

    compSections.forEach(section => {
      ws.getRow(rowIdx).height = 15;
      ws.mergeCells(`A${rowIdx}:F${rowIdx}`);
      const hdr = ws.getCell(`A${rowIdx}`);
      hdr.value = section.title;
      hdr.font  = { bold: true, size: 8, color: { argb: O_WHITE } };
      hdr.alignment = { vertical: 'middle', horizontal: 'left' };
      fillColor(hdr, 'FF3C3C3C');
      rowIdx++;

      section.items!.forEach(item => {
        ws.getRow(rowIdx).height = 13;
        ws.mergeCells(`A${rowIdx}:F${rowIdx}`);
        const cell = ws.getCell(`A${rowIdx}`);
        cell.value = `• ${item.description}`;
        cell.font  = { size: 8, color: { argb: O_BLACK } };
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        rowIdx++;
      });
    });

    // ── Bank info ─────────────────────────────────────────────────────────
    rowIdx++;
    const bankData = [
      { label: '► BCP',                                      bold: true  },
      { label: 'CUENTAS CORRIENTES SOLES',                   bold: true  },
      { label: '  S/.  194-2056198-0-75',                    bold: false },
      { label: '  S/.  CCI: 002-19400205619807594',          bold: false },
      { label: 'CUENTAS CORRIENTES DOLARES',                 bold: true  },
      { label: '  US$  194-2255663-1-83',                    bold: false },
      { label: '  US$  CCI: 002-19400225566318390',          bold: false },
      { label: 'TRANSFERENCIAS A NOMBRE DE:',                bold: true  },
      { label: `  TECMEING PERU S.A.C   RUC: ${this._TECMEING_RUC}`, bold: false },
      { label: '  administracion@tecmeing.com',              bold: false },
    ];
    bankData.forEach(bd => {
      ws.getRow(rowIdx).height = 13;
      ws.mergeCells(`A${rowIdx}:F${rowIdx}`);
      const cell = ws.getCell(`A${rowIdx}`);
      cell.value = bd.label;
      cell.font  = { bold: bd.bold, size: 8.5, color: { argb: O_BLACK } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      rowIdx++;
    });

    // ── Footer ────────────────────────────────────────────────────────────
    rowIdx++;
    ws.getRow(rowIdx).height = 13;
    ws.mergeCells(`A${rowIdx}:F${rowIdx}`);
    const footerCell = ws.getCell(`A${rowIdx}`);
    footerCell.value = '☎ 955 317 749    ✉ ventas@tecmeing.com    ⌖ www.tecmeing.com';
    footerCell.font  = { size: 8, color: { argb: 'FF666666' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    rowIdx++;

    ws.getRow(rowIdx).height = 12;
    ws.mergeCells(`A${rowIdx}:F${rowIdx}`);
    const addrCell2 = ws.getCell(`A${rowIdx}`);
    addrCell2.value = 'Av. Guardia Civil 444 Mz. E Lt. 20 Urb. La Campiña, Chorrillos, Lima - Perú.';
    addrCell2.font  = { size: 7.5, color: { argb: 'FF888888' } };
    addrCell2.alignment = { horizontal: 'center', vertical: 'middle' };

    // Save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Cotizacion_${q.number}.xlsx`; a.click();
    URL.revokeObjectURL(url);
    this.messageService.add({ severity: 'success', summary: 'Exportado', detail: 'Excel generado.' });
  }

  async exportPDF() {
    const q = this.quote();
    if (!q) return;
    await this.quotePdfService.export(q, this.clientName(), this.projectName());
    this.messageService.add({ severity: 'success', summary: 'Exportado', detail: 'PDF generado.' });
  }

  getStateSeverity(state: QuoteState): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (state) {
      case 'Aprobada': return 'success';
      case 'Observada': return 'warn';
      case 'Rechazada': return 'danger';
      case 'Cancelada': return 'danger';
      case 'Pendiente': return 'secondary';
      case 'Enviada': return 'info';
      default: return 'info';
    }
  }
}
