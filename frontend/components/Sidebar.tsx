
import React from 'react';
import { LayoutDashboard, AlertCircle, BarChart3, User, Settings, Zap, PackageX, Cloud } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  
  const navItems: { id: ViewState; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
    { id: 'incidents', label: 'Incidentes', icon: AlertCircle },
    { id: 'schadentisch', label: 'Schadentisch', icon: PackageX },
    { id: 'analytics', label: 'Análisis', icon: BarChart3 },
    { id: 'cloud', label: 'Cloud', icon: Cloud },
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <aside className="w-20 lg:w-64 bg-white border-r border-gray-200 flex flex-col justify-between transition-all duration-300 h-full shadow-sm z-20">
      <div>
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-gray-100">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
            <Zap size={18} fill="currentColor" />
          </div>
          <span className="ml-3 font-bold text-xl tracking-tight hidden lg:block text-gray-900">FaultSense</span>
        </div>

        <nav className="mt-6 px-2 lg:px-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-200 group ${
                currentView === item.id
                  ? 'bg-gray-100 text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon
                size={22}
                className={`${currentView === item.id ? 'text-black' : 'text-gray-400 group-hover:text-gray-600'}`}
              />
              <span className={`ml-3 font-medium hidden lg:block`}>{item.label}</span>
              {currentView === item.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-black hidden lg:block" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 hidden lg:block">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-4 text-white shadow-lg shadow-gray-300/50">
          <p className="text-xs text-gray-300 font-medium uppercase tracking-wider mb-1">Estado del Sistema</p>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-semibold text-sm">Operativo 99.9%</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
