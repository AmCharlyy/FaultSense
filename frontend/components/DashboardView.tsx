
import React from 'react';
import { DashboardMetrics, Severity, Status } from '../types';
import { Activity, AlertTriangle, CheckCircle2, Clock, ArrowUpRight, MoreHorizontal, Hash, Factory, Loader2 } from 'lucide-react';

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ metrics }) => {
  
  if (!metrics) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.4s_ease-out]">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Q-TICKER</h1>
          <p className="text-gray-500 mt-1">Monitoreo de Calidad y Fallas.</p>
        </div>
        <div className="text-sm text-gray-400 font-medium">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Tickets Activos" value={metrics.activeTickets.toString()} trend={metrics.trends.tickets} icon={AlertTriangle} color="red" />
        <StatCard title="Piezas Afectadas (Sorte)" value={metrics.totalSorte.toString()} trend={metrics.trends.sorte} icon={Hash} color="orange" />
        <StatCard title="Clientes Afectados" value={metrics.activeClients.toString()} trend={metrics.trends.clients} icon={Factory} color="blue" />
        <StatCard title="Eficacia Resolución" value={`${metrics.resolutionRate}%`} trend={metrics.trends.resolution} icon={CheckCircle2} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-soft border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Actividad Reciente (Q-Tickers)</h3>
            <button className="p-2 hover:bg-gray-50 rounded-full text-gray-400"><MoreHorizontal size={20} /></button>
          </div>
          <div className="space-y-4">
            {metrics.recentIncidents.map((incident) => (
              <div key={incident.id} className="flex items-center p-4 rounded-2xl hover:bg-gray-50 transition-colors group cursor-pointer border border-transparent hover:border-gray-100">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${incident.severity === Severity.CRITICAL ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                  <Activity size={20} />
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex justify-between">
                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{incident.folio}: {incident.title}</h4>
                    <span className="text-xs font-medium text-gray-400">{new Date(incident.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                    <span className="font-medium text-gray-600">Cliente: {incident.client}</span> • Origen: {incident.origin}
                  </p>
                </div>
                <div className="ml-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${incident.status === Status.OPEN ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                    {incident.status}
                  </span>
                </div>
              </div>
            ))}
            {metrics.recentIncidents.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">No hay actividad reciente.</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-soft border border-gray-100 flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Estado General</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
             <div className="relative w-48 h-48">
               <svg className="w-full h-full" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#34C759" strokeWidth="3" strokeDasharray={`${metrics.resolutionRate}, 100`} className="animate-[dash_1.5s_ease-out_forwards]" />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-4xl font-bold text-gray-900">{metrics.resolutionRate}%</span>
                 <span className="text-xs text-gray-500 font-medium uppercase mt-1">Eficacia</span>
               </div>
             </div>
             <div className="w-full mt-8 space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Tickets Resueltos</span>
                    <span className="font-medium text-gray-900">{metrics.resolutionRate}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${metrics.resolutionRate}%` }}></div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, trend, icon: Icon, color }: any) => {
  const colorClasses = { blue: 'bg-blue-50 text-blue-600', red: 'bg-red-50 text-red-600', green: 'bg-green-50 text-green-600', orange: 'bg-orange-50 text-orange-600' };
  return (
    <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${(colorClasses as any)[color]}`}><Icon size={24} /></div>
        <div className="flex items-center space-x-1 text-gray-400 bg-gray-50 px-2 py-1 rounded-lg"><ArrowUpRight size={14} /><span className="text-xs font-medium">{trend}</span></div>
      </div>
      <div><h4 className="text-3xl font-bold text-gray-900 tracking-tight">{value}</h4><p className="text-sm text-gray-500 font-medium mt-1">{title}</p></div>
    </div>
  );
};
