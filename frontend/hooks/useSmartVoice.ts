import { useState, useRef, useEffect } from 'react';
import { analyzeVoiceTranscript, SmartIncidentData } from '../services/geminiService';

export const useSmartVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>(""); // Acumulador de texto

  useEffect(() => {
    // Configuración inicial de Web Speech API
    if ('webkitSpeechRecognition' in window || 'speechRecognition' in window) {
      // @ts-ignore
      const SpeechRecognition = window.webkitSpeechRecognition || window.speechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true; // IMPORTANTE: Permite hablar corrido sin cortes
      rec.interimResults = true; // Para ver lo que dices en tiempo real
      rec.lang = 'es-MX';

      rec.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          }
        }
        // Guardamos en el ref para no perderlo entre renders
        if(finalTranscript) {
            transcriptRef.current += finalTranscript;
        }
      };

      rec.onend = () => {
        // Si se detiene "solo", cambiamos el estado visual
        if (isListening) setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const startSmartListening = () => {
    transcriptRef.current = ""; // Limpiar buffer anterior
    setIsListening(true);
    recognitionRef.current?.start();
  };

  const stopAndAnalyze = async (onSuccess: (data: SmartIncidentData) => void) => {
    setIsListening(false);
    recognitionRef.current?.stop();
    
    // Si no se dijo nada, salir
    if (!transcriptRef.current) return;

    setIsProcessing(true);
    
    // Enviamos TODO lo que hablaste a Gemini
    const data = await analyzeVoiceTranscript(transcriptRef.current);
    
    if (data) {
      onSuccess(data);
    } else {
      alert("No pude entender el reporte. Intenta de nuevo.");
    }
    setIsProcessing(false);
  };

  return {
    isListening,
    isProcessing,
    startSmartListening,
    stopAndAnalyze
  };
};