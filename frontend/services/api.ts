
import { Incident, NCPart, User, Severity, Status, DashboardMetrics, IncidentFilters, PaginatedResponse } from '../types';
import { auth } from './firebaseConfig';

// 1. VARIABLE PARA ALMACENAR LA URL BASE DE LA API
// Se inicializa como una cadena vacía. Se configurará al iniciar la app.
let apiBaseUrl = '';

// 2. FUNCIÓN PARA CONFIGURAR LA URL BASE
export const configureApi = (baseUrl: string) => {
  apiBaseUrl = baseUrl;
  console.log(`[API] Base URL configurada a: ${baseUrl}`);
};

// --- Custom API Error ---
export class ApiError extends Error {
  constructor(message: string, public status: number, public statusText: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// --- HELPER: Fetch con Autenticación ---
async function authenticatedFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    // 1. Get Firebase Token if User is Logged In
    let token = null;
    if (auth?.currentUser) {
      token = await auth.currentUser.getIdToken();
    }

    // 2. Prepare Headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json', // Reemplazamos la dependencia de API_CONFIG
      ...options?.headers,
    };

    // 3. Inject Authorization Header
    if (token) {
      (headers as any)['Authorization'] = `Bearer ${token}`;
    }

    // 3. CONSTRUIMOS LA URL COMPLETA
    // Usamos la variable `apiBaseUrl` que configuraremos desde App.tsx
    const fullUrl = `${apiBaseUrl}${endpoint}`;

    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      // Throw a more specific error with status code
      throw new ApiError(
        `HTTP error! status: ${response.status}`, 
        response.status, 
        response.statusText
      );
    }
    return await response.json();
  } catch (error) {
    console.error(`[API] Fallo la petición a ${apiBaseUrl}${endpoint}:`, error);
    throw error; // Re-lanzamos el error para que el componente que llama lo maneje
  }
}

// --- API METHODS ---

export const api = {
  // DASHBOARD AGGREGATED METRICS
  dashboard: {
    getMetrics: () => authenticatedFetch<DashboardMetrics>('/api/dashboard/metrics')
  },

  // INCIDENTS (Q-TICKERS)
  incidents: {
    // Updated to handle Server-Side Filtering & Pagination
    getAll: (filters: IncidentFilters) => {
      // Build Query String for Real Backend
      const params = new URLSearchParams();
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());
      if(filters.search) params.append('search', filters.search);
      // Only append filter if it's NOT 'All'
      if(filters.status && filters.status !== 'All') params.append('status', filters.status);
      if(filters.client && filters.client !== 'All') params.append('client', filters.client);
      if(filters.origin && filters.origin !== 'All') params.append('origin', filters.origin);
      if(filters.dateStart) params.append('dateStart', filters.dateStart);
      if(filters.dateEnd) params.append('dateEnd', filters.dateEnd);

      return authenticatedFetch<PaginatedResponse<Incident>>(`/api/incidents?${params.toString()}`);
    },
    
    create: (data: Partial<Incident>) => authenticatedFetch<Incident>('/api/incidents', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

    update: (id: string, data: Partial<Incident>) => authenticatedFetch<Incident>(`/api/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

    delete: (id: string) => authenticatedFetch<void>(`/api/incidents/${id}`, {
      method: 'DELETE'
    })
  },

  // RUTAS PARA FILTROS
  clients: {
    getAll: () => authenticatedFetch<{name: string}[]>('/api/clients')
  },
  origins: {
    getAll: () => authenticatedFetch<{name: string}[]>('/api/origins')
  },

  // SCHADENTISCH (NC PARTS)
  ncParts: {
    getAll: () => authenticatedFetch<NCPart[]>('/api/nc-parts'),

    create: (data: Partial<NCPart>) => authenticatedFetch<NCPart>('/api/nc-parts', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

    update: (id: string, data: Partial<NCPart>) => authenticatedFetch<NCPart>(`/api/nc-parts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

    delete: (id: string) => authenticatedFetch<void>(`/api/nc-parts/${id}`, {
      method: 'DELETE'
    })
  },

  // USER PROFILE
  user: {
    get: () => authenticatedFetch<User>('/api/user/profile'),
    update: (data: Partial<User>) => authenticatedFetch<User>('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }
};
