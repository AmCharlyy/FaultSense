import { api, ApiError } from "./api"; // <-- 1. IMPORTAMOS LA API Y EL ERROR PERSONALIZADO

import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth"; // Esta importación ahora es correcta

// ¡CORRECCIÓN DE RUTA DE IMPORTACIÓN AQUÍ!
import { auth } from "./firebaseConfig"; // <= AHORA APUNTA AL MISMO DIRECTORIO

import { User } from "../types"; // Ruta a la definición de tu tipo de usuario de la aplicación (asumo que está en src/types.ts)

// Helper para convertir el objeto Firebase User a tu tipo de aplicación User
const mapFirebaseUserToUser = (fbUser: FirebaseUser): User => {
  return {
    id: fbUser.uid,
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario',
    email: fbUser.email || '',
    role: 'Ingeniero', // Rol por defecto para nuevos usuarios
    avatar: fbUser.photoURL || 'https://ui-avatars.com/api/?name=' + (fbUser.displayName || 'User'),
    department: 'Sin asignar',
    bio: 'Perfil sincronizado con Google Workspace.',
    location: 'Planta Principal'
  };
};

// *** LISTA DE DOMINIOS PERMITIDOS PARA EL INICIO DE SESIÓN CON GOOGLE ***
const ALLOWED_DOMAINS = [
  'uppenjamo.edu.mx', "gmail.com", 
];

export const authService = {
  // --- INICIO DE SESIÓN CON GOOGLE ---
  loginWithGoogle: async (): Promise<User> => {
    if (!auth) throw new Error("Firebase Authentication no está inicializado.");
    try {
      const provider = new GoogleAuthProvider();
      // FORZAR EL SELECTOR DE CUENTAS DE GOOGLE
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, provider);

      const userEmail = result.user.email;
      if (!userEmail) {
        await signOut(auth);
        throw new Error("No se pudo obtener el correo electrónico del usuario de Google.");
      }

      const domain = userEmail.split('@')[1];
      if (!ALLOWED_DOMAINS.includes(domain.toLowerCase())) {
        // IMPORTANTE: Primero cerramos sesión para evitar que onAuthStateChanged se active con un usuario no válido.
        await signOut(auth);
        throw new Error(`Dominio de correo electrónico no autorizado: ${domain}. Por favor, usa una cuenta con un dominio permitido.`);
      }

      // Si el dominio es correcto, ahora sí pedimos el perfil completo desde nuestro backend.
      return await api.user.get();
    } catch (error: any) {
      // CAMBIO: Ahora verificamos si el objeto 'error' tiene una propiedad 'code'
      if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && error.code.startsWith('auth/')) {
        let errorMessage = "Error al iniciar sesión con Google.";
        switch (error.code) {
          case 'auth/popup-closed-by-user':
            errorMessage = "Inicio de sesión de Google cancelado.";
            break;
          case 'auth/unauthorized-domain':
            errorMessage = "Este dominio de Google no está autorizado por FaultSense. Por favor, usa una cuenta con un dominio permitido (ej. @uppenjamo.edu.mx).";
            break;
          default:
            errorMessage = error.message;
        }
        console.error("Error de autenticación de Google:", error.code, error.message);
        throw new Error(errorMessage);
      }
      if (error && error.message && error.message.includes("Dominio de correo electrónico no autorizado")) {
         throw error; // Re-lanzamos el error específico del dominio
      }
      console.error("Error inesperado en loginWithGoogle:", error);
      throw new Error("Ocurrió un error inesperado al iniciar sesión con Google.");
    }
  },

  // --- INICIO DE SESIÓN CON EMAIL Y CONTRASEÑA ---
  loginWithEmail: async (email: string, pass: string): Promise<User> => {
    if (!auth) throw new Error("Firebase Authentication no está inicializado.");
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      return mapFirebaseUserToUser(result.user);
    } catch (error: any) {
      // CAMBIO: Ahora verificamos si el objeto 'error' tiene una propiedad 'code'
      if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && error.code.startsWith('auth/')) {
        let errorMessage = "Error al iniciar sesión.";
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            errorMessage = "Credenciales incorrectas. Verifica tu email y contraseña.";
            break;
          case 'auth/invalid-email':
            errorMessage = "El formato del email es inválido.";
            break;
          case 'auth/user-disabled':
            errorMessage = "Tu cuenta ha sido deshabilitada.";
            break;
          default:
            errorMessage = error.message;
        }
        console.error("Error de autenticación de Email:", error.code, error.message);
        throw new Error(errorMessage);
      }
      console.error("Error inesperado en loginWithEmail:", error);
      throw new Error("Ocurrió un error inesperado al iniciar sesión con email y contraseña.");
    }
  },

  // --- CIERRE DE SESIÓN ---
  logout: async () => {
    if (!auth) return;
    await signOut(auth);
  },

  // --- ESCUCHA DE CAMBIOS DE ESTADO DE AUTENTICACIÓN ---
  subscribeToAuthChanges: (callback: (user: User | null) => void) => {
    if (!auth) {
      console.warn("Firebase Auth no está inicializado para subscribeToAuthChanges.");
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // 2. Si hay un usuario de Firebase, pedimos su perfil a nuestro backend
        try {
          const userProfile = await api.user.get();
          callback(userProfile);
        } catch (error) {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            // Si el backend nos rechaza (token inválido, dominio no permitido, etc.)
            console.error(`Acceso denegado por el backend (status: ${error.status}). Cerrando sesión.`);
            await signOut(auth); // Forzamos el cierre de sesión
            callback(null); // Notificamos a la app que no hay usuario
          } else {
            // Otro tipo de error de red o del servidor
            console.error("Error al obtener el perfil del usuario:", error);
            callback(null);
          }
        }
      } else {
        callback(null);
      }
    });
  },

  // --- ELIMINAR EL USUARIO ACTUAL ---
  deleteCurrentUser: async (reauthPassword?: string): Promise<void> => {
    if (!auth || !auth.currentUser) {
      throw new Error("No hay un usuario autenticado para eliminar.");
    }

    const user = auth.currentUser;

    try {
      if (user.providerData.some(p => p.providerId === 'password') && user.email && reauthPassword) {
        const credential = EmailAuthProvider.credential(user.email, reauthPassword);
        await reauthenticateWithCredential(user, credential);
      } else if (user.providerData.some(p => p.providerId === 'google.com')) {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithCredential(user, provider);
      }

      await deleteUser(user);
      console.log("Cuenta de usuario eliminada exitosamente.");
    } catch (error: any) {
      // CAMBIO: Ahora verificamos si el objeto 'error' tiene una propiedad 'code'
      if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && error.code.startsWith('auth/')) {
        switch (error.code) {
          case 'auth/requires-recent-login':
            throw new Error("Por favor, inicia sesión nuevamente para confirmar la eliminación de tu cuenta.");
          case 'auth/wrong-password':
            throw new Error("Contraseña incorrecta para reautenticación.");
          case 'auth/user-mismatch':
            throw new Error("Error de reautenticación: la credencial no coincide con el usuario actual.");
          case 'auth/popup-blocked':
            throw new Error("El popup de reautenticación fue bloqueado. Permite popups en tu navegador.");
          case 'auth/popup-closed-by-user':
            throw new Error("Reautenticación cancelada por el usuario.");
          default:
            throw new Error(error.message || "No se pudo eliminar la cuenta.");
        }
      }
      console.error("Error inesperado al eliminar la cuenta:", error);
      throw new Error("Ocurrió un error inesperado al eliminar la cuenta.");
    }
  }
};
