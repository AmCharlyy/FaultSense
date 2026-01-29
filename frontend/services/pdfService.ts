import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Incident } from "../types";

const COLORS = {
  headerBlue: "#004b93",
  headerText: "#ffffff",
  darkGray: "#404040",
  lightGray: "#e5e7eb",
  alertRed: "#cc0000",
  textBlack: "#000000"
};

const getWeekNumber = (d: Date) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const generateIncidentReport = (incident: Incident) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const width = doc.internal.pageSize.width;
  const height = doc.internal.pageSize.height;
  const margin = 10;

  const incidentDate = new Date(incident.createdAt);
  const weekNum = getWeekNumber(incidentDate);
  const weekStr = `${weekNum}.${incidentDate.getDay()}`;

  // 1. ENCABEZADO
  const drawHeader = () => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.textBlack);
    doc.text("INTERNAL / INTERNO", width - margin, 7, { align: "right" });
    
    doc.setFontSize(14);
    doc.setTextColor(COLORS.alertRed);
    doc.text("Q-Ticker Q MoMo EA888", margin, 12);

    doc.setFontSize(10);
    doc.setTextColor(COLORS.textBlack);
    doc.text(`SEM ${weekStr}  ${incidentDate.getFullYear()}`, width / 2, 12, { align: "center" });
    doc.text("PLANTA GUANAJUATO", width - margin, 12, { align: "right" });
  };

  drawHeader();

  // 2. TABLA DE CABECERA (ESTRUCTURA ORIGINAL)
  autoTable(doc, {
    startY: 15,
    theme: 'grid',
    head: [
      [
        { content: incident.partName || 'Pieza N/A', styles: { fillColor: COLORS.headerBlue, textColor: COLORS.headerText, halign: 'center' } },
        { content: incident.origin || 'Origen N/A', styles: { fillColor: COLORS.headerBlue, textColor: COLORS.headerText, halign: 'center' } },
        { content: incident.supplier || 'Proveedor N/A', styles: { fillColor: COLORS.headerBlue, textColor: COLORS.headerText, halign: 'center' } },
        { content: incident.partResponsible || 'Responsable N/A', styles: { fillColor: COLORS.headerBlue, textColor: COLORS.headerText, halign: 'center' } }
      ]
    ],
    body: [
      [
        { content: incident.folio, styles: { fontStyle: 'bold', halign: 'center' } },
        { content: `Área: ${incident.area}`, styles: { halign: 'center', fontSize: 8 } },
        { content: `DMC: ${incident.partNumber || 'N/A'}`, styles: { halign: 'center' } },
        { content: `Cliente: ${incident.client}\nResp: ${incident.responsibleName}`, styles: { fontSize: 8 } }
      ],
      [
        { content: `Fecha 1er falla: ${incidentDate.toLocaleDateString()}`, styles: { fillColor: COLORS.lightGray, fontSize: 8 } },
        { content: `Sorte: ${incident.sorte}`, styles: { fillColor: COLORS.lightGray, fontSize: 8 } },
        { content: `Status: ${incident.status}`, styles: { fillColor: COLORS.lightGray, halign: 'center', fontSize: 8 } },
        { content: `Turno: ${incident.shift}`, styles: { fillColor: COLORS.lightGray, halign: 'center', fontSize: 8 } }
      ]
    ],
    styles: { lineColor: [255, 255, 255], lineWidth: 0.1, cellPadding: 2, fontSize: 9 },
    margin: { left: margin, right: margin }
  });

  // 3. CUERPO (ESTRUCTURA ORIGINAL DE 4 FILAS)
  // @ts-ignore
  const startYMain = (doc as any).lastAutoTable.finalY + 2;
  const availableHeight = height - startYMain - 45;

  autoTable(doc, {
    startY: startYMain,
    theme: 'grid',
    body: [
      [
        { content: '', rowSpan: 4, styles: { minCellWidth: 90, valign: 'middle', halign: 'center' } },
        { 
          content: `Falla / Failure:\n\n${incident.paFailure || incident.description}`, 
          styles: { fillColor: COLORS.darkGray, textColor: COLORS.headerText, fontStyle: 'bold', minCellHeight: availableHeight * 0.15 } 
        }
      ],
      [
        { content: `Causa-Hipótesis / Cause-Hypothesis:\n\n${incident.paHypothesis || 'Pendiente'}`, styles: { fillColor: COLORS.lightGray, minCellHeight: availableHeight * 0.2 } }
      ],
      [
        { content: `Análisis / Analysis:\n\n${incident.paAnalysis || 'En proceso...'}`, styles: { fillColor: COLORS.lightGray, minCellHeight: availableHeight * 0.35 } }
      ],
      [
        { content: `Acciones Inmediatas / Immediate Actions:\n\n${incident.paActions || 'Sin acciones registradas'}`, styles: { fillColor: COLORS.headerText, textColor: COLORS.textBlack, fontStyle: 'bold', minCellHeight: availableHeight * 0.3 } }
      ]
    ],
    styles: { lineColor: [200, 200, 200], lineWidth: 0.1, fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 90 } },
    didDrawCell: (data) => {
      if (data.column.index === 0 && data.row.index === 0 && incident.evidenceUrl) {
        try {
          doc.addImage(incident.evidenceUrl, 'JPEG', data.cell.x + 2, data.cell.y + 2, data.cell.width - 4, data.cell.height - 4);
        } catch (e) { /* Error handling */ }
      }
    }
  });

  // 4. PIE DE TABLA (ESTRUCTURA ORIGINAL)
  // @ts-ignore
  const finalY = (doc as any).lastAutoTable.finalY + 2;

  autoTable(doc, {
    startY: finalY,
    theme: 'grid',
    body: [
        [
            { content: 'Folio afectado', styles: { fillColor: COLORS.headerBlue, textColor: COLORS.headerText } },
            { content: 'Motores OK', styles: { fillColor: COLORS.headerBlue, textColor: COLORS.headerText } },
            { content: 'Piezas NOK', styles: { fillColor: COLORS.headerBlue, textColor: COLORS.headerText } },
            { content: 'Esp. Q-MoMo', styles: { fillColor: COLORS.headerBlue, textColor: COLORS.headerText } }
        ],
        [
            { content: incident.folio },
            { content: String(incident.paConfirmed || 0) },
            { content: String(incident.paSegregated || 0) },
            { content: incident.paQmomo || 'N/A' }
        ]
    ],
    styles: { halign: 'center', fontSize: 8, cellPadding: 2 },
    margin: { left: margin, right: margin }
  });

  // 5. FOOTER LEGAL (ESTRUCTURA ORIGINAL)
  const footerY = height - 12;
  doc.setFontSize(6);
  doc.setTextColor(COLORS.textBlack);
  doc.text("Elaboró: Calidad Montaje", margin, footerY);
  doc.text("KSU: 2.2 / 7 años", margin, footerY + 6);
  doc.text(new Date().toLocaleDateString(), width / 2, footerY + 6, { align: "center" });
  doc.text("INTERNAL / INTERNO", width - margin, footerY + 6, { align: "right" });

  doc.save(`QTICKER_${incident.folio}.pdf`);
};