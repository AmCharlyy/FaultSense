import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Incident } from "../types";

// --- COLORES CORPORATIVOS (Estilo VW/Audi) ---
const COLORS = {
  headerBlue: "#004b93", // Azul VW
  headerText: "#ffffff",
  darkGray: "#404040",   // Gris oscuro para títulos
  lightGray: "#e5e7eb",  // Gris claro para fondos alternos
  alertRed: "#cc0000",   // Rojo corporativo
  textBlack: "#000000"
};

// --- HELPER: Calcular número de semana ISO ---
const getWeekNumber = (d: Date) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const generateIncidentReport = (incident: Incident) => {
  // 1. Configuración Horizontal (Landscape)
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const width = doc.internal.pageSize.width;
  const height = doc.internal.pageSize.height;
  const margin = 10;

  // CÁLCULO DE LA SEMANA (Corrección del error)
  const incidentDate = new Date(incident.createdAt);
  const weekNum = getWeekNumber(incidentDate);
  const weekStr = `${weekNum}.${incidentDate.getDay()}`; // Formato Semana.Día (ej: 50.6)

  // ==========================================
  // 1. ENCABEZADO SUPERIOR (Texto Obligatorio)
  // ==========================================
  const drawHeader = () => {
    // Esquina Superior Derecha - Clasificación
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.textBlack);
    doc.text("INTERNAL / INTERNO", width - margin, 7, { align: "right" });
    
    // Esquina Superior Izquierda - Título
    doc.setFontSize(14);
    doc.setTextColor(COLORS.alertRed);
    doc.text("Q-Ticker Q MoMo EA888", margin, 12);

    // Centro - Semana y Año
    doc.setFontSize(10);
    doc.setTextColor(COLORS.textBlack);
    doc.text(`SEM ${weekStr}  ${incidentDate.getFullYear()}`, width / 2, 12, { align: "center" });

    // Derecha - Planta
    doc.text("PLANTA GUANAJUATO", width - margin, 12, { align: "right" });
  };

  drawHeader();

  // ==========================================
  // 2. TABLA DE DATOS DE CABECERA (Franja Azul)
  // ==========================================
  autoTable(doc, {
    startY: 15,
    theme: 'grid',
    head: [
      [
        { content: 'Pieza 1 / CKD', styles: { fillColor: COLORS.headerBlue, textColor: COLORS.headerText, halign: 'center' } },
        { content: incident.origin || 'XXAXXXXXXAA', styles: { fillColor: COLORS.headerBlue, textColor: COLORS.headerText, halign: 'center' } },
        { content: 'Proveedor de la pieza 1', styles: { fillColor: COLORS.headerBlue, textColor: COLORS.headerText, halign: 'center' } },
        { content: 'Responsable de la pieza 1', styles: { fillColor: COLORS.headerBlue, textColor: COLORS.headerText, halign: 'center' } }
      ]
    ],
    body: [
      [
        { content: incident.folio, styles: { fontStyle: 'bold', halign: 'center' } },
        { content: 'OP: 70  |  RB  |  LT', styles: { halign: 'center', fontSize: 8 } },
        { content: 'LOG / CPC', styles: { halign: 'center' } },
        { content: `Cliente: ${incident.client}\nResp: ${incident.responsibleName}`, styles: { fontSize: 8 } }
      ],
      // Fila Gris de Datos Técnicos
      [
        { content: `Fecha 1er falla: ${incidentDate.toLocaleDateString()}`, styles: { fillColor: COLORS.lightGray, fontSize: 8 } },
        { content: `Reincidencias: 0`, styles: { fillColor: COLORS.lightGray, fontSize: 8 } },
        { content: `MoMo: X   PC`, styles: { fillColor: COLORS.lightGray, halign: 'center', fontSize: 8 } },
        { content: `Turno: ${incident.shift}`, styles: { fillColor: COLORS.lightGray, halign: 'center', fontSize: 8 } }
      ]
    ],
    styles: { 
        lineColor: [255, 255, 255], 
        lineWidth: 0.1, 
        cellPadding: 2,
        fontSize: 9 
    },
    margin: { left: margin, right: margin }
  });

  // ==========================================
  // 3. CUERPO PRINCIPAL (IMAGEN IZQ + TEXTO DER)
  // ==========================================
  // @ts-ignore
  const startYMain = doc.lastAutoTable.finalY + 2;
  const footerHeight = 40; // Espacio reservado para el pie de página
  const availableHeight = height - startYMain - footerHeight;

  autoTable(doc, {
    startY: startYMain,
    theme: 'grid',
    body: [
      // FILA 1: La celda izquierda tiene rowSpan 4 para ocupar TODO el alto lateral
      [
        { 
            content: '', 
            rowSpan: 4, 
            styles: { 
                minCellWidth: 90, // Ancho fijo para la zona de imagen
                valign: 'middle', 
                halign: 'center' 
            } 
        },
        // Columna Derecha: Falla
        { 
            content: `Falla / Failure:\n\n${incident.description}`, 
            styles: { 
                fillColor: COLORS.darkGray, 
                textColor: COLORS.headerText, 
                fontStyle: 'bold',
                minCellHeight: availableHeight * 0.15 
            } 
        }
      ],
      // FILA 2: Causa (Derecha)
      [
        { 
            content: `Causa-Hipótesis / Cause-Hypothesis:\n\n${incident.category || 'C1. Defecto en material identificado en estación 70.'}`, 
            styles: { fillColor: COLORS.lightGray, minCellHeight: availableHeight * 0.2 } 
        }
      ],
      // FILA 3: Análisis (Derecha)
      [
        { 
            content: `Análisis / Analysis:\n\nSe confirma desviación visual en la pieza.\n${incident.description}`, 
            styles: { fillColor: COLORS.lightGray, minCellHeight: availableHeight * 0.35 } 
        }
      ],
      // FILA 4: Acciones (Derecha)
      [
        { 
            content: `Acciones Inmediatas / Immediate Actions:\n\n1. Se revisa material en el PoU.\n2. Se notifica a calidad.\n3. 100% Sorting.`, 
            styles: { fillColor: COLORS.headerText, textColor: COLORS.textBlack, fontStyle: 'bold', minCellHeight: availableHeight * 0.3 } 
        }
      ]
    ],
    styles: {
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak'
    },
    columnStyles: {
        0: { cellWidth: 90 }, // Columna Imagen
        1: { cellWidth: 'auto' } // Columna Texto
    },
    // --- INYECCIÓN DE IMAGEN EN LA CELDA UNIFICADA ---
    didDrawCell: (data) => {
        // Solo dibujamos en la columna 0 y fila 0 (que es la fusionada)
        if (data.column.index === 0 && data.row.index === 0 && data.section === 'body') {
            
            // Fondo suave para el área de imagen
            doc.setFillColor("#f3f4f6");
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');

            // Etiqueta
            doc.setFontSize(7);
            doc.setTextColor("#6b7280");
            doc.text("EVIDENCIA VISUAL", data.cell.x + 5, data.cell.y + 5);

            if (incident.evidenceUrl) {
                try {
                    const padding = 4;
                    // Espacio disponible dentro de la celda
                    const availableW = data.cell.width - (padding * 2);
                    const availableH = data.cell.height - (padding * 2);

                    // Insertar imagen centrada y contenida (CONTAIN)
                    doc.addImage(
                        incident.evidenceUrl, 
                        'JPEG', 
                        data.cell.x + padding, 
                        data.cell.y + padding + 5, 
                        availableW, 
                        availableH - 5
                    );
                    
                    // Borde rojo fino alrededor de la imagen (estilo técnico)
                    doc.setDrawColor(COLORS.alertRed);
                    doc.setLineWidth(0.3);
                    doc.rect(data.cell.x + padding, data.cell.y + padding + 5, availableW, availableH - 5);

                } catch (e) {
                    doc.text("(Error cargando img)", data.cell.x + 10, data.cell.y + 20);
                }
            }
        }
    }
  });

  // ==========================================
  // 4. PIE DE PÁGINA DE DATOS (Tabla inferior)
  // ==========================================
  // @ts-ignore
  const finalY = doc.lastAutoTable.finalY + 2;

  autoTable(doc, {
    startY: finalY,
    theme: 'grid',
    head: [
        [
            { content: 'Folio(s) afectado(s)', styles: { fillColor: COLORS.headerBlue, textColor: COLORS.headerText } },
            { content: 'Motores afectados', styles: { fillColor: COLORS.headerBlue, textColor: COLORS.headerText } },
            { content: 'Piezas NOK', styles: { fillColor: COLORS.headerBlue, textColor: COLORS.headerText } },
            { content: 'ESP-Q MoMo', styles: { fillColor: COLORS.headerBlue, textColor: COLORS.headerText } }
        ]
    ],
    body: [
        [
            { content: incident.folio, styles: { fillColor: COLORS.lightGray, fontStyle: 'bold' } },
            { content: '1', styles: { fillColor: COLORS.lightGray } },
            { content: '1', styles: { fillColor: COLORS.lightGray } },
            { content: incident.responsibleName || 'Nombre del especialista', styles: { fillColor: COLORS.lightGray } }
        ],
        // Fila extra para códigos DMC
        [
            { content: `DMC: ${incident.area || 'XAXXXXXXXXXXXXXXXXXXXXX'}`, colSpan: 4, styles: { fontSize: 7, halign: 'left' } }
        ]
    ],
    styles: { 
        halign: 'center', 
        fontSize: 8, 
        cellPadding: 1.5,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
    },
    margin: { left: margin, right: margin }
  });

  // ==========================================
  // 5. PIE DE PÁGINA LEGAL OBLIGATORIO
  // ==========================================
  const footerY = height - 12;
  
  doc.setFontSize(6);
  doc.setTextColor(COLORS.textBlack);
  
  // Bloque Izquierdo
  doc.text("Elaboró: Calidad Montaje", margin, footerY);
  doc.text("Presentación fallas / Calidad Montaje / 4202", margin, footerY + 3);
  doc.text("KSU: 2.2 / 7 años", margin, footerY + 6);

  // Bloque Central (Fecha Impresión)
  const today = new Date().toLocaleDateString();
  doc.text(today, width / 2, footerY + 6, { align: "center" });

  // Bloque Derecho (Obligatorio)
  doc.setFont("helvetica", "bold");
  doc.text("INTERNAL / INTERNO", width - margin, footerY + 6, { align: "right" });
  
  // Línea de corte o marca de agua inferior
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.1);
  doc.line(margin, footerY - 2, width - margin, footerY - 2);

  doc.save(`QTICKER_${incident.folio}.pdf`);
};