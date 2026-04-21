import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { QuotesApiService } from '../../../shared/services/quotes-api.service';
import { ClientsApiService } from '../../../shared/services/clients-api.service';
import { ProjectsApiService } from '../../../shared/services/projects-api.service';
import { Quote, QuoteState } from '../../../shared/interfaces/quote.interface';
import { MessageService } from 'primeng/api';

// PrimeNG
import { ToastModule } from 'primeng/toast';

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable'; // Add definition internally if needed

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
  exportXLSX() {
     const q = this.quote();
     if (!q) return;

     const wp = XLSX.utils.book_new();

     // Sheet 1: Datos Generales
     const summaryData = [
       ['Cotización Múltiple', q.number],
       ['Cliente', this.clientName()],
       ['Proyecto', this.projectName()],
       ['Ubicación', q.location || 'N/A'],
       ['Estado', q.state],
       ['Presupuesto Venta', q.grandTotalQuote],
       ['', ''],
       ['CONFIGURACIÓN COMERCIAL', 'VALOR'],
       ['Incluir Costos Proyecto', q.includeExpenses ? 'SI' : 'NO'],
       ['Incluye IGV (18%)', q.includeIgv ? 'SI' : 'NO'],
       ['% Gastos Generales', (q.percentageGeneralExpenses || 0) + '%'],
       ['% Alojamiento', (q.percentageAccommodationFood || 0) + '%'],
       ['% Utilidad', (q.percentageUtilities || 0) + '%']
     ];
     const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
     XLSX.utils.book_append_sheet(wp, wsSummary, 'Resumen');

     // Sheet 2: Analisis de Costos
     const costsData: any[][] = [['Categoría', 'Descripción', 'Costo Calculado']];
     if (q.costs) {
        costsData.push(['Vehículos', 'Total Transporte y Vehículos', q.costs.totalVehicles || 0]);
        costsData.push(['Planillas', 'Total Mano de Obra', q.costs.totalPayrolls || 0]);
        costsData.push(['Herramientas', 'Total Herramientas / Equipos', q.costs.totalTools || 0]);
        costsData.push(['Materiales', 'Total Materiales y Suministros', q.costs.totalMaterials || 0]);
        costsData.push(['Uniformes/EPPs', 'Total Uniformes EPPs', q.costs.totalUniforms || 0]);
        costsData.push(['Gastos', 'Gastos Extras / Operativos', q.costs.totalExpenses || 0]);
        costsData.push(['Alojamiento/Alimentación', 'Dietas y Viáticos', q.costs.totalAccommodations || 0]);
        costsData.push(['', 'TOTAL COSTOS DIRECTOS', q.costs.grandTotalCosts || 0]);
     }
     const wsCosts = XLSX.utils.aoa_to_sheet(costsData);
     XLSX.utils.book_append_sheet(wp, wsCosts, 'Costo Directo');

     // Sheet 3: Venta Comercial
     const saleData: any[][] = [['Concepto', 'Descripción', 'Und', 'Cant', 'Precio Unitario', 'Subtotal']];
     if (q.items) {
        q.items.forEach(i => {
           saleData.push(['ÍTEM', i.description, i.unit, i.qty, i.price, i.finalTotal || i.subtotal]);
           if (i.subItems && i.subItems.length > 0) {
              i.subItems.forEach(s => saleData.push(['SUBCONCEPTO', '    ' + s.description, s.unit, s.qty, s.price, s.subtotal]));
           }
        });
     }
     const wsSale = XLSX.utils.aoa_to_sheet(saleData);
     XLSX.utils.book_append_sheet(wp, wsSale, 'Presupuesto Comercial');

     XLSX.writeFile(wp, `Cotizacion_${q.number}.xlsx`);
     this.messageService.add({severity:'success', summary:'Exportado', detail:'Archivo Excel generado con éxito.'});
  }

  async exportPDF() {
    const q = this.quote();
    if (!q) return;

    const doc = new jsPDF('p', 'pt', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const ml = 35, mr = 35;
    const cW = pageW - ml - mr;

    // --- Load logo ---
    let logoUrl: string | null = null;
    try {
      const res = await fetch('/images/logo-base.png');
      const blob = await res.blob();
      logoUrl = await new Promise<string>(resolve => {
        const rd = new FileReader();
        rd.onloadend = () => resolve(rd.result as string);
        rd.readAsDataURL(blob);
      });
    } catch { /* skip */ }

    // --- Helpers ---
    const fmt = (n?: number) =>
      `S/ ${(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtN = (n?: number) =>
      (n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDate = (d?: string | Date) =>
      d ? new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

    const addPageFooters = () => {
      const total = (doc.internal as any).getNumberOfPages();
      for (let pg = 1; pg <= total; pg++) {
        doc.setPage(pg);
        doc.setFillColor(30, 41, 59);
        doc.rect(0, pageH - 22, pageW, 22, 'F');
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(190, 200, 215);
        doc.text('TECMEING S.A.C. | Ingeniería y Metalmecánica', ml, pageH - 8);
        doc.text(`Pág. ${pg} / ${total}`, pageW - mr, pageH - 8, { align: 'right' });
      }
    };

    // ── HEADER ────────────────────────────────────────────────────────
    const headerH = 64;
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageW, headerH, 'F');
    doc.setFillColor(234, 88, 12);
    doc.rect(0, headerH, pageW, 3, 'F');

    if (logoUrl) {
      doc.addImage(logoUrl, 'PNG', ml, 11, 130, 42);
    } else {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(234, 88, 12);
      doc.text('TECMEING', ml + 5, 42);
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('COTIZACIÓN DE SERVICIOS', pageW - mr, 28, { align: 'right' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 190, 210);
    doc.text(`N° ${q.number}`, pageW - mr, 48, { align: 'right' });

    // ── METADATA ──────────────────────────────────────────────────────
    let y = headerH + 18;
    const col2X = pageW / 2 + 8;

    const clientName = typeof q.clientId === 'object' ? (q.clientId as any).name : this.clientName();
    const projectName = typeof q.projectId === 'object' ? (q.projectId as any).name : this.projectName();

    const metaL: [string, string][] = [
      ['Cliente:', clientName],
      ['Proyecto:', projectName],
      ['Ubicación:', q.location || '—'],
    ];
    const metaR: [string, string][] = [
      ['Fecha:', fmtDate(q.createDate)],
      ['Vence:', fmtDate(q.expirationDate)],
      ['Estado:', q.state],
    ];
    const stateColorMap: Record<string, [number, number, number]> = {
      'Aprobada':  [22, 163, 74],
      'Enviada':   [37, 99, 235],
      'Pendiente': [100, 116, 139],
      'Observada': [202, 138, 4],
      'Rechazada': [220, 38, 38],
      'Cancelada': [220, 38, 38],
    };

    metaL.forEach(([label, val], i) => {
      const ry = y + i * 15;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(label, ml, ry);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      const w = doc.splitTextToSize(val, cW / 2 - 54);
      doc.text(w, ml + 54, ry);
    });

    metaR.forEach(([label, val], i) => {
      const ry = y + i * 15;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(label, col2X, ry);
      if (label === 'Estado:') {
        const sc = stateColorMap[val] || [15, 23, 42];
        doc.setTextColor(sc[0], sc[1], sc[2]);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
      }
      doc.text(val, col2X + 50, ry);
    });

    y += 3 * 15 + 8;

    // Config summary line
    const pills: string[] = [];
    if (q.includeExpenses) pills.push('Incl. Costos');
    if (q.includeIgv) pills.push('IGV 18%');
    if (q.percentageGeneralExpenses) pills.push(`GG ${q.percentageGeneralExpenses}%`);
    if (q.percentageAccommodationFood) pills.push(`Aloj. ${q.percentageAccommodationFood}%`);
    if (q.percentageUtilities) pills.push(`Util. ${q.percentageUtilities}%`);
    if (pills.length) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Configuración: ' + pills.join('   •   '), ml, y);
      y += 10;
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(ml, y, pageW - mr, y);
    y += 12;

    // ── COST STRUCTURE ────────────────────────────────────────────────
    if (q.costs && q.costs.grandTotalCosts) {
      doc.setFillColor(234, 88, 12);
      doc.rect(ml, y, cW, 17, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('ESTRUCTURA DE COSTOS DIRECTOS', ml + 8, y + 11.5);
      y += 19;

      const costRows = [
        ['Transporte y Vehículos',    fmtN(q.costs.totalVehicles)],
        ['Personal / Planillas',      fmtN(q.costs.totalPayrolls)],
        ['Herramientas y Equipos',    fmtN(q.costs.totalTools)],
        ['Materiales y Suministros',  fmtN(q.costs.totalMaterials)],
        ['Uniformes / EPP',           fmtN(q.costs.totalUniforms)],
        ['Gastos Operativos',         fmtN(q.costs.totalExpenses)],
        ['Alojamiento y Alimentación',fmtN(q.costs.totalAccommodations)],
      ].filter(r => parseFloat(r[1].replace(/[,]/g, '').replace('.', '').replace(',', '.')) > 0
                 || r[1] !== '0,00');

      (doc as any).autoTable({
        startY: y,
        head: [['Categoría de Costo', 'Total (S/)']],
        body: costRows,
        foot: [['TOTAL COSTOS DIRECTOS', fmtN(q.costs.grandTotalCosts)]],
        showFoot: 'lastPage',
        theme: 'plain',
        headStyles:  { fillColor: [51, 65, 85], textColor: [255,255,255], fontSize: 8, fontStyle: 'bold', cellPadding: 5 },
        bodyStyles:  { fontSize: 8, textColor: [15, 23, 42], cellPadding: 4 },
        footStyles:  { fillColor: [30, 41, 59], textColor: [255,255,255], fontSize: 8.5, fontStyle: 'bold', cellPadding: 5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: cW * 0.65 },
          1: { cellWidth: cW * 0.35, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: ml, right: mr, bottom: 30 },
      });
      y = (doc as any).lastAutoTable.finalY + 14;
    }

    // ── COMMERCIAL BUDGET ─────────────────────────────────────────────
    if (y > pageH * 0.65) { doc.addPage(); y = ml; }

    doc.setFillColor(30, 41, 59);
    doc.rect(ml, y, cW, 17, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('PRESUPUESTO COMERCIAL', ml + 8, y + 11.5);
    y += 19;

    const commBody: any[][] = [];
    let itmN = 0;
    (q.items || []).forEach(item => {
      itmN++;
      commBody.push([
        { content: String(itmN), styles: { fontStyle: 'bold', halign: 'center' } },
        { content: item.description, styles: { fontStyle: 'bold' } },
        { content: item.unit, styles: { halign: 'center' } },
        { content: String(item.qty), styles: { halign: 'center' } },
        { content: fmtN(item.price), styles: { halign: 'right' } },
        { content: fmtN(item.finalTotal ?? item.subtotal), styles: { halign: 'right', fontStyle: 'bold' } },
      ]);
      (item.subItems || []).forEach(sub => {
        commBody.push([
          '',
          { content: '   • ' + sub.description, styles: { textColor: [80, 95, 115], fontSize: 7.5 } },
          { content: sub.unit, styles: { halign: 'center', textColor: [80, 95, 115], fontSize: 7.5 } },
          { content: String(sub.qty), styles: { halign: 'center', textColor: [80, 95, 115], fontSize: 7.5 } },
          { content: fmtN(sub.price), styles: { halign: 'right', textColor: [80, 95, 115], fontSize: 7.5 } },
          { content: fmtN(sub.subtotal), styles: { halign: 'right', textColor: [80, 95, 115], fontSize: 7.5 } },
        ]);
      });
    });

    (doc as any).autoTable({
      startY: y,
      head: [['#', 'Descripción', 'Und', 'Cant', 'P.U. (S/)', 'Subtotal (S/)']],
      body: commBody,
      theme: 'plain',
      headStyles:  { fillColor: [51, 65, 85], textColor: [255,255,255], fontSize: 8, fontStyle: 'bold', cellPadding: 5 },
      bodyStyles:  { fontSize: 8, textColor: [15, 23, 42], cellPadding: 4 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 32, halign: 'center' },
        3: { cellWidth: 28, halign: 'center' },
        4: { cellWidth: 62, halign: 'right' },
        5: { cellWidth: 68, halign: 'right' },
      },
      margin: { left: ml, right: mr, bottom: 30 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ── TOTALS BLOCK ──────────────────────────────────────────────────
    const totW = 205;
    const totX = pageW - mr - totW;
    if (y + 95 > pageH - 30) { doc.addPage(); y = ml; }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(totX, y, pageW - mr, y);
    y += 5;

    const subtotal = (q.items || []).reduce((s, i) => s + (i.finalTotal ?? i.subtotal ?? 0), 0);
    const totRows: [string, string, boolean][] = [
      ['Subtotal ítems comerciales:', fmt(subtotal), false],
    ];
    if (q.includeExpenses && q.costs?.grandTotalCosts)
      totRows.push(['+ Costos de Proyecto:', fmt(q.costs.grandTotalCosts), false]);
    if (q.percentageGeneralExpenses)
      totRows.push([`+ Gastos Generales (${q.percentageGeneralExpenses}%):`, 'aplicado', false]);
    if (q.percentageAccommodationFood)
      totRows.push([`+ Alojamiento (${q.percentageAccommodationFood}%):`, 'aplicado', false]);
    if (q.percentageUtilities)
      totRows.push([`+ Utilidad (${q.percentageUtilities}%):`, 'aplicado', false]);
    if (q.includeIgv)
      totRows.push(['+ IGV (18%):', 'incluido', false]);
    totRows.push(['TOTAL PRESUPUESTO:', fmt(q.grandTotalQuote), true]);

    totRows.forEach(([label, value, isFinal]) => {
      const rH = isFinal ? 17 : 13;
      if (isFinal) {
        doc.setFillColor(30, 41, 59);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFillColor(248, 250, 252);
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
      }
      doc.rect(totX, y, totW, rH, 'F');
      doc.text(label, totX + 6, y + rH - 4);
      doc.setFont('helvetica', 'bold');
      doc.text(value, totX + totW - 6, y + rH - 4, { align: 'right' });
      y += rH + 2;
    });

    // ── COMPLIANCE SECTIONS ───────────────────────────────────────────
    const compSections = [
      { title: 'CUMPLIMIENTO DEL CLIENTE',                                              color: [37, 99, 235]  as [number,number,number], items: q.clientCompliance },
      { title: 'CUMPLIMIENTO DE COORDINACIÓN, PLAZO Y STAND BY POR EQUIPOS DEL CLIENTE', color: [202, 138, 4] as [number,number,number], items: q.coordCompliance },
      { title: 'CUMPLIMIENTO DE TECMEING',                                              color: [22, 163, 74]  as [number,number,number], items: q.tecmeingCompliance },
    ].filter(s => s.items && s.items.length > 0);

    compSections.forEach(section => {
      y += 14;
      if (y + 40 > pageH - 30) { doc.addPage(); y = ml; }

      doc.setFillColor(section.color[0], section.color[1], section.color[2]);
      doc.rect(ml, y, cW, 17, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      const titleFit = doc.splitTextToSize(section.title, cW - 16);
      doc.text(titleFit[0], ml + 8, y + 11.5);
      y += 19;

      section.items!.forEach((item, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${item.description}`, cW - 15);
        lines.forEach((line: string) => {
          if (y + 12 > pageH - 30) { doc.addPage(); y = ml; }
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(15, 23, 42);
          doc.text(line, ml + 10, y + 10);
          y += 12;
        });
      });
    });

    // ── NOTES ─────────────────────────────────────────────────────────
    if (q.notes) {
      y += 12;
      if (y + 30 > pageH - 30) { doc.addPage(); y = ml; }
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('NOTAS Y OBSERVACIONES:', ml, y);
      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.splitTextToSize(q.notes, cW).forEach((line: string) => {
        if (y + 12 > pageH - 30) { doc.addPage(); y = ml; }
        doc.text(line, ml, y);
        y += 11;
      });
    }

    addPageFooters();
    doc.save(`Cotizacion_${q.number}.pdf`);
    this.messageService.add({ severity: 'success', summary: 'Exportado', detail: 'PDF generado con éxito.' });
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
