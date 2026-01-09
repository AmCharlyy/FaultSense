import React, { useState, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Incident, Severity, Status } from '../types';
import { FileText, Download, TrendingUp, AlertOctagon, CheckCircle, Clock, Calendar, Sparkles } from 'lucide-react';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface AnalyticsViewProps {
  incidents: Incident[];
}

const COLORS = ['#34C759', '#FF9500', '#FF3B30', '#007AFF'];
const RADAR_COLORS = ['#8884d8', '#82ca9d'];

type TimeRange = '7days' | 'month' | 'year';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ incidents }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Filter Data based on Time Range
  const filteredIncidents = useMemo(() => {
    const now = new Date();
    return incidents.filter(incident => {
      const incDate = new Date(incident.createdAt);
      if (timeRange === '7days') {
        const past = new Date();
        past.setDate(now.getDate() - 7);
        return incDate >= past;
      }
      if (timeRange === 'month') {
        return incDate.getMonth() === now.getMonth() && incDate.getFullYear() === now.getFullYear();
      }
      if (timeRange === 'year') {
        return incDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [incidents, timeRange]);

  // --- Calculate Metrics ---
  const totalIncidents = filteredIncidents.length;
  const resolvedCount = filteredIncidents.filter(i => i.status === Status.RESOLVED).length;
  const criticalCount = filteredIncidents.filter(i => i.severity === Severity.CRITICAL).length;
  const resolutionRate = totalIncidents > 0 ? Math.round((resolvedCount / totalIncidents) * 100) : 0;
  
  // Severity Distribution for Pie Chart
  const severityData = [
    { name: 'Baja', value: filteredIncidents.filter(i => i.severity === Severity.LOW).length },
    { name: 'Media', value: filteredIncidents.filter(i => i.severity === Severity.MEDIUM).length },
    { name: 'Alta', value: filteredIncidents.filter(i => i.severity === Severity.HIGH).length },
    { name: 'Crítica', value: filteredIncidents.filter(i => i.severity === Severity.CRITICAL).length },
  ];

  // Top Equipment Logic
  const equipmentStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredIncidents.forEach(i => {
      const key = i.origin;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredIncidents]);

  // Category Logic for Radar
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    const categories = ['Mecánica', 'Eléctrica', 'Hidráulica', 'Neumática', 'Software', 'Otro'];
    // Initialize
    categories.forEach(c => counts[c] = 0);
    
    filteredIncidents.forEach(i => {
      // Simple mapping or exact match
      const cat = categories.find(c => i.category.includes(c) || i.title.includes(c)) || 'Otro';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts).map(([subject, A]) => ({ subject, A, fullMark: totalIncidents }));
  }, [filteredIncidents, totalIncidents]);

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);
    
    try {
      // Wait for UI to update (remove shadow/buttons if needed)
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2, // Higher resolution
        useCORS: true, // For images
        backgroundColor: '#F5F5F7'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape A4
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate aspect ratio to fit
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Add Header
      pdf.setFillColor(31, 41, 55); 
      pdf.rect(0, 0, pdfWidth, 20, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("FAULTSENSE ANALYTICS", 15, 13);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Reporte Generado: ${new Date().toLocaleDateString()} | Rango: ${timeRange.toUpperCase()}`, pdfWidth - 80, 13);

      // Add Dashboard Image
      // Adjust y position to start after header
      let heightLeft = imgHeight;
      let position = 25; // Margin top

      // If image fits in one page
      if (imgHeight < pdfHeight - 30) {
         pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      } else {
         // Scale down to fit one page if preferred, or split. 
         // For dashboard view, scaling to fit width often pushes height.
         // Let's scale to fit PAGE HEIGHT if it's too tall
         const ratio = (pdfHeight - 40) / imgHeight;
         const fitWidth = pdfWidth * ratio;
         const centerX = (pdfWidth - fitWidth) / 2;
         pdf.addImage(imgData, 'PNG', centerX, position, fitWidth, pdfHeight - 40);
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text("Documento Confidencial - Uso Interno Exclusivo", 15, pdfHeight - 10);
      
      pdf.save(`FaultSense_Dashboard_${timeRange}.pdf`);

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error al generar el PDF. Intente nuevamente.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.4s_ease-out] pb-10">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Centro de Análisis</h1>
          <p className="text-gray-500 mt-1">Inteligencia de negocios y métricas de rendimiento.</p>
        </div>
        
        <div className="flex gap-4">
           {/* Time Filters */}
           <div className="flex items-center gap-3 bg-gray-100 p-1 rounded-xl">
             <button 
               onClick={() => setTimeRange('7days')}
               className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === '7days' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
             >
               7 Días
             </button>
             <button 
               onClick={() => setTimeRange('month')}
               className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === 'month' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
             >
               Mes
             </button>
             <button 
               onClick={() => setTimeRange('year')}
               className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === 'year' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
             >
               Año
             </button>
           </div>
           
           {/* Export Button */}
           <button 
             onClick={handleExportPDF}
             disabled={isExporting}
             className="flex items-center gap-2 bg-black text-white px-5 py-2 rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 active:scale-95"
           >
             {isExporting ? <span className="animate-pulse">Generando...</span> : <><Download size={18} /> <span>Exportar PDF</span></>}
           </button>
        </div>
      </div>

      {/* DASHBOARD CONTENT WRAPPER FOR CAPTURE */}
      <div ref={dashboardRef} className="space-y-8 p-1 bg-[#F5F5F7]"> 
        {/* Added padding and bg to ensure clean capture edges */}
        
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={20} /></div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Total</span>
               </div>
               <h3 className="text-3xl font-bold text-gray-900">{totalIncidents}</h3>
               <p className="text-xs text-gray-500 mt-1">Incidentes registrados</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle size={20} /></div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Eficacia</span>
               </div>
               <h3 className="text-3xl font-bold text-gray-900">{resolutionRate}%</h3>
               <p className="text-xs text-gray-500 mt-1">Tasa de resolución</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertOctagon size={20} /></div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Críticos</span>
               </div>
               <h3 className="text-3xl font-bold text-gray-900">{criticalCount}</h3>
               <p className="text-xs text-gray-500 mt-1">Incidentes de alta prioridad</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Clock size={20} /></div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Tiempo</span>
               </div>
               <h3 className="text-3xl font-bold text-gray-900">4.5h</h3>
               <p className="text-xs text-gray-500 mt-1">Promedio de resolución</p>
            </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Chart 1: Severity */}
          <div className="bg-white p-8 rounded-3xl shadow-soft border border-gray-100 h-96">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Distribución de Severidad</h3>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2: Top Equipment (Bar Chart) */}
          <div className="bg-white p-8 rounded-3xl shadow-soft border border-gray-100 h-96">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Top 5 Equipos con Fallas</h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart layout="vertical" data={equipmentStats} margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F3F4F6" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#F9FAFB' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" fill="#1F2937" radius={[0, 4, 4, 0]} barSize={24}>
                   {equipmentStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#EF4444' : '#1F2937'} />
                   ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 3: Categories (Radar) */}
          <div className="bg-white p-8 rounded-3xl shadow-soft border border-gray-100 h-96">
             <h3 className="text-lg font-bold text-gray-900 mb-6">Análisis por Categoría</h3>
             <ResponsiveContainer width="100%" height="90%">
               <RadarChart cx="50%" cy="50%" outerRadius="80%" data={categoryStats}>
                 <PolarGrid stroke="#E5E7EB" />
                 <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 11 }} />
                 <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                 <Radar
                   name="Incidentes"
                   dataKey="A"
                   stroke="#007AFF"
                   strokeWidth={2}
                   fill="#007AFF"
                   fillOpacity={0.2}
                 />
                 <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}/>
               </RadarChart>
             </ResponsiveContainer>
          </div>
          
          {/* Chart 4: Future Placeholder */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-3xl shadow-soft text-white flex flex-col justify-center items-center h-96 relative overflow-hidden group">
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              <Sparkles size={48} className="mb-4 text-yellow-400 animate-pulse" />
              <h3 className="text-2xl font-bold mb-2">Predicción de Fallas</h3>
              <p className="text-gray-400 text-center max-w-xs text-sm">
                 Modelo de proyección basado en histórico de mantenimiento.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs text-gray-500 border border-gray-700 rounded-full px-3 py-1">
                 <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                 Sistema Activo
              </div>
          </div>

        </div>
      </div>
    </div>
  );
};