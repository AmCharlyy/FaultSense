import { useState, useRef } from 'react';
import { processVoiceWithOpenAI, SmartIncidentData } from '../services/openAIService';

export const useSmartVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startSmartListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsListening(true);
    } catch (err) {
      alert("No se pudo acceder al micrófono. Revisa los permisos.");
    }
  };

  const stopAndAnalyze = async (onSuccess: (data: SmartIncidentData) => void) => {
    if (!mediaRecorderRef.current) return;
    setIsListening(false);
    setIsProcessing(true);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      const data = await processVoiceWithOpenAI(audioBlob);
      if (data) onSuccess(data);
      setIsProcessing(false);
      // Limpiar micrófono
      mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    };

    mediaRecorderRef.current.stop();
  };

  return { isListening, isProcessing, startSmartListening, stopAndAnalyze };
};