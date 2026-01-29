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
  
  status: Status;          // id_estado_qticker
  
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
}

// ==========================================
// SCHADENTISCH (NCP)
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

// ==========================================
// CLOUD MODULE (NUEVO)
// ==========================================

export interface CloudFile {
  id: string;
  name: string;
  url: string;        // URL pública para visualización/descarga
  type: string;       // MIME type (image/png, application/pdf, etc.)
  size: string;       // Texto formateado (ej: "2.4 MB")
  createdAt: string;  // ISO Date string
  ownerId: string;    // ID del usuario que lo subió
  ownerName: string;  // Nombre del usuario para mostrar en UI
  storagePath?: string; // Ruta interna en Firebase Storage (opcional para frontend)
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
    tickets: string; // e.g. "Pendientes"
    sorte: string;   // e.g. "Total Acumulado"
    clients: string; // e.g. "Últimos 30 días"
    resolution: string; // e.g. "+2% vs mes ant."
  }
}

// ==========================================
// SYSTEM
// ==========================================

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'INCIDENT_NEW' | 'NCPART_NEW' | 'GENERAL';
  relatedId: string;
  isRead: boolean;
  createdAt: string;
}

// Added 'cloud' to ViewState
export type ViewState = 
  | 'dashboard' 
  | 'incidents' 
  | 'analytics' 
  | 'profile' 
  | 'settings' 
  | 'schadentisch' 
  | 'cloud';