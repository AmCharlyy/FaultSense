import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // Importante: npm install jspdf-autotable
import { Incident } from "../types";

// --- Configuración de Estilo Premium ---
const COLORS = {
  primary: "#1e3a8a",    // Azul corporativo oscuro
  secondary: "#64748b",  // Slate gray para textos secundarios
  accent: "#f59e0b",     // Acento sutil (opcional)
  text: "#1e293b",       // Texto principal (no usar negro puro)
  lightBg: "#f8fafc",    // Fondo muy suave
  white: "#ffffff"
};

export const generateIncidentReport = (incident: Incident) => {
  // Configuración A4 estándar
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;

  // --- Helpers ---
  const addHeader = () => {
    // Franja decorativa lateral
    doc.setFillColor(COLORS.primary);
    doc.rect(0, 0, 6, pageHeight, 'F');

    // Título Principal
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(COLORS.primary);
    doc.text("REPORTE DE INCIDENCIA", margin, 30);
    
    // Subtítulo / Sistema
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.secondary);
    doc.text("SISTEMA DE CONTROL DE CALIDAD Q-TICKER", margin, 36);

    // Caja de Folio y Fecha (Diseño flotante derecha)
    const rightInfoX = pageWidth - margin - 50;
    doc.setTextColor(COLORS.text);
    doc.setFontSize(10);
    doc.text("FOLIO:", rightInfoX, 30, { align: "right" });
    doc.text("FECHA:", rightInfoX, 36, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text(incident.folio, pageWidth - margin, 30, { align: "right" });
    doc.text(new Date(incident.createdAt).toLocaleDateString(), pageWidth - margin, 36, { align: "right" });

    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, 45, pageWidth - margin, 45);
  };

  const addFooter = (pageNumber: number, totalPages: number) => {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const footerText = `Generado por Q-Ticker Platform | Página ${pageNumber} de ${totalPages}`;
    doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: "center" });
  };

  // --- 1. Renderizar Header ---
  addHeader();

  // --- 2. Tabla de Detalles (Layout de 2 Columnas simulado con AutoTable) ---
  // Usar AutoTable da un alineado perfecto y fondos profesionales
  autoTable(doc, {
    startY: 55,
    margin: { left: margin, right: margin },
    head: [['INFORMACIÓN GENERAL', 'UBICACIÓN Y ORIGEN']],
    body: [
      [
        `Estado: ${incident.status}\nTurno: ${incident.shift}\nFecha Sch.: ${incident.schadentischDate}`, 
        `Cliente: ${incident.client}\nÁrea: ${incident.area}\nOrigen: ${incident.origin}`
      ],
      [
        `Sorte: ${incident.sorte}\nResponsable: ${incident.responsibleName || 'N/A'}`,
        `Categoría: ${incident.category}`
      ]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      textColor: COLORS.text,
      fontSize: 9,
      cellPadding: 6,
      lineColor: [230, 230, 230]
    },
    columnStyles: {
      0: { cellWidth: 'auto' }, // Columna 1
      1: { cellWidth: 'auto' }  // Columna 2
    },
    styles: { overflow: 'linebreak' },
  });

  // --- 3. Descripción Detallada ---
  // @ts-ignore (para evitar errores de tipado con lastAutoTable)
  let currentY = doc.lastAutoTable.finalY + 15;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(COLORS.primary);
  doc.text("DESCRIPCIÓN DETALLADA", margin, currentY);
  
  // Fondo gris suave para la descripción
  currentY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.text);
  
  const descText = doc.splitTextToSize(incident.description, pageWidth - (margin * 2) - 4);
  const textHeight = descText.length * 5;
  
  // Dibujar caja de fondo para la descripción
  doc.setFillColor(COLORS.lightBg);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), textHeight + 10, 2, 2, 'FD');
  
  doc.text(descText, margin + 4, currentY + 7);
  
  currentY += textHeight + 25;

  // --- 4. Evidencia Visual (Manejo inteligente de salto de página) ---
  if (incident.evidenceUrl) {
    // Si no hay espacio (aprox 80mm), nueva página
    if (currentY + 80 > pageHeight - 40) {
      doc.addPage();
      addHeader();
      currentY = 55;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(COLORS.primary);
    doc.text("EVIDENCIA VISUAL", margin, currentY);
    
    doc.setDrawColor(COLORS.secondary);
    doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);

    try {
      // Caja contenedora de imagen
      const imgHeight = 80; // Altura fija para mantener uniformidad
      const imgWidth = 120; // Ancho máximo
      const imgX = (pageWidth - imgWidth) / 2; // Centrado
      
      // Nota: addImage asume que la URL es accesible o base64. 
      // Si tienes problemas de CORS, deberás convertirla a base64 antes.
      doc.addImage(incident.evidenceUrl, 'JPEG', imgX, currentY + 10, imgWidth, imgHeight);
      
      // Borde alrededor de la imagen para que se vea "foto"
      doc.setDrawColor(200, 200, 200);
      doc.rect(imgX, currentY + 10, imgWidth, imgHeight);
      
      currentY += imgHeight + 20;
    } catch (e) {
      console.error("Error cargando imagen", e);
      doc.setFontSize(8);
      doc.setTextColor("red");
      doc.text("No se pudo cargar la evidencia visual.", margin, currentY + 10);
      currentY += 20;
    }
  }

  // --- 5. Firmas (Siempre al final, verifica espacio) ---
  const signatureHeight = 40;
  if (currentY + signatureHeight > pageHeight - 30) {
    doc.addPage();
    addHeader();
    currentY = 55;
  }

  // Posicionar firmas al final del contenido o al pie de página si hay mucho espacio
  // Optamos por "sticky bottom" si hay espacio, o "flow" si no.
  let sigY = Math.max(currentY + 10, pageHeight - 50);

  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);

  // Firma 1
  doc.line(margin + 10, sigY, margin + 80, sigY);
  doc.setFontSize(9);
  doc.setTextColor(COLORS.secondary);
  doc.text("FIRMA RESPONSABLE", margin + 45, sigY + 5, { align: "center" });
  doc.setFontSize(7);
  doc.text(incident.responsibleName || "", margin + 45, sigY + 9, { align: "center" });

  // Firma 2
  doc.line(pageWidth - margin - 80, sigY, pageWidth - margin - 10, sigY);
  doc.setFontSize(9);
  doc.text("FIRMA CALIDAD / CLIENTE", pageWidth - margin - 45, sigY + 5, { align: "center" });

  // --- 6. Numeración de Páginas ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  // --- Guardar ---
  doc.save(`QTICKER_${incident.folio}_${new Date().toISOString().split('T')[0]}.pdf`);
};