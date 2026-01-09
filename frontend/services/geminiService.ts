import { GoogleGenAI } from "@google/genai";
import { Incident } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeIncidentDescription = async (description: string, title: string, equipment: string): Promise<{ severity: string; suggestion: string, tags: string[] }> => {
  try {
    const prompt = `
      Actúa como un Ingeniero Senior de Manufactura y Control de Calidad en una planta de producción de motores de alta gama.
      Analiza el siguiente reporte de falla en línea de producción.
      
      Equipo Afectado: ${equipment}
      Título: ${title}
      Descripción: ${description}
      
      Devuelve un JSON estricto (sin markdown) con la siguiente estructura:
      {
        "severity": "Baja" | "Media" | "Alta" | "Crítica",
        "suggestion": "Sugerencia técnica concisa para el técnico de mantenimiento (max 40 palabras).",
        "tags": ["Array", "de", "3-5", "tags", "técnicos", "relevantes"]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) return { severity: 'Media', suggestion: 'No se pudo generar análisis.', tags: [] };
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error analyzing incident:", error);
    return { severity: 'Media', suggestion: 'Error al conectar con IA.', tags: [] };
  }
};

export const generateExecutiveReport = async (incidents: Incident[], timeRange: string): Promise<string> => {
  try {
    const summary = incidents.slice(0, 15).map(i => `- [${i.severity}] ${i.origin}: ${i.title} (${i.status})`).join('\n');
    
    const prompt = `
      Genera un RESUMEN EJECUTIVO DE ANÁLISIS DE PLANTA (${timeRange}).
      Eres un consultor experto en Lean Manufacturing. Analiza los siguientes datos de incidentes y genera un texto narrativo de 3 párrafos.
      
      Datos recientes:
      ${summary}
      
      Estructura del reporte:
      1. Resumen de Estabilidad: Estado general de la línea.
      2. Puntos Críticos: Máquinas o áreas que más fallan.
      3. Recomendación Estratégica: Acciones para la gerencia.

      Tono: Formal, directo y basado en datos. No uses markdown con negritas excesivas, solo texto limpio.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No se pudo generar el reporte ejecutivo.";
  } catch (error) {
    console.error("Error generating report:", error);
    return "Error generando el reporte ejecutivo.";
  }
};

export const analyzePartImage = async (base64Image: string): Promise<{ defectType: string; description: string; action: string }> => {
  try {
    const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid image format");
    }
    const mimeType = matches[1];
    const data = matches[2];

    const prompt = `
      Actúa como un inspector de control de calidad visual en manufactura.
      Analiza la imagen de la pieza proporcionada.
      
      Identifica defectos visibles como:
      - Visual (Rayones, golpes, decoloración)
      - Dimensional (Deformaciones visibles)
      - Material (Porosidad, grietas, quemaduras)
      - Ensamble (Componentes faltantes o mal alineados)
      
      Determina la acción recomendada:
      - Scrap: Defecto crítico no recuperable.
      - Rework: Defecto reparable.
      - Concession: Defecto menor aceptable bajo concesión.
      - Pending: No se puede determinar con certeza.

      Devuelve un JSON estricto con:
      {
        "defectType": "Visual" | "Dimensional" | "Material" | "Ensamble" | "Otro",
        "description": "Breve descripción técnica del defecto (max 15 palabras).",
        "action": "Scrap" | "Rework" | "Concession" | "Pending"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: data
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) return { defectType: 'Otro', description: 'Análisis no disponible.', action: 'Pending' };

    return JSON.parse(text);
  } catch (error) {
    console.error("Error analyzing part image:", error);
    return { defectType: 'Otro', description: 'Error de análisis.', action: 'Pending' };
  }
};