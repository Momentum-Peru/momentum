import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Quote } from '../interfaces/quote.interface';

@Injectable({ providedIn: 'root' })
export class QuotePdfService {

  private readonly _RUC  = '20548168393';
  private readonly _ADDR = 'AV. GUARDIA CIVIL 444 URB. LA CAMPIÑA - CHORRILLOS - LIMA';

  private readonly _CONTACT = {
    phone:  '955 317 749',
    ventas: 'ventas@tecmeing.com',
    web:    'www.tecmeing.com',
    admin:  'administracion@tecmeing.com',
    addr:   'Av. Guardia Civil 444 Mz. E Lt. 20 Urb. La Campiña, Chorrillos, Lima - Perú.',
  };
  private readonly _BANK = {
    solesAcct: '194-2056198-0-75',
    solesCci:  '002-19400205619807594',
    usdAcct:   '194-2255663-1-83',
    usdCci:    '002-19400225566318390',
  };

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

  async export(q: Quote, clientName: string, projectName: string): Promise<void> {
    const doc   = new jsPDF('p', 'pt', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const ml = 30, mr = 30;
    const cW = pageW - ml - mr;

    const FOOTER_H = 48;
    const BOTTOM   = pageH - FOOTER_H;

    const C_ORANGE: [number,number,number] = [245, 165,  0];
    const C_RED:    [number,number,number] = [220,  38, 38];
    const C_BLUE:   [number,number,number] = [  0, 112,192];
    const C_YELLOW: [number,number,number] = [255, 230,  0];
    const C_DARK:   [number,number,number] = [ 30,  30, 30];
    const C_GRAY:   [number,number,number] = [ 60,  60, 60];
    const C_WHITE:  [number,number,number] = [255, 255,255];
    const C_BLACK:  [number,number,number] = [  0,   0,  0];

    const currSym     = q.currency === 'USD' ? '$' : 'S/';
    const clientTaxId = typeof q.clientId === 'object' ? ((q.clientId as any).taxId       || '') : '';
    const contactName = typeof q.clientId === 'object' ? ((q.clientId as any).contactName || '') : '';

    // ── Logo ─────────────────────────────────────────────────────────────
    let logoUrl: string | null = null;
    try {
      const res  = await fetch('/images/logo-base.png');
      const blob = await res.blob();
      logoUrl = await new Promise<string>(resolve => {
        const rd = new FileReader();
        rd.onloadend = () => resolve(rd.result as string);
        rd.readAsDataURL(blob);
      });
    } catch { /* skip */ }

    let y = ml;

    // ── HEADER ───────────────────────────────────────────────────────────
    if (logoUrl) {
      doc.addImage(logoUrl, 'PNG', ml, y, 115, 42);
    } else {
      doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(234, 88, 12);
      doc.text('TECMEING', ml, y + 24);
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_DARK);
      doc.text('INGENIERÍA Y METALMECÁNICA', ml, y + 36);
    }
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLACK);
    doc.text(`FECHA: ${this._fmtDate(q.createDate)}`, pageW - mr, y + 10, { align: 'right' });
    doc.text(`COTIZACION N°: ${q.number}`,            pageW - mr, y + 23, { align: 'right' });
    doc.text(`RUC: ${this._RUC}`,                     pageW - mr, y + 36, { align: 'right' });
    y += 50;
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_BLACK);
    doc.text(`DIRECCIÓN: ${this._ADDR}`, ml, y + 9);
    y += 15;
    doc.setDrawColor(...C_BLACK); doc.setLineWidth(0.5);
    doc.line(ml, y, pageW - mr, y);
    y += 6;

    // ── CLIENT INFO TABLE ─────────────────────────────────────────────────
    const rowH  = 16;
    const c1W = 95, c2W = 188, c3W = 82, c4W = cW - 95 - 188 - 82;
    const clientRows: [string, string, string, string][] = [
      ['CLIENTE / EMPRESA:', clientName,   'N° DE CONTACTO:', contactName],
      ['RUC / DNI:',         clientTaxId,  'LUGAR:',          q.location || ''],
      ['PROYECTO:',          projectName,  'AREA:',           q.area ? `${q.area} M2` : ''],
    ];
    clientRows.forEach((row, ri) => {
      const ry = y + ri * rowH;
      const drawCell = (x: number, w: number, text: string, isLabel: boolean) => {
        doc.setFillColor(...(isLabel ? C_ORANGE : C_WHITE));
        doc.rect(x, ry, w, rowH, 'F');
        doc.setDrawColor(...C_BLACK); doc.setLineWidth(0.3); doc.rect(x, ry, w, rowH, 'S');
        doc.setFontSize(isLabel ? 7 : 7.5);
        doc.setFont('helvetica', isLabel ? 'bold' : 'normal'); doc.setTextColor(...C_BLACK);
        doc.text(doc.splitTextToSize(text, w - 5)[0] || '', x + 3, ry + rowH - 4);
      };
      drawCell(ml,                  c1W, row[0], true);
      drawCell(ml + c1W,            c2W, row[1], false);
      drawCell(ml + c1W + c2W,      c3W, row[2], true);
      drawCell(ml + c1W + c2W + c3W, c4W, row[3], false);
    });
    y += clientRows.length * rowH + 4;

    // ── "FORMULARIO DE LA PROPUESTA" BANNER ──────────────────────────────
    doc.setFillColor(...C_YELLOW);
    doc.rect(ml, y, cW, 18, 'F');
    doc.setDrawColor(...C_BLACK); doc.setLineWidth(0.5); doc.rect(ml, y, cW, 18, 'S');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLACK);
    doc.text('FORMULARIO DE LA PROPUESTA', pageW / 2, y + 12, { align: 'center' });
    y += 18;

    // ── ITEMS TABLE ───────────────────────────────────────────────────────
    const iW = 55, cW2 = 42, uW = 36, pW = 68, paW = 73;
    const dW = cW - iW - cW2 - uW - pW - paW;
    const tableBody: any[][] = [];

    (q.items || []).forEach(item => {
      const level  = this._getLevel(item.number);
      const total  = item.finalTotal ?? item.subtotal ?? 0;
      const tColor = level === 1 ? C_RED : level === 2 ? C_BLUE : C_BLACK;
      const fStyle = level <= 2 ? 'bold' : 'normal';
      if (level <= 2) {
        tableBody.push([
          { content: item.number,      styles: { textColor: tColor, fontStyle: fStyle, halign: 'center' } },
          { content: item.description, styles: { textColor: tColor, fontStyle: fStyle } },
          '', '',
          { content: currSym,                             styles: { textColor: tColor, fontStyle: fStyle, halign: 'center' } },
          { content: `${currSym}  ${this._fmtN(total)}`, styles: { textColor: tColor, fontStyle: fStyle, halign: 'right'  } },
        ]);
      } else {
        tableBody.push([
          { content: item.number, styles: { halign: 'center' } },
          item.description,
          { content: item.qty,  styles: { halign: 'center' } },
          { content: item.unit, styles: { halign: 'center' } },
          { content: `${currSym}  ${this._fmtN(item.price)}`,                       styles: { halign: 'right' } },
          { content: `${currSym}  ${this._fmtN(item.finalTotal ?? item.subtotal)}`, styles: { halign: 'right' } },
        ]);
      }
      (item.subItems || []).forEach(sub => {
        tableBody.push([
          '',
          { content: '   ' + sub.description, styles: { textColor: [80, 95, 115] as [number,number,number] } },
          { content: sub.qty,  styles: { halign: 'center' } },
          { content: sub.unit, styles: { halign: 'center' } },
          { content: `${currSym}  ${this._fmtN(sub.price)}`,    styles: { halign: 'right' } },
          { content: `${currSym}  ${this._fmtN(sub.subtotal)}`, styles: { halign: 'right' } },
        ]);
      });
    });

    (doc as any).autoTable({
      startY: y,
      head: [['ITEM', 'DESCRIPCIÓN', 'CAN.', 'UND.', 'PRECIO', 'PARCIAL']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: C_DARK, textColor: C_WHITE,
        fontSize: 8, fontStyle: 'bold',
        cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
        halign: 'center',
      },
      bodyStyles: { fontSize: 8, textColor: C_BLACK, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
      columnStyles: {
        0: { cellWidth: iW,  halign: 'center' },
        1: { cellWidth: dW  },
        2: { cellWidth: cW2, halign: 'center' },
        3: { cellWidth: uW,  halign: 'center' },
        4: { cellWidth: pW,  halign: 'right'  },
        5: { cellWidth: paW, halign: 'right'  },
      },
      margin: { left: ml, right: mr, top: ml, bottom: FOOTER_H + 5 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ── TOTALS BLOCK ──────────────────────────────────────────────────────
    // Columns: label (right-aligned) | % | sym | amount
    const tLabelW = 355, tPctW = 60, tSymW = 22, tAmtW = cW - tLabelW - tPctW - tSymW;
    const tRH = 14;

    const subtotal    = (q.items || []).reduce((s, i) => s + (i.finalTotal ?? i.subtotal ?? 0), 0);
    const genExpPct   = q.percentageGeneralExpenses   || 0;
    const accomPct    = q.percentageAccommodationFood || 0;
    const utilPct     = q.percentageUtilities         || 0;
    const genExpAmt   = subtotal * genExpPct / 100;
    const accomAmt    = subtotal * accomPct  / 100;
    const utilAmt     = subtotal * utilPct   / 100;
    const preIgvTotal = subtotal + genExpAmt + accomAmt + utilAmt;
    const igvAmt      = q.includeIgv ? preIgvTotal * 0.18 : 0;
    const finalTotal  = q.grandTotalQuote ?? (preIgvTotal + igvAmt);

    type TotRow = { label: string; pct: string; amt: number; final?: boolean };
    const totRows: TotRow[] = [{ label: 'SUB TOTAL', pct: '', amt: subtotal }];
    if (genExpPct > 0) totRows.push({ label: 'GASTOS GENERALES',                    pct: `${genExpPct}%`, amt: genExpAmt });
    if (accomPct  > 0) totRows.push({ label: 'GASTOS DE ALOJAMIENTO Y ALIMENTACIÓN', pct: `${accomPct}%`,  amt: accomAmt  });
    if (utilPct   > 0) totRows.push({ label: 'UTILIDADES',                           pct: `${utilPct}%`,   amt: utilAmt   });
    if (q.includeIgv)  totRows.push({ label: 'IGV (18%)',                            pct: '18%',           amt: igvAmt    });
    totRows.push({ label: q.includeIgv ? 'TOTAL CON IGV' : 'COSTO DIRECTO SIN IGV', pct: '', amt: finalTotal, final: true });

    if (y + totRows.length * tRH + 20 > BOTTOM) { doc.addPage(); y = ml; }

    totRows.forEach(row => {
      const bg: [number,number,number] = row.final ? C_YELLOW : C_WHITE;
      const fs = row.final ? 8.5 : 8;
      const fw = row.final ? 'bold' : 'normal';

      // label
      doc.setFillColor(...bg); doc.rect(ml, y, tLabelW, tRH, 'F');
      doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3); doc.rect(ml, y, tLabelW, tRH, 'S');
      doc.setFontSize(fs); doc.setFont('helvetica', fw); doc.setTextColor(...C_BLACK);
      doc.text(row.label, ml + tLabelW - 4, y + tRH - 4, { align: 'right' });

      // %
      const px = ml + tLabelW;
      doc.setFillColor(...bg); doc.rect(px, y, tPctW, tRH, 'F'); doc.rect(px, y, tPctW, tRH, 'S');
      doc.text(row.pct, px + tPctW / 2, y + tRH - 4, { align: 'center' });

      // sym
      const sx = px + tPctW;
      doc.setFillColor(...bg); doc.rect(sx, y, tSymW, tRH, 'F'); doc.rect(sx, y, tSymW, tRH, 'S');
      doc.text(currSym, sx + tSymW / 2, y + tRH - 4, { align: 'center' });

      // amount
      const ax = sx + tSymW;
      doc.setFillColor(...bg); doc.rect(ax, y, tAmtW, tRH, 'F'); doc.rect(ax, y, tAmtW, tRH, 'S');
      doc.text(this._fmtN(row.amt), ax + tAmtW - 4, y + tRH - 4, { align: 'right' });

      y += tRH;
    });

    // ── COMPLIANCE + BANK INFO ────────────────────────────────────────────
    const hasCompliance = (q.clientCompliance?.length ?? 0) + (q.coordCompliance?.length ?? 0) + (q.tecmeingCompliance?.length ?? 0) > 0;

    if (hasCompliance) {
      y += 12;
      if (y + 14 > BOTTOM) { doc.addPage(); y = ml; }
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLACK);
      doc.text('CONDICIONES DE VENTA:', ml, y + 9);
      y += 14;

      const compSections = [
        { title: 'EL CLIENTE DEBERA CUMPLIR CON LOS SIGUIENTES ACUERDOS',         items: q.clientCompliance  },
        { title: 'COORDINACION, PLAZO Y STAND BY POR EQUIPOS DEL CLIENTE',        items: q.coordCompliance   },
        { title: 'LA EMPRESA TECMEING DEBERÁ CUMPLIR CON LOS SIGUIENTES',         items: q.tecmeingCompliance, withBank: true },
      ].filter(s => s.items && s.items.length > 0);

      const BANK_W = 210;
      const ITEM_W = cW - BANK_W - 8;

      compSections.forEach(section => {
        if (y + 16 > BOTTOM) { doc.addPage(); y = ml; }

        // Section header
        doc.setFillColor(...C_GRAY);
        doc.rect(ml, y, cW, 14, 'F');
        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_WHITE);
        doc.text(section.title, ml + 5, y + 10);
        y += 16;

        // Content
        const itemsColW = section.withBank ? ITEM_W : cW;
        const bankX     = ml + ITEM_W + 8;
        const sectionStartY = y;
        let itemsY = y;

        section.items!.forEach(item => {
          doc.splitTextToSize(`• ${item.description}`, itemsColW - 10).forEach((line: string) => {
            if (itemsY + 11 > BOTTOM) { doc.addPage(); itemsY = ml; }
            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_BLACK);
            doc.text(line, ml + 5, itemsY + 9);
            itemsY += 11;
          });
        });

        // Bank info alongside tecmeing section
        if (section.withBank) {
          let bY = sectionStartY;
          const bank = this._BANK;

          const bLine = (text: string, bold: boolean, indent = 0) => {
            if (bY + 11 > BOTTOM) return;
            doc.setFontSize(7.5);
            doc.setFont('helvetica', bold ? 'bold' : 'normal');
            doc.setTextColor(...C_BLACK);
            doc.text(text, bankX + indent, bY + 9);
            bY += 11;
          };

          // BCP title
          doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 63, 145);
          doc.text('►  BCP', bankX, bY + 9);
          bY += 13;

          bLine('CUENTAS CORRIENTES SOLES', true);
          bLine(`S/.  ${bank.solesAcct}`,        false, 4);
          bLine(`S/.  CCI: ${bank.solesCci}`,    false, 4);
          bLine('', false); // spacer

          bLine('CUENTAS CORRIENTES DOLARES', true);
          bLine(`US$  ${bank.usdAcct}`,           false, 4);
          bLine(`US$  CCI: ${bank.usdCci}`,       false, 4);
          bLine('', false);

          bLine('TRANSFERENCIAS A NOMBRE DE:', true);
          bLine(`TECMEING PERU S.A.C`, false, 4);
          bLine(`RUC: ${this._RUC}`,  false, 4);
          bLine('Enviar comprobante al correo:', false, 4);
          bLine(this._CONTACT.admin,             false, 4);

          itemsY = Math.max(itemsY, bY);
        }

        y = itemsY + 6;
      });
    }

    // ── NOTES ─────────────────────────────────────────────────────────────
    if (q.notes) {
      y += 8;
      if (y + 30 > BOTTOM) { doc.addPage(); y = ml; }
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139);
      doc.text('NOTAS Y OBSERVACIONES:', ml, y);
      y += 12;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_BLACK);
      doc.splitTextToSize(q.notes, cW).forEach((line: string) => {
        if (y + 12 > BOTTOM) { doc.addPage(); y = ml; }
        doc.text(line, ml, y); y += 11;
      });
    }

    // ── FOOTER ON EVERY PAGE ─────────────────────────────────────────────
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let pg = 1; pg <= totalPages; pg++) {
      doc.setPage(pg);
      const fy = pageH - FOOTER_H;

      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.4);
      doc.line(ml, fy, pageW - mr, fy);

      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
      doc.text(
        `☎  ${this._CONTACT.phone}    ✉  ${this._CONTACT.ventas}    ⌖  ${this._CONTACT.web}`,
        pageW / 2, fy + 10, { align: 'center' }
      );

      doc.setFontSize(7.5); doc.setTextColor(110, 110, 110);
      doc.text(this._CONTACT.addr, pageW / 2, fy + 21, { align: 'center' });

      doc.setFontSize(7.5); doc.setTextColor(160, 160, 160);
      doc.text(`Página ${pg} de ${totalPages}`, pageW / 2, fy + 32, { align: 'center' });

      // Orange bottom bar
      doc.setFillColor(...C_ORANGE);
      doc.rect(0, pageH - 8, pageW, 8, 'F');
    }

    doc.save(`Cotizacion_${q.number}.pdf`);
  }
}
