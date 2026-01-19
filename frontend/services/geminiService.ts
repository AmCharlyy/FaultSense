// Importamos el modelo YA configurado y seguro desde firebaseConfig
import { model } from "./firebaseConfig";

// --- UTILIDADES DE RESILIENCIA (Anti-Error 429) ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Detectar errores de cuota (429) o servicio no disponible (503)
    if (retries > 0 && (error.message?.includes("429") || error.code === 429 || error.status === 503 || error.message?.includes("quota"))) {
      console.warn(`⚠️ IA saturada o límite de cuota. Reintentando en ${delay/1000}s...`);
      await wait(delay);
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// ==========================================
// 1. VOZ A REPORTE TÉCNICO (Nivel Ingeniero)
// ==========================================
export interface SmartIncidentData {
  client: string;
  area: string;
  origin: string;
  category: string;
  description: string;
}

export const analyzeVoiceTranscript = async (transcript: string): Promise<SmartIncidentData | null> => {
  try {
    // PROMPT PROFESIONAL: Instruimos a la IA para que actúe como experto VDA/IATF
    const prompt = `
      Actúa como un Auditor de Calidad Senior en la industria automotriz (experto en normas VDA 6.3 e IATF 16949).
      
      Tu tarea es procesar el siguiente reporte dictado por voz (que puede ser informal o desordenado) y convertirlo en un REGISTRO TÉCNICO FORMAL.

      TRANSCRIPCIÓN DE VOZ:
      "${transcript}"

      INSTRUCCIONES DE REDACCIÓN:
      1.  **Extracción de Datos:** Identifica Cliente, Área y Proveedor/Origen. Si no se dicen explícitamente, intenta inferirlos por el contexto o déjalos vacíos ("").
      2.  **Categorización:** Clasifica el defecto en una categoría estándar (ej: Dimensional, Superficial, Material, Eléctrico, Ensamble).
      3.  **Descripción Técnica (IMPORTANTE):**
          - NO transcribas literalmente. Reescribe lo sucedido usando terminología técnica precisa.
          - Elimina coloquialismos (ej: en vez de "está chueco", escribe "presenta desviación geométrica").
          - Estructura: "Se detecta [defecto] en [componente], ubicado en [zona]. La condición representa un incumplimiento de [criterio posible]."
          - Sé conciso pero exhaustivo (máximo 3 líneas).

      RESPONDE ÚNICAMENTE CON ESTE JSON:
      {
        "client": "Nombre del cliente normalizado",
        "area": "Ubicación técnica",
        "origin": "Proveedor o proceso origen",
        "category": "Categoría técnica del defecto",
        "description": "Texto técnico redactado profesionalmente"
      }
    `;

    // Usamos el modelo importado de Firebase
    const result = await retryWithBackoff(() => model.generateContent(prompt));
    // Usamos (result as any) para evitar conflictos de tipos entre SDKs
    const response = await (result as any).response;
    const text = response.text();
    const cleanJson = text.replace(/```json|```/g, '').trim();
    
    return JSON.parse(cleanJson) as SmartIncidentData;

  } catch (error) {
    console.error("Error Smart Voice (Firebase):", error);
    return null;
  }
};

// ==========================================
// 2. ANÁLISIS Y CONSULTORÍA (IA ASSIST)
// ==========================================
export const analyzeIncidentDescription = async (description: string, title: string, origin: string) => {
  try {
    const prompt = `
      Actúa como un Ingeniero de Calidad experto en resolución de problemas (8D, Ishikawa).
      Analiza este incidente reportado:
      
      - Título: ${title}
      - Origen: ${origin}
      - Descripción del Problema: "${description}"
      
      TAREAS:
      1.  **Evaluación de Severidad:** Determina el nivel (LOW, MEDIUM, HIGH, CRITICAL) basándote en el riesgo de parada de línea, seguridad o retrabajo costoso.
      2.  **Sugerencia Técnica:** Proporciona una recomendación técnica inmediata. Sugiere una acción de contención (ej: "Segregar lote", "Inspección 100%") y una posible causa raíz a investigar.
      3.  **Etiquetado:** Genera 3-5 etiquetas técnicas (Tags) para facilitar la búsqueda futura.

      RESPONDE ÚNICAMENTE CON ESTE JSON:
      {
        "severity": "NIVEL",
        "suggestion": "Texto de la recomendación técnica...",
        "tags": ["Tag1", "Tag2", "Tag3"]
      }
    `;

    const result = await retryWithBackoff(() => model.generateContent(prompt));
    const response = await (result as any).response;
    const text = response.text();
    
    return JSON.parse(text.replace(/```json|```/g, '').trim());

  } catch (error) {
    console.error("Error Analysis Text (Firebase):", error);
    return { 
      severity: "MEDIUM", 
      suggestion: "No se pudo conectar con el servicio de IA seguro.", 
      tags: ["Error-Conexión"] 
    };
  }
};

// ==========================================
// 3. ANÁLISIS VISUAL DE PIEZAS (Visión Computarizada)
// ==========================================
export const analyzePartImage = async (imageBase64: string) => {
  try {
    const base64Data = imageBase64.split(',')[1] || imageBase64;

    const prompt = `
      Eres un sistema de visión artificial para control de calidad industrial.
      Analiza la imagen proporcionada buscando defectos en la pieza automotriz.

      INSTRUCCIONES:
      1.  Identifica el tipo de pieza visible.
      2.  Detecta anomalías (golpes, rayones, porosidad, rebaba, óxido, faltantes).
      3.  Si la pieza parece correcta pero la imagen es de un reporte de fallo, describe qué se debería inspeccionar.
      
      RESPONDE ÚNICAMENTE CON ESTE JSON:
      {
        "description": "Descripción técnica detallada de los hallazgos visuales",
        "category": "Categoría visual (ej: Daño Material, Acabado Superficial)",
        "severity": "MEDIUM",
        "tags": ["Visual", "NombrePieza", "TipoDefecto"]
      }
    `;

    // Formato correcto para Firebase Vertex AI (inlineData)
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg"
      }
    };

    const result = await retryWithBackoff(() => model.generateContent([prompt, imagePart]));

    const response = await (result as any).response;
    const text = response.text();
    return JSON.parse(text.replace(/```json|```/g, '').trim());

  } catch (error) {
    console.error("Error Image Analysis (Firebase):", error);
    return { 
      description: "No se pudo procesar la imagen.", 
      category: "No-Clasificado", 
      severity: "MEDIUM", 
      tags: [] 
    };
  }
};