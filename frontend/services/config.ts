// src/services/config.ts

const API_BASE_URL = '/api'; // <-- ¡CAMBIO CLAVE! Ahora usa la ruta relativa para el proxy.

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};