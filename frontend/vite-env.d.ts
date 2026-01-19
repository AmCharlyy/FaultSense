/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  // aquí puedes añadir otras variables si las tienes
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}