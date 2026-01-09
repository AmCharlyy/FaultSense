import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // El proxy ya no es necesario porque configuramos la URL completa de la API
        // en App.tsx. Se puede eliminar para evitar confusiones.
        // proxy: { ... },
        // --- SOLUCIÓN: AÑADIR CABECERA COOP ---
        headers: {
          'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
