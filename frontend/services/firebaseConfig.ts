import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
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
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

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