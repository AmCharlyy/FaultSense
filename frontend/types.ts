// types.ts
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

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Ingeniero' | 'Operador' | 'Gerente';
  avatar: string;
}

export interface Incident {
  id: string;
  folio: string;
  schadentischDate: string;
  createdAt: string;
  updatedAt: string;
  shift: number;
  sorte: number;
  status: Status | string; // Permitir el string 'Sin respuesta' del modal
  origin: string;
  client: string;
  area: string;
  assignedTo: User | null;
  responsibleName?: string;
  title: string;
  description: string;
  severity: Severity;
  evidenceUrl?: string;
  tags: string[];
  aiAnalysis?: string;
  category: string;

  // --- NUEVOS CAMPOS DE PIEZA Y PRE-ANÁLISIS ---
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
}