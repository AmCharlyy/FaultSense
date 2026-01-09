// src/components/LoginView.tsx

import React, { useState } from 'react';
import { Zap, Mail, Lock, ArrowRight, Chrome } from 'lucide-react'; // Eliminamos PlayCircle
// Eliminamos la importación de authService y User

// Propiedades que App.tsx espera pasar a LoginView
interface LoginViewProps {
  onLoginGoogle: () => void;
  onLoginEmail: (email: string, pass: string) => void;
  // Eliminamos onDemoMode
  loading: boolean;
  error: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginGoogle, onLoginEmail, loading, error }) => { // Eliminamos onDemoMode de props
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginEmail(email, password);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-[pulse_8s_infinite]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-[pulse_10s_infinite]" />
      </div>

      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[32px] shadow-2xl w-full max-w-5xl h-[600px] flex overflow-hidden relative z-10 animate-[scaleIn_0.4s_ease-out]">

        {/* Left Side: Brand */}
        <div className="hidden md:flex flex-col justify-between w-1/2 p-12 bg-black/40 text-white relative">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center">
                <Zap size={24} fill="currentColor" />
             </div>
             <span className="text-2xl font-bold tracking-tight">FaultSense</span>
          </div>

          <div className="space-y-6">
             <h1 className="text-4xl font-bold leading-tight">
               Inteligencia Industrial para la nueva era.
             </h1>
             <p className="text-gray-300 text-lg">
               Gestiona incidentes, analiza métricas OEE y optimiza tu línea de producción con el poder de la IA Generativa.
             </p>
             <div className="flex items-center gap-4 text-sm font-medium text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Sistema Activo</span>
                <span>v2.5.0</span>
             </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 bg-white p-12 flex flex-col justify-center relative">

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Bienvenido de nuevo</h2>
            <p className="text-gray-500 mt-2">Ingresa tus credenciales para acceder al dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Email</label>
                <div className="relative">
                   <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                   <input
                     type="email"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-gray-900 outline-none focus:ring-2 focus:ring-black/10 transition-all"
                     placeholder="nombre@empresa.com"
                     disabled={loading}
                   />
                </div>
             </div>

             <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Contraseña</label>
                <div className="relative">
                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                   <input
                     type="password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-gray-900 outline-none focus:ring-2 focus:ring-black/10 transition-all"
                     placeholder="••••••••"
                     disabled={loading}
                   />
                </div>
             </div>

             {error && (
               <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium">
                 {error}
               </div>
             )}

             <button type="submit" disabled={loading} className="w-full bg-black text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:opacity-50">
                {loading ? 'Verificando...' : 'Iniciar Sesión'} <ArrowRight size={18} />
             </button>
          </form>

          <div className="my-6 flex items-center gap-3">
             <div className="h-px bg-gray-200 flex-1"></div>
             <span className="text-xs text-gray-400 font-medium uppercase">O continuar con</span>
             <div className="h-px bg-gray-200 flex-1"></div>
          </div>

          <div className="grid grid-cols-1 gap-4"> {/* Cambiado a 1 columna ya que solo queda Google */}
             <button onClick={onLoginGoogle} disabled={loading} className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                <Chrome size={18} className="text-blue-500" /> Google
             </button>
             {/* Eliminamos el botón de Modo Demo */}
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
             Protegido por reCAPTCHA y sujeto a la Política de Privacidad y Términos de Servicio de Google.
          </p>

        </div>
      </div>
    </div>
  );
};
