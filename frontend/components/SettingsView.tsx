import React, { useState } from 'react';
import { 
  Moon, Globe, Bell, Shield, Smartphone, Mail, 
  Cpu, Database, LogOut, ChevronRight, RefreshCw, 
  Zap, Volume2, Eye, Server, Download
} from 'lucide-react';

interface SettingsViewProps {
  onLogout?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onLogout }) => {
  // Local state for settings simulation
  const [settings, setSettings] = useState({
    darkMode: false,
    language: 'es',
    emailAlerts: true,
    pushNotifications: false,
    soundEffects: true,
    compactMode: false,
    autoRefresh: 30,
    oeeThreshold: 85,
    dataRetention: '90days'
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key: keyof typeof settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Reusable Toggle Component
  const Toggle = ({ active, onClick }: { active: boolean; onClick: () => void }) => (
    <button 
      onClick={onClick}
      className={`w-11 h-6 rounded-full transition-colors relative ${active ? 'bg-green-500' : 'bg-gray-200'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${active ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-[fadeIn_0.4s_ease-out]">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Configuración</h1>
        <p className="text-gray-500 mt-1">Preferencias del sistema, notificaciones y parámetros operativos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Main Categories */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* General Settings */}
          <section className="bg-white rounded-[24px] shadow-soft border border-gray-100 overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Globe size={18} /></div>
                <h3 className="font-bold text-gray-900">General y Región</h3>
             </div>
             <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="text-gray-400"><Moon size={20} /></div>
                      <div>
                         <p className="text-sm font-medium text-gray-900">Modo Oscuro</p>
                         <p className="text-xs text-gray-500">Ajustar interfaz para entornos con poca luz.</p>
                      </div>
                   </div>
                   <Toggle active={settings.darkMode} onClick={() => handleToggle('darkMode')} />
                </div>

                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="text-gray-400"><Eye size={20} /></div>
                      <div>
                         <p className="text-sm font-medium text-gray-900">Modo Compacto</p>
                         <p className="text-xs text-gray-500">Reducir espaciado en tablas y listas.</p>
                      </div>
                   </div>
                   <Toggle active={settings.compactMode} onClick={() => handleToggle('compactMode')} />
                </div>

                <div className="h-px bg-gray-100 w-full" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Idioma del Sistema</label>
                      <select 
                        value={settings.language}
                        onChange={(e) => handleChange('language', e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-black/5 focus:border-gray-400 block p-2.5 outline-none"
                      >
                        <option value="es">Español (México)</option>
                        <option value="en">English (US)</option>
                        <option value="de">Deutsch (Alemania)</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Formato de Fecha</label>
                      <select className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-black/5 focus:border-gray-400 block p-2.5 outline-none">
                        <option>DD/MM/AAAA (24h)</option>
                        <option>MM/DD/AAAA (12h)</option>
                        <option>AAAA-MM-DD (ISO)</option>
                      </select>
                   </div>
                </div>
             </div>
          </section>

          {/* Plant Parameters */}
          <section className="bg-white rounded-[24px] shadow-soft border border-gray-100 overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Cpu size={18} /></div>
                <h3 className="font-bold text-gray-900">Parámetros de Planta (Q-TICKER)</h3>
             </div>
             <div className="p-6 space-y-8">
                <div>
                   <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium text-gray-900">Umbral de Alerta OEE (Eficiencia)</label>
                      <span className="text-sm font-bold text-orange-600">{settings.oeeThreshold}%</span>
                   </div>
                   <input 
                      type="range" 
                      min="50" 
                      max="99" 
                      value={settings.oeeThreshold} 
                      onChange={(e) => handleChange('oeeThreshold', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                   />
                   <p className="text-xs text-gray-500 mt-2">Se enviará una notificación crítica si la eficiencia global cae por debajo de este valor.</p>
                </div>

                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="text-gray-400"><RefreshCw size={20} /></div>
                      <div>
                         <p className="text-sm font-medium text-gray-900">Frecuencia de Actualización</p>
                         <p className="text-xs text-gray-500">Refresco automático de dashboard.</p>
                      </div>
                   </div>
                   <select 
                      value={settings.autoRefresh}
                      onChange={(e) => handleChange('autoRefresh', parseInt(e.target.value))}
                      className="bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg p-2 outline-none"
                   >
                      <option value={10}>Cada 10 seg</option>
                      <option value={30}>Cada 30 seg</option>
                      <option value={60}>Cada 1 min</option>
                      <option value={0}>Manual</option>
                   </select>
                </div>
             </div>
          </section>

          {/* Data Management */}
           <section className="bg-white rounded-[24px] shadow-soft border border-gray-100 overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Database size={18} /></div>
                <h3 className="font-bold text-gray-900">Datos y Exportación</h3>
             </div>
             <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                 <div className="text-sm text-gray-600">
                    <p><strong>Retención de historial:</strong> 90 días</p>
                    <p className="text-xs text-gray-400 mt-1">Los registros antiguos se archivan automáticamente.</p>
                 </div>
                 <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 text-gray-700">
                       <Server size={16} /> Backup
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 shadow-lg">
                       <Download size={16} /> Exportar CSV
                    </button>
                 </div>
             </div>
           </section>

        </div>

        {/* RIGHT COLUMN: Notifications & Security */}
        <div className="space-y-6">
           
           <section className="bg-white rounded-[24px] shadow-soft border border-gray-100 overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Bell size={18} /></div>
                <h3 className="font-bold text-gray-900">Notificaciones</h3>
             </div>
             <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <Mail size={18} className="text-gray-400"/>
                      <span className="text-sm text-gray-700">Alertas por Email</span>
                   </div>
                   <Toggle active={settings.emailAlerts} onClick={() => handleToggle('emailAlerts')} />
                </div>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <Smartphone size={18} className="text-gray-400"/>
                      <span className="text-sm text-gray-700">Push App Móvil</span>
                   </div>
                   <Toggle active={settings.pushNotifications} onClick={() => handleToggle('pushNotifications')} />
                </div>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <Volume2 size={18} className="text-gray-400"/>
                      <span className="text-sm text-gray-700">Sonidos de Alerta</span>
                   </div>
                   <Toggle active={settings.soundEffects} onClick={() => handleToggle('soundEffects')} />
                </div>
                
                <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 mt-2">
                   <p className="text-xs text-yellow-800 flex items-start gap-2">
                      <Zap size={14} className="mt-0.5 shrink-0"/>
                      Las alertas críticas (Paro de Línea) siempre enviarán un SMS al supervisor de turno.
                   </p>
                </div>
             </div>
           </section>

           <section className="bg-white rounded-[24px] shadow-soft border border-gray-100 overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Shield size={18} /></div>
                <h3 className="font-bold text-gray-900">Cuenta</h3>
             </div>
             <div className="p-6">
                <div className="space-y-1 mb-6">
                   <button className="w-full text-left flex justify-between items-center py-2 text-sm text-gray-700 hover:text-black group">
                      <span>Cambiar Contraseña</span>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-black transition-colors" />
                   </button>
                   <button className="w-full text-left flex justify-between items-center py-2 text-sm text-gray-700 hover:text-black group">
                      <span>Autenticación de 2 Factores</span>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-black transition-colors" />
                   </button>
                   <button className="w-full text-left flex justify-between items-center py-2 text-sm text-gray-700 hover:text-black group">
                      <span>Historial de Sesiones</span>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-black transition-colors" />
                   </button>
                </div>
                
                <button onClick={onLogout} className="w-full py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 flex items-center justify-center gap-2 transition-colors">
                   <LogOut size={16} /> Cerrar Sesión
                </button>
             </div>
           </section>

           <div className="text-center">
              <p className="text-xs text-gray-400 font-medium">FaultSense v2.5.0 (Build 2491)</p>
              <p className="text-[10px] text-gray-300 mt-1">© 2025 Industrial Solutions Inc.</p>
           </div>

        </div>

      </div>
    </div>
  );
};