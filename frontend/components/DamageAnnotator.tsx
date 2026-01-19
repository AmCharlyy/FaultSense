import React, { useState, useRef, memo } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { 
  Check, X, Move, Plus, Trash2, Upload, 
  Circle, Square, Image as ImageIcon, Minus, Maximize2, MousePointerClick
} from 'lucide-react';

// --- TIPOS ---
interface AnnotationItem {
  id: string;
  src: string;
  targetPos: { x: number; y: number };
  detailPos: { x: number; y: number };
  size: number;
  shape: 'circle' | 'square';
}

interface DamageAnnotatorProps {
  imageSrc: string;
  onSave: (finalImageBase64: string) => void;
  onCancel: () => void;
}

// --- SUB-COMPONENTE: Maneja CADA par de (Punto + Foto) individualmente ---
// Esto arregla el error de "findDOMNode" al permitir un useRef estable por ítem.
const AnnotationLayer = memo(({ 
    ann, 
    isSelected, 
    onDrag, 
    onSelect 
}: { 
    ann: AnnotationItem, 
    isSelected: boolean, 
    onDrag: (id: string, type: 'target' | 'detail', data: DraggableData) => void,
    onSelect: (id: string) => void
}) => {
    // Estas referencias son estables y únicas para CADA anotación
    const targetNodeRef = useRef<HTMLDivElement>(null);
    const detailNodeRef = useRef<HTMLDivElement>(null);

    return (
        <>
            {/* LÍNEA CONECTORA (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 filter drop-shadow-lg">
                <line 
                    x1={ann.targetPos.x + 10} 
                    y1={ann.targetPos.y + 10} 
                    x2={ann.detailPos.x + (ann.size / 2)} 
                    y2={ann.detailPos.y + (ann.size / 2)} 
                    stroke={isSelected ? "#3b82f6" : "#ef4444"} 
                    strokeWidth={isSelected ? "3" : "2.5"} 
                    strokeOpacity={isSelected ? 1 : 0.8}
                    strokeLinecap="round"
                />
            </svg>

            {/* PUNTO DE ORIGEN (TARGET) */}
            <Draggable 
                nodeRef={targetNodeRef} // Referencia estable
                bounds="parent" 
                position={ann.targetPos} 
                onDrag={(_e, d) => onDrag(ann.id, 'target', d)}
                onStart={() => onSelect(ann.id)}
            >
                <div 
                    ref={targetNodeRef} 
                    className="absolute left-0 top-0 z-50 cursor-move group w-5 h-5 touch-none"
                >
                    <div className={`w-5 h-5 shadow-[0_0_20px_rgba(0,0,0,0.5)] ring-2 rounded-full transition-transform group-hover:scale-125 ${isSelected ? 'bg-blue-500 ring-white scale-110' : 'bg-red-500 ring-white'}`}></div>
                </div>
            </Draggable>

            {/* FOTO DETALLE (ZOOM) */}
            <Draggable 
                nodeRef={detailNodeRef} // Referencia estable
                bounds="parent" 
                position={ann.detailPos} 
                onDrag={(_e, d) => onDrag(ann.id, 'detail', d)}
                onStart={() => onSelect(ann.id)}
            >
                <div 
                    ref={detailNodeRef}
                    className={`absolute left-0 top-0 z-40 cursor-move shadow-2xl bg-white group touch-none overflow-hidden transition-all duration-200 
                        ${ann.shape === 'circle' ? 'rounded-full' : 'rounded-2xl'}
                        ${isSelected ? 'border-[3px] border-blue-500 z-[60] shadow-blue-500/30' : 'border-[3px] border-red-500 opacity-90'}
                    `}
                    style={{ width: ann.size, height: ann.size }}
                    onMouseDown={(e) => {
                        e.stopPropagation(); // Evita que el clic pase al fondo
                        onSelect(ann.id);
                    }}
                >
                    <img src={ann.src} className="w-full h-full object-cover pointer-events-none" alt="Detail" />
                    
                    {/* Overlay Hover */}
                    <div className={`absolute inset-0 flex items-center justify-center transition-opacity bg-black/40 ${isSelected ? 'opacity-0 hover:opacity-100' : 'opacity-0'}`}>
                        <Move className="text-white w-8 h-8 drop-shadow-lg" />
                    </div>
                </div>
            </Draggable>
        </>
    );
});


// --- COMPONENTE PRINCIPAL ---
export const DamageAnnotator: React.FC<DamageAnnotatorProps> = ({ imageSrc, onSave, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainImageRef = useRef<HTMLImageElement>(null);
  const detailInputRef = useRef<HTMLInputElement>(null);

  // Estados
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mainImgLoaded, setMainImgLoaded] = useState(false);

  // Configuración
  const MIN_SIZE = 120;
  const MAX_SIZE = 350;

  // --- LOGICA DE DATOS ---

  const handleDrag = (id: string, type: 'target' | 'detail', data: DraggableData) => {
    setAnnotations(prev => prev.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        [type === 'target' ? 'targetPos' : 'detailPos']: { x: data.x, y: data.y }
      };
    }));
    if (selectedId !== id) setSelectedId(id);
  };

  const triggerUpload = () => {
    detailInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newId = Date.now().toString();
        const newAnnotation: AnnotationItem = {
            id: newId,
            src: reader.result as string,
            targetPos: { x: 100, y: 100 },
            detailPos: { x: 50, y: 200 },
            size: 180,
            shape: 'circle'
        };

        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            newAnnotation.targetPos = { x: rect.width / 2 - 20, y: rect.height / 2 - 20 };
            const offset = annotations.length * 30; // Cascada visual para que no se encimen
            newAnnotation.detailPos = { x: 40 + offset, y: rect.height - 220 - offset };
        }

        setAnnotations([...annotations, newAnnotation]);
        setSelectedId(newId);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const updateSelected = (key: keyof AnnotationItem, value: any) => {
    if (!selectedId) return;
    setAnnotations(prev => prev.map(item => 
        item.id === selectedId ? { ...item, [key]: value } : item
    ));
  };

  const toggleShape = () => {
    const current = annotations.find(a => a.id === selectedId);
    if (current) {
        updateSelected('shape', current.shape === 'circle' ? 'square' : 'circle');
    }
  };

  const deleteSelected = () => {
    setAnnotations(prev => prev.filter(a => a.id !== selectedId));
    setSelectedId(null);
  };

  // --- GENERACIÓN DE IMAGEN FINAL ---
  const generateCompositeImage = () => {
    const mainImg = mainImageRef.current;
    if (!mainImg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = mainImg.naturalWidth;
    canvas.height = mainImg.naturalHeight;

    const scaleX = mainImg.naturalWidth / mainImg.width;
    const scaleY = mainImg.naturalHeight / mainImg.height;

    // 1. Fondo
    ctx.drawImage(mainImg, 0, 0);

    // 2. Renderizar cada anotación
    annotations.forEach(ann => {
        const detailImg = new Image();
        detailImg.src = ann.src;
        
        const realTargetX = ann.targetPos.x * scaleX;
        const realTargetY = ann.targetPos.y * scaleY;
        const realDetailX = ann.detailPos.x * scaleX;
        const realDetailY = ann.detailPos.y * scaleY;
        const realSize = ann.size * scaleX;

        const targetCenter = { x: realTargetX + (10 * scaleX), y: realTargetY + (10 * scaleY) };
        const detailCenter = { x: realDetailX + (realSize / 2), y: realDetailY + (realSize / 2) };

        // Línea
        ctx.beginPath();
        ctx.moveTo(targetCenter.x, targetCenter.y);
        ctx.lineTo(detailCenter.x, detailCenter.y);
        ctx.lineWidth = 4 * scaleX;
        ctx.strokeStyle = '#ef4444'; 
        ctx.stroke();

        // Recorte y Foto
        ctx.save();
        ctx.beginPath();
        if (ann.shape === 'circle') {
            ctx.arc(detailCenter.x, detailCenter.y, realSize / 2, 0, Math.PI * 2);
        } else {
            ctx.roundRect(realDetailX, realDetailY, realSize, realSize, 20 * scaleX);
        }
        ctx.clip();
        ctx.fillStyle = 'white';
        ctx.fill();

        // Object-fit: cover logic
        const aspect = detailImg.naturalWidth / detailImg.naturalHeight;
        let drawW = realSize;
        let drawH = realSize;
        let offsetX = 0;
        let offsetY = 0;

        if (aspect > 1) { 
            drawW = realSize * aspect;
            offsetX = -(drawW - realSize) / 2;
        } else { 
            drawH = realSize / aspect;
            offsetY = -(drawH - realSize) / 2;
        }
        ctx.drawImage(detailImg, realDetailX + offsetX, realDetailY + offsetY, drawW, drawH);
        ctx.restore();

        // Bordes
        ctx.beginPath();
        if (ann.shape === 'circle') {
            ctx.arc(detailCenter.x, detailCenter.y, realSize / 2, 0, Math.PI * 2);
        } else {
            ctx.roundRect(realDetailX, realDetailY, realSize, realSize, 20 * scaleX);
        }
        ctx.lineWidth = 6 * scaleX;
        ctx.strokeStyle = '#ef4444';
        ctx.stroke();

        // Punto Rojo
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, 8 * scaleX, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, 20 * scaleX, 0, Math.PI * 2);
        ctx.lineWidth = 2 * scaleX;
        ctx.strokeStyle = '#ef4444';
        ctx.stroke();
    });

    onSave(canvas.toDataURL('image/jpeg', 0.85));
  };

  const currentAnnotation = annotations.find(a => a.id === selectedId);

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center select-none animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="absolute top-6 left-0 right-0 text-center pointer-events-none z-50">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white/80 text-sm font-medium shadow-lg">
           <ImageIcon size={14} className="text-white" />
           Editor Multizoom
        </div>
      </div>

      {/* ÁREA DE TRABAJO */}
      <div 
        ref={containerRef} 
        className="relative shadow-2xl overflow-hidden rounded-2xl cursor-crosshair transition-all border border-white/5 ring-1 ring-white/10"
        style={{ maxWidth: '90vw', maxHeight: '70vh' }}
        // Al hacer clic en el fondo vacío, deseleccionamos
        onMouseDown={(e) => {
            if (e.target === e.currentTarget || e.target === mainImageRef.current) {
                setSelectedId(null);
            }
        }}
      >
        <img 
          ref={mainImageRef}
          src={imageSrc} 
          alt="Main" 
          className="max-w-full max-h-[70vh] object-contain block pointer-events-none"
          onLoad={() => setMainImgLoaded(true)}
        />

        {mainImgLoaded && annotations.map((ann) => (
            <AnnotationLayer 
                key={ann.id}
                ann={ann}
                isSelected={selectedId === ann.id}
                onDrag={handleDrag}
                onSelect={setSelectedId}
            />
        ))}
      </div>

      <input type="file" ref={detailInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      {/* --- DOCK FLOTANTE --- */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl animate-in slide-in-from-bottom-6 duration-500 z-[80]">
        
        <button 
            onClick={onCancel}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105 active:scale-95"
            title="Cancelar"
        >
            <X size={18} />
        </button>

        <div className="w-px h-6 bg-white/10 mx-1"></div>

        {/* BOTÓN AÑADIR */}
        <button 
            onClick={triggerUpload}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
            title="Añadir otro zoom"
        >
            <Plus size={20} /> 
        </button>

        {/* CONTROLES CONTEXTUALES */}
        {currentAnnotation && (
            <>
                <div className="w-px h-6 bg-white/10 mx-1"></div>
                
                <div className="flex items-center gap-3 px-2 animate-in fade-in slide-in-from-right-4 duration-300">
                    <button 
                        onClick={toggleShape}
                        className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        title="Cambiar Forma"
                    >
                        {currentAnnotation.shape === 'circle' ? <Square size={18} /> : <Circle size={18} />}
                    </button>

                    <div className="flex items-center gap-2 group">
                        <Minus size={14} className="text-white/50" />
                        <input 
                            type="range" 
                            min={MIN_SIZE} 
                            max={MAX_SIZE} 
                            value={currentAnnotation.size} 
                            onChange={(e) => updateSelected('size', Number(e.target.value))}
                            className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500 hover:bg-white/30 transition-colors"
                        />
                        <Maximize2 size={14} className="text-white/50" />
                    </div>

                    <button 
                        onClick={deleteSelected}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full transition-colors"
                        title="Borrar Selección"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </>
        )}

        {!currentAnnotation && annotations.length > 0 && (
            <span className="text-white/40 text-xs px-2 animate-in fade-in hidden sm:inline-block">
                <MousePointerClick className="inline w-3 h-3 mr-1" />
                Selecciona para editar
            </span>
        )}

        <div className="w-px h-6 bg-white/10 mx-1"></div>

        {/* BOTÓN GUARDAR */}
        <button 
            onClick={generateCompositeImage}
            className="flex items-center gap-2 px-6 py-2.5 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all shadow-lg hover:scale-105 active:scale-95"
        >
            <Check size={18} />
            <span>Guardar</span>
        </button>

      </div>
    </div>
  );
};