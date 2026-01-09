// src/lib/firebase/firebaseConfig.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // ¡Importante para la autenticación!
import { getAnalytics } from "firebase/analytics"; // Para Firebase Analytics

// Tu configuración de Firebase real para FaultSense
const firebaseConfig = {
  apiKey: "AIzaSyBhmkSr2typO8x1BWDmx2pmYzYOkiTZvLo",
  authDomain: "fault-sense.firebaseapp.com",
  projectId: "fault-sense",
  storageBucket: "fault-sense.firebasestorage.app",
  messagingSenderId: "523092052574",
  appId: "1:523092052574:web:a032a798939b6ce9c382cf",
  measurementId: "G-145W93X3LC"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Obtiene la instancia de Auth para usar en tu authService
export const auth = getAuth(app);

// Opcional: Si quieres usar Analytics en otros lugares de tu app
export const analytics = getAnalytics(app);
