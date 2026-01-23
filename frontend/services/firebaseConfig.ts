import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getGenerativeModel, getAI } from "firebase/ai";
// Estas son las líneas que te daban error, ahora deben funcionar
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyBhmkSr2typO8x1BWDmx2pmYzYOkiTZvLo",
  authDomain: "fault-sense.firebaseapp.com",
  projectId: "fault-sense",
  storageBucket: "fault-sense.firebasestorage.app",
  messagingSenderId: "523092052574",
  appId: "1:523092052574:web:a032a798939b6ce9c382cf",
  measurementId: "G-145W93X3LC"
};

// 1. Inicializar App
const app = initializeApp(firebaseConfig);

// 2. Auth y Analytics (Lo que ya tenías)
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

// 3. Inicializar Vertex AI (Gemini)
const vertexAI = getAI(app);
export const model = getGenerativeModel(vertexAI, { model: "gemini-1.5-flash" });

// 3. App Check (Seguridad con la clave SITE KEY que termina en ...DTDAquce-)
if (typeof window !== "undefined") {
  // @ts-ignore
  if (window.location.hostname === "localhost" || window.location.hostname.includes("firebaseapp.com")) {
    const RECAPTCHA_SITE_KEY = "6Ld1EE8sAAAAANimkzkp7cxTNR-An__DTDAquce-";
    
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  }
}



export default app;