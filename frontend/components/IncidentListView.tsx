
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Incident, Severity, Status, IncidentFilters } from '../types';
import { Filter, Plus, Search, MoreVertical, Trash2, FileText, Edit3, SlidersHorizontal, X, ChevronDown, ChevronLeft, ChevronRight, Loader2, ClipboardList } from 'lucide-react';
import { IncidentModal } from './IncidentModal';
import { IncidentDetailModal } from './IncidentDetailModal';
import { generateIncidentReport } from '../services/pdfService';
import { api } from '../services/api';

// Reuse CustomSelect component with visual indicators
const CustomSelect = ({ 
  label, value, onChange, options, icon: Icon 
}: { 
  label: string; value: string; onChange: (val: string) => void; options: { value: string; label: string; color?: string }[]; icon?: React.ElementType;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const selectedOption = options.find(o => o.value === value) || options[0];
  return (
    <div className="space-y-1 relative" ref={containerRef}>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">{label}</label>
      <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between bg-gray-50 border transition-all rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-black/5 outline-none ${isOpen ? 'border-gray-400' : 'border-gray-200 hover:border-gray-300'}`}>
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon size={16} className="text-gray-400" />}
          {selectedOption.color && <div className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedOption.color}`}></div>}
          <span className="truncate">{selectedOption.label}</span>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-[60] max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button key={option.value} onClick={() => { onChange(option.value); setIsOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between hover:bg-gray-50 ${value === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}>
              <div className="flex items-center gap-2">
                 {option.color && <div className={`w-2 h-2 rounded-full ${option.color}`}></div>}
                 <span>{option.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const IncidentListView: React.FC = () => {
  // --- Data State ---
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false); // For Delete/Save actions
  
  // --- UI State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [modalView, setModalView] = useState<'default' | 'pre-analysis'>('default');
  
  // --- Filter Options State (from DB) ---
  const [clientOptions, setClientOptions] = useState<{value: string, label: string}[]>([{value: 'All', label: 'Todos'}]);
  const [originOptions, setOriginOptions] = useState<{value: string, label: string}[]>([{value: 'All', label: 'Todos'}]);

  // --- Filter State (Server Side) ---
  const [filters, setFilters] = useState<IncidentFilters>({
    page: 1,
    limit: 7, // Items per page
    search: '',
    status: 'All',
    client: 'All',
    origin: 'All',
    dateStart: '',
    dateEnd: ''
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // --- FETCHING LOGIC (DB READY) ---
  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.incidents.getAll(filters);
      setIncidents(response.data);
      setTotalItems(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      console.error("Error fetching incidents", err);
      // Optional: Add toast notification here
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Debounce search effect
  useEffect(() => {
    const timer = setTimeout(() => {
       fetchIncidents();
    }, 400); // 400ms delay for search debounce
    return () => clearTimeout(timer);
  }, [fetchIncidents]);

  // Handle dropdown outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setActiveDropdown(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- FETCH FILTER OPTIONS (CLIENTS, ORIGINS) ---
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Asumimos que tu API tiene endpoints para obtener estas listas
        const clientsRes = await api.clients.getAll(); // EJEMPLO: api.clients.getAll()
        const originsRes = await api.origins.getAll(); // EJEMPLO: api.origins.getAll()

        setClientOptions([{value: 'All', label: 'Todos'}, ...clientsRes.map((c: any) => ({ value: c.name, label: c.name }))]);
        setOriginOptions([{value: 'All', label: 'Todos'}, ...originsRes.map((o: any) => ({ value: o.name, label: o.name }))]);
      } catch (err) {
        console.error("Error fetching filter options:", err);
      }
    };
    fetchFilterOptions();
  }, []); // El array vacío asegura que se ejecute solo una vez al montar el componente

  // --- ACTIONS ---
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setFilters(prev => ({ ...prev, page: newPage }));
    }
  };

  const toggleDropdown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); setActiveDropdown(activeDropdown === id ? null : id);
  };

  const handleCreate = () => {
    setEditingIncident(null); 
    setModalView('default');
    setIsModalOpen(true);
  };
  
  const handleEdit = (incident: Incident) => {
    setEditingIncident(incident); 
    setModalView('default');
    setIsModalOpen(true); setActiveDropdown(null);
  };

  const handlePreAnalysis = (incident: Incident) => {
    setEditingIncident(incident);
    setModalView('pre-analysis');
    setIsModalOpen(true);
    setActiveDropdown(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Eliminar Q-TICKER permanentemente?')) { 
       setActiveDropdown(null);
       setIsProcessing(true); 
       try {
         await api.incidents.delete(id);
         await fetchIncidents(); // Refresh list from server after delete
       } catch (e) {
         alert("Error al eliminar. Verifique conexión.");
       } finally {
         setIsProcessing(false);
       }
    }
  };

  const handleSaveIncident = async (data: any) => {
    setIsProcessing(true);
    try {
      if (editingIncident) {
        await api.incidents.update(data.id, data);
      } else {
        await api.incidents.create(data);
      }
      setIsModalOpen(false);
      await fetchIncidents(); // Refresh data from server
    } catch (e) {
      alert("Error al guardar. Verifique conexión.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRowClick = (incident: Incident) => {
    setSelectedIncident(incident); setIsDetailOpen(true);
  };

  const clearFilters = () => {
    setFilters(prev => ({ 
      ...prev, 
      search: '', status: 'All', client: 'All', origin: 'All', dateStart: '', dateEnd: '', page: 1 
    }));
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out] relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Q-TICKER Monitor</h1>
        <button onClick={handleCreate} className="flex items-center space-x-2 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200">
          <Plus size={20} /> <span className="font-medium">Nuevo Registro</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-soft border border-gray-100 min-h-[500px] flex flex-col relative z-0">
        
        {/* FILTERS BAR */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 rounded-t-3xl relative z-20">
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por Folio, Cliente, Origen..." 
                  value={filters.search} 
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))} // Reset to page 1 on search
                  className="w-full pl-10 pr-10 py-3 rounded-xl border-none bg-white focus:ring-2 focus:ring-black/5 text-sm shadow-sm text-gray-900" 
                />
                {filters.search && <button onClick={() => setFilters(prev => ({...prev, search: ''}))} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-gray-500"><X size={16} /></button>}
              </div>
              <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border transition-all ${showFilters ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'}`}>
                <SlidersHorizontal size={18} /> <span className="font-medium hidden sm:inline">Filtros</span>
              </button>
            </div>

            {showFilters && (
               <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl space-y-4 relative z-30 animate-[fadeIn_0.2s]">
                  <div className="flex justify-between items-center mb-2">
                     <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><Filter size={12} /> Búsqueda Avanzada DB</h3>
                     <button onClick={clearFilters} className="text-xs text-red-500 hover:underline">Restablecer todo</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <CustomSelect label="Estado" value={filters.status || 'All'} onChange={(val) => setFilters(prev => ({...prev, status: val, page: 1}))} options={[{ value: 'All', label: 'Todos' }, { value: Status.OPEN, label: 'Abierto', color: 'bg-blue-500' }, { value: Status.RESOLVED, label: 'Resuelto', color: 'bg-green-500' }, { value: Status.CLOSED, label: 'Cerrado', color: 'bg-gray-500' }]} />
                      <CustomSelect label="Cliente" value={filters.client || 'All'} onChange={(val) => setFilters(prev => ({...prev, client: val, page: 1}))} options={clientOptions} />
                      <CustomSelect label="Origen" value={filters.origin || 'All'} onChange={(val) => setFilters(prev => ({...prev, origin: val, page: 1}))} options={originOptions} />
                      
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Fecha Registro</label>
                        <div className="flex gap-2">
                           <div className="relative w-full">
                             <input type="date" value={filters.dateStart} onChange={(e) => setFilters(prev => ({...prev, dateStart: e.target.value, page: 1}))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2.5 text-sm text-gray-700 outline-none [&::-webkit-calendar-picker-indicator]:hidden" onClick={(e) => (e.target as HTMLInputElement).showPicker()} />
                           </div>
                           <div className="relative w-full">
                             <input type="date" value={filters.dateEnd} onChange={(e) => setFilters(prev => ({...prev, dateEnd: e.target.value, page: 1}))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2.5 text-sm text-gray-700 outline-none [&::-webkit-calendar-picker-indicator]:hidden" onClick={(e) => (e.target as HTMLInputElement).showPicker()} />
                           </div>
                        </div>
                      </div>
                  </div>
               </div>
            )}
          </div>
        </div>

        {/* TABLE CONTENT */}
        <div className="overflow-x-visible z-10 flex-1 relative min-h-[400px]">
          {/* Main Loading State */}
          {loading && (
             <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center">
                <Loader2 size={32} className="animate-spin text-gray-400 mb-2" />
                <span className="text-sm text-gray-500 font-medium">Sincronizando con Base de Datos...</span>
             </div>
          )}
          
          {/* Action Processing Overlay (Delete/Save) */}
          {isProcessing && (
             <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center">
                <div className="bg-black text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-xl">
                   <Loader2 size={16} className="animate-spin" />
                   <span className="text-xs font-bold">Procesando cambio...</span>
                </div>
             </div>
          )}

          {!loading && incidents.length === 0 ? (
             <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                <div className="p-4 bg-gray-50 rounded-full mb-3"><Filter size={24} /></div>
                <p>No se encontraron registros con estos filtros.</p>
             </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 text-left border-b border-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">Folio / Título</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/5">Cliente / Origen</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Detalles Téc.</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {incidents.map((incident) => (
                  <tr key={incident.id} onClick={() => handleRowClick(incident)} className="hover:bg-gray-50/80 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-gray-900 text-sm bg-gray-100 px-2 py-0.5 rounded w-fit mb-1">{incident.folio}</span>
                        <span className="text-sm font-medium text-gray-700 line-clamp-1">{incident.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-sm">
                        <span className="font-bold text-gray-900">{incident.client}</span>
                        <span className="text-gray-500 text-xs">{incident.origin}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex gap-4 text-xs text-gray-500">
                          <div>
                             <span className="block font-bold text-gray-400 uppercase text-[10px]">Sorte</span>
                             <span className="font-mono text-gray-900">{incident.sorte}</span>
                          </div>
                          <div>
                             <span className="block font-bold text-gray-400 uppercase text-[10px]">Turno</span>
                             <span className="font-mono text-gray-900">{incident.shift}</span>
                          </div>
                          <div>
                             <span className="block font-bold text-gray-400 uppercase text-[10px]">Fecha</span>
                             <span className="text-gray-900">{incident.schadentischDate}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${incident.status === Status.OPEN ? 'bg-blue-50 text-blue-700 border-blue-100' : incident.status === Status.RESOLVED ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button onClick={(e) => toggleDropdown(incident.id, e)} className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100"><MoreVertical size={18} /></button>
                      {activeDropdown === incident.id && (
                        <div ref={dropdownRef} onClick={(e) => e.stopPropagation()} className="absolute right-6 top-10 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                          <button onClick={() => { generateIncidentReport(incident); setActiveDropdown(null); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"><FileText size={16} /><span>PDF Q-TICKER</span></button>
                          <button onClick={() => handlePreAnalysis(incident)} className="w-full text-left px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-50 flex items-center space-x-2"><ClipboardList size={16} /><span>Pre-Análisis</span></button>
                          <button onClick={() => handleEdit(incident)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"><Edit3 size={16} /><span>Editar</span></button>
                          <button onClick={() => handleDelete(incident.id)} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"><Trash2 size={16} /><span>Eliminar</span></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION FOOTER */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-3xl flex items-center justify-between">
           <span className="text-xs text-gray-500 font-medium ml-2">
             Mostrando {incidents.length} de {totalItems} registros (Página {filters.page} de {totalPages})
           </span>
           <div className="flex gap-2">
              <button 
                 onClick={() => handlePageChange(filters.page - 1)} 
                 disabled={filters.page === 1}
                 className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                 <ChevronLeft size={16} />
              </button>
              <button 
                 onClick={() => handlePageChange(filters.page + 1)} 
                 disabled={filters.page === totalPages}
                 className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                 <ChevronRight size={16} />
              </button>
           </div>
        </div>

      </div>

      <IncidentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveIncident} incidentToEdit={editingIncident} initialView={modalView} />
      <IncidentDetailModal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} incident={selectedIncident} />
    </div>
  );
};
