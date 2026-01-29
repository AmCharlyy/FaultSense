export interface SmartIncidentData {
  partNumber: string;
  partName: string; // <--- Agregado a la interfaz
  schadentischDate: string;
  shift: number;
  sorte: number;
  status: string;
  origin: string;
  client: string;
  area: string;
  responsibleName: string;
  paFailure: string;
  paHypothesis: string;
  paAnalysis: string;
  paActions: string;
  paConfirmed: number;
  paSegregated: number;
  paRepetitive: 'Si' | 'No';
  paQmomo: string;
  paAdditional: string;
  paResponse: string;
}

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export const processVoiceWithOpenAI = async (audioBlob: Blob): Promise<SmartIncidentData | null> => {
  try {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.wav");
    formData.append("model", "whisper-1");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
      body: formData
    });
    const { text: transcript } = await whisperRes.json();

    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Eres un experto en calidad. Extrae datos de un dictado industrial.
Devuelve EXCLUSIVAMENTE un JSON con estas llaves exactas:
partNumber (string), shift (number: 1, 2 o 3), sorte (number), status (string: "Sin respuesta", "En seguimiento", "Cerrado"), 
origin (string), client (string), area (string), responsibleName (string), 
paFailure (string), paHypothesis (string), paAnalysis (string), paActions (string), 
paConfirmed (number), paSegregated (number), paRepetitive (string: "Si" o "No").`
          },
          { role: "user", content: `Dictado: "${transcript}"` }
        ],
        response_format: { type: "json_object" }
      })
    });

    const gptData = await gptRes.json();
    return JSON.parse(gptData.choices[0].message.content);
  } catch (error) {
    console.error("Error en proceso OpenAI:", error);
    return null;
  }
};

// Añadir esta función a tu archivo openAIService.ts existente
export const analyzeFailureWithOpenAI = async (failureDescription: string) => {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${OPENAI_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Eres un ingeniero de calidad experto en análisis de causa raíz (8Ds, 5 Whys). 
            Analiza la falla y devuelve un JSON con:
            "paHypothesis": una causa probable técnica y concisa. Se resumido con informacion clave,
            "paAnalysis": un análisis detallado del impacto y posible origen. Se resumido con informacion clave, maximo 50 palabras.`
          },
          { role: "user", content: `Falla detectada: "${failureDescription}"` }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error("Error en el análisis de falla:", error);
    return null;
  }
};