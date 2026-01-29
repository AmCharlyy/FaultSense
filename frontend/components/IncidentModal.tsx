import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Loader2, UploadCloud, ChevronDown, Camera, Trash2, ImageIcon, Mic, ClipboardList, ArrowLeft } from 'lucide-react';
import { Incident, Severity, Status } from '../types';
import { analyzeIncidentDescription } from '../services/geminiService';
import { processVoiceWithOpenAI, analyzeFailureWithOpenAI } from '../services/openAIService';
import { DamageAnnotator } from './DamageAnnotator'; 
// 1. IMPORTAR EL HOOK DE VOZ INTELIGENTE
import { useSmartVoice } from '../hooks/useSmartVoice';
import { db } from '../services/firebaseConfig';
import { collection, getDocs, addDoc } from 'firebase/firestore';


interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (incident: any) => void;
  incidentToEdit?: Incident | null;
  initialView?: 'default' | 'pre-analysis';
}

export const IncidentModal: React.FC<IncidentModalProps> = ({ isOpen, onClose, onSave, incidentToEdit, initialView = 'default' }) => {
  // --- Estados del Formulario ---
  const [formData, setFormData] = useState({
    folio: '',
    title: '',
    schadentischDate: new Date().toISOString().split('T')[0],
    shift: 1,
    sorte: 0,
    status: 'Sin respuesta', // Valor por defecto solicitado
    origin: '',
    client: '',
    area: '',
    responsibleName: '',
    description: '',
    severity: Severity.MEDIUM,
    category: 'General',
    // Nuevos campos
    partNumber: '',
    partName: '',
    supplier: '',
    partResponsible: '',
    // Campos de PRE-ANALISIS
    paFailure: '',
    paHypothesis: '',
    paAnalysis: '',
    paActions: '',
    paAdditional: '',
    paConfirmed: 0,
    paSegregated: 0,
    paRepetitive: 'No',
    paQmomo: '',
    paResponse: ''
  });

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingFailure, setIsAnalyzingFailure] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [partsCatalog, setPartsCatalog] = useState<any[]>([]); // Estado para el catálogo real de BD
  const [isLoadingParts, setIsLoadingParts] = useState(false); // Nuevo estado de carga
  const [showPreAnalysis, setShowPreAnalysis] = useState(false); // Estado para mostrar el formulario de Pre-Análisis
  
  // --- Estados de Imagen y Anotador ---
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAnnotator, setShowAnnotator] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. INICIALIZAR EL HOOK DE VOZ
  const { isListening, isProcessing, startSmartListening, stopAndAnalyze } = useSmartVoice();

  // 3. CALLBACK PARA LLENAR LOS CAMPOS AUTOMÁTICAMENTE
  // 3. CALLBACK PARA LLENAR LOS CAMPOS AUTOMÁTICAMENTE (ACTUALIZADO)
  const handleSmartFill = (data: any) => {
  console.log("Datos recibidos de OpenAI:", data);

  setFormData(prev => {
    const updated = { ...prev };

    // 1. Mapeo de campos de texto y selección
    if (data.client) updated.client = data.client;
    if (data.area) updated.area = data.area;
    if (data.origin) updated.origin = data.origin;
    if (data.responsibleName) updated.responsibleName = data.responsibleName;
    if (data.status) updated.status = data.status;
    
    // 2. Mapeo de campos numéricos (Aseguramos que sean números reales)
    if (data.shift) updated.shift = Number(data.shift);
    if (data.sorte) updated.sorte = Number(data.sorte);
    
    // 3. Mapeo de campos de PRE-ANÁLISIS
    if (data.paFailure) updated.paFailure = data.paFailure;
    if (data.paHypothesis) updated.paHypothesis = data.paHypothesis;
    if (data.paAnalysis) updated.paAnalysis = data.paAnalysis;
    if (data.paActions) updated.paActions = data.paActions;
    if (data.paConfirmed) updated.paConfirmed = Number(data.paConfirmed);
    if (data.paSegregated) updated.paSegregated = Number(data.paSegregated);
    if (data.paRepetitive) updated.paRepetitive = data.paRepetitive; // 'Si' o 'No'

    // 4. Lógica especial para Número de Parte
    if (data.partNumber) {
      const part = partsCatalog.find(p => 
        p.number.toLowerCase().includes(data.partNumber.toLowerCase())
      );
      if (part) {
        updated.partNumber = part.number;
        updated.partName = part.name;
        updated.supplier = part.supplier;
        updated.partResponsible = part.responsible;
        // Si el responsable de la pieza es el mismo del reporte
        if (!data.responsibleName) updated.responsibleName = part.responsible;
      } else {
        updated.partNumber = data.partNumber;
      }
    }

    return updated;
  });
};

  const handleAIAnalysis = async () => {
    if (!formData.paFailure) return alert("Escribe primero la falla");
  
    setIsAnalyzingFailure(true);
    const result = await analyzeFailureWithOpenAI(formData.paFailure);
  
    if (result) {
      setFormData(prev => ({
        ...prev,
        paHypothesis: result.paHypothesis,
        paAnalysis: result.paAnalysis
      }));
    }
    setIsAnalyzingFailure(false);
  };

  // --- EFECTO: CARGAR O CREAR TABLA DE PIEZAS EN BD ---
  useEffect(() => {
    const initializePartsTable = async () => {
      setIsLoadingParts(true); // Iniciamos carga
      const defaultParts = [
        { number: '06H-105-021', name: 'CIGUEÑAL', supplier: 'VOLKSWAGEN GUANAJUATO', responsible: 'Ing. Roberto Gómez' },
        { number: '06K-103-603', name: 'CARTER DE ACEITE', supplier: 'NEMAK MONTERREY', responsible: 'Lic. Ana Torres' },
        { number: '5Q0-615-301', name: 'DISCO DE FRENO', supplier: 'BREMBO PUEBLA', responsible: 'Ing. Carlos Ruiz' }
      ];

      try {
        const partsRef = collection(db, 'parts');
        const snapshot = await getDocs(partsRef);
        
        if (!snapshot.empty) {
          const dbParts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setPartsCatalog(dbParts);
        } else {
          console.log("Tabla de piezas vacía en BD. Creando registros iniciales...");
          try {
             await Promise.all(defaultParts.map(part => addDoc(partsRef, part)));
             alert("¡Éxito! Se creó la colección 'parts' en Firebase correctamente.");
             setPartsCatalog(defaultParts);
          } catch (e: any) {
             console.error("Error creando seed:", e);
             // AVISO VISUAL DE ERROR
             if (e.code === 'permission-denied') {
                alert("⚠️ BLOQUEADO POR FIREBASE: No tienes permisos de escritura.\n\nSolución: Ve a Firebase Console -> Firestore Database -> Reglas y cambia 'allow write: if false' a 'allow write: if request.auth != null'.");
             }
             setPartsCatalog(defaultParts); // Usamos local mientras arreglas los permisos
          }
        }
      } catch (error) {
        console.error("Error al conectar con la base de datos de piezas:", error);
        setPartsCatalog(defaultParts);
      }
      setIsLoadingParts(false); // Terminamos carga
    };

    if (isOpen) {
      initializePartsTable();
    }
  }, [isOpen]);

  // Inicialización de datos
  useEffect(() => {
    if (isOpen) {
      if (incidentToEdit) {
        setFormData({
          folio: incidentToEdit.folio,
          title: incidentToEdit.title,
          schadentischDate: incidentToEdit.schadentischDate,
          shift: incidentToEdit.shift,
          sorte: incidentToEdit.sorte,
          status: incidentToEdit.status as any, // Cast para aceptar strings personalizados
          origin: incidentToEdit.origin,
          client: incidentToEdit.client,
          area: incidentToEdit.area,
          responsibleName: incidentToEdit.responsibleName || incidentToEdit.assignedTo?.name || '',
          description: incidentToEdit.description,
          severity: incidentToEdit.severity,
          category: incidentToEdit.category,
          partNumber: (incidentToEdit as any).partNumber || '',
          partName: (incidentToEdit as any).partName || '',
          supplier: (incidentToEdit as any).supplier || '',
          partResponsible: (incidentToEdit as any).partResponsible || '',
          paFailure: (incidentToEdit as any).paFailure || '',
          paHypothesis: (incidentToEdit as any).paHypothesis || '',
          paAnalysis: (incidentToEdit as any).paAnalysis || '',
          paActions: (incidentToEdit as any).paActions || '',
          paAdditional: (incidentToEdit as any).paAdditional || '',
          paConfirmed: (incidentToEdit as any).paConfirmed || 0,
          paSegregated: (incidentToEdit as any).paSegregated || 0,
          paRepetitive: (incidentToEdit as any).paRepetitive || 'No',
          paQmomo: (incidentToEdit as any).paQmomo || '',
          paResponse: (incidentToEdit as any).paResponse || ''
        });
        setTags(incidentToEdit.tags || []);
        setAiSuggestion(incidentToEdit.aiAnalysis || null);
        setEvidencePreview(incidentToEdit.evidenceUrl || null);
      } else {
        const randomFolio = `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        setFormData({
          folio: randomFolio,
          title: '',
          schadentischDate: new Date().toISOString().split('T')[0],
          shift: 1,
          sorte: 0,
          status: 'Sin respuesta',
          origin: '',
          client: '',
          area: '',
          responsibleName: '',
          description: '',
          severity: Severity.MEDIUM,
          category: 'General',
          partNumber: '',
          partName: '',
          supplier: '',
          partResponsible: '',
          paFailure: '',
          paHypothesis: '',
          paAnalysis: '',
          paActions: '',
          paAdditional: '',
          paConfirmed: 0,
          paSegregated: 0,
          paRepetitive: 'No',
          paQmomo: '',
          paResponse: ''
        });
        setAiSuggestion(null);
        setTags([]);
        setEvidencePreview(null);
      }
      setErrors({});
      setIsDragging(false);
      setShowAnnotator(false);
      setTempImage(null);
      setShowPreAnalysis(initialView === 'pre-analysis');
    }
  }, [isOpen, incidentToEdit, initialView]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: false }));
  };

  // Manejo de selección de pieza (Auto-llenado)
  const handlePartChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPartNumber = e.target.value;
    const part = partsCatalog.find(p => p.number === selectedPartNumber);

    setFormData(prev => ({
      ...prev,
      partNumber: selectedPartNumber,
      partName: part ? part.name : '',
      supplier: part ? part.supplier : '',
      partResponsible: part ? part.responsible : '',
      // Llenamos campos ocultos para compatibilidad con backend
      title: part ? `${part.name} - ${selectedPartNumber}` : prev.title,
      responsibleName: part ? part.responsible : prev.responsibleName
    }));
  };

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setTempImage(result);
        setShowAnnotator(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  const triggerFileSelect = () => fileInputRef.current?.click();
  
  const removeEvidence = (e: React.MouseEvent) => {
    e.stopPropagation(); setEvidencePreview(null); 
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnnotatorSave = (finalImage: string) => {
    setEvidencePreview(finalImage);
    setTempImage(null);
    setShowAnnotator(false);
  };

  const handleAnnotatorCancel = () => {
    if (tempImage && !evidencePreview) {
        setEvidencePreview(tempImage);
    }
    setTempImage(null);
    setShowAnnotator(false);
  };

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};
    let isValid = true;
    const requiredFields = ['folio', 'schadentischDate', 'origin', 'client', 'area', 'partNumber']; // Quitamos title/desc, agregamos partNumber
    requiredFields.forEach(field => {
      if (!(formData as any)[field] || (formData as any)[field].toString().trim() === '') {
        newErrors[field] = true; isValid = false;
      }
    });
    setErrors(newErrors);
    return isValid;
  };

  const handleAnalyze = async () => {
    if (formData.description.length < 5) return;
    setIsAnalyzing(true);
    const result = await analyzeIncidentDescription(formData.description, formData.title, formData.origin);
    setFormData(prev => ({ ...prev, severity: result.severity as Severity }));
    setAiSuggestion(result.suggestion);
    setTags(result.tags);
    setIsAnalyzing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    onSave({
      ...incidentToEdit,
      ...formData,
      shift: Number(formData.shift),
      sorte: Number(formData.sorte),
      tags: tags,
      aiAnalysis: aiSuggestion || undefined,
      evidenceUrl: evidencePreview || undefined,
      createdAt: incidentToEdit ? incidentToEdit.createdAt : new Date().toISOString()
    });
    onClose();
  };

  const getInputClass = (fieldName: string) => `
    w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm text-gray-900 
    outline-none transition-all placeholder-gray-400
    ${errors[fieldName] ? 'border-red-300 focus:ring-2 focus:ring-red-100' : 'border-gray-200 focus:ring-2 focus:ring-black/5 focus:border-gray-400'}
  `;
  const labelClass = "block text-xs font-semibold text-gray-500 mb-1.5 ml-1 uppercase tracking-wide";
  const selectClass = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-black/5 outline-none appearance-none cursor-pointer";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-3xl overflow-hidden animate-[scaleIn_0.2s_ease-out] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 flex justify-between items-center border-b border-gray-100 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Q-TICKER: {incidentToEdit ? 'Editar Registro' : 'Nuevo Registro'}</h2>
            <p className="text-sm text-gray-500">Sistema de Control de Fallas y Calidad</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto custom-scrollbar">
          {showPreAnalysis ? (
            // --- FORMULARIO DE PRE-ANÁLISIS ---
            <div className="space-y-6 animate-in slide-in-from-right-4">
               <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                  <button type="button" onClick={() => setShowPreAnalysis(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                     <ArrowLeft size={20} className="text-gray-600" />
                  </button>
                  <div>
                     <h3 className="text-lg font-bold text-gray-900">Pre-Análisis de Falla</h3>
                     <p className="text-xs text-gray-500">Complete la información técnica preliminar</p>
                  </div>
               </div>

               {/* --- SECCIÓN DE PRE-ANÁLISIS EN IncidentModal.tsx --- */}
<div>
  <label className={labelClass}>Falla</label>
  <textarea 
    name="paFailure" 
    value={formData.paFailure} 
    onChange={handleChange} 
    rows={2} 
    className={getInputClass('paFailure')} 
    placeholder="Descripción de la falla..." 
  />

  {/* BOTÓN DE ANÁLISIS IA: Colócalo justo aquí */}
  <button
    type="button"
    onClick={handleAIAnalysis}
    disabled={isAnalyzingFailure || !formData.paFailure.trim()}
    className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-purple-100 transition-all border border-purple-200 disabled:opacity-50 shadow-sm"
  >
    {isAnalyzingFailure ? (
      <>
        <Loader2 size={14} className="animate-spin text-purple-600" />
        Analizando Falla...
      </>
    ) : (
      <>
        <Sparkles size={14} className="text-purple-600" />
        Sugerir Causa y Análisis con IA
      </>
    )}
  </button>
</div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                     <label className={labelClass}>Causa / Hipótesis</label>
                     <textarea name="paHypothesis" value={formData.paHypothesis} onChange={handleChange} rows={3} className={getInputClass('paHypothesis')} placeholder="Posible causa raíz..." />
                  </div>
                  <div>
                     <label className={labelClass}>Análisis</label>
                     <textarea name="paAnalysis" value={formData.paAnalysis} onChange={handleChange} rows={3} className={getInputClass('paAnalysis')} placeholder="Detalles del análisis..." />
                  </div>
               </div>

               <div>
                  <label className={labelClass}>Acciones Inmediatas</label>
                  <textarea name="paActions" value={formData.paActions} onChange={handleChange} rows={2} className={getInputClass('paActions')} placeholder="Acciones de contención..." />
               </div>

               <div className="grid grid-cols-2 gap-5">
                  <div>
                     <label className={labelClass}>Confirmados (Cant)</label>
                     <input type="number" name="paConfirmed" value={formData.paConfirmed} onChange={handleChange} className={getInputClass('paConfirmed')} />
                  </div>
                  <div>
                     <label className={labelClass}>Segregados (Cant)</label>
                     <input type="number" name="paSegregated" value={formData.paSegregated} onChange={handleChange} className={getInputClass('paSegregated')} />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-5">
                  <div>
                     <label className={labelClass}>Repetitivo</label>
                     <select name="paRepetitive" value={formData.paRepetitive} onChange={handleChange} className={selectClass}>
                        <option value="No">No</option>
                        <option value="Si">Si</option>
                     </select>
                  </div>
                  <div>
                     <label className={labelClass}>Esp. Q-MOMO</label>
                     <input name="paQmomo" value={formData.paQmomo} onChange={handleChange} className={getInputClass('paQmomo')} placeholder="Especificación..." />
                  </div>
               </div>

               <div>
                  <label className={labelClass}>Información Adicional</label>
                  <textarea name="paAdditional" value={formData.paAdditional} onChange={handleChange} rows={2} className={getInputClass('paAdditional')} />
               </div>

               <div>
                  <label className={labelClass}>Respuesta Responsable</label>
                  <textarea name="paResponse" value={formData.paResponse} onChange={handleChange} rows={2} className={getInputClass('paResponse')} placeholder="Comentarios del responsable..." />
               </div>
            </div>
          ) : (
            // --- FORMULARIO PRINCIPAL ---
            <div className="space-y-6 animate-in slide-in-from-left-4">
            
            {/* 4. INTEGRACIÓN VISUAL: BARRA DE DICTADO INTELIGENTE */}
          {!incidentToEdit && ( // Solo mostrar en nuevos registros
            <div className="mb-8 p-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl shadow-lg">
                <div className="bg-white rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Sparkles size={16} className="text-indigo-500" /> 
                            Llenado Rápido por Voz
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            {isListening 
                                ? "🎙️ Escuchando... Describe el problema, cliente, ubicación y origen." 
                                : isProcessing 
                                    ? "🧠 Analizando reporte y llenando campos..."
                                    : "Presiona el micrófono y habla corrido. La IA llenará el formulario por ti."}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
  {isProcessing ? (
    // Estado: Procesando con IA (Se muestra mientras la API de OpenAI responde)
    <div className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-600 rounded-full font-medium text-sm animate-pulse border border-gray-200">
      <Loader2 size={18} className="animate-spin text-indigo-600" />
      <span>Analizando...</span>
    </div>
  ) : isListening ? (
    // Estado: Grabando (El botón se vuelve rojo y parpadea)
    <button 
      type="button"
      onClick={() => stopAndAnalyze(handleSmartFill)}
      className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-sm shadow-lg shadow-red-200 transition-all animate-pulse"
    >
      <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
      Detener y Llenar
    </button>
  ) : (
    // Estado: Reposo (Botón azul de micrófono listo para empezar)
    <button 
      type="button"
      onClick={startSmartListening}
      className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-200 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
      title="Dictar reporte completo"
    >
      <Mic size={24} className="group-hover:rotate-12 transition-transform" />
    </button>
  )}
</div>
                </div>
            </div>
          )}

          <div className="space-y-6">
            
            {/* ROW 1: Identifiers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                   <label className={labelClass}>Folio (Auto) <span className="text-red-500">*</span></label>
                   <input name="folio" value={formData.folio} onChange={handleChange} className={`${getInputClass('folio')} font-mono font-bold text-gray-700`} placeholder="QT-2024-XXXX" readOnly />
                </div>
                <div className="md:col-span-2">
                   <label className={labelClass}>Número de Parte <span className="text-red-500">*</span></label>
                   <div className="relative">
                     <select name="partNumber" value={formData.partNumber} onChange={handlePartChange} className={selectClass} disabled={isLoadingParts}>
                        <option value="">{isLoadingParts ? "Cargando catálogo..." : "Seleccionar Pieza..."}</option>
                        {partsCatalog.map(part => (
                          <option key={part.number} value={part.number}>
                            {part.number} - {part.name}
                          </option>
                        ))}
                     </select>
                     <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                   </div>
                </div>
            </div>

            {/* ROW 2: Date & Shift */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <div className="col-span-2 md:col-span-1">
                   <label className={labelClass}>Fecha Schadentisch <span className="text-red-500">*</span></label>
                   <input name="schadentischDate" value={formData.schadentischDate} onChange={handleChange} type="date" className={getInputClass('schadentischDate')} />
                </div>
                <div>
                   <label className={labelClass}>Turno <span className="text-red-500">*</span></label>
                   <select name="shift" value={formData.shift} onChange={handleChange} className={selectClass}>
                     <option value={1}>1</option>
                     <option value={2}>2</option>
                     <option value={3}>3</option>
                   </select>
                </div>
                <div>
                   <label className={labelClass}>SORTE</label>
                   <input name="sorte" value={formData.sorte} onChange={handleChange} type="number" className={getInputClass('sorte')} placeholder="0" />
                </div>
                <div>
                   <label className={labelClass}>Estado Q-TICKER</label>
                   <div className="relative">
                     <select name="status" value={formData.status} onChange={handleChange} className={`${selectClass} font-medium text-blue-900 bg-blue-50 border-blue-200`}>
                        <option value="Sin respuesta">Sin respuesta</option>
                        <option value="En seguimiento">En seguimiento</option>
                        <option value="Cerrado">Cerrado</option>
                        <option value="Acciones no efectivas">Acciones no efectivas</option>
                        <option value="Analisis rechazado">Análisis rechazado</option>
                     </select>
                     <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" size={16} />
                   </div>
                </div>
            </div>

            {/* BOTÓN PRE-ANÁLISIS */}
            <div className="flex justify-end">
               <button type="button" onClick={() => setShowPreAnalysis(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors border border-blue-200">
                  <ClipboardList size={16} />
                  PRE-ANALISIS
               </button>
            </div>

            <div className="h-px bg-gray-100 w-full"></div>

            {/* ROW 3: Relations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Campos Auto-llenados */}
                <div>
                   <label className={labelClass}>Nombre de Pieza</label>
                   <input name="partName" value={formData.partName} readOnly className={`${getInputClass('partName')} bg-gray-100 text-gray-600`} />
                </div>

                <div>
                   <label className={labelClass}>Proveedor</label>
                   <input name="supplier" value={formData.supplier} readOnly className={`${getInputClass('supplier')} bg-gray-100 text-gray-600`} />
                </div>

                <div>
                   <label className={labelClass}>Responsable de Pieza</label>
                   <input name="partResponsible" value={formData.partResponsible} readOnly className={`${getInputClass('partResponsible')} bg-gray-100 text-gray-600`} />
                </div>

                <div className="relative">
                   <label className={labelClass}>Origen <span className="text-red-500">*</span></label>
                   <input name="origin" value={formData.origin} onChange={handleChange} list="origins" className={getInputClass('origin')} placeholder="Seleccionar origen..." />
                   <datalist id="origins">
                      <option value="Línea de Ensamblaje 1" />
                      <option value="Fundición" />
                      <option value="Mecanizado" />
                      <option value="Proveedor Externo" />
                   </datalist>
                </div>

                <div className="relative">
                   <label className={labelClass}>Cliente <span className="text-red-500">*</span></label>
                   <select name="client" value={formData.client} onChange={handleChange} className={selectClass}>
                      <option value="">Seleccionar Cliente...</option>
                      <option value="Volkswagen">Volkswagen</option>
                      <option value="Audi">Audi</option>
                      <option value="BMW">BMW</option>
                      <option value="Ford">Ford</option>
                      <option value="Interno">Interno / Planta</option>
                   </select>
                   <ChevronDown className="absolute right-3 top-9 text-gray-400 pointer-events-none" size={16} />
                </div>

                <div>
                   <label className={labelClass}>Localización <span className="text-red-500">*</span></label>
                   <input name="area" value={formData.area} onChange={handleChange} className={getInputClass('area')} placeholder="Ej: Nave 4, Pasillo B" />
                </div>

                <div>
                   <label className={labelClass}>Responsable <span className="text-red-500">*</span></label>
                   <input name="responsibleName" value={formData.responsibleName} onChange={handleChange} className={getInputClass('responsibleName')} placeholder="Nombre del responsable" />
                </div>
            </div>

            {/* Evidence (With Damage Annotator) */}
            <div>
              <label className={labelClass}>Evidencia Visual</label>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={onFileInputChange} />
              {evidencePreview ? (
                <div className="relative h-48 w-full rounded-xl overflow-hidden group border border-gray-200 bg-gray-50">
                  <img src={evidencePreview} alt="Preview" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button type="button" onClick={triggerFileSelect} className="p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"><ImageIcon size={20} /></button>
                      <button type="button" onClick={removeEvidence} className="p-2 bg-red-500/80 text-white rounded-full hover:bg-red-600/90 transition-colors"><Trash2 size={20} /></button>
                  </div>
                </div>
              ) : (
                <div 
                  className={`border border-dashed border-gray-300 rounded-xl h-24 flex flex-col items-center justify-center cursor-pointer transition-all ${isDragging ? 'bg-blue-50 border-blue-400' : 'hover:bg-gray-50'}`}
                  onClick={triggerFileSelect}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                   <div className="text-gray-400"><Camera size={24} /></div>
                   <span className="text-xs text-gray-500 mt-1">Click para subir foto y anotar daño</span>
                </div>
              )}
            </div>
            </div>
          </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 sticky bottom-0 z-10">
           <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-200">Cancelar</button>
           <button onClick={handleSubmit} className="px-5 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 shadow-lg active:scale-95">
             {incidentToEdit ? 'Actualizar Q-TICKER' : 'Crear Q-TICKER'}
           </button>
        </div>
      </div>

      {/* --- INTEGRACIÓN: PANTALLA DE ANOTACIÓN --- */}
      {showAnnotator && tempImage && (
        <DamageAnnotator 
          imageSrc={tempImage}
          onSave={handleAnnotatorSave}
          onCancel={handleAnnotatorCancel}
        />
      )}

    </div>
  );
};