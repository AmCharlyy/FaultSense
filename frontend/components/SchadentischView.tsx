
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NCPart } from '../types';
import { Plus, Search, Filter, Trash2, Camera, UploadCloud, X, AlertTriangle, Recycle, Clock, Sparkles, Loader2, ImageIcon } from 'lucide-react';
import { analyzePartImage } from '../services/geminiService';
import { api } from '../services/api';

export const SchadentischView: React.FC = () => {
  const [parts, setParts] = useState<NCPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [partToEdit, setPartToEdit] = useState<NCPart | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchParts = useCallback(async () => {
    try {
      const data = await api.ncParts.getAll();
      setParts(data);
    } catch (err) {
      console.error("Error fetching NC Parts", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  // Derived state for KPIs
  const totalScrap = parts.filter(p => p.action === 'Scrap').length;
  const totalRework = parts.filter(p => p.action === 'Rework').length;
  const totalPending = parts.filter(p => p.action === 'Pending').length;

  // Filter parts
  const filteredParts = parts.filter(p => 
    p.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.defectType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (part: NCPart) => {
    setPartToEdit(part);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setPartToEdit(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Eliminar registro de pieza permanentemente?')) {
       try {
         await api.ncParts.delete(id);
         fetchParts(); // Refresh list from server
       } catch (e) {
         alert("Error al eliminar pieza. Verifique conexión.");
       }
    }
  };

  const handleSave = async (data: any) => {
    setIsSaving(true);
    try {
      if (partToEdit) {
         await api.ncParts.update(partToEdit.id, data);
      } else {
         await api.ncParts.create(data);
      }
      await fetchParts();
      setIsModalOpen(false);
    } catch (e) {
      alert("Error al guardar. Verifique conexión.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
         <Loader2 size={48} className="animate-spin text-gray-300" />
         <p className="text-gray-400 font-medium">Cargando Mesa de Control...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.4s_ease-out]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Schadentisch</h1>
           <p className="text-gray-500 mt-1">Mesa de Control de Piezas No Conformes (NCP).</p>
        </div>
        <button 
          onClick={handleCreate}
          className="flex items-center space-x-2 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
        >
          <Plus size={20} />
          <span className="font-medium">Registrar Pieza</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Scrap</p>
               <h3 className="text-3xl font-bold text-red-600">{totalScrap}</h3>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-xl"><Trash2 size={24} /></div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Para Retrabajo</p>
               <h3 className="text-3xl font-bold text-orange-600">{totalRework}</h3>
            </div>
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Recycle size={24} /></div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pendiente Decisión</p>
               <h3 className="text-3xl font-bold text-gray-600">{totalPending}</h3>
            </div>
            <div className="p-3 bg-gray-50 text-gray-600 rounded-xl"><Clock size={24} /></div>
         </div>
      </div>

      {/* Gallery Grid */}
      <div className="bg-white rounded-3xl p-6 shadow-soft border border-gray-100 min-h-[500px]">
         <div className="flex items-center gap-4 mb-6 sticky top-0 bg-white z-10 pb-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por número de parte, nombre..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black/5 outline-none transition-all text-gray-900"
                />
            </div>
            <button className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600">
               <Filter size={18} />
            </button>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredParts.map(part => (
               <div 
                  key={part.id} 
                  onClick={() => handleEdit(part)}
                  className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer"
               >
                  <div className="relative h-48 bg-gray-100 overflow-hidden">
                     {part.imageUrl ? (
                        <img src={part.imageUrl} alt={part.partName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                           <Camera size={32} />
                        </div>
                     )}
                     <div className="absolute top-2 right-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border shadow-sm ${
                           part.action === 'Scrap' ? 'bg-red-50 text-red-700 border-red-100' :
                           part.action === 'Rework' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                           part.action === 'Concession' ? 'bg-green-50 text-green-700 border-green-100' :
                           'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                           {part.action}
                        </span>
                     </div>
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col">
                     <div className="mb-2">
                        <h3 className="font-bold text-gray-900 truncate">{part.partName}</h3>
                        <p className="text-xs font-mono text-gray-500">{part.partNumber}</p>
                     </div>
                     
                     <div className="flex-1">
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                           {part.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                           <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 font-medium">
                              {part.defectType}
                           </span>
                           <span className="text-[10px] text-gray-400 flex items-center">
                              {new Date(part.createdAt).toLocaleDateString()}
                           </span>
                        </div>
                     </div>

                     <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-gray-400">Reportado por: <span className="text-gray-600 font-medium">{part.reportedBy}</span></span>
                        <button 
                           onClick={(e) => {
                             e.stopPropagation(); // Prevent opening edit modal
                             handleDelete(part.id);
                           }}
                           className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                        >
                           <Trash2 size={16} />
                        </button>
                     </div>
                  </div>
               </div>
            ))}
            {filteredParts.length === 0 && (
               <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400">
                  <PackageX size={48} strokeWidth={1} className="mb-4 text-gray-200" />
                  <p>No se encontraron piezas con ese criterio.</p>
               </div>
            )}
         </div>
      </div>

      <SchadentischModal 
         isOpen={isModalOpen}
         onClose={() => setIsModalOpen(false)}
         onSave={handleSave}
         partToEdit={partToEdit}
         isSaving={isSaving}
      />
    </div>
  );
};

// --- Internal Modal Component for Adding/Editing Parts ---

interface ModalProps {
   isOpen: boolean;
   onClose: () => void;
   onSave: (data: any) => void;
   partToEdit?: NCPart | null;
   isSaving?: boolean;
}

// Importing lucide icon here locally if needed or reuse from top
import { PackageX } from 'lucide-react';

const SchadentischModal: React.FC<ModalProps> = ({ isOpen, onClose, onSave, partToEdit, isSaving }) => {
   const [formData, setFormData] = useState({
      partNumber: '',
      partName: '',
      quantity: '',
      cc: '',
      operationNumber: '',
      description: '', // Observaciones
      nc: '',
      reportedBy: '' // Nombre Responsable
   });
   const [preview, setPreview] = useState<string | null>(null);
   const [analyzing, setAnalyzing] = useState(false);
   const fileInputRef = useRef<HTMLInputElement>(null);

   useEffect(() => {
     if (isOpen) {
       if (partToEdit) {
         setFormData({
            partNumber: partToEdit.partNumber,
            partName: partToEdit.partName,
            quantity: (partToEdit as any).quantity || '',
            cc: (partToEdit as any).cc || '',
            operationNumber: (partToEdit as any).operationNumber || '',
            description: partToEdit.description,
            nc: (partToEdit as any).nc || '',
            reportedBy: partToEdit.reportedBy
         });
         setPreview(partToEdit.imageUrl || null);
       } else {
         // Reset for new entry
         setFormData({
            partNumber: '',
            partName: '',
            quantity: '',
            cc: '',
            operationNumber: '',
            description: '',
            nc: '',
            reportedBy: ''
         });
         setPreview(null);
       }
     }
   }, [isOpen, partToEdit]);

   if (!isOpen) return null;

   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         const reader = new FileReader();
         reader.onloadend = () => setPreview(reader.result as string);
         reader.readAsDataURL(file);
      }
   };

   const handleAIAnalyze = async () => {
      if (!preview) {
         alert("Sube una imagen primero para usar la IA.");
         return;
      }
      setAnalyzing(true);
      const result = await analyzePartImage(preview);
      setFormData(prev => ({
         ...prev,
         description: result.description || prev.description
      }));
      setAnalyzing(false);
   };

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({ ...formData, imageUrl: preview });
   };

   const inputClass = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-black/5 outline-none";
   const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1";

   return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
         <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden animate-[scaleIn_0.2s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
               <h2 className="text-lg font-bold text-gray-900">{partToEdit ? 'Editar Pieza No Conforme' : 'Registrar Pieza No Conforme'}</h2>
               <button onClick={onClose} className="text-gray-400 hover:text-gray-900"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className={labelClass}>Número de Parte</label>
                     <input required placeholder="Ej: 123-ABC-456" className={inputClass} value={formData.partNumber} onChange={e => setFormData({...formData, partNumber: e.target.value})} />
                  </div>
                  <div>
                     <label className={labelClass}>Nombre Pieza</label>
                     <input required placeholder="Ej: Pistón V8" className={inputClass} value={formData.partName} onChange={e => setFormData({...formData, partName: e.target.value})} />
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-4">
                  <div>
                     <label className={labelClass}>Cantidad</label>
                     <input type="number" required min="1" className={inputClass} value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                  </div>
                  <div>
                     <label className={labelClass}>C.C</label>
                     <input className={inputClass} value={formData.cc} onChange={e => setFormData({...formData, cc: e.target.value})} />
                  </div>
                  <div>
                     <label className={labelClass}>No. Operación</label>
                     <input className={inputClass} value={formData.operationNumber} onChange={e => setFormData({...formData, operationNumber: e.target.value})} />
                  </div>
               </div>

               <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className={labelClass}>Observaciones</label>
                    <button 
                       type="button"
                       onClick={handleAIAnalyze}
                       disabled={analyzing || !preview}
                       className="flex items-center space-x-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors bg-blue-50 px-2 py-0.5 rounded-full"
                    >
                       {analyzing ? <Loader2 className="animate-spin" size={10} /> : <Sparkles size={10} />}
                       <span>Analizar Foto (IA)</span>
                    </button>
                  </div>
                  <textarea required rows={3} className={`${inputClass} resize-none`} placeholder="Detalles..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
               </div>

               <div className="pt-2">
                  <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 mb-3">Responsable de detención</h3>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className={labelClass}>N.C.</label>
                         <input required className={inputClass} value={formData.nc} onChange={e => setFormData({...formData, nc: e.target.value})} />
                      </div>
                      <div>
                         <label className={labelClass}>Nombre</label>
                         <input required className={inputClass} value={formData.reportedBy} onChange={e => setFormData({...formData, reportedBy: e.target.value})} />
                      </div>
                  </div>
               </div>

               <div>
                  <label className={labelClass}>Evidencia Visual</label>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                  
                  {preview ? (
                     <div className="relative h-48 w-full rounded-xl overflow-hidden group border border-gray-200 bg-gray-50">
                        <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                           <button 
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="p-3 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-sm transition-all"
                              title="Cambiar imagen"
                           >
                              <ImageIcon size={20} />
                           </button>
                           <button 
                              type="button"
                              onClick={(e) => {
                                 e.stopPropagation();
                                 setPreview(null);
                                 if(fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="p-3 bg-red-500/80 hover:bg-red-600 text-white rounded-full backdrop-blur-sm transition-all"
                              title="Eliminar"
                           >
                              <Trash2 size={20} />
                           </button>
                        </div>
                     </div>
                  ) : (
                     <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-40 border border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all bg-white group"
                     >
                        <div className="mb-2 text-gray-400 group-hover:text-gray-600 transition-colors">
                           <UploadCloud size={32} strokeWidth={1.5} />
                        </div>
                        <span className="text-sm font-semibold text-gray-400 group-hover:text-gray-500 transition-colors">Click para adjuntar evidencia</span>
                     </div>
                  )}
               </div>

               <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancelar</button>
                  <button type="submit" disabled={isSaving} className="px-6 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 shadow-lg disabled:opacity-50 flex items-center gap-2">
                     {isSaving && <Loader2 size={16} className="animate-spin" />}
                     {partToEdit ? 'Guardar Cambios' : 'Registrar'}
                  </button>
               </div>
            </form>
         </div>
      </div>
   );
}
