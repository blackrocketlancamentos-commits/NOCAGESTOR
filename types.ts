
// FIX: Define all missing types to resolve import errors across the application.

export type LinkStatus = 'Vencido' | 'Vence Hoje/Amanhã' | 'A Vencer' | 'Ativo';
export type ClientType = 'Cliente' | 'Lead' | 'Contato' | 'Parceiro';

export interface WorkMaterial {
  url: string;
  type: 'instagram' | 'drive' | 'other';
}

export interface TrackedLink {
  id: string;
  name: string;
  originalUrl: string;
  clicks: number;
  shortUrl?: string;
  workMaterialUrls: WorkMaterial[];
  startDate: string;
  endDate: string;
  phone: string;
  instagram: string;
  email: string;
  packageInfo: string;
  isArchived: boolean;
  createdAt: string;
  contractId?: string;
  clientType?: ClientType;
  companyName?: string;
  cpf?: string;
  cnpj?: string;
}

export interface Client {
  name: string;
  contracts: TrackedLink[];
  companyName?: string;
  phone?: string;
  instagram?: string;
  email?: string;
  clientType?: ClientType;
  cpf?: string;
  cnpj?: string;
}

export interface ReportData {
  totalClicks: number;
  links: { id: string; name: string; clicksInPeriod: number }[];
  startDate: string;
  endDate: string;
  filterName?: string;
}

export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO String
  end: string;   // ISO String
  isAllDay: boolean;
}

export interface FinancialTransaction {
  id: string;
  date: string;
  description: string;
  type: 'receita' | 'despesa';
  amount: number;
  relatedContractId?: string;
}

export interface Settings {
  googleCalendarId?: string;
  zapiInstanceId?: string;
  zapiToken?: string;
  zapiClientToken?: string;
}

export interface RawChatMessage {
  chatid: string;
  messageid: string;
  text: string;
  isfromme: boolean;
  timestamp: string;
  sendername?: string;
  attendanceMode?: 'BOT' | 'HUMANO';
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'me' | 'contact';
  timestamp: string;
}

export interface ChatConversation {
  id: string;
  name: string;
  type: 'group' | 'individual';
  avatarUrl: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
  attendanceMode: 'BOT' | 'HUMANO';
}

export type TaskFrequency = 'daily' | 'weekly';

export interface RoutineTask {
  id: string;
  text: string;
  frequency: TaskFrequency;
  repetitions: number; // Quantas vezes por dia/semana
  dayOfWeek?: number;
  time?: string;
}

export interface CrmData {
  conversationsToday: number;
  newLeads: number;
  status: {
    attending: number;
    waiting: number;
    lost: number;
    remarketing: number;
    client: number;
  };
}

export interface WhatsAppLead {
  id: string;
  name: string;
  phone: string;
  lastMessage?: string;
  timestamp?: string;
  stage?: string;
}

export interface WhatsAppColumn {
  id: string;
  title: string;
  leads: WhatsAppLead[];
}

export type TaskCompletions = {
  [taskId: string]: number[]; // Array of completion timestamps
};

export interface WebhookLogEntry {
  timestamp: string;
  content: string;
}