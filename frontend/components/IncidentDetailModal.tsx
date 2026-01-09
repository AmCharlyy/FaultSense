
import React from 'react';
import { X, Calendar, Clock, MapPin, Box, Wrench, User, FileText, Sparkles, Tag, Layers, Factory, Hash } from 'lucide-react';
import { Incident, Severity, Status } from '../types';

interface IncidentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident | null;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({ isOpen, onClose, incident }) => {
  if (!isOpen || !incident) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md transition-opacity">
        <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-[scaleIn_0.2s_ease-out] relative">
            <div className="h-32 bg-gradient-to-r from-gray-900 to-gray-800 relative overflow-hidden flex items-start justify-end p-4">
                <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                <button onClick={onClose} className="relative z-10 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm"><X size={20} /></button>
            </div>

            <div className="px-8 pb-10 -mt-12 relative">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-wrap gap-2">
                             <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border flex items-center gap-1.5 bg-blue-100 text-blue-700 border-blue-200">
                               {incident.status}
                             </span>
                        </div>
                        <span className="text-sm font-mono font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">FOLIO: {incident.folio}</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-3">{incident.title}</h2>
                    <div className="flex flex-wrap items-center text-sm text-gray-500 gap-y-2 gap-x-6">
                         <span className="flex items-center gap-2"><div className="p-1 bg-gray-100 rounded-md"><Calendar size={14}/></div> Reg: {new Date(incident.createdAt).toLocaleDateString()}</span>
                         <span className="flex items-center gap-2"><div className="p-1 bg-gray-100 rounded-md"><Clock size={14}/></div> Sch: {incident.schadentischDate}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-8">
                        <div className="prose prose-sm max-w-none">
                             <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2"><FileText size={18} className="text-gray-400" /> Descripción</h3>
                             <p className="text-gray-700 leading-relaxed text-base bg-gray-50/50 p-5 rounded-2xl border border-gray-100 whitespace-pre-wrap">{incident.description}</p>
                        </div>
                        {incident.aiAnalysis && (
                           <div className="group relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50/30 p-6">
                              <div className="flex items-start gap-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600"><Sparkles size={24} /></div>
                                <div className="flex-1">
                                  <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-2">Diagnóstico IA</h3>
                                  <p className="text-blue-800 text-sm leading-relaxed mb-4 font-medium">"{incident.aiAnalysis}"</p>
                                </div>
                              </div>
                           </div>
                        )}
                         {incident.evidenceUrl && (
                             <div>
                                 <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Evidencia</h3>
                                 <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                                    <img src={incident.evidenceUrl} alt="Evidencia" className="w-full h-auto max-h-64 object-cover" />
                                 </div>
                             </div>
                         )}
                    </div>

                    <div className="space-y-6">
                         <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Datos Q-TICKER</h3>
                             <div className="space-y-5">
                                <InfoItem icon={Factory} label="Cliente" value={incident.client} />
                                <InfoItem icon={Box} label="Origen" value={incident.origin} />
                                <InfoItem icon={MapPin} label="Localización" value={incident.area} />
                                <InfoItem icon={Layers} label="Turno" value={incident.shift.toString()} />
                                <InfoItem icon={Hash} label="Sorte (Cant)" value={incident.sorte.toString()} isMono />
                                <InfoItem icon={Wrench} label="Categoría" value={incident.category} />
                             </div>
                         </div>

                         <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Responsable</h3>
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><User size={20} /></div>
                                <div>
                                     <p className="text-sm font-bold text-gray-900">{incident.responsibleName || 'N/A'}</p>
                                     <p className="text-xs text-gray-500">Asignado</p>
                                 </div>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

const InfoItem = ({ icon: Icon, label, value, isMono }: any) => (
  <div className="flex items-start gap-3 group">
     <div className="mt-0.5 text-gray-400 group-hover:text-gray-600 transition-colors"><Icon size={16} /></div>
     <div>
       <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
       <p className={`text-sm font-medium text-gray-900 ${isMono ? 'font-mono' : ''}`}>{value}</p>
     </div>
  </div>
);
