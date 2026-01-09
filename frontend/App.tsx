// src/App.tsx

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { IncidentListView } from './components/IncidentListView';
import { AnalyticsView } from './components/AnalyticsView';
import { ProfileView } from './components/ProfileView';
import { SchadentischView } from './components/SchadentischView';
import { SettingsView } from './components/SettingsView';
import { LoginView } from './components/LoginView';
import { Incident, ViewState, User, DashboardMetrics } from './types';
import { Bell, Loader2 } from 'lucide-react';
import { api, configureApi } from './services/api';
import { authService } from './services/authService';

// ==========================================
//    CONFIGURACIÓN DE CONEXIÓN (API)
// ==========================================

// 1. URL REAL de Producción (La que obtuviste de Firebase Console)
const PROD_API_URL = 'https://api-xlkihlzrzq-uc.a.run.app';

// 2. URL de Desarrollo (Tu backend local)
const DEV_API_URL = 'http://localhost:6001';

// 3. Lógica de Selección Inteligente:
//    a) Si existe la variable de entorno VITE_API_URL (definida en .env), úsala.
//    b) Si no, detecta si estás en 'localhost' y usa la local.
//    c) Si no es localhost, usa la URL de producción harcodeada.
const API_BASE_URL = import.meta.env.VITE_API_URL || 
                     (window.location.hostname === 'localhost' ? DEV_API_URL : PROD_API_URL);

console.log("🔌 FaultSense Conectado a:", API_BASE_URL);

// 4. Inyectamos la URL en el servicio de API
configureApi(API_BASE_URL);

// ==========================================


const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  // NUEVO ESTADO: Para controlar el flujo de login y evitar "race conditions".
  const [isLoginInProgress, setIsLoginInProgress] = useState(false);

  // App State (Vista actual)
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  // Data State
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [allIncidentsForAnalytics, setAllIncidentsForAnalytics] = useState<Incident[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // --- AUTH LISTENER ---
  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthChanges((user) => {
      // Solo actualizamos el usuario si NO hay un login manual en progreso.
      if (!isLoginInProgress) {
        setCurrentUser(user);
      }
      setIsAuthLoading(false);
      
      if (!user && !isLoginInProgress) {
        setLoginError(null); 
        setCurrentView('dashboard');
      }
    });
    return () => unsubscribe();
  }, [isLoginInProgress]);

  // --- DATA FETCH STRATEGY ---
  useEffect(() => {
    if (currentUser) {
      const fetchData = async () => {
        setIsDataLoading(true);
        setDataError(null);
        try {
          const [metricsData, rawIncidents] = await Promise.all([
            api.dashboard.getMetrics(),
            // Traemos muchos incidentes para las analíticas
            api.incidents.getAll({ page: 1, limit: 10000, search: '', status: 'All', client: 'All', origin: 'All' })
          ]);

          setDashboardMetrics(metricsData);
          setAllIncidentsForAnalytics(rawIncidents.data);

        } catch (err) {
          console.error("Failed to load initial data", err);
          setDataError("Error conectando a Q-TICKER Server. Intente de nuevo más tarde.");
        } finally {
          setIsDataLoading(false);
        }
      };
      fetchData();
    } else {
      setDashboardMetrics(null);
    }
  }, [currentUser]);

  // --- LOGIN HANDLERS ---
  const handleLoginGoogle = async () => {
    setIsLoginInProgress(true);
    setLoginError(null);
    try {
      const user = await authService.loginWithGoogle();
      setCurrentUser(user);
    } catch (e: any) {
      console.error("Error en handleLoginGoogle:", e);
      setLoginError(e.message || "Error al iniciar sesión con Google.");
    } finally {
      setIsLoginInProgress(false);
    }
  };

  const handleLoginEmail = async (email: string, pass: string) => {
    setIsLoginInProgress(true);
    setLoginError(null);
    try {
      const user = await authService.loginWithEmail(email, pass);
      setCurrentUser(user);
    } catch (e: any) {
      console.error("Error en handleLoginEmail:", e);
      setLoginError(e.message || "Credenciales incorrectas.");
    } finally {
      setIsLoginInProgress(false);
    }
  };

  // --- LOGOUT HANDLER ---
  const handleLogout = async () => {
    try {
      await authService.logout();
      setDashboardMetrics(null);
      setAllIncidentsForAnalytics([]);
      setDataError(null);
      alert("Has cerrado sesión exitosamente.");
    } catch (error: any) {
      console.error("Error al cerrar sesión:", error);
      alert("Error al cerrar sesión: " + (error.message || "Hubo un problema."));
    }
  };

  // --- ACCOUNT DELETED HANDLER ---
  const handleAccountDeleted = () => {
    alert("Tu cuenta ha sido eliminada. Lamentamos verte partir.");
    setCurrentView('dashboard');
  };

  // --- PROFILE UPDATE HANDLER ---
  const handleUpdateProfile = async (updatedUser: User) => {
    try {
      const savedUser = await api.user.update(updatedUser);
      setCurrentUser(savedUser);
    } catch (error) {
      console.error("Error al actualizar el perfil:", error);
      alert("No se pudo guardar el perfil. Revisa tu conexión.");
    }
  };

  // --- RENDERIZADO CONDICIONAL ---
  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F5F5F7] flex-col gap-4">
        <Loader2 size={48} className="animate-spin text-gray-900" />
        <p className="text-gray-500 font-medium animate-pulse">Iniciando FaultSense OS...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginView
        onLoginGoogle={handleLoginGoogle}
        onLoginEmail={handleLoginEmail}
        loading={isLoginInProgress}
        error={loginError}
      />
    );
  }

  const renderContent = () => {
    if (isDataLoading && !dashboardMetrics) {
       return (
         <div className="flex h-full w-full items-center justify-center">
            <Loader2 size={32} className="animate-spin text-gray-400" />
            <p className="ml-3 text-gray-500">Cargando datos...</p>
         </div>
       );
    }

    if (dataError) {
      return (
        <div className="flex h-full w-full items-center justify-center p-4">
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-center">
            <h3 className="text-xl font-bold mb-2">Error de Conexión</h3>
            <p>{dataError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard': return <DashboardView metrics={dashboardMetrics} />;
      case 'incidents': return <IncidentListView />;
      case 'schadentisch': return <SchadentischView />;
      case 'analytics': return <AnalyticsView incidents={allIncidentsForAnalytics} />;
      case 'profile': return (
        <ProfileView
          user={currentUser}
          onUpdateProfile={handleUpdateProfile}
          onLogout={handleLogout}
          onAccountDeleted={handleAccountDeleted}
        />
      );
      case 'settings': return <SettingsView onLogout={handleLogout} />;
      default: return <DashboardView metrics={dashboardMetrics} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F5F5F7] overflow-hidden font-sans">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-20 flex items-center justify-end px-8 flex-shrink-0 z-10 bg-[#F5F5F7]/90 backdrop-blur-md sticky top-0">
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
               <span className="text-xs font-medium text-gray-600">Sistema Q-TICKER Activo</span>
            </div>
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell size={20} />
            </button>

            <div className="flex items-center space-x-3 pl-6 border-l border-gray-200">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-gray-900">{currentUser.name}</p>
                <p className="text-xs text-gray-500">{currentUser.role}</p>
              </div>
              <img
                src={currentUser.avatar}
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setCurrentView('profile')}
              />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 pb-20 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;