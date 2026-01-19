import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Loader2, UploadCloud, ChevronDown, Camera, Trash2, ImageIcon, Mic } from 'lucide-react';
import { Incident, Severity, Status } from '../types';
import { analyzeIncidentDescription } from '../services/geminiService';
import { DamageAnnotator } from './DamageAnnotator'; 
// 1. IMPORTAR EL HOOK DE VOZ INTELIGENTE
import { useSmartVoice } from '../hooks/useSmartVoice';

interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (incident: any) => void;
  incidentToEdit?: Incident | null;
}

export const IncidentModal: React.FC<IncidentModalProps> = ({ isOpen, onClose, onSave, incidentToEdit }) => {
  // --- Estados del Formulario ---
  const [formData, setFormData] = useState({
    folio: '',
    title: '',
    schadentischDate: new Date().toISOString().split('T')[0],
    shift: 1,
    sorte: 0,
    status: Status.OPEN,
    origin: '',
    client: '',
    area: '',
    responsibleName: '',
    description: '',
    severity: Severity.MEDIUM,
    category: 'General'
  });

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  
  // --- Estados de Imagen y Anotador ---
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAnnotator, setShowAnnotator] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. INICIALIZAR EL HOOK DE VOZ
  const { isListening, isProcessing, startSmartListening, stopAndAnalyze } = useSmartVoice();

  // 3. CALLBACK PARA LLENAR LOS CAMPOS AUTOMÁTICAMENTE
  const handleSmartFill = (data: any) => {
    setFormData(prev => ({
      ...prev,
      // Solo actualizamos si la IA encontró algo, si no, mantenemos lo que había
      client: data.client || prev.client,
      area: data.area || prev.area,
      origin: data.origin || prev.origin,
      // Mapeamos category a category o title si prefieres
      category: data.category || prev.category,
      // La descripción técnica reemplaza la actual
      description: data.description || prev.description,
      // Si la IA detectó un título implícito (opcional, podrías sacarlo de category)
      title: data.category ? `Falla: ${data.category}` : prev.title
    }));
  };

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
          status: incidentToEdit.status,
          origin: incidentToEdit.origin,
          client: incidentToEdit.client,
          area: incidentToEdit.area,
          responsibleName: incidentToEdit.responsibleName || incidentToEdit.assignedTo?.name || '',
          description: incidentToEdit.description,
          severity: incidentToEdit.severity,
          category: incidentToEdit.category
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
          status: Status.OPEN,
          origin: '',
          client: '',
          area: '',
          responsibleName: '',
          description: '',
          severity: Severity.MEDIUM,
          category: 'General'
        });
        setAiSuggestion(null);
        setTags([]);
        setEvidencePreview(null);
      }
      setErrors({});
      setIsDragging(false);
      setShowAnnotator(false);
      setTempImage(null);
    }
  }, [isOpen, incidentToEdit]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: false }));
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
    const requiredFields = ['folio', 'title', 'schadentischDate', 'origin', 'client', 'area', 'responsibleName', 'description'];
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
                             <div className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-600 rounded-full font-medium text-sm animate-pulse">
                                <Loader2 size={18} className="animate-spin" /> Procesando
                             </div>
                        ) : isListening ? (
                            <button 
                                type="button"
                                onClick={() => stopAndAnalyze(handleSmartFill)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-sm shadow-md transition-all animate-pulse"
                            >
                                <div className="w-2 h-2 bg-white rounded-full"></div> Detener
                            </button>
                        ) : (
                            <button 
                                type="button"
                                onClick={startSmartListening}
                                className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                                title="Iniciar Dictado"
                            >
                                <Mic size={24} />
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
                   <input name="folio" value={formData.folio} onChange={handleChange} className={`${getInputClass('folio')} font-mono font-bold text-gray-700`} placeholder="QT-2024-XXXX" />
                </div>
                <div className="md:col-span-2">
                   <label className={labelClass}>Título Breve <span className="text-red-500">*</span></label>
                   <input name="title" value={formData.title} onChange={handleChange} className={getInputClass('title')} placeholder="Resumen del problema..." />
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
                   <label className={labelClass}>Sorte (Cant)</label>
                   <input name="sorte" value={formData.sorte} onChange={handleChange} type="number" className={getInputClass('sorte')} placeholder="0" />
                </div>
                <div>
                    <div className="relative">
                      <label className={labelClass}>Prioridad</label>
                      <select name="severity" value={formData.severity} onChange={handleChange} className={selectClass}>
                        <option value={Severity.LOW}>Baja</option>
                        <option value={Severity.MEDIUM}>Media</option>
                        <option value={Severity.HIGH}>Alta</option>
                        <option value={Severity.CRITICAL}>Crítica</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-9 text-gray-400 pointer-events-none" size={16} />
                    </div>
                </div>
            </div>

            <div className="h-px bg-gray-100 w-full"></div>

            {/* ROW 3: Relations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

            {incidentToEdit && (
              <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
                  <div className="relative">
                    <label className={`${labelClass} text-yellow-700`}>Estado Q-TICKER</label>
                    <select name="status" value={formData.status} onChange={handleChange} className={`${selectClass} border-yellow-200 bg-white`}>
                      <option value={Status.OPEN}>Abierto</option>
                      <option value={Status.IN_PROGRESS}>En Progreso</option>
                      <option value={Status.RESOLVED}>Resuelto</option>
                      <option value={Status.CLOSED}>Cerrado</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-9 text-yellow-400 pointer-events-none" size={16} />
                  </div>
              </div>
            )}

            {/* Description */}
            <div className="relative">
              <div className="flex justify-between items-end mb-1.5">
                <label className={labelClass}>Descripción Detallada <span className="text-red-500">*</span></label>
                {/* Botón antiguo de análisis manual, lo mantenemos por si acaso */}
                <button type="button" onClick={handleAnalyze} disabled={isAnalyzing || formData.description.length < 5} className="flex items-center space-x-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100">
                  {isAnalyzing ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />} <span>Re-Analizar Texto</span>
                </button>
              </div>
              <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className={`${getInputClass('description')} resize-none`} placeholder="Detalles técnicos de la falla..." />
              
              {aiSuggestion && (
                <div className="mt-3 bg-blue-50 border border-blue-100 p-3 rounded-xl text-sm text-blue-900 animate-in fade-in slide-in-from-top-2">
                   <p className="font-bold text-xs uppercase mb-1 flex items-center gap-1"><Sparkles size={10}/> Sugerencia Técnica IA</p>
                   {aiSuggestion}
                </div>
              )}
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