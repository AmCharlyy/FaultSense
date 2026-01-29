
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Cloud, Search, Upload, Camera, Trash2, Calendar, FileText, 
  ImageIcon, Loader2, X, Download, Shield, Clock, CheckCircle2,
  Square, CheckSquare, DownloadCloud, Files
} from 'lucide-react';
import { CloudFile, User } from '../types';
import { api } from '../services/api';

interface CloudViewProps {
  user: User;
}

export const CloudView: React.FC<CloudViewProps> = ({ user }) => {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [selectedFile, setSelectedFile] = useState<CloudFile | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.cloud.getMyFiles();
      setFiles(data);
    } catch (e) {
      console.error("Error fetching files", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Group files by date
  const groupedFiles = useMemo(() => {
    const groups: Record<string, CloudFile[]> = {};
    const filtered = files.filter(f => 
      f.name.toLowerCase().includes(search.toLowerCase())
    );

    filtered.forEach(file => {
      const date = new Date(file.createdAt);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let groupTitle = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
      
      if (date.toDateString() === today.toDateString()) groupTitle = "Hoy";
      else if (date.toDateString() === yesterday.toDateString()) groupTitle = "Ayer";

      if (!groups[groupTitle]) groups[groupTitle] = [];
      groups[groupTitle].push(file);
    });

    return groups;
  }, [files, search]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        await api.cloud.upload({
          name: file.name,
          url: base64,
          type: file.type,
          size: (file.size / 1024).toFixed(1) + ' KB'
        });
        fetchFiles();
      } catch (e) {
        alert("Error al subir archivo");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // --- Multi Selection Logic ---
  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    if (newSelected.size > 0) setIsSelectionMode(true);
    else setIsSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`¿Eliminar permanentemente los ${selectedIds.size} archivos seleccionados?`)) {
      setLoading(true);
      try {
        await api.cloud.bulkDelete(Array.from(selectedIds));
        setFiles(prev => prev.filter(f => !selectedIds.has(f.id)));
        setSelectedIds(new Set());
        setIsSelectionMode(false);
      } catch (e) {
        alert("Error al eliminar archivos");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBulkDownload = () => {
    selectedIds.forEach(id => {
      const file = files.find(f => f.id === id);
      if (file) {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  // --- Camera Logic ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch (err) {
      alert("No se pudo acceder a la cámara");
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const url = canvas.toDataURL('image/jpeg');
        setIsUploading(true);
        try {
          await api.cloud.upload({
            name: `Captura_${Date.now()}.jpg`,
            url,
            type: 'image/jpeg',
            size: 'N/A'
          });
          fetchFiles();
          stopCamera();
        } catch (e) {
          alert("Error al guardar foto");
        } finally {
          setIsUploading(false);
        }
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const handleDeleteSingle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("¿Eliminar este archivo permanentemente?")) {
      try {
        await api.cloud.delete(id);
        setFiles(prev => prev.filter(f => f.id !== id));
        if (selectedFile?.id === id) setSelectedFile(null);
        if (selectedIds.has(id)) {
          const newSet = new Set(selectedIds);
          newSet.delete(id);
          setSelectedIds(newSet);
        }
      } catch (e) {
        alert("Error al eliminar");
      }
    }
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.4s_ease-out] pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
             <Cloud className="text-blue-500" size={32} />
             FaultSense Cloud
           </h1>
           <p className="text-gray-500 mt-1">Almacenamiento privado de evidencias y documentos técnicos.</p>
        </div>
        <div className="flex gap-3">
           <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
           <button 
             onClick={() => fileInputRef.current?.click()}
             disabled={isUploading}
             className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-5 py-3 rounded-xl hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
           >
             <Upload size={20} /> <span className="font-medium">Subir</span>
           </button>
           <button 
             onClick={startCamera}
             disabled={isUploading}
             className="flex items-center space-x-2 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200 disabled:opacity-50"
           >
             <Camera size={20} /> <span className="font-medium">Cámara</span>
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-soft border border-gray-100 min-h-[600px] flex flex-col overflow-hidden relative">
         {/* Filter & Selection Bar */}
         <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar en tus archivos..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium"
                />
            </div>
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 bg-white border border-gray-200 px-4 py-3 rounded-xl tracking-widest uppercase">
                  <Shield size={14} className="text-green-500" />
                  Encriptación AES-256
               </div>
            </div>
         </div>

         {/* File Grid */}
         <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="animate-spin mb-4" size={48} />
                <p className="font-medium">Cargando galería privada...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20">
                 <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <ImageIcon size={40} className="text-gray-200" />
                 </div>
                 <h3 className="text-lg font-bold text-gray-900">Nube vacía</h3>
                 <p className="max-w-xs text-center mt-2">No se han encontrado archivos personales en este servidor.</p>
              </div>
            ) : (
              <div className="space-y-12">
                {(Object.entries(groupedFiles) as [string, CloudFile[]][]).map(([dateGroup, groupFiles]) => (
                  <div key={dateGroup} className="space-y-6">
                    <div className="sticky top-0 z-10 py-2 bg-white/80 backdrop-blur-md flex justify-between items-center">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={14} className="text-blue-500" /> {dateGroup}
                        <span className="ml-2 px-2 py-0.5 bg-gray-100 text-[10px] rounded-full text-gray-500">{groupFiles.length}</span>
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                      {groupFiles.map(file => {
                        const isSelected = selectedIds.has(file.id);
                        return (
                          <div 
                            key={file.id} 
                            onClick={() => isSelectionMode ? toggleSelect(file.id) : setSelectedFile(file)}
                            className={`group relative aspect-square rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer ${
                              isSelected 
                                ? 'border-blue-500 shadow-xl shadow-blue-100 scale-95 ring-4 ring-blue-50' 
                                : 'border-gray-100 hover:shadow-lg hover:-translate-y-1 bg-gray-50'
                            }`}
                          >
                            {/* Selection Checkbox */}
                            <button 
                              onClick={(e) => toggleSelect(file.id, e)}
                              className={`absolute top-3 left-3 z-20 p-1 rounded-lg transition-all ${
                                isSelected ? 'bg-blue-500 text-white scale-110' : 'bg-white/80 text-gray-400 opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>

                            {file.type.startsWith('image/') ? (
                              <img src={file.url} className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`} alt={file.name} />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                 <FileText size={40} className="text-blue-500 mb-2" />
                                 <span className="text-[10px] font-bold text-gray-500 uppercase text-center truncate w-full">{file.name}</span>
                              </div>
                            )}

                            {/* Hover Actions */}
                            {!isSelected && (
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                                 <div className="flex justify-end">
                                    <button 
                                      onClick={(e) => handleDeleteSingle(file.id, e)}
                                      className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                 </div>
                                 <div className="text-white">
                                    <p className="text-[10px] font-bold truncate">{file.name}</p>
                                    <p className="text-[8px] opacity-70 flex items-center gap-1"><Clock size={8}/> {new Date(file.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                 </div>
                              </div>
                            )}

                            {/* Selected Indicator */}
                            {isSelected && (
                              <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                                <div className="bg-white rounded-full p-2 shadow-xl animate-bounce">
                                   <CheckCircle2 size={24} className="text-blue-500" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
         </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] animate-[slideUp_0.3s_ease-out]">
           <div className="bg-white/80 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-[32px] px-8 py-5 flex items-center gap-10">
              <div className="flex items-center gap-4 border-r border-gray-200 pr-10">
                 <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                    <Files size={24} />
                 </div>
                 <div>
                    <p className="text-lg font-black text-gray-900">{selectedIds.size} seleccionados</p>
                    <button onClick={clearSelection} className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest">Cancelar selección</button>
                 </div>
              </div>
              
              <div className="flex items-center gap-4">
                 <button 
                   onClick={handleBulkDownload}
                   className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-sm transition-all active:scale-95"
                 >
                    <DownloadCloud size={18} /> Descargar Lote
                 </button>
                 <button 
                   onClick={handleBulkDelete}
                   className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-red-100 active:scale-95"
                 >
                    <Trash2 size={18} /> Borrar Todo
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Visor Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-[fadeIn_0.2s]">
           <button onClick={() => setSelectedFile(null)} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-2"><X size={32} /></button>
           <div className="max-w-5xl w-full flex flex-col md:flex-row gap-8">
              <div className="flex-1 bg-white/5 rounded-3xl overflow-hidden flex items-center justify-center border border-white/10">
                 {selectedFile.type.startsWith('image/') ? (
                   <img src={selectedFile.url} className="max-w-full max-h-[80vh] object-contain" alt="" />
                 ) : (
                   <div className="p-20 flex flex-col items-center text-white">
                      <FileText size={120} className="text-blue-500 mb-6" />
                      <h2 className="text-2xl font-bold">{selectedFile.name}</h2>
                      <p className="text-white/50 mt-2">Documento no previsualizable</p>
                   </div>
                 )}
              </div>
              <div className="w-full md:w-80 space-y-6 text-white">
                 <div>
                    <h2 className="text-2xl font-bold truncate">{selectedFile.name}</h2>
                    <p className="text-white/40 text-sm mt-1">ID: {selectedFile.id}</p>
                 </div>
                 <div className="space-y-4">
                    <InfoRow label="Tamaño" value={selectedFile.size} />
                    <InfoRow label="Tipo" value={selectedFile.type} />
                    <InfoRow label="Creado" value={new Date(selectedFile.createdAt).toLocaleString()} />
                    <InfoRow label="Propietario" value={selectedFile.ownerName} />
                 </div>
                 <div className="pt-6 border-t border-white/10 flex flex-col gap-3">
                    <a 
                      href={selectedFile.url} 
                      download={selectedFile.name}
                      className="w-full py-3 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
                    >
                      <Download size={18} /> Descargar Original
                    </a>
                    <button 
                       onClick={(e) => { setSelectedFile(null); handleDeleteSingle(selectedFile.id, e as any); }}
                       className="w-full py-3 border border-red-500/50 text-red-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500/10 transition-all"
                    >
                       <Trash2 size={18} /> Eliminar
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white rounded-[32px] overflow-hidden w-full max-w-lg shadow-2xl relative">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="font-bold text-gray-900 flex items-center gap-2"><Camera size={20}/> Modo Captura</h3>
                 <button onClick={stopCamera} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
              </div>
              <div className="relative aspect-[4/3] bg-black">
                 <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                 <canvas ref={canvasRef} className="hidden"></canvas>
                 {isUploading && (
                   <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="animate-spin text-white" size={48} />
                   </div>
                 )}
              </div>
              <div className="p-8 flex justify-center">
                 <button 
                   onClick={capturePhoto}
                   disabled={isUploading}
                   className="w-20 h-20 rounded-full border-4 border-gray-100 p-1 group hover:border-blue-500 transition-all active:scale-90"
                 >
                   <div className="w-full h-full bg-gray-900 rounded-full group-hover:bg-blue-600 transition-colors flex items-center justify-center text-white">
                      <Camera size={32} />
                   </div>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Uploading Overlay */}
      {isUploading && !showCamera && (
        <div className="fixed bottom-8 right-8 z-[100] bg-black text-white px-6 py-4 rounded-2xl shadow-2xl animate-[slideUp_0.3s_ease-out] flex items-center gap-4">
           <Loader2 className="animate-spin text-blue-400" size={20} />
           <div className="text-sm">
              <p className="font-bold">Subiendo...</p>
              <p className="text-xs text-white/50">Procesando metadatos</p>
           </div>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-white/40 font-medium">{label}</span>
    <span className="font-bold">{value}</span>
  </div>
);
