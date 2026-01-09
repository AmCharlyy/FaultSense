// src/components/ProfileView.tsx

import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { Camera, MapPin, Mail, Phone, Briefcase, Save, Edit3, Shield, CheckCircle, Upload, X, Loader2, LogOut, Trash2 } from 'lucide-react'; // Añadir LogOut y Trash2
import { api } from '../services/api';
import { authService } from '../services/authService'; // ¡Importar authService para eliminar cuenta!

interface ProfileViewProps {
  user: User;
  onUpdateProfile: (updatedUser: User) => void;
  onLogout: () => void; // AÑADIDO: Prop para cerrar sesión
  onAccountDeleted?: () => void; // AÑADIDO: Prop opcional para notificar la eliminación de la cuenta
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdateProfile, onLogout, onAccountDeleted }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<User>(user);
  const [previewAvatar, setPreviewAvatar] = useState(user.avatar);

  // Camera & File State
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para eliminar cuenta
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);


  // Sync state if prop changes (e.g. initial load or update from parent)
  useEffect(() => {
    setFormData(user);
    setPreviewAvatar(user.avatar);
  }, [user]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- File Upload Logic ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewAvatar(result);
        setFormData(prev => ({ ...prev, avatar: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // --- Camera Logic ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("No se pudo acceder a la cámara. Verifique los permisos.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');

        setPreviewAvatar(dataUrl);
        setFormData(prev => ({ ...prev, avatar: dataUrl }));
        stopCamera();
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

  // --- API Interaction (Save Profile) ---
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Aquí se asumiría que si formData.avatar es una data URL, la subirías a Cloud Storage
      // y obtendrías su URL antes de enviarla a tu API para actualizar el usuario.
      // Por simplicidad, este ejemplo solo envía el formData tal cual.
      // EN UN PROYECTO REAL: Deberías subir la imagen a Firebase Storage primero.
      const updatedUser = await api.user.update(formData);

      onUpdateProfile(updatedUser); // Sincroniza el estado local de la App
      setIsEditing(false); // Sale del modo edición
      alert("Perfil actualizado exitosamente.");
    } catch (error) {
      console.error("Failed to update profile", error);
      alert("Error al guardar cambios. Verifique su conexión o intente nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(user); // Restaura los datos originales
    setPreviewAvatar(user.avatar); // Restaura el avatar original
    setIsEditing(false);
    stopCamera(); // Asegúrate de detener la cámara si estaba abierta
  };

  // --- Handle Delete Account ---
  const handleDeleteAccount = async () => {
    setLoadingDelete(true);
    setDeleteError(null);
    try {
      // Llama a la función de eliminar cuenta de authService
      // Pasa la contraseña si el usuario se autenticó con email/password
      await authService.deleteCurrentUser(reauthPassword);
      alert('Tu cuenta ha sido eliminada exitosamente.');
      if (onAccountDeleted) {
        onAccountDeleted(); // Notifica al componente padre
      }
      // El listener en App.tsx detectará que no hay usuario y mostrará el LoginView.
    } catch (error: any) {
      setDeleteError(error.message || 'Error al eliminar la cuenta.');
      console.error("Error al eliminar cuenta:", error);
    } finally {
      setLoadingDelete(false);
    }
  };

  // Helper styles
  const inputClass = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-black/5 focus:border-gray-400 outline-none transition-all disabled:opacity-60";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1";

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-[fadeIn_0.4s_ease-out]">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Mi Perfil</h1>
           <p className="text-gray-500">Gestiona tu información personal y configuración de cuenta.</p>
        </div>
        {!isEditing ? (
          <div className="flex gap-3"> {/* Contenedor para botones en modo no edición */}
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all shadow-sm"
            >
              <Edit3 size={18} />
              <span>Editar Perfil</span>
            </button>
            <button
              onClick={onLogout} // Botón de CERRAR SESIÓN
              className="flex items-center space-x-2 px-5 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all shadow-sm"
            >
              <LogOut size={18} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-2 px-6 py-2.5 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-wait"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Left Column: Avatar & Quick Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[24px] shadow-soft border border-gray-100 text-center relative overflow-hidden group">

            {/* Avatar Circle */}
            <div className="relative w-40 h-40 mx-auto mb-6 group">
               <div className="w-full h-full rounded-full p-1 border-2 border-gray-100 bg-white overflow-hidden relative">
                  <img src={previewAvatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
               </div>

               {/* Checkmark badge */}
               {!isEditing && (
                 <div className="absolute bottom-2 right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-full flex items-center justify-center shadow-sm">
                   <CheckCircle size={14} className="text-white" />
                 </div>
               )}
            </div>

            {/* Photo Action Buttons (Only in Edit Mode) */}
            {isEditing ? (
              <div className="flex flex-col gap-2 mb-4 animate-[fadeIn_0.3s]">
                 <input
                   type="file"
                   ref={fileInputRef}
                   className="hidden"
                   accept="image/*"
                   onChange={handleFileSelect}
                 />

                 <button
                   onClick={triggerFileInput}
                   disabled={isSaving}
                   className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                 >
                   <Upload size={14} /> Subir Imagen
                 </button>

                 <button
                   onClick={startCamera}
                   disabled={isSaving}
                   className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                 >
                   <Camera size={14} /> Tomar Foto
                 </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                <p className="text-gray-500 font-medium text-sm mt-1">{user.role}</p>

                <div className="mt-6 flex justify-center gap-2">
                   <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                     {user.department || 'General'}
                   </span>
                </div>
              </>
            )}
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-[24px] shadow-lg text-white">
             <div className="flex items-center gap-3 mb-4">
               <Shield className="text-yellow-400" />
               <span className="font-bold">Nivel de Acceso</span>
             </div>
             <p className="text-gray-300 text-sm leading-relaxed mb-4">
               Tienes permisos de <strong>{user.role}</strong>. Esto te permite gestionar incidentes, ver analíticas y configurar parámetros de línea.
             </p>
             <div className="w-full bg-gray-700/50 h-1.5 rounded-full overflow-hidden">
               <div className="bg-yellow-400 h-full w-[85%]"></div>
             </div>
             <div className="mt-2 flex justify-between text-xs text-gray-400">
               <span>Seguridad</span>
               <span>Alto</span>
             </div>
          </div>
        </div>

        {/* Right Column: Detailed Form */}
        <div className="md:col-span-2">
          <div className="bg-white p-8 rounded-[24px] shadow-soft border border-gray-100 h-full">
             <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
               <div className="p-2 bg-gray-50 rounded-lg text-gray-900">
                 <Briefcase size={20} />
               </div>
               <h3 className="text-lg font-bold text-gray-900">Información Personal</h3>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div className="md:col-span-2">
                  <label className={labelClass}>Nombre Completo</label>
                  {isEditing ? (
                    <input name="name" value={formData.name} onChange={handleChange} disabled={isSaving} className={inputClass} />
                  ) : (
                    <p className="text-gray-900 font-medium p-2.5">{user.name}</p>
                  )}
                </div>

                <div>
                   <label className={labelClass}>
                     <span className="flex items-center gap-1"><Mail size={12}/> Email Corporativo</span>
                   </label>
                   {isEditing ? (
                     <input name="email" value={formData.email} onChange={handleChange} disabled={true} className={`${inputClass} bg-gray-100 text-gray-500 cursor-not-allowed`} title="El email no se puede cambiar" />
                   ) : (
                     <p className="text-gray-600 p-2.5">{user.email}</p>
                   )}
                </div>

                <div>
                   <label className={labelClass}>
                     <span className="flex items-center gap-1"><Phone size={12}/> Teléfono</span>
                   </label>
                   {isEditing ? (
                     <input name="phone" value={formData.phone || ''} onChange={handleChange} disabled={isSaving} placeholder="+52 (555) 000-0000" className={inputClass} />
                   ) : (
                     <p className="text-gray-600 p-2.5">{user.phone || 'No registrado'}</p>
                   )}
                </div>

                <div>
                   <label className={labelClass}>Departamento</label>
                   {isEditing ? (
                     <input name="department" value={formData.department || ''} onChange={handleChange} disabled={isSaving} className={inputClass} />
                   ) : (
                     <p className="text-gray-900 p-2.5">{user.department}</p>
                   )}
                </div>

                <div>
                   <label className={labelClass}>
                      <span className="flex items-center gap-1"><MapPin size={12}/> Ubicación / Planta</span>
                   </label>
                   {isEditing ? (
                     <input name="location" value={formData.location || ''} onChange={handleChange} disabled={isSaving} placeholder="Planta Monterrey, Edificio B" className={inputClass} />
                   ) : (
                     <p className="text-gray-600 p-2.5">{user.location || 'Planta Principal'}</p>
                   )}
                </div>

                <div className="md:col-span-2">
                   <label className={labelClass}>Biografía Profesional</label>
                   {isEditing ? (
                     <textarea
                        name="bio"
                        value={formData.bio || ''}
                        onChange={handleChange}
                        disabled={isSaving}
                        rows={4}
                        className={`${inputClass} resize-none`}
                        placeholder="Escribe una breve descripción de tu rol y experiencia..."
                      />
                   ) : (
                     <p className="text-gray-600 text-sm leading-relaxed p-2.5 border border-transparent">
                       {user.bio || 'Ingeniero dedicado con más de 5 años de experiencia en gestión de calidad y procesos de manufactura automatizada.'}
                     </p>
                   )}
                </div>

             </div>
          </div>
        </div>
      </div>

      {/* Zona de Peligro - Delete Account */}
      <div className="bg-red-50 p-8 rounded-[24px] shadow-soft border border-red-100 mt-8">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-red-200">
          <div className="p-2 bg-red-100 rounded-lg text-red-700">
            <Trash2 size={20} />
          </div>
          <h3 className="text-lg font-bold text-red-900">Zona de Peligro</h3>
        </div>
        <p className="text-red-700 text-sm mb-4">
          Eliminar tu cuenta es una acción permanente y no se puede deshacer.
          Todos tus datos y configuraciones se perderán.
        </p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center space-x-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all shadow-sm disabled:opacity-50"
            disabled={isSaving || loadingDelete} // Deshabilitar si se está guardando el perfil o ya eliminando
          >
            <Trash2 size={18} />
            <span>Eliminar Mi Cuenta</span>
          </button>
        ) : (
          <div className="animate-[fadeIn_0.3s]">
            <p className="text-red-800 font-semibold mb-3">
              ¿Estás seguro? Para continuar, por favor re-autentícate:
            </p>
            {user.email && user.email.includes('@') && user.id?.length < 20 ? ( // Heurística simple para detectar email/pass vs Google UID
              // Asume que si el UID es corto y tiene email, es probable que sea email/pass
              // Esto es una HEURÍSTICA, no un método infalible. Lo ideal es guardar el provider en el objeto User.
              <div className="mb-3">
                <label htmlFor="reauthPassword" className={labelClass}>Contraseña Actual</label>
                <input
                  type="password"
                  id="reauthPassword"
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  className={`${inputClass} border-red-300`}
                  placeholder="Ingresa tu contraseña"
                  disabled={loadingDelete}
                />
              </div>
            ) : (
              <p className="text-sm text-red-700 mb-3">
                Si iniciaste sesión con Google, se abrirá una ventana para reautenticarte.
              </p>
            )}

            {deleteError && (
              <div className="p-3 bg-red-100 text-red-800 text-sm rounded-lg mb-3 border border-red-300">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={loadingDelete || (user.email && user.email.includes('@') && user.id?.length < 20 && !reauthPassword)}
                className="flex items-center space-x-2 px-5 py-2.5 bg-red-700 text-white rounded-xl font-medium hover:bg-red-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-wait"
              >
                {loadingDelete ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                <span>{loadingDelete ? 'Eliminando...' : 'Confirmar Eliminación'}</span>
              </button>
              <button
                onClick={() => { setConfirmDelete(false); setDeleteError(null); setReauthPassword(''); }}
                disabled={loadingDelete}
                className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Camera Modal Overlay */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s]">
          <div className="bg-white p-4 rounded-3xl w-full max-w-md mx-4 overflow-hidden relative shadow-2xl">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><Camera size={20}/> Capturar Foto</h3>
                <button onClick={stopCamera} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
             </div>

             <div className="relative aspect-square bg-black rounded-2xl overflow-hidden mb-4">
                <video
                   ref={videoRef}
                   autoPlay
                   playsInline
                   className="w-full h-full object-cover"
                ></video>
                <canvas ref={canvasRef} className="hidden"></canvas>
             </div>

             <div className="flex justify-center">
               <button
                 onClick={capturePhoto}
                 className="w-16 h-16 rounded-full border-4 border-gray-200 flex items-center justify-center hover:border-gray-900 transition-colors group"
               >
                 <div className="w-12 h-12 bg-gray-900 rounded-full group-hover:bg-red-500 transition-colors"></div>
               </button>
             </div>
             <p className="text-center text-xs text-gray-400 mt-4">Asegúrate de tener buena iluminación</p>
          </div>
        </div>
      )}

    </div>
  );
};
