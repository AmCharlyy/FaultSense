// ==========================================
// ENUMS & CONSTANTS
// ==========================================

export enum Severity {
  LOW = 'Baja',
  MEDIUM = 'Media',
  HIGH = 'Alta',
  CRITICAL = 'Crítica'
}

export enum Status {
  OPEN = 'Abierto',
  IN_PROGRESS = 'En Progreso',
  RESOLVED = 'Resuelto',
  CLOSED = 'Cerrado'
}

// ==========================================
// CORE INTERFACES
// ==========================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Ingeniero' | 'Operador' | 'Gerente';
  avatar: string;
  department?: string;
  bio?: string;
  phone?: string;
  location?: string;
}

// Mapped to SQL Table: falla
export interface Incident {
  id: string;              // id_falla
  folio: string;           // folio
  schadentischDate: string; // fecha_schadentisch (YYYY-MM-DD)
  createdAt: string;       // fecha_registro
  updatedAt: string;       // updated_at
  
  shift: number;           // turno
  sorte: number;           // sorte
  
  status: Status | string; // Permitir Status enum o string como 'Sin respuesta'
  
  origin: string;          // id_origen
  client: string;          // id_cliente
  area: string;            // id_localizacion
  
  assignedTo: User | null; // id_responsable object
  responsibleName?: string; // fallback

  // Content
  title: string;           
  description: string;     
  severity: Severity;      
  
  // Optional / Extra
  evidenceUrl?: string;
  tags: string[];
  aiAnalysis?: string;
  category: string;        

  // --- CAMPOS DE PRE-ANÁLISIS (Schadentisch) ---
  // Estos son los que alimentan tu PDF y el Pre-Analysis Modal
  partNumber?: string;
  partName?: string;
  supplier?: string;
  partResponsible?: string;
  paFailure?: string;
  paHypothesis?: string;
  paAnalysis?: string;
  paActions?: string;
  paAdditional?: string;
  paConfirmed?: number;
  paSegregated?: number;
  paRepetitive?: string;
  paQmomo?: string;
  paResponse?: string;

  // Otros datos
  damageCoordinates?: { x: number; y: number }[];
  sketchData?: string;
  dbId?: number;
  isSynced?: boolean;
  localId?: string;
  attachmentPath?: string;
  thumbnailUrl?: string;
}

// ==========================================
// FILTERS & PAGINATION
// ==========================================

export interface IncidentFilters {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  client?: string;
  origin?: string;
  dateStart?: string;
  dateEnd?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// ==========================================
// DASHBOARD & ANALYTICS
// ==========================================

export interface DashboardMetrics {
  activeTickets: number;
  totalSorte: number;
  activeClients: number;
  resolutionRate: number;
  recentIncidents: Incident[]; // Only top 5
  trends: {
    tickets: string;
    sorte: string;
    clients: string;
    resolution: string;
  }
}

// ==========================================
// ADDITIONAL FEATURES (NCPart, Notifications, etc.)
// ==========================================

export interface NCPart {
  id: string;
  partNumber: string;
  partName: string;
  defectType: string;
  description: string;
  action: 'Scrap' | 'Rework' | 'Concession' | 'Pending';
  imageUrl?: string;
  createdAt: string;
  reportedBy: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'INCIDENT_NEW' | 'NCPART_NEW' | 'GENERAL';
  relatedId: string;
  isRead: boolean;
  createdAt: string;
}

export type ViewState = 'dashboard' | 'incidents' | 'analytics' | 'profile' | 'settings' | 'schadentisch';

export interface AppConfig {
  apiUrl: string;
  environment: 'development' | 'production';
  version: string;
  features: {
    voiceRecognition: boolean;
    aiAnalysis: boolean;
    offlineMode: boolean;
  }
}