// =================================================================================
// BUNDLED APPLICATION - All TSX/TS files are combined here to avoid MIME type errors
// on static hosts like GitHub Pages.
// =================================================================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// ---------------------------------------------------------------------------------
// START OF: config.ts
// ---------------------------------------------------------------------------------
const GOOGLE_SCRIPT_URL: string = "https://script.google.com/macros/s/AKfycbzUptotd8kX2LlQt67R726rKdBGdZfOV5vkaL0M29y5jXx-0hvp6KoLQ3FwCPuba7OD/exec";


// ---------------------------------------------------------------------------------
// START OF: types.ts
// ---------------------------------------------------------------------------------
type LinkStatus = 'Vencido' | 'Vence Hoje/Amanhã' | 'A Vencer' | 'Ativo';
type ClientType = 'Cliente' | 'Lead' | 'Contato' | 'Parceiro';

interface WorkMaterial {
  url: string;
  type: 'instagram' | 'drive' | 'other';
}

interface TrackedLink {
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

interface Client {
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

interface ReportData {
  totalClicks: number;
  links: { id: string; name: string; clicksInPeriod: number }[];
  startDate: string;
  endDate: string;
  filterName?: string;
}

interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO String
  end: string;   // ISO String
  isAllDay: boolean;
}

interface FinancialTransaction {
  id: string;
  date: string;
  description: string;
  type: 'receita' | 'despesa';
  amount: number;
  relatedContractId?: string;
}

interface Settings {
  googleCalendarId?: string;
  zapiInstanceId?: string;
  zapiToken?: string;
  zapiClientToken?: string;
}

interface RawChatMessage {
  chatid: string;
  messageid: string;
  text: string;
  isfromme: boolean;
  timestamp: string;
  sendername?: string;
  attendanceMode?: 'BOT' | 'HUMANO';
}

interface ChatMessage {
  id: string;
  text: string;
  sender: 'me' | 'contact';
  timestamp: string;
}

interface ChatConversation {
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

type TaskFrequency = 'daily' | 'weekly';

interface RoutineTask {
  id: string;
  text: string;
  frequency: TaskFrequency;
  repetitions: number; // Quantas vezes por dia/semana
  dayOfWeek?: number;
  time?: string;
}

interface CrmData {
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

interface WhatsAppLead {
  id: string;
  name: string;
  phone: string;
  lastMessage?: string;
  timestamp?: string;
  stage?: string;
}

interface WhatsAppColumn {
  id: string;
  title: string;
  leads: WhatsAppLead[];
}

type TaskCompletions = {
  [taskId: string]: number[]; // Array of completion timestamps
};

interface WebhookLogEntry {
  timestamp: string;
  content: string;
}


// ---------------------------------------------------------------------------------
// START OF: utils.ts
// ---------------------------------------------------------------------------------
const getStatus = (endDate?: string): { text: LinkStatus; color: string; textColor: string; } | null => {
    if (!endDate) return null;
    const end = new Date(`${endDate}T00:00:00`);
     if (isNaN(end.getTime())) { return null; }

    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return { text: 'Vencido', color: 'bg-red-600', textColor: 'text-white' };
    }
    if (diffDays < 2) {
        return { text: 'Vence Hoje/Amanhã', color: 'bg-orange-500', textColor: 'text-white' };
    }
    if (diffDays <= 7) {
        return { text: 'A Vencer', color: 'bg-yellow-400', textColor: 'text-black' };
    }
    return { text: 'Ativo', color: 'bg-green-500', textColor: 'text-white' };
};

const parsePackageValue = (packageInfo?: string): number => {
    if (!packageInfo) return 0;
    const match = packageInfo.match(/R\$\s*([\d.,]+)/);
    if (!match || !match[1]) {
        return 0;
    }
    const numberStr = match[1].trim();
    const cleanedStr = numberStr.includes(',')
      ? numberStr.replace(/\./g, '').replace(',', '.')
      : numberStr;
    return parseFloat(cleanedStr) || 0;
};

const parseContractType = (packageInfo?: string): string => {
    if (!packageInfo) return 'N/A';
    const lowerCaseInfo = packageInfo.toLowerCase();
    if (lowerCaseInfo.includes('permuta')) return 'Permuta';
    if (lowerCaseInfo.includes('premium')) return 'Premium';
    if (lowerCaseInfo.includes('básico')) return 'Básico';
    if (packageInfo.length < 25 && !packageInfo.includes(':')) return packageInfo;
    return 'Personalizado';
};

function expandScientificNotation(str: string): string {
  const strValue = String(str);
  if (!strValue || !strValue.toLowerCase().includes('e+')) {
    return strValue;
  }

  const [base, exponentStr] = strValue.toLowerCase().split('e+');
  const exponent = parseInt(exponentStr, 10);
  
  let [integerPart, fractionalPart] = base.split('.');
  if (!fractionalPart) {
      fractionalPart = '';
  }
  
  const numWithoutDecimal = integerPart + fractionalPart;
  const digitsToMove = exponent - fractionalPart.length;

  if (digitsToMove >= 0) {
    return numWithoutDecimal + '0'.repeat(digitsToMove);
  } else {
    const splitPoint = numWithoutDecimal.length + digitsToMove;
    return numWithoutDecimal.substring(0, splitPoint) + '.' + numWithoutDecimal.substring(splitPoint);
  }
}

const normalizeIdToJid = (id: any): string => {
  if (!id) return '';
  let idString = String(id).trim();
  idString = expandScientificNotation(idString);
  if (idString.endsWith('@g.us')) return idString;
  if (idString.endsWith('@c.us')) return idString;
  const numberPart = idString.split('@')[0];
  const cleanedId = numberPart.replace(/\D/g, '');
  if (cleanedId.length >= 10) return `${cleanedId}@c.us`;
  if (idString.includes('-') && !idString.includes('@')) return `${idString}@g.us`;
  return idString;
};

const processRawMessagesIntoConversations = (
  rawMessages: RawChatMessage[],
  contracts: TrackedLink[],
  crmLeads: WhatsAppLead[]
): ChatConversation[] => {
  if (!rawMessages || rawMessages.length === 0) return [];
  const normalizePhone = (phone: any = ''): string => String(phone || '').replace(/\D/g, '');

  const messagesByChatId = rawMessages.reduce((acc, msg) => {
    const normalizedId = normalizeIdToJid(msg.chatid);
    if (!normalizedId) return acc;
    if (!acc[normalizedId]) acc[normalizedId] = [];
    acc[normalizedId].push({ ...msg, chatid: normalizedId });
    return acc;
  }, {} as Record<string, RawChatMessage[]>);

  const conversations: (ChatConversation & { lastMessageTimestamp: number })[] = Object.entries(messagesByChatId).map(([chatId, messages]) => {
    const sortedMessages = messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const lastMessage = sortedMessages[sortedMessages.length - 1];
    
    let contactName = crmLeads.find(l => normalizeIdToJid(l.id) === chatId)?.name;
    if (!contactName) {
      const normalizedChatIdPhonePart = chatId.split('@')[0];
      const contractInfo = contracts.find(c => c.phone && normalizePhone(c.phone) === normalizedChatIdPhonePart);
      if (contractInfo) contactName = contractInfo.name;
    }
    
    const name = contactName || lastMessage.sendername || chatId;
    const conversationType = chatId.includes('@g.us') ? 'group' : 'individual';
    const formattedMessages: ChatMessage[] = sortedMessages.map(msg => ({
      id: msg.messageid,
      text: msg.text,
      sender: msg.isfromme ? 'me' : 'contact',
      timestamp: new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }));

    return {
      id: chatId, name, type: conversationType,
      avatarUrl: `https://i.pravatar.cc/40?u=${chatId}`,
      lastMessage: lastMessage.text,
      lastMessageTime: new Date(lastMessage.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      unreadCount: 0, messages: formattedMessages,
      attendanceMode: lastMessage.attendanceMode || 'BOT',
      lastMessageTimestamp: new Date(lastMessage.timestamp).getTime()
    };
  });

  return conversations
    .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp)
    .map(({ lastMessageTimestamp, ...convo }) => convo);
};


// ---------------------------------------------------------------------------------
// START OF: hooks/useLocalStorage.ts
// ---------------------------------------------------------------------------------
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  function getValueFromStorage<T>(key: string, initialValue: T): T {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  }

  const [storedValue, setStoredValue] = useState<T>(() => getValueFromStorage(key, initialValue));

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  };

  useEffect(() => {
    const valueFromStorage = getValueFromStorage(key, initialValue);
    if (JSON.stringify(valueFromStorage) !== JSON.stringify(storedValue)) {
        setStoredValue(valueFromStorage);
    }
  }, [key, initialValue]);

  return [storedValue, setValue];
}


// ---------------------------------------------------------------------------------
// START OF: hooks/useDailyResetLocalStorage.ts
// ---------------------------------------------------------------------------------
function useDailyResetLocalStorage<T>(baseKey: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const getStorageKey = (baseKey: string): string => `${baseKey}_${new Date().toISOString().split('T')[0]}`;
  
  function getValueFromStorage<T>(key: string, initialValue: T): T {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  }
  
  const [storageKey, setStorageKey] = useState(() => getStorageKey(baseKey));
  const [storedValue, setStoredValue] = useState<T>(() => getValueFromStorage(storageKey, initialValue));

  useEffect(() => {
    const interval = setInterval(() => {
      const newKey = getStorageKey(baseKey);
      if (newKey !== storageKey) {
        setStorageKey(newKey);
        setStoredValue(getValueFromStorage(newKey, initialValue));
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [baseKey, storageKey, initialValue]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(storageKey, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key “${storageKey}”:`, error);
    }
  };
  return [storedValue, setValue];
}


// ---------------------------------------------------------------------------------
// START OF: services/api.ts
// ---------------------------------------------------------------------------------
namespace api {
  async function callApi(action: string, data: object = {}) {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST', body: JSON.stringify({ action, data }), redirect: 'follow'
      });
      let result;
      try { result = await response.json(); } catch (e) { throw new Error("RESPONSE_NOT_JSON"); }
      if (!result.success) { throw new Error(result.error || 'Ocorreu um erro na API'); }
      return result.data;
  }
  export const ping = async (): Promise<{ status: string }> => callApi('PING');
  export const getLinks = async (): Promise<TrackedLink[]> => {
    const result = await callApi('GET_LINKS', {});
    return result.map((link: any) => ({
      ...link, companyName: link.companyname, clicks: Number(link.clicks) || 0,
      workMaterialUrls: Array.isArray(link.workMaterialUrls) ? link.workMaterialUrls : [],
    }));
  };
  export const addLink = async (linkData: TrackedLink, googleCalendarId?: string): Promise<TrackedLink> => callApi('CREATE', { ...linkData, googleCalendarId });
  export const createSimpleTracker = async (name: string, url: string): Promise<{id: string}> => callApi('CREATE_SIMPLE_TRACKER', { name, url });
  export const incrementClick = async (id: string): Promise<{id: string, clicks: number}> => callApi('UPDATE_CLICK', { id });
  export const updateWorkMaterials = async (id: string, workMaterialUrls: WorkMaterial[]): Promise<{id: string}> => callApi('UPDATE_WORK_MATERIALS', { id, workMaterialUrls });
  export const updateDates = async (id: string, startDate: string, endDate: string): Promise<{id: string}> => callApi('UPDATE_DATES', { id, startDate, endDate });
  export const updateContactInfo = async (id: string, phone: string, instagram: string, email: string, cpf: string, cnpj: string, companyName: string): Promise<{id: string}> => callApi('UPDATE_CONTACT_INFO', { id, phone, instagram, email, cpf, cnpj, companyName });
  export const archiveLink = async (id: string, isArchived: boolean): Promise<{id: string}> => callApi('ARCHIVE_LINK', { id, isArchived });
  export const deleteContract = async (id: string): Promise<{id: string}> => callApi('DELETE_CONTRACT', { id });
  export const updatePackageInfo = async (id: string, packageInfo: string): Promise<{id:string}> => callApi('UPDATE_PACKAGE_INFO', { id, packageInfo });
  export const getReport = async (startDate: string, endDate: string, linkId: string): Promise<ReportData> => callApi('GET_REPORT', { startDate, endDate, linkId });
  export const getCalendarEvents = async (calendarId: string, startDate: string, endDate: string): Promise<AgendaItem[]> => callApi('GET_CALENDAR_EVENTS', { calendarId, startDate, endDate });
  export const createCalendarEvent = async (calendarId: string, eventData: Omit<AgendaItem, 'id'>): Promise<AgendaItem> => callApi('CREATE_CALENDAR_EVENT', { calendarId, ...eventData });
  export const updateCalendarEvent = async (calendarId: string, eventData: AgendaItem): Promise<{success: boolean}> => callApi('UPDATE_CALENDAR_EVENT', { calendarId, ...eventData });
  export const deleteCalendarEvent = async (calendarId: string, eventId: string): Promise<{success: boolean}> => callApi('DELETE_CALENDAR_EVENT', { calendarId, eventId });
  export const addRoutineTaskToCalendar = async (task: Omit<RoutineTask, 'id' | 'isCustom'>, calendarId: string): Promise<{success: boolean}> => callApi('ADD_ROUTINE_TASK', { ...task, calendarId });
  export const generateWhatsAppMessage = async (campaignName: string, prompt: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const fullPrompt = `Crie uma mensagem de WhatsApp curta, amigável e profissional para uma campanha de marketing chamada "${campaignName}". O objetivo da campanha é: "${prompt}". A mensagem deve ser otimizada para conversão e incluir uma chamada para ação clara. Não inclua saudações como "Olá," ou despedidas, apenas o corpo da mensagem. Use emojis de forma moderada e relevante.`;
// @google/genai-api-fix: Use response.text to extract the text from the response.
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: fullPrompt });
        const text = response.text;
        if (text) return text.trim();
        throw new Error('A IA não retornou uma mensagem.');
    } catch (error) { console.error("Erro ao gerar mensagem com IA:", error); throw new Error("Não foi possível gerar a mensagem. Verifique a chave de API e tente novamente."); }
  };
  export const sendHumanMessage = async (id: string, message: string): Promise<any> => callApi('SEND_HUMAN_MESSAGE', { phone: id, message });
  export const getConversations = async (): Promise<RawChatMessage[]> => callApi('GET_CONVERSATIONS');
  export const setAttendanceMode = async (phone: string, mode: 'BOT' | 'HUMANO'): Promise<void> => { await callApi('SET_ATTENDANCE_MODE', { phone, mode }); }
  export const getCrmLeads = async (): Promise<WhatsAppLead[]> => callApi('GET_CRM_LEADS');
  export const updateCrmStage = async (id: string, newStage: string): Promise<any> => callApi('UPDATE_CRM_STAGE', { phone: id, newStage });
  export const getSettings = async (): Promise<Settings> => callApi('GET_SETTINGS');
  export const updateSettings = async (settings: Settings): Promise<{success: boolean}> => callApi('UPDATE_SETTINGS', settings);
  export const getRoutineTasks = async (): Promise<{ customTasks: RoutineTask[], archivedDefaultTaskIds: string[] }> => callApi('GET_ROUTINE_TASKS');
  export const updateRoutineTasks = async (tasksData: { customTasks: RoutineTask[], archivedDefaultTaskIds: string[] }): Promise<{success: boolean}> => callApi('UPDATE_ROUTINE_TASKS', tasksData);
  export const getTransactions = async (): Promise<FinancialTransaction[]> => {
    const result = await callApi('GET_TRANSACTIONS');
    return result.map((t: any) => ({ ...t, amount: Number(t.amount) || 0 }));
  };
  export const addTransaction = async (transaction: Omit<FinancialTransaction, 'id'>): Promise<FinancialTransaction> => callApi('ADD_TRANSACTION', transaction);
  export const getWebhookLogs = async (): Promise<WebhookLogEntry[]> => callApi('GET_WEBHOOK_LOGS');
}

// ---------------------------------------------------------------------------------
// START OF: All components
// ---------------------------------------------------------------------------------
const FeedbackToast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void; }> = ({ message, type, onClose }) => {
  useEffect(() => { const timer = setTimeout(() => onClose(), 4000); return () => clearTimeout(timer); }, [onClose]);
  const typeClasses = { success: "bg-green-600 border border-green-500 text-white", error: "bg-red-600 border border-red-500 text-white", };
  const icon = {
    success: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    error: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  };
  return <div className={`fixed top-5 right-5 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in-out max-w-sm ${typeClasses[type]}`}>{icon[type]}<p className="font-semibold text-sm">{message}</p></div>;
};

type Tab = 'gestao' | 'dashboard' | 'whatsapp' | 'agenda' | 'rotinas' | 'financeiro' | 'relatorios' | 'configuracoes';
const TabNavigation: React.FC<{ activeTab: Tab; setActiveTab: (tab: Tab) => void; }> = ({ activeTab, setActiveTab }) => {
    const tabs: { id: Tab, label: string, icon: React.ReactElement }[] = [
        { id: 'gestao', label: 'Clientes & Links', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m5-4h1m-1 4h1" /></svg> },
        { id: 'dashboard', label: 'Dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
        { id: 'whatsapp', label: 'WhatsApp', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.956-.5-5.688-1.448l-6.305 1.654z"/></svg> },
        { id: 'agenda', label: 'Agenda', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
        { id: 'rotinas', label: 'Rotinas', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> },
        { id: 'financeiro', label: 'Financeiro', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
        { id: 'relatorios', label: 'Relatórios', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
        { id: 'configuracoes', label: 'Configurações', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    ];
    return <nav className="border-b border-slate-700"><div className="flex flex-wrap gap-1 md:gap-2 pb-2">{tabs.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-400 ${activeTab === tab.id ? 'bg-slate-800/50 border-b-2 border-blue-400 text-blue-300' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>{tab.icon}{tab.label}</button>)}</div></nav>;
};

const DiagnosticTool: React.FC = () => {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setTestStatus('testing'); setErrorDetails(null);
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'PING' }), redirect: 'follow' });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const result = await response.json();
        if (result.success && result.data?.status === 'ok') setTestStatus('success');
        else { setTestStatus('error'); setErrorDetails(`A resposta da API não foi a esperada. Detalhes: ${JSON.stringify(result)}`); }
      } else {
         setTestStatus('error');
         const responseText = await response.text();
         if (responseText.includes("Página não encontrada") || responseText.includes("file cannot be opened")) setErrorDetails("Recebemos uma resposta de 'Página não encontrada' do Google. Isso significa que a URL está correta, mas a permissão de acesso está errada. Você PRECISA criar uma nova implantação e garantir que a opção 'Quem pode acessar' esteja definida como 'Qualquer pessoa'.");
         else setErrorDetails("A URL não retornou um JSON válido. Isso geralmente indica um erro de permissão ou configuração na implantação do script.");
      }
    } catch (e: any) {
        setTestStatus('error');
        if (e instanceof TypeError) setErrorDetails("Erro de Conexão ou URL Inválida. Não foi possível alcançar a URL. Verifique se a URL no arquivo config.ts está exatamente igual à URL da 'implantação do app da web' fornecida pelo Google. Ela deve começar com https://script.google.com/macros/s/...");
        else setErrorDetails(`Ocorreu um erro inesperado: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans flex items-center justify-center p-4">
      <div className="max-w-3xl w-full mx-auto text-left bg-slate-900/50 p-6 md:p-8 rounded-lg border border-blue-700 shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-amber-300 mb-6">Guia de Configuração e Diagnóstico</h2>
        <div className="mb-8 p-6 rounded-lg bg-slate-800/50 border border-slate-700">
            <p className="text-center text-slate-300 mb-4">Parece que o aplicativo não consegue se conectar à sua Planilha Google. Vamos verificar a sua configuração.</p>
            <div className="flex justify-center">
                 <button onClick={handleTestConnection} disabled={testStatus === 'testing'} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-wait">
                    {testStatus === 'testing' ? <><svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Testando...</> : "▶️ Testar Conexão"}
                 </button>
            </div>
            {testStatus !== 'idle' && testStatus !== 'testing' && (
                <div className={`mt-6 p-4 rounded-lg border ${testStatus === 'success' ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}`}>
                    <h4 className={`font-bold text-lg mb-2 ${testStatus === 'success' ? 'text-green-300' : 'text-red-300'}`}>{testStatus === 'success' ? '✅ Conexão bem-sucedida!' : '❌ Erro na Conexão'}</h4>
                    <p className="text-sm text-slate-300">{testStatus === 'success' ? "A comunicação com sua Planilha Google está funcionando! Se o app ainda não carregou, faça uma atualização forçada da página (Cmd+Shift+R ou Ctrl+F5) para limpar o cache." : errorDetails}</p>
                </div>
            )}
        </div>
        <div className="space-y-6 text-slate-300">
            <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-800"><h3 className="font-bold text-lg text-slate-100 mb-2">Passo 1: Abra o Editor de Scripts do Google</h3><p>Abra o seu projeto de script. Se não souber onde está, acesse pelo link:</p><a href="https://script.google.com/home" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-blue-400 underline hover:text-blue-300">script.google.com/home</a></div>
            <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-800"><h3 className="font-bold text-lg text-slate-100 mb-2">Passo 2: Crie uma NOVA Implantação (O Passo Mais Importante!)</h3><ol className="list-decimal list-inside space-y-3 pl-2"><li>No canto superior direito, clique no botão azul <strong className="bg-blue-600 px-2 py-1 rounded">Implantar</strong>.</li><li>No menu que aparecer, selecione <strong className="bg-green-600 text-white px-2 py-1 rounded">"Nova implantação"</strong>.</li><li className="text-amber-300"><strong>NÃO</strong> use "Gerenciar implantações". Atualizar uma implantação antiga geralmente não corrige o problema de permissão. Você <strong>PRECISA</strong> criar uma nova.</li></ol></div>
            <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-800"><h3 className="font-bold text-lg text-slate-100 mb-2">Passo 3: Configure o Acesso Correto</h3><ol className="list-decimal list-inside space-y-3 pl-2"><li>Na nova tela, ao lado de "Quem pode acessar", mude a opção para <strong className="bg-green-600 text-white px-2 py-1 rounded">"Qualquer pessoa"</strong>.</li><li><em className="text-slate-400">Se estiver definido como "Apenas eu" ou "Qualquer pessoa na sua organização", o aplicativo NÃO funcionará.</em></li><li>Clique no botão azul <strong className="bg-blue-600 px-2 py-1 rounded">Implantar</strong>.</li></ol></div>
            <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-800"><h3 className="font-bold text-lg text-slate-100 mb-2">Passo 4: Copie a URL do App da Web</h3><p>Após a implantação, o Google mostrará uma janela com a <strong className="text-amber-300">URL do app da web</strong>. Copie essa URL. Ela termina com <code className="bg-slate-700 text-xs p-1 rounded">/exec</code>.</p></div>
            <div className="mt-8 p-6 rounded-lg bg-green-900/30 border border-green-800"><h3 className="font-bold text-xl text-green-300 mb-3">✅ Passo Final: Atualize o arquivo de configuração</h3><p>Agora que você tem a URL correta, preciso que você me forneça o arquivo <code className="bg-slate-700 text-sm p-1 rounded">config.ts</code> atualizado.</p><p className="mt-3">Abra o arquivo <code className="bg-slate-700 text-sm p-1 rounded">config.ts</code> na lista de arquivos, cole sua nova URL e me envie o conteúdo completo do arquivo aqui no chat.</p></div>
        </div>
      </div>
    </div>
  );
};

const InfoModal: React.FC<{ content: { title: string; link: string; }; onClose: () => void; }> = ({ content, onClose }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(content.link); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-blue-700 shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-center p-5 border-b border-slate-700">
          <div><h2 className="text-xl font-bold text-slate-100">Link Rastreável Gerado</h2><p className="text-sm font-semibold text-blue-300">{content.title}</p></div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </header>
        <div className="p-6 space-y-4">
            <p className="text-sm text-slate-300">Seu link rastreável está pronto! Copie e use em suas campanhas, bio, anúncios, etc.</p>
            <div className="flex items-center gap-2">
                <input type="text" readOnly value={content.link} className="w-full flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md text-slate-200 text-sm"/>
                <button onClick={handleCopy} className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors">{copied ? 'Copiado!' : 'Copiar'}</button>
            </div>
        </div>
      </div>
    </div>
  );
};

const ReportModal: React.FC<{ reportData: ReportData; onClose: () => void; }> = ({ reportData, onClose }) => {
  const formatDate = (dateString: string) => { const [year, month, day] = dateString.split('-'); return `${day}/${month}/${year}`; };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-blue-700 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-center p-5 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Relatório de Cliques</h2>
            <p className="text-sm font-semibold text-blue-300">Filtro: {reportData.filterName || 'Geral'}</p>
            <p className="text-sm text-slate-400 mt-1">Período: {formatDate(reportData.startDate)} a {formatDate(reportData.endDate)}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </header>
        <div className="p-6 flex-grow overflow-y-auto">
            <div className="text-center bg-blue-900/30 p-6 rounded-lg mb-6"><p className="text-lg text-slate-300">Total de Cliques no Período</p><p className="text-6xl font-bold text-green-400">{reportData.totalClicks}</p></div>
            {reportData.links.length > 0 ? (
                <div className="space-y-3">{reportData.links.map(link => <div key={link.id} className="flex justify-between items-center bg-slate-800/50 p-4 rounded-lg"><span className="font-semibold text-slate-200">{link.name}</span><span className="text-lg font-bold text-blue-300 bg-blue-500/20 px-3 py-1 rounded-full">{link.clicksInPeriod}</span></div>)}</div>
            ) : <div className="text-center py-10"><p className="text-slate-400">Nenhum clique foi registrado neste período.</p></div>}
        </div>
      </div>
    </div>
  );
};

const WhatsAppLinkForm: React.FC<{ onUseLink: (url: string) => void; clients: { name: string; phone?: string; }[]; }> = ({ onUseLink, clients }) => {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('Olá, vim pelo Instagram e quero mais informações sobre os serviços.');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState('');
  const formatPhoneNumber = (cleaned: string) => { let formatted = cleaned; if (cleaned.length > 2) { formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2)}`; } if (cleaned.length > 7) { formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`; } return formatted; };
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => { const cleaned = e.target.value.replace(/\D/g, '').slice(0, 11); setPhone(formatPhoneNumber(cleaned)); };
  const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => { const clientName = e.target.value; setSelectedClientName(clientName); if (clientName) { const selectedClient = clients.find(c => c.name === clientName); if (selectedClient && selectedClient.phone) { const cleaned = selectedClient.phone.replace(/\D/g, '').slice(0, 11); setPhone(formatPhoneNumber(cleaned)); } else { setPhone(''); } } else { setPhone(''); } };
  const handleGenerate = () => { if (!phone.trim()) { alert('Por favor, insira um número de telefone.'); return; } const cleanPhone = phone.replace(/\D/g, ''); if (cleanPhone.length < 10) { alert('Número de telefone inválido. Por favor, inclua o DDD.'); return; } const encodedMessage = encodeURIComponent(message); const url = `https://wa.me/55${cleanPhone}?text=${encodedMessage}`; setGeneratedUrl(url); };
  const handleCopy = () => { if (!generatedUrl) return; navigator.clipboard.writeText(generatedUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleUseLink = () => { if (!generatedUrl) { alert("Primeiro, gere um link para poder usá-lo."); return; } onUseLink(generatedUrl); };
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">Crie um link de WhatsApp com uma mensagem personalizada para usar em seus anúncios ou na bio.</p>
      <div className="space-y-4">
        <div><label htmlFor="wa-client-select" className="block text-sm font-medium text-slate-300 mb-1">Selecionar Cliente (Opcional)</label><select id="wa-client-select" value={selectedClientName} onChange={handleClientSelect} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"><option value="">Nenhum (Digitar Manualmente)</option>{clients.map(client => <option key={client.name} value={client.name}>{client.name}</option>)}</select></div>
        <div><label htmlFor="wa-phone" className="block text-sm font-medium text-slate-300 mb-1">Número de Telefone (com DDD)</label><input id="wa-phone" type="tel" value={phone} onChange={handlePhoneChange} placeholder="(XX) XXXXX-XXXX" className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"/><p className="text-xs text-slate-500 mt-1">O código do país (55 - Brasil) será adicionado automaticamente.</p></div>
        <div><label htmlFor="wa-message" className="block text-sm font-medium text-slate-300 mb-1">Mensagem Padrão</label><textarea id="wa-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"/><div className="text-right text-xs text-slate-500 mt-1">{message.length} / 1500 caracteres</div></div>
        <button onClick={handleGenerate} className="w-full md:w-auto bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-2 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all duration-300 shadow-lg">Gerar Link</button>
      </div>
      {generatedUrl && (<div className="pt-4 border-t border-blue-800/50 space-y-4"><div><label className="block text-xs text-slate-400 mb-1" htmlFor="wa-generated-link">Seu link gerado:</label><div className="flex items-center gap-2"><input id="wa-generated-link" type="text" readOnly value={generatedUrl} className="w-full flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md text-slate-200 text-sm"/><button onClick={handleCopy} className="flex-shrink-0 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors">{copied ? 'Copiado!' : 'Copiar'}</button></div></div><button onClick={handleUseLink} className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 transition-all duration-300 shadow-lg transform hover:scale-105">⬇️ Usar este Link no Cadastro de Contrato</button></div>)}
    </div>
  );
};

const SimpleTrackerForm: React.FC<{ onUseForContract: (name: string, url: string) => void; onTrackerCreated: () => void; clients: { name: string; }[]; }> = ({ onUseForContract, onTrackerCreated, clients }) => {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [selectedClient, setSelectedClient] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const handleAction = async () => { if (!name.trim() || !url.trim()) { alert('Por favor, preencha o nome e a URL de destino.'); return; } try { new URL(url); } catch (_) { alert("Por favor, insira uma URL válida."); return; } if (selectedClient) { onUseForContract(name, url); } else { setIsLoading(true); try { const result = await api.createSimpleTracker(name, url); const fullUrl = `${GOOGLE_SCRIPT_URL}?id=${result.id}`; setGeneratedUrl(fullUrl); onTrackerCreated(); setName(''); setUrl(''); setSelectedClient(''); } catch (e: any) { alert(`Erro ao criar link rastreável: ${e.message}`); } finally { setIsLoading(false); } } };
    const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => { const clientName = e.target.value; setSelectedClient(clientName); setName(clientName); setGeneratedUrl(''); };
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => { setName(e.target.value); if (selectedClient) { setSelectedClient(''); } setGeneratedUrl(''); };
    const handleCopy = () => { if (!generatedUrl) return; navigator.clipboard.writeText(generatedUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    return <div className="space-y-4"><p className="text-sm text-slate-400">Crie um link para qualquer URL de destino. Use para rastrear campanhas ou para iniciar um novo contrato.</p><div className="space-y-4"><div><label htmlFor="st-client-select" className="block text-sm font-medium text-slate-300 mb-1">Selecionar Cliente Existente (Opcional)</label><select id="st-client-select" value={selectedClient} onChange={handleClientSelect} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"><option value="">Nenhum (Digitar Manualmente)</option>{clients.map(client => <option key={client.name} value={client.name}>{client.name}</option>)}</select></div><div><label htmlFor="st-name" className="block text-sm font-medium text-slate-300 mb-1">Nome / Identificação do Link</label><input id="st-name" type="text" value={name} onChange={handleNameChange} placeholder="Ex: Campanha Dia das Mães, Bio do Instagram" className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"/></div><div><label htmlFor="st-url" className="block text-sm font-medium text-slate-300 mb-1">URL de Destino</label><input id="st-url" type="url" value={url} onChange={(e) => { setUrl(e.target.value); setGeneratedUrl(''); }} placeholder="https://seusite.com/produto" className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"/></div>{generatedUrl && !selectedClient && (<div className="space-y-2"><label className="block text-sm font-medium text-slate-300" htmlFor="generated-tracker-link">Link Rastreável</label><div className="flex items-center gap-2"><input id="generated-tracker-link" type="text" readOnly value={generatedUrl} className="w-full flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md text-slate-200 text-sm"/><button onClick={handleCopy} className="flex-shrink-0 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors">{copied ? 'Copiado!' : 'Copiar'}</button></div></div>)}<button onClick={handleAction} disabled={isLoading} className="w-full flex items-center justify-center bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 transition-all duration-300 shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait">{isLoading ? 'Gerando...' : (selectedClient ? <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>Usar para Contrato de Cliente</> : <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>Gerar Link Rastreável</>)}</button></div></div>;
};

const NewContractForm: React.FC<{ onAddLink: (name: string, companyName: string, url: string, workMaterial: WorkMaterial | null, startDate: string, endDate: string, phone: string, instagram: string, email: string, packageInfo: string, clientType: ClientType, cpf: string, cnpj: string) => void; clients: { name: string; companyName?: string; phone?: string; instagram?: string; email?: string; cpf?: string; cnpj?: string; }[]; renewalData?: Partial<TrackedLink> | null; prefilledUrl?: string; }> = ({ onAddLink, clients, renewalData, prefilledUrl }) => {
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [url, setUrl] = useState('');
    const [phone, setPhone] = useState('');
    const [instagram, setInstagram] = useState('');
    const [email, setEmail] = useState('');
    const [cpf, setCpf] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [workMaterialUrl, setWorkMaterialUrl] = useState('');
    const [workMaterialType, setWorkMaterialType] = useState<WorkMaterial['type']>('instagram');
    const nameInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
    const [selectedClient, setSelectedClient] = useState('');
    const [foundClientByPhone, setFoundClientByPhone] = useState<{ name: string; companyName?: string; phone?: string; instagram?: string; email?: string; cpf?: string; cnpj?: string; } | null>(null);
    const [clientType, setClientType] = useState<ClientType>('Cliente');
    const [selectedPackage, setSelectedPackage] = useState<keyof typeof packageOptions>("pacote_1");
    const [customPackageInfo, setCustomPackageInfo] = useState('');
    const getFutureDate = (startDateStr: string, days: number): string => { const date = new Date(`${startDateStr}T00:00:00`); date.setDate(date.getDate() + days); return date.toISOString().split('T')[0]; };
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(getFutureDate(today, 30));
    const resetContractFields = () => { setUrl(''); setWorkMaterialUrl(''); setStartDate(today); setEndDate(getFutureDate(today, 30)); setSelectedPackage('pacote_1'); setCustomPackageInfo(''); setClientType('Cliente'); };
    const clearForm = () => { setName(''); setCompanyName(''); setPhone(''); setInstagram(''); setEmail(''); setCpf(''); setCnpj(''); setSelectedClient(''); setFoundClientByPhone(null); resetContractFields(); };
    const populateFormWithClient = (clientData: { name: string; companyName?: string; phone?: string; instagram?: string; email?: string; cpf?: string; cnpj?: string; }) => { setName(clientData.name); setCompanyName(clientData.companyName || ''); setPhone(clientData.phone || ''); setInstagram(clientData.instagram || ''); setEmail(clientData.email || ''); setCpf(clientData.cpf || ''); setCnpj(clientData.cnpj || ''); setSelectedClient(clientData.name); };
    useEffect(() => { if (prefilledUrl) { setUrl(prefilledUrl); nameInputRef.current?.focus(); } }, [prefilledUrl]);
    useEffect(() => { if (renewalData && renewalData.name) { const clientData = clients.find(c => c.name === renewalData.name); if (clientData) { populateFormWithClient(clientData); } resetContractFields(); } }, [renewalData, clients]);
    useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) { setIsSuggestionsVisible(false); } }; document.addEventListener('mousedown', handleClickOutside); return () => { document.removeEventListener('mousedown', handleClickOutside); }; }, [suggestionsRef]);
    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => { const newStartDate = e.target.value; setStartDate(newStartDate); setEndDate(getFutureDate(newStartDate, 30)); };
    const handleNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { const value = e.target.value; setName(value); setSelectedClient(''); setFoundClientByPhone(null); const existingNames = clients.map(c => c.name); if (value.trim().length > 0) { const filteredSuggestions = existingNames.filter(n => n.toLowerCase().includes(value.toLowerCase())); setSuggestions(filteredSuggestions); setIsSuggestionsVisible(filteredSuggestions.length > 0); } else { setSuggestions([]); setIsSuggestionsVisible(false); } };
    const handleSuggestionClick = (suggestion: string) => { const clientData = clients.find(c => c.name === suggestion); if (clientData) { populateFormWithClient(clientData); } setSuggestions([]); setIsSuggestionsVisible(false); };
    const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => { const clientName = e.target.value; if (clientName) { const clientData = clients.find(c => c.name === clientName); if (clientData) { populateFormWithClient(clientData); } resetContractFields(); } else { clearForm(); nameInputRef.current?.focus(); } };
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => { const newPhone = e.target.value; setPhone(newPhone); const cleanedPhone = newPhone.replace(/\D/g, ''); if (cleanedPhone.length >= 10) { const existingClient = clients.find(c => c.phone && String(c.phone).replace(/\D/g, '') === cleanedPhone); if (existingClient) { setFoundClientByPhone(existingClient); populateFormWithClient(existingClient); } else { setFoundClientByPhone(null); } } else { setFoundClientByPhone(null); } };
    const setEndDateShortcut = (days: number) => { setEndDate(getFutureDate(startDate, days)); };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!name.trim()) { alert("O Nome do Cliente é obrigatório."); return; } const workMaterial: WorkMaterial | null = workMaterialUrl.trim() ? { url: workMaterialUrl.trim(), type: workMaterialType } : null; const packageInfo = clientType === 'Parceiro' ? 'Permuta' : (selectedPackage === 'personalizado' ? customPackageInfo : packageOptions[selectedPackage]); onAddLink(name, companyName, url, workMaterial, startDate, endDate, phone, instagram, email, packageInfo, clientType, cpf, cnpj); clearForm(); };
    const hasExistingContracts = clients.some(client => client.name.toLowerCase() === name.trim().toLowerCase() && !foundClientByPhone);
    const packageOptions = { "pacote_1": "Básico: 1 Feed, 4 Stories/mês (R$160)", "pacote_2": "Intermediário: 2 Feeds, 8 Stories/mês (R$190)", "pacote_3": "Premium: 2 Feeds, Stories Diários (R$497)", "personalizado": "Personalizado" };

    return (
        <form id="add-link-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
              <div>
                <label htmlFor="client-select" className="block text-sm font-medium text-slate-300 mb-1">Selecionar Cliente Existente (Opcional)</label>
                <select id="client-select" value={selectedClient} onChange={handleClientSelect} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors">
                    <option value="">Nenhum (Cadastrar Novo)</option>
                    {clients.map(client => <option key={client.name} value={client.name}>{client.name}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div ref={suggestionsRef} className="relative">
                <label htmlFor="link-name" className="block text-sm font-medium text-slate-300 mb-1">Nome do Contato</label>
                <input id="link-name" ref={nameInputRef} type="text" value={name} onChange={handleNameInputChange} onFocus={handleNameInputChange} placeholder="Digite o nome ou selecione" className={`w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors ${foundClientByPhone ? 'bg-slate-700 cursor-not-allowed' : ''}`} autoComplete="off" disabled={!!foundClientByPhone}/>
                {isSuggestionsVisible && suggestions.length > 0 && (<ul className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-40 overflow-y-auto">{suggestions.map((suggestion, index) => <li key={index} onClick={() => handleSuggestionClick(suggestion)} className="px-4 py-2 text-sm text-slate-200 cursor-pointer hover:bg-blue-600">{suggestion}</li>)}</ul>)}
                {hasExistingContracts && (<p className="text-amber-400 text-xs mt-1">Já existe um contato com este nome. Ao salvar, um novo contrato será criado para ele.</p>)}
              </div>
               <div className="md:col-span-1"><label htmlFor="company-name" className="block text-sm font-medium text-slate-300 mb-1">Nome da Empresa (Opcional)</label><input id="company-name" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Empresa Exemplo Ltda." className={`w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors ${foundClientByPhone ? 'bg-slate-700 cursor-not-allowed' : ''}`} disabled={!!foundClientByPhone}/></div>
              <div><label htmlFor="client-type" className="block text-sm font-medium text-slate-300 mb-1">Tipo de Contato</label><select id="client-type" value={clientType} onChange={(e) => setClientType(e.target.value as ClientType)} className={`w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors ${foundClientByPhone ? 'bg-slate-700 cursor-not-allowed' : ''}`} disabled={!!foundClientByPhone}><option value="Cliente">Cliente</option><option value="Lead">Lead</option><option value="Contato">Contato</option><option value="Parceiro">Parceiro</option></select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label htmlFor="link-phone" className="block text-sm font-medium text-slate-300 mb-1">Telefone (Opcional)</label><input id="link-phone" type="tel" value={phone} onChange={handlePhoneChange} placeholder="+55 (11) 99999-8888" className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"/>{foundClientByPhone ? (<p className="text-amber-400 text-xs mt-1">Este telefone já pertence a <strong>{foundClientByPhone.name}</strong>. Um novo contrato será adicionado a este cliente.</p>) : (<p className="text-xs text-slate-400 mt-1">Para links WhatsApp, inclua o código do país (DDI), ex: 55119....</p>)}</div>
              <div><label htmlFor="link-instagram" className="block text-sm font-medium text-slate-300 mb-1">Instagram (Opcional)</label><input id="link-instagram" type="text" value={instagram} onChange={(e) => setInstagram(e.target.value.replace(/@/g, ''))} placeholder="usuario" className={`w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors ${foundClientByPhone ? 'bg-slate-700 cursor-not-allowed' : ''}`} disabled={!!foundClientByPhone}/><p className="text-xs text-slate-400 mt-1">Insira apenas o nome de usuário, sem o "@".</p></div>
            </div>
            <div><label htmlFor="link-email" className="block text-sm font-medium text-slate-300 mb-1">E-mail (Opcional)</label><input id="link-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" className={`w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors ${foundClientByPhone ? 'bg-slate-700 cursor-not-allowed' : ''}`} disabled={!!foundClientByPhone}/></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label htmlFor="link-cpf" className="block text-sm font-medium text-slate-300 mb-1">CPF (Opcional)</label><input id="link-cpf" type="text" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" className={`w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors ${foundClientByPhone ? 'bg-slate-700 cursor-not-allowed' : ''}`} disabled={!!foundClientByPhone}/></div>
                <div><label htmlFor="link-cnpj" className="block text-sm font-medium text-slate-300 mb-1">CNPJ (Opcional)</label><input id="link-cnpj" type="text" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" className={`w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors ${foundClientByPhone ? 'bg-slate-700 cursor-not-allowed' : ''}`} disabled={!!foundClientByPhone}/></div>
            </div>
            <div><label htmlFor="link-url" className="block text-sm font-medium text-slate-300 mb-1">URL de Destino (Opcional)</label><input id="link-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://wa.me/..." className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"/></div>
            {clientType !== 'Parceiro' && (<div className="pt-4 border-t border-blue-800/50 space-y-4"><p className="text-lg font-medium text-slate-300">Detalhes do Contrato</p><div><label htmlFor="package-info" className="block text-sm font-medium text-slate-300 mb-1">Pacote do Cliente</label><select id="package-info" value={selectedPackage} onChange={(e) => setSelectedPackage(e.target.value as keyof typeof packageOptions)} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors">{Object.entries(packageOptions).map(([key, value]) => ( <option key={key} value={key}>{value}</option>))}</select></div>{selectedPackage === 'personalizado' && (<div><label htmlFor="custom-package-info" className="block text-sm font-medium text-slate-300 mb-1">Descreva o Pacote Personalizado</label><input id="custom-package-info" type="text" value={customPackageInfo} onChange={(e) => setCustomPackageInfo(e.target.value)} placeholder="Ex: 3 feeds/semana, 10 stories/mês (R$300)" className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"/></div>)}<div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label htmlFor="start-date" className="block text-xs text-slate-400 mb-1">Data de Início</label><input id="start-date" type="date" value={startDate} onChange={handleStartDateChange} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors" style={{ colorScheme: 'dark' }}/></div><div><label htmlFor="end-date" className="block text-xs text-slate-400 mb-1">Data de Vencimento</label><input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors" style={{ colorScheme: 'dark' }}/></div></div><div className="flex flex-wrap gap-2"><span className="text-sm text-slate-400 self-center mr-2">Definir vencimento:</span>{[7, 15, 30].map(days => (<button key={days} type="button" onClick={() => setEndDateShortcut(days)} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-full transition-colors">+{days} dias</button>))}</div></div>)}
            <div className="pt-4 border-t border-blue-800/50"><label htmlFor="work-material-url" className="block text-sm font-medium text-slate-300 mb-1">1º Material de Trabalho (Opcional)</label><div className="flex flex-col sm:flex-row gap-2"><input id="work-material-url" type="url" value={workMaterialUrl} onChange={(e) => setWorkMaterialUrl(e.target.value)} placeholder="Cole aqui o link do post, vídeo, etc." className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"/><select value={workMaterialType} onChange={(e) => setWorkMaterialType(e.target.value as WorkMaterial['type'])} className="w-full sm:w-auto px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"><option value="instagram">Instagram</option><option value="drive">Google Drive</option><option value="other">Outro</option></select></div></div>
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-300 shadow-lg transform hover:scale-105">{renewalData || foundClientByPhone ? 'Adicionar Novo Contrato' : 'Cadastrar Novo Cliente'}</button>
        </form>
    );
};

const ReportGenerator: React.FC<{ links: TrackedLink[]; onGenerateReport: (startDate: string, endDate: string, linkId: string) => void; isLoading: boolean; error: string | null; }> = ({ links, onGenerateReport, isLoading, error }) => {
    const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState(''); const [filter, setFilter] = useState('all');
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const setDateRange = (days: number | 'today') => { const end = new Date(); let start = new Date(); if (days === 'today') { start.setHours(0, 0, 0, 0); } else { start.setDate(end.getDate() - (days - 1)); start.setHours(0, 0, 0, 0); } setStartDate(formatDate(start)); setEndDate(formatDate(end)); };
    const handleSubmit = () => { if (!startDate || !endDate) { alert('Por favor, selecione a data de início e de fim.'); return; } if (new Date(startDate) > new Date(endDate)) { alert('A data de início não pode ser posterior à data de fim.'); return; } onGenerateReport(startDate, endDate, filter); };
    const shortcuts = [{ label: "Hoje", days: 'today' as 'today' }, { label: "7 dias", days: 7 }, { label: "15 dias", days: 15 }, { label: "30 dias", days: 30 }];
    return <div className="p-6 bg-blue-900/20 rounded-lg border border-blue-700 shadow-lg backdrop-blur-sm space-y-6 mb-12"><h3 className="text-xl font-semibold text-slate-200">Relatório de Cliques por Período</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="md:col-span-3"><label htmlFor="client-filter" className="block text-sm font-medium text-slate-300 mb-1">Filtrar por Cliente</label><select id="client-filter" value={filter} onChange={e => setFilter(e.target.value)} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"><option value="all">Todos os Clientes (Geral)</option>{links.map(link => <option key={link.id} value={link.id}>{link.name}</option>)}</select></div><div><label htmlFor="start-date" className="block text-sm font-medium text-slate-300 mb-1">Data de Início</label><div className="relative"><input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full pl-4 pr-10 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors" style={{ colorScheme: 'dark' }}/><div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div></div></div><div><label htmlFor="end-date" className="block text-sm font-medium text-slate-300 mb-1">Data de Fim</label><div className="relative"><input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full pl-4 pr-10 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors" style={{ colorScheme: 'dark' }}/><div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div></div></div><div className="flex items-end"><button onClick={handleSubmit} disabled={isLoading} className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-2 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">{isLoading ? 'Gerando...' : 'Gerar Relatório'}</button></div></div><div className="flex flex-wrap gap-2 pt-2 border-t border-blue-800/50"><span className="text-sm text-slate-400 self-center mr-2">Atalhos:</span>{shortcuts.map(s => <button key={s.label} onClick={() => setDateRange(s.days)} className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-full transition-colors">{s.label}</button>)}{error && <p className="text-red-400 mt-2">{error}</p>}</div></div>;
};

const WebhookDiagnostics: React.FC = () => {
    const [logs, setLogs] = useState<WebhookLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const fetchLogs = async () => { setIsLoading(true); setError(null); try { const data = await api.getWebhookLogs(); setLogs(data); } catch (e) { setError('Falha ao carregar os logs. A aba "WebhookLog" existe na sua planilha?'); console.error(e); } finally { setIsLoading(false); } };
    useEffect(() => { fetchLogs(); }, []);
    const handleCopy = () => { navigator.clipboard.writeText(GOOGLE_SCRIPT_URL); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    return <div className="space-y-6 p-4 bg-slate-800/40 rounded-lg border border-slate-700"><h4 className="block text-lg font-medium text-amber-300 mb-1">Diagnóstico de Webhook</h4><p className="text-xs text-slate-300 -mt-4">Use esta ferramenta para verificar se as mensagens do WhatsApp estão chegando ao NOCA Gestor.</p><div className="space-y-3"><p className="text-sm font-semibold text-slate-300">Checklist de Configuração:</p><ul className="list-disc list-inside space-y-2 text-sm text-slate-300"><li>Copie a URL abaixo.</li><li>Na Z-API, cole a URL no campo do webhook <code className="bg-slate-700 text-xs p-1 rounded">on-message-received</code>.</li><li>No Google Apps Script, certifique-se de que a última implantação está configurada para "Quem pode acessar": <strong className="text-green-400">Qualquer pessoa</strong>.</li></ul><div><label htmlFor="webhook-url-diag" className="block text-sm font-medium text-slate-300 mb-1">Sua URL de Webhook</label><div className="flex items-center gap-2"><input id="webhook-url-diag" type="text" readOnly value={GOOGLE_SCRIPT_URL} className="w-full px-4 py-2 bg-slate-900/70 border border-slate-700 rounded-md text-slate-400 text-xs cursor-not-allowed" /><button onClick={handleCopy} className="flex-shrink-0 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors">{copied ? 'Copiado!' : 'Copiar'}</button></div></div></div><div><div className="flex justify-between items-center mb-2"><h5 className="font-semibold text-slate-300">Registros Recebidos (últimos 20)</h5><button onClick={fetchLogs} disabled={isLoading} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-50">{isLoading ? 'Atualizando...' : 'Atualizar'}</button></div><div className="bg-slate-900 rounded-md p-3 max-h-80 overflow-y-auto border border-slate-600 text-xs font-mono">{isLoading && <p className="text-slate-400">Carregando...</p>}{error && <p className="text-red-400">{error}</p>}{!isLoading && !error && logs.length === 0 && (<p className="text-slate-500">Nenhum registro de webhook encontrado. Envie uma mensagem de teste para o seu número e clique em "Atualizar". Se nada aparecer, verifique o checklist acima.</p>)}{logs.map((log, index) => <div key={index} className="p-2 border-b border-slate-700 last:border-b-0"><p className="text-green-400 font-semibold">[{new Date(log.timestamp).toLocaleString('pt-BR')}]</p><pre className="whitespace-pre-wrap break-all text-slate-300">{log.content}</pre></div>)}</div></div></div>;
};

const CrmDashboard: React.FC = () => {
    const [crmData, setCrmData] = useState<CrmData>({ conversationsToday: 0, newLeads: 0, status: { attending: 0, waiting: 0, lost: 0, remarketing: 0, client: 0 } });
    const [isLoading, setIsLoading] = useState(false); 
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(formatDate(new Date()));
    const [endDate, setEndDate] = useState(formatDate(new Date()));
    const setDateRange = (days: number | 'today') => { const end = new Date(); let start = new Date(); if (days === 'today') { start.setHours(0, 0, 0, 0); } else { start.setDate(end.getDate() - (days - 1)); start.setHours(0, 0, 0, 0); } setStartDate(formatDate(start)); setEndDate(formatDate(end)); };
    const shortcuts = [ { label: "Hoje", days: 'today' as 'today' }, { label: "7 dias", days: 7 }, { label: "15 dias", days: 15 }, { label: "30 dias", days: 30 }];
    const StatCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => ( <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700 flex flex-col ${className}`}> <h3 className="text-sm font-medium text-slate-400 mb-2">{title}</h3> <div className="flex-grow flex flex-col justify-center">{children}</div> </div> );
    return ( <div className="p-6 bg-blue-900/20 rounded-lg border border-blue-700 shadow-lg backdrop-blur-sm"> <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4"> <div className="flex-1"> <h2 className="text-2xl font-bold text-slate-100">Visão Geral de CRM (Leads)</h2> <p className="text-xs text-amber-400">Dados de demonstração. Integração com Z-API pendente.</p> <p className="text-xs text-sky-400 mt-1">Filtro de tempo afeta todos os indicadores abaixo.</p> </div> <div className="flex flex-wrap items-center justify-center gap-2"> {shortcuts.map(s => ( <button key={s.label} onClick={() => setDateRange(s.days)} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-full transition-colors"> {s.label} </button> ))} <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-2 py-1 text-xs bg-slate-700 text-slate-200 rounded-md border border-slate-600" style={{ colorScheme: 'dark' }} /> <span className="text-slate-400 text-xs">até</span> <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-2 py-1 text-xs bg-slate-700 text-slate-200 rounded-md border border-slate-600" style={{ colorScheme: 'dark' }} /> </div> </div> <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"> <StatCard title="Conversas Hoje"> <p className="text-4xl font-bold text-sky-400">{isLoading ? '...' : crmData.conversationsToday}</p> </StatCard> <StatCard title="Novos Leads/Contatos"> <p className="text-4xl font-bold text-green-400">{isLoading ? '...' : crmData.newLeads}</p> </StatCard> <StatCard title="Leads Perdidos"> <p className="text-4xl font-bold text-red-400">{isLoading ? '...' : crmData.status.lost}</p> </StatCard> <StatCard title="Viraram Clientes"> <p className="text-4xl font-bold text-teal-400">{isLoading ? '...' : crmData.status.client}</p> </StatCard> <div className="col-span-2 lg:col-span-4 p-5 bg-slate-800/50 rounded-lg border border-slate-700"> <h3 className="text-sm font-medium text-slate-400 mb-3">Leads por Status</h3> <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center"> <div> <p className="font-bold text-2xl text-yellow-400">{isLoading ? '...' : crmData.status.attending}</p> <p className="text-xs text-slate-300">Atendendo</p> </div> <div> <p className="font-bold text-2xl text-blue-400">{isLoading ? '...' : crmData.status.waiting}</p> <p className="text-xs text-slate-300">Aguardando Resposta</p> </div> <div> <p className="font-bold text-2xl text-purple-400">{isLoading ? '...' : crmData.status.remarketing}</p> <p className="text-xs text-slate-300">Remarketing</p> </div> </div> </div> </div> </div> );
};

const Dashboard: React.FC<{ links: TrackedLink[] }> = ({ links }) => {
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isLoadingClicks, setIsLoadingClicks] = useState(true);
    const [clicksError, setClicksError] = useState<string | null>(null);
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(formatDate(new Date()));
    const [endDate, setEndDate] = useState(formatDate(new Date()));
    const fetchClicks = useCallback(async () => { if (!startDate || !endDate) return; setIsLoadingClicks(true); setClicksError(null); try { const report = await api.getReport(startDate, endDate, 'all'); setReportData(report); } catch (error) { console.error("Failed to fetch dashboard clicks report:", error); setReportData(null); setClicksError("Failed to fetch"); } finally { setIsLoadingClicks(false); } }, [startDate, endDate]);
    useEffect(() => { fetchClicks(); }, [fetchClicks]);
    const setDateRange = (days: number | 'today') => { const end = new Date(); let start = new Date(); if (days === 'today') { start.setHours(0, 0, 0, 0); } else { start.setDate(end.getDate() - (days - 1)); start.setHours(0, 0, 0, 0); } setStartDate(formatDate(start)); setEndDate(formatDate(end)); };
    const activeLinks = links.filter(link => !link.isArchived);
    const getDaysUntilExpiry = (endDate?: string): number | null => { if (!endDate) return null; const end = new Date(`${endDate}T00:00:00`); if (isNaN(end.getTime())) return null; const today = new Date(); today.setHours(0, 0, 0, 0); const diffTime = end.getTime() - today.getTime(); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); return diffDays; };
    const contractsToExpire = { todayOrTomorrow: activeLinks.filter(l => { const d = getDaysUntilExpiry(l.endDate); return d !== null && d >= 0 && d < 2; }).length, sevenDays: activeLinks.filter(l => { const d = getDaysUntilExpiry(l.endDate); return d !== null && d >= 2 && d <= 7; }).length, fifteenDays: activeLinks.filter(l => { const d = getDaysUntilExpiry(l.endDate); return d !== null && d > 7 && d <= 15; }).length };
    const parsePackageName = (packageInfo?: string): string => { if (!packageInfo) return 'Não Informado'; if (packageInfo.toLowerCase().includes('personalizado')) return 'Personalizado'; const match = packageInfo.match(/^([^:]+)/); return match ? match[1].trim() : 'Outro'; };
    const packageCounts = activeLinks.reduce((acc, link) => { const name = parsePackageName(link.packageInfo); acc[name] = (acc[name] || 0) + 1; return acc; }, {} as Record<string, number>);
    const totalValue = activeLinks.reduce((sum, link) => { return sum + parsePackageValue(link.packageInfo); }, 0);
    const shortcuts = [ { label: "Hoje", days: 'today' as 'today' }, { label: "7 dias", days: 7 }, { label: "15 dias", days: 15 }, { label: "30 dias", days: 30 }];
    const StatCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => ( <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700 flex flex-col ${className}`}> <h3 className="text-sm font-medium text-slate-400 mb-2">{title}</h3> <div className="flex-grow flex flex-col justify-center">{children}</div> </div> );
    const renderClicksContent = () => { if (isLoadingClicks) { return <div className="animate-pulse h-10 bg-slate-700 rounded w-3/4 mx-auto"></div>; } if (clicksError) { return ( <div className="text-center"> <p className="text-sm text-yellow-400 font-semibold">Falha ao carregar</p> <button onClick={fetchClicks} className="mt-2 text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md"> Tentar Novamente </button> </div> ) } return ( <> <p className="text-4xl font-bold text-sky-400">{reportData?.totalClicks ?? 0}</p> <p className="text-[10px] text-slate-500 mt-1">Filtro de tempo aplicado</p> </> ) };
    return ( <> <div className="p-6 bg-blue-900/20 rounded-lg border border-blue-700 shadow-lg backdrop-blur-sm"> <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4"> <h2 className="text-2xl font-bold text-slate-100">Dashboard de Performance</h2> <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full"> {shortcuts.map(s => ( <button key={s.label} onClick={() => setDateRange(s.days)} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-full transition-colors"> {s.label} </button> ))} <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-2 py-1 text-xs bg-slate-700 text-slate-200 rounded-md border border-slate-600" style={{ colorScheme: 'dark' }} /> <span className="text-slate-400 text-xs">até</span> <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-2 py-1 text-xs bg-slate-700 text-slate-200 rounded-md border border-slate-600" style={{ colorScheme: 'dark' }} /> </div> </div> <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"> <StatCard title="Clientes Ativos"> <p className="text-4xl font-bold text-green-400">{activeLinks.length}</p> </StatCard> <StatCard title="Cliques no Período"> <div className="text-center"> {renderClicksContent()} </div> </StatCard> <StatCard title="Contratos a Vencer"> <div className="space-y-2"> <div className="flex justify-between items-center"> <span className="text-sm text-slate-300">Hoje/Amanhã</span> <span className="font-bold text-lg text-orange-400 bg-orange-500/20 px-2.5 py-0.5 rounded-full">{contractsToExpire.todayOrTomorrow}</span> </div> <div className="flex justify-between items-center"> <span className="text-sm text-slate-300">Próximos 7 dias</span> <span className="font-bold text-lg text-yellow-400 bg-yellow-500/20 px-2.5 py-0.5 rounded-full">{contractsToExpire.sevenDays}</span> </div> <div className="flex justify-between items-center"> <span className="text-sm text-slate-300">Próximos 15 dias</span> <span className="font-bold text-lg text-sky-400 bg-sky-500/20 px-2.5 py-0.5 rounded-full">{contractsToExpire.fifteenDays}</span> </div> </div> </StatCard> <StatCard title="Pacotes Ativos"> <div className="space-y-1 max-h-24 overflow-y-auto pr-2"> {Object.entries(packageCounts).length > 0 ? Object.entries(packageCounts).map(([name, count]) => ( <div key={name} className="flex justify-between items-center text-sm"> <span className="text-slate-300 truncate pr-2" title={name}>{name}</span> <span className="font-semibold text-blue-300">{count}</span> </div> )) : <p className="text-sm text-slate-500">Nenhum pacote ativo.</p>} </div> </StatCard> <StatCard title="Valor Acumulado (Ativos)"> <p className="text-4xl font-bold text-teal-400"> R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} </p> </StatCard> </div> </div> <div className="mt-8"> <CrmDashboard /> </div> </> );
};

const StatusTag: React.FC<{endDate?: string}> = ({ endDate }) => {
    const status = getStatus(endDate);
    if (!status) return <span className="text-xs text-slate-500 italic">Sem data</span>;
    return <span className={`text-xs font-bold px-2 py-1 rounded-full ${status.color} ${status.textColor}`}>{status.text}</span>;
};

const ClientTypeTag: React.FC<{ type?: ClientType }> = ({ type }) => {
    if (!type) return null;
    const typeStyles: { [key in ClientType]: string } = {
        Cliente: 'bg-blue-500/30 text-blue-300 border-blue-500',
        Lead: 'bg-yellow-500/30 text-yellow-300 border-yellow-500',
        Contato: 'bg-gray-500/30 text-gray-300 border-gray-500',
        Parceiro: 'bg-purple-500/30 text-purple-300 border-purple-500',
    };
    return ( <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${typeStyles[type] || typeStyles.Contato}`}> {type} </span> );
};

const PlanTag: React.FC<{ plan?: string }> = ({ plan }) => {
    if (!plan || plan === 'N/A') return <span className="text-xs text-slate-500 italic">N/A</span>;
    const planStyles: { [key: string]: string } = {
        'Permuta': 'bg-gray-500/30 text-gray-300 border-gray-500',
        'Premium': 'bg-yellow-500/30 text-yellow-300 border-yellow-500',
        'Básico': 'bg-teal-500/30 text-teal-300 border-teal-500',
        'Personalizado': 'bg-indigo-500/30 text-indigo-300 border-indigo-500',
    };
    const style = planStyles[plan] || 'bg-slate-600/30 text-slate-300 border-slate-500';
    return ( <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${style}`}> {plan} </span> );
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/D';
  const date = new Date(`${dateString}T00:00:00`);
  if (isNaN(date.getTime())) { return 'N/D'; }
  return date.toLocaleDateString('pt-BR');
};

const ClientListRow: React.FC<{ client: Client; onArchive: (id: string, isArchived: boolean) => void; onRenew: (link: TrackedLink) => void; isPending: boolean; onUpdateDates: (id: string, startDate: string, endDate: string) => void; onUpdateContactInfo: (id: string, phone: string, instagram: string, email: string, cpf: string, cnpj: string, companyName: string) => void; onUpdatePackageInfo: (id: string, packageInfo: string) => void; onDeleteContract: (id: string) => void; }> = ({ client, onArchive, onRenew, isPending, onUpdateDates, onUpdateContactInfo, onUpdatePackageInfo, onDeleteContract }) => { const [isExpanded, setIsExpanded] = useState(false); const [copiedId, setCopiedId] = useState<string | null>(null); const [storyCopiedId, setStoryCopiedId] = useState<string | null>(null); const totalClicks = client.contracts.reduce((acc, c) => acc + c.clicks, 0); const firstWorkMaterialUrl = client.contracts.flatMap(c => c.workMaterialUrls).find(wm => wm.url)?.url; const latestContract = client.contracts[0]; const contractType = latestContract ? parseContractType(latestContract.packageInfo) : 'N/A'; const handleCopyClick = (e: React.MouseEvent, link: TrackedLink) => { e.stopPropagation(); const url = `${GOOGLE_SCRIPT_URL}?id=${link.id}`; navigator.clipboard.writeText(url); setCopiedId(link.id); setTimeout(() => setCopiedId(null), 2000); }; const handlePostStoryClick = (e: React.MouseEvent, contract: TrackedLink) => { e.stopPropagation(); if (!contract.workMaterialUrls || contract.workMaterialUrls.length === 0) { alert("Nenhum material de trabalho encontrado para este contrato."); return; } const trackableUrl = `${GOOGLE_SCRIPT_URL}?id=${contract.id}`; navigator.clipboard.writeText(trackableUrl); setStoryCopiedId(contract.id); window.open(contract.workMaterialUrls[0].url, '_blank', 'noopener,noreferrer'); setTimeout(() => setStoryCopiedId(null), 2000); }; const handleEditContract = (e: React.MouseEvent, contract: TrackedLink) => { e.stopPropagation(); const newPackageInfo = prompt("Editar Pacote do Cliente:", contract.packageInfo); if (newPackageInfo !== null) { onUpdatePackageInfo(contract.id, newPackageInfo); } const newStartDate = prompt("Editar Data de Início (AAAA-MM-DD):", contract.startDate); if (newStartDate !== null) { const newEndDate = prompt("Editar Data de Vencimento (AAAA-MM-DD):", contract.endDate); if (newEndDate !== null) { onUpdateDates(contract.id, newStartDate, newEndDate); } } }; const handleArchiveClick = (e: React.MouseEvent, contract: TrackedLink) => { e.stopPropagation(); if (window.confirm(`Tem certeza que deseja ${contract.isArchived ? 'desarquivar' : 'arquivar'} este contrato?`)) { onArchive(contract.id, !contract.isArchived); } }; const handleDeleteClick = (e: React.MouseEvent, contract: TrackedLink) => { e.stopPropagation(); if (window.confirm('Atenção! Tem certeza que deseja DELETAR este contrato? Esta ação é irreversível e removerá também a transação financeira associada.')) { onDeleteContract(contract.id); } }; return ( <div className={`bg-slate-800/50 rounded-lg transition-colors duration-300 ${isExpanded ? 'bg-slate-700/50' : 'hover:bg-slate-700/50'}`}> {isPending && ( <div className="absolute inset-0 bg-slate-900 bg-opacity-80 flex items-center justify-center rounded-lg z-20"> <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> </div> )} <div className="flex flex-wrap md:flex-nowrap md:items-center text-sm w-full p-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}> <div className="md:w-[4%] text-center text-slate-400"> <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mx-auto transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7-7" /></svg> </div> <div className="w-full md:w-[26%] pl-2 pr-4"> <p className="font-bold text-slate-100 truncate" title={client.name}>{client.name}</p> {client.companyName && <p className="text-xs text-slate-400 truncate" title={client.companyName}>{client.companyName}</p>} </div> <div className="w-1/3 md:w-[12%] text-center my-2 md:my-0"> <ClientTypeTag type={client.clientType} /> </div> <div className="w-1/3 md:w-[12%] text-center my-2 md:my-0"> <PlanTag plan={contractType} /> </div> <div className="w-1/3 md:w-[10%] text-center my-2 md:my-0"> <span className="font-semibold text-lg text-slate-100 bg-blue-900/50 px-3 py-1 rounded-full">{client.contracts.length}</span> </div> <div className="w-1/3 md:w-[10%] text-center font-bold text-lg text-blue-300 my-2 md:my-0">{totalClicks}</div> <div className="w-full md:w-[26%] flex items-center justify-center gap-2 mt-3 md:mt-0 md:ml-auto"> <button onClick={(e) => { e.stopPropagation(); onRenew(client.contracts[0]); }} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-semibold transition-colors">Novo Contrato</button> </div> </div> {isExpanded && ( <div className="px-4 pb-3 space-y-2"> <div className="p-3 my-2 bg-slate-900/40 rounded-md border border-slate-700"> <p className="text-sm font-semibold text-slate-300 mb-2">Informações de Contato</p> <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm"> <div className="flex items-center gap-2"> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.956-.5-5.688-1.448l-6.305 1.654z"/></svg> {client.phone ? <a href={`https://wa.me/55${String(client.phone).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white hover:underline">{client.phone}</a> : <span className="text-slate-500 italic">Não informado</span>} </div> <div className="flex items-center gap-2"> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-pink-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg> {client.instagram ? <a href={`https://instagram.com/${String(client.instagram).replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white hover:underline">{client.instagram}</a> : <span className="text-slate-500 italic">Não informado</span>} </div> <div className="flex items-center gap-2"> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> {client.email ? <a href={`mailto:${client.email}`} className="text-slate-300 hover:text-white hover:underline">{client.email}</a> : <span className="text-slate-500 italic">Não informado</span>} </div> <div className="flex items-center gap-2"> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h2a2 2 0 012 2v1m-6 4h.01M9 16h.01" /></svg> {client.cpf ? <span className="text-slate-300">{client.cpf}</span> : <span className="text-slate-500 italic">CPF não informado</span>} </div> <div className="flex items-center gap-2"> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m5-4h1m-1 4h1" /></svg> {client.cnpj ? <span className="text-slate-300">{client.cnpj}</span> : <span className="text-slate-500 italic">CNPJ não informado</span>} </div> <button onClick={(e) => { e.stopPropagation(); const linkForContact = client.contracts[0]; const newCompanyName = prompt("Editar Nome da Empresa:", linkForContact.companyName || ""); if (newCompanyName === null) return; const newPhone = prompt("Editar Telefone:", linkForContact.phone || ""); if (newPhone === null) return; const newInstagram = prompt("Editar Instagram:", linkForContact.instagram || ""); if (newInstagram === null) return; const newEmail = prompt("Editar E-mail:", linkForContact.email || ""); if (newEmail === null) return; const newCpf = prompt("Editar CPF:", linkForContact.cpf || ""); if (newCpf === null) return; const newCnpj = prompt("Editar CNPJ:", linkForContact.cnpj || ""); if (newCnpj === null) return; client.contracts.forEach(c => onUpdateContactInfo(c.id, newPhone, newInstagram, newEmail, newCpf, newCnpj, newCompanyName)); }} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mt-2" title="Editar Contato"> <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg> Editar Contatos </button> </div> </div> <div className="hidden md:flex items-center p-2 text-xs font-semibold text-slate-400 border-y border-slate-700"> <div className="w-[15%]">ID Contrato</div> <div className="w-[10%] text-center">Status</div> <div className="w-[12%] text-center">Vencimento</div> <div className="w-[10%] text-center">Valor</div> <div className="w-[8%] text-center">Cliques</div> <div className="w-[45%] text-center">Ações</div> </div> {client.contracts.map(contract => ( <div key={contract.id} className={`flex flex-wrap items-center p-2 rounded-md hover:bg-slate-900/50 ${contract.isArchived ? 'opacity-50' : ''}`}> <div className="w-full md:w-[15%] font-medium text-blue-300 truncate mb-2 md:mb-0" title={contract.id}>{contract.id.substring(0, 8)}...</div> <div className="w-1/3 md:w-[10%] text-center"><StatusTag endDate={contract.endDate} /></div> <div className="w-1/3 md:w-[12%] text-center text-slate-300">{formatDate(contract.endDate)}</div> <div className="w-1/3 md:w-[10%] text-center font-semibold text-teal-300">{parsePackageValue(contract.packageInfo) > 0 ? `R$ ${parsePackageValue(contract.packageInfo).toFixed(2)}` : 'N/A'}</div> <div className="w-1/3 md:w-[8%] text-center font-bold text-lg text-blue-300">{contract.clicks}</div> <div className="w-full md:w-[45%] flex items-center justify-center gap-2 mt-3 md:mt-0"> <button onClick={(e) => handleCopyClick(e, contract)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-colors"> {copiedId === contract.id ? 'Copiado!' : 'Link Rastreio'} </button> {contract.workMaterialUrls && contract.workMaterialUrls.length > 0 && ( <button onClick={(e) => handlePostStoryClick(e, contract)} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-semibold transition-colors"> {storyCopiedId === contract.id ? 'Link Copiado!' : 'Postar Stories'} </button> )} <button onClick={(e) => handleEditContract(e, contract)} className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-700" title="Editar Contrato"> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg> </button> <button onClick={(e) => {e.stopPropagation(); onRenew(contract)}} className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-700" title="Criar Novo Contrato (Renovação)"> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> </button> <button onClick={(e) => handleArchiveClick(e, contract)} className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-700" title={contract.isArchived ? 'Desarquivar' : 'Arquivar'}> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg> </button> <button onClick={(e) => handleDeleteClick(e, contract)} className="p-1.5 text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-700" title="Deletar Contrato"> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> </button> </div> </div> ))} </div> )} </div> ); };

// START OF: Added components
const EventModal: React.FC<{ eventData: Partial<AgendaItem> | null; onClose: () => void; onSave: (event: Omit<AgendaItem, 'id'> | AgendaItem) => Promise<void>; onDelete: (eventId: string) => Promise<void>; }> = ({ eventData, onClose, onSave, onDelete }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (eventData) {
            const start = new Date(eventData.start || new Date());
            const end = new Date(eventData.end || new Date());

            setTitle(eventData.title || '');
            setDescription(eventData.description || '');
            setStartDate(start.toISOString().split('T')[0]);
            setStartTime(start.toTimeString().substring(0, 5));
            setEndDate(end.toISOString().split('T')[0]);
            setEndTime(end.toTimeString().substring(0, 5));
        }
    }, [eventData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) {
            alert('O título é obrigatório.');
            return;
        }

        setIsSaving(true);
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);

        if (startDateTime >= endDateTime) {
            alert('A data/hora de término deve ser posterior à de início.');
            setIsSaving(false);
            return;
        }

        const payload = {
            ...eventData,
            title,
            description,
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
            isAllDay: false,
        };
        
        await onSave(payload as AgendaItem); // Type assertion, as 'id' might be missing for new events
        setIsSaving(false);
    };

    const handleDelete = async () => {
        if (eventData?.id) {
             setIsSaving(true);
             await onDelete(eventData.id);
             setIsSaving(false);
        }
    };

    if (!eventData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 modal-overlay" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-2xl w-full max-w-lg modal-content" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <header className="flex justify-between items-center p-4 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-slate-100">{eventData.id ? 'Editar Evento' : 'Novo Evento'}</h2>
                        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </header>

                    <div className="p-5 space-y-4">
                        <div>
                            <label htmlFor="event-title" className="block text-sm font-medium text-slate-300 mb-1">Título</label>
                            <input type="text" id="event-title" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="event-start-date" className="block text-sm font-medium text-slate-300 mb-1">Início</label>
                                <div className="flex gap-2">
                                     <input type="date" id="event-start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md" style={{ colorScheme: 'dark' }} />
                                     <input type="time" id="event-start-time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md" style={{ colorScheme: 'dark' }} />
                                </div>
                            </div>
                             <div>
                                <label htmlFor="event-end-date" className="block text-sm font-medium text-slate-300 mb-1">Término</label>
                                <div className="flex gap-2">
                                     <input type="date" id="event-end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md" style={{ colorScheme: 'dark' }}/>
                                     <input type="time" id="event-end-time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md" style={{ colorScheme: 'dark' }} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="event-description" className="block text-sm font-medium text-slate-300 mb-1">Descrição</label>
                            <textarea id="event-description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400"></textarea>
                        </div>
                    </div>
                    
                    <footer className="flex justify-between items-center p-4 bg-slate-900/50 rounded-b-lg">
                        <div>
                            {eventData.id && (
                                <button type="button" onClick={handleDelete} disabled={isSaving} className="px-4 py-2 text-sm bg-red-800 hover:bg-red-700 text-white font-semibold rounded-md disabled:opacity-50">
                                    Excluir
                                </button>
                            )}
                        </div>
                         <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-md">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md disabled:opacity-50">
                               {isSaving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </footer>
                </form>
            </div>
        </div>
    );
};

const CalendarView: React.FC<{ view: 'day' | 'week' | 'month' | 'year'; currentDate: Date; events: AgendaItem[]; onEventClick: (event: AgendaItem) => void; onSlotClick: (date: Date) => void; }> = ({ view, currentDate, events, onEventClick, onSlotClick }) => {
    const WEEK_DAYS_CALENDAR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const HOUR_HEIGHT_REM = 3;
    
    const CurrentTimeIndicator: React.FC = () => {
        const [topPosition, setTopPosition] = useState(0);
        const indicatorRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const updatePosition = () => {
                const now = new Date();
                const hours = now.getHours();
                const minutes = now.getMinutes();
                const newTop = (hours + minutes / 60) * HOUR_HEIGHT_REM;
                setTopPosition(newTop);
            };

            updatePosition();
            const intervalId = setInterval(updatePosition, 60000); // Update every minute

            return () => clearInterval(intervalId);
        }, []);
        
        if (topPosition > 24 * HOUR_HEIGHT_REM) return null;

        return (
            <div ref={indicatorRef} className="absolute left-0 right-0 z-20 flex items-center" style={{ top: `${topPosition}rem`}}>
                <div className="w-2 h-2 -ml-1 bg-red-500 rounded-full"></div>
                <div className="h-0.5 flex-grow bg-red-500"></div>
            </div>
        );
    };

    const DayView: React.FC<{ currentDate: Date; events: AgendaItem[], onEventClick: (event: AgendaItem) => void, onSlotClick: (date: Date) => void }> = ({ currentDate, events, onEventClick, onSlotClick }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isToday = currentDate.toDateString() === today.toDateString();

        const hours = Array.from({ length: 24 }, (_, i) => i);
        const dayEvents = events.filter(e => {
            const eventDate = new Date(e.start);
            return eventDate.toDateString() === currentDate.toDateString();
        });
        
        const handleGridClick = (hour: number, e: React.MouseEvent) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const minute = Math.floor((y / rect.height) * 60);
            const clickedDate = new Date(currentDate);
            clickedDate.setHours(hour, minute);
            onSlotClick(clickedDate);
        };

        return (
            <div className="flex flex-col">
                <div className="grid grid-cols-[3rem_1fr] flex-shrink-0">
                    <div className="w-12"></div>
                    <div className="text-center py-2 border-b border-slate-700">
                        <span className="text-xs text-slate-400">{WEEK_DAYS_CALENDAR[currentDate.getDay()]}</span>
                        <span className={`block text-lg font-bold ${isToday ? 'bg-blue-500 text-white rounded-full h-7 w-7 mx-auto flex items-center justify-center' : 'text-slate-200'}`}>{currentDate.getDate()}</span>
                    </div>
                </div>
                <div className="grid grid-cols-[3rem_1fr] overflow-y-auto" style={{ height: `${HOUR_HEIGHT_REM * 12}rem`}}>
                    <div className="w-12 border-r border-slate-700">
                        {hours.map(h => (
                            <div key={h} className="text-right pr-2 text-xs text-slate-500 -mt-2" style={{height: `${HOUR_HEIGHT_REM}rem`}}>
                               {h > 0 ? `${h}:00` : ''}
                            </div>
                        ))}
                    </div>
                    <div className="relative">
                        {hours.map(h => <div key={h} onClick={(e) => handleGridClick(h, e)} className="border-b border-slate-700/50" style={{height: `${HOUR_HEIGHT_REM}rem`}}></div>)}
                        {isToday && <CurrentTimeIndicator />}
                        {dayEvents.map(event => {
                            const start = new Date(event.start);
                            const end = new Date(event.end);
                            const top = (start.getHours() + start.getMinutes() / 60) * HOUR_HEIGHT_REM;
                            const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
                            const height = (durationMinutes / 60) * HOUR_HEIGHT_REM;

                            return (
                                <div 
                                    key={event.id}
                                    onClick={() => onEventClick(event)}
                                    className="absolute left-1 right-1 bg-sky-800/80 backdrop-blur-sm text-white p-1.5 rounded-md z-10 border border-sky-600 cursor-pointer hover:bg-sky-700/80"
                                    style={{ top: `${top}rem`, height: `${Math.max(height, 1.5)}rem`}}
                                    title={`${event.title}\n${event.description}`}
                                >
                                    <p className="text-xs font-bold truncate">{event.title}</p>
                                    <p className="text-[10px] truncate">{start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit'})}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const MonthView: React.FC<{ currentDate: Date; events: AgendaItem[] }> = ({ currentDate, events }) => {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const startDate = new Date(monthStart);
        startDate.setDate(startDate.getDate() - monthStart.getDay());
        const endDate = new Date(monthEnd);
        endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()));

        const days = [];
        let day = new Date(startDate);

        while (day <= endDate) {
            days.push(new Date(day));
            day.setDate(day.getDate() + 1);
        }

        const today = new Date();
        today.setHours(0,0,0,0);

        return (
            <div className="grid grid-cols-7">
                {WEEK_DAYS_CALENDAR.map(day => (
                    <div key={day} className="text-center text-xs font-bold text-slate-400 py-2 border-b border-slate-700">{day}</div>
                ))}
                {days.map((d, i) => {
                    const isCurrentMonth = d.getMonth() === currentDate.getMonth();
                    const isToday = d.getTime() === today.getTime();
                    const dayEvents = events.filter(e => new Date(e.start).toDateString() === d.toDateString());

                    return (
                        <div key={i} className={`relative min-h-[6rem] sm:min-h-[7rem] border-b border-r border-slate-700 p-1 ${isCurrentMonth ? 'bg-slate-800/30' : 'bg-slate-900/40'}`}>
                            <span className={`text-xs ${isToday ? 'bg-blue-500 text-white rounded-full flex items-center justify-center h-5 w-5 font-bold' : isCurrentMonth ? 'text-slate-300' : 'text-slate-600'}`}>
                                {d.getDate()}
                            </span>
                            <div className="mt-1 space-y-1">
                                {dayEvents.slice(0, 2).map(event => (
                                     <div key={event.id} className="text-[10px] bg-blue-800 text-white p-1 rounded-md truncate" title={event.title}>
                                        {event.title}
                                    </div>
                                ))}
                                {dayEvents.length > 2 && (
                                     <div className="text-[10px] text-slate-400">+ {dayEvents.length - 2} mais</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };


    const WeekView: React.FC<{ currentDate: Date; events: AgendaItem[]; onEventClick: (event: AgendaItem) => void, onSlotClick: (date: Date) => void }> = ({ currentDate, events, onEventClick, onSlotClick }) => {
        const weekStart = new Date(currentDate);
        const dayOfWeek = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));

        const days = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            return d;
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const hours = Array.from({ length: 24 }, (_, i) => i);

        const handleGridClick = (hour: number, day: Date, e: React.MouseEvent) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const minute = Math.floor((y / rect.height) * 60);
            const clickedDate = new Date(day);
            clickedDate.setHours(hour, minute);
            onSlotClick(clickedDate);
        };

        return (
            <div className="flex flex-col">
                <div className="grid grid-cols-[3rem_1fr] flex-shrink-0">
                    <div className="w-12"></div>
                    <div className="grid grid-cols-7">
                        {days.map(d => {
                            const isToday = d.toDateString() === today.toDateString();
                            return (
                                <div key={d.toISOString()} className="text-center py-2 border-b border-slate-700">
                                    <span className="text-xs text-slate-400">{WEEK_DAYS_CALENDAR[d.getDay()]}</span>
                                    <span className={`block text-lg font-bold ${isToday ? 'bg-blue-500 text-white rounded-full h-7 w-7 mx-auto flex items-center justify-center' : 'text-slate-200'}`}>{d.getDate()}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
                <div className="grid grid-cols-[3rem_1fr] overflow-y-auto" style={{ height: `${HOUR_HEIGHT_REM * 12}rem`}}>
                    <div className="w-12 border-r border-slate-700">
                        {hours.map(h => (
                            <div key={h} className="text-right pr-2 text-xs text-slate-500 -mt-2" style={{height: `${HOUR_HEIGHT_REM}rem`}}>
                               {h > 0 ? `${h}:00` : ''}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 relative">
                         {days.map((d, dayIndex) => (
                             <div key={dayIndex} className="border-r border-slate-700 relative">
                                {hours.map(h => <div key={h} onClick={(e) => handleGridClick(h, d, e)} className="border-b border-slate-700/50" style={{height: `${HOUR_HEIGHT_REM}rem`}}></div>)}
                            </div>
                         ))}
                         {days.findIndex(d => d.toDateString() === new Date().toDateString()) !== -1 && <CurrentTimeIndicator />}
                         {events.map(event => {
                            const start = new Date(event.start);
                            const end = new Date(event.end);
                            const eventDayIndex = days.findIndex(d => d.toDateString() === start.toDateString());
                            if (eventDayIndex === -1) return null;

                            const top = (start.getHours() + start.getMinutes() / 60) * HOUR_HEIGHT_REM;
                            const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
                            const height = (durationMinutes / 60) * HOUR_HEIGHT_REM;

                            return (
                                <div 
                                    key={event.id}
                                    onClick={() => onEventClick(event)}
                                    className="absolute bg-sky-800/80 text-white p-1.5 rounded-md z-10 border border-sky-600 cursor-pointer hover:bg-sky-700/80 overflow-hidden"
                                    style={{ 
                                        top: `${top}rem`, 
                                        height: `${Math.max(height, 1.5)}rem`,
                                        left: `calc(${(100/7) * eventDayIndex}% + 0.25rem)`,
                                        width: `calc(${(100/7)}% - 0.5rem)`
                                    }}
                                    title={`${event.title}\n${event.description}`}
                                >
                                    <p className="text-[11px] font-bold truncate">{event.title}</p>
                                    <p className="text-[10px] truncate">{start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit'})}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const YearView: React.FC<{ currentDate: Date; events: AgendaItem[] }> = ({ currentDate, events }) => {
        const year = currentDate.getFullYear();

        const MiniMonth: React.FC<{ month: number }> = ({ month }) => {
            const monthStart = new Date(year, month, 1);
            const monthEnd = new Date(year, month + 1, 0);
            const startDate = new Date(monthStart);
            startDate.setDate(startDate.getDate() - monthStart.getDay());
            const endDate = new Date(monthEnd);
            endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()));

            const days = [];
            let day = new Date(startDate);
            while (day <= endDate) {
                days.push(new Date(day));
                day.setDate(day.getDate() + 1);
            }

            const eventsByDay: { [key: string]: number } = events.reduce((acc, event) => {
                const eventDate = new Date(event.start).toDateString();
                acc[eventDate] = (acc[eventDate] || 0) + 1;
                return acc;
            }, {} as {[key: string]: number});

            return (
                <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                    <h4 className="font-bold text-center text-sm text-blue-300 mb-2">{MONTH_NAMES[month]}</h4>
                    <div className="grid grid-cols-7 text-center text-[10px] text-slate-500">
                        {WEEK_DAYS_CALENDAR.map(d => <span key={d}>{d[0]}</span>)}
                    </div>
                    <div className="grid grid-cols-7 text-center text-xs">
                        {days.map((d, i) => {
                            const isCurrentMonth = d.getMonth() === month;
                            const hasEvents = eventsByDay[d.toDateString()] > 0;
                            return (
                                <span key={i} className={`p-0.5 ${!isCurrentMonth ? 'text-slate-600' : 'text-slate-200'} ${hasEvents ? 'bg-blue-500/50 rounded-full' : ''}`}>
                                    {d.getDate()}
                                </span>
                            );
                        })}
                    </div>
                </div>
            );
        };
        
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {MONTH_NAMES.map((_, i) => <MiniMonth key={i} month={i} />)}
            </div>
        );
    };

    switch(view) {
        case 'day':
            return <DayView currentDate={currentDate} events={events} onEventClick={onEventClick} onSlotClick={onSlotClick}/>;
        case 'week':
            return <WeekView currentDate={currentDate} events={events} onEventClick={onEventClick} onSlotClick={onSlotClick}/>;
        case 'month':
            return <MonthView currentDate={currentDate} events={events} />;
        case 'year':
            return <YearView currentDate={currentDate} events={events} />;
        default:
            return <WeekView currentDate={currentDate} events={events} onEventClick={onEventClick} onSlotClick={onSlotClick}/>;
    }
};

const AgendaPanel: React.FC<{ isActive: boolean; items: AgendaItem[]; onSync: (startDate: string, endDate: string) => void; isSyncing: boolean; syncError: string | null; isConfigured: boolean; onSaveEvent: (eventData: Omit<AgendaItem, 'id'> | AgendaItem) => Promise<void>; onDeleteEvent: (eventId: string) => Promise<void>; eventModalState: { isOpen: boolean; event: Partial<AgendaItem> | null; setIsOpen: (isOpen: boolean) => void; setEvent: (event: Partial<AgendaItem> | null) => void; }; }> = ({ isActive, items, onSync, isSyncing, syncError, isConfigured, onSaveEvent, onDeleteEvent, eventModalState }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'day' | 'week' | 'month' | 'year'>('day');

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setView('day');
            } else {
                setView('week');
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { startDate, endDate } = useMemo(() => {
        const getDayRange = (date: Date) => { const start = new Date(date); const end = new Date(date); return { start, end }; };
        const getWeekRange = (date: Date) => { const start = new Date(date); const day = start.getDay(); const diff = start.getDate() - day + (day === 0 ? -6 : 1); start.setDate(diff); const end = new Date(start); end.setDate(start.getDate() + 6); return { start, end }; };
        const getMonthRange = (date: Date) => { const start = new Date(date.getFullYear(), date.getMonth(), 1); const end = new Date(date.getFullYear(), date.getMonth() + 1, 0); return { start, end }; };
        const getYearRange = (date: Date) => { const start = new Date(date.getFullYear(), 0, 1); const end = new Date(date.getFullYear(), 11, 31); return { start, end }; };

        let range;
        switch(view) {
            case 'day': range = getDayRange(currentDate); break;
            case 'week': range = getWeekRange(currentDate); break;
            case 'month': range = getMonthRange(currentDate); break;
            case 'year': range = getYearRange(currentDate); break;
        }
        return {
            startDate: range.start.toISOString().split('T')[0],
            endDate: range.end.toISOString().split('T')[0]
        };
    }, [currentDate, view]);

    useEffect(() => {
        if (isActive && isConfigured) {
            onSync(startDate, endDate);
        }
    }, [isActive, isConfigured, startDate, endDate, onSync]);
    
    const handleNav = (direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') {
            setCurrentDate(new Date());
            return;
        }
        const newDate = new Date(currentDate);
        const increment = direction === 'next' ? 1 : -1;
        switch(view) {
            case 'day': newDate.setDate(newDate.getDate() + increment); break;
            case 'week': newDate.setDate(newDate.getDate() + (7 * increment)); break;
            case 'month': newDate.setMonth(newDate.getMonth() + increment); break;
            case 'year': newDate.setFullYear(newDate.getFullYear() + increment); break;
        }
        setCurrentDate(newDate);
    };
    
    const handleEventClick = (event: AgendaItem) => {
        eventModalState.setEvent(event);
        eventModalState.setIsOpen(true);
    };
    
    const handleSlotClick = (date: Date) => {
        const end = new Date(date.getTime() + 60 * 60 * 1000);
        eventModalState.setEvent({
            title: '', description: '', start: date.toISOString(), end: end.toISOString(), isAllDay: false
        });
        eventModalState.setIsOpen(true);
    };

    const headerTitle = useMemo(() => {
        switch(view) {
            case 'day': return currentDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
            case 'week': {
                const start = new Date(startDate + 'T00:00:00');
                const end = new Date(endDate + 'T00:00:00');
                const startMonth = start.toLocaleString('pt-BR', { month: 'long' });
                const endMonth = end.toLocaleString('pt-BR', { month: 'long' });
                if (startMonth === endMonth) {
                    return `${start.getDate()} - ${end.getDate()} de ${endMonth} de ${end.getFullYear()}`;
                }
                return `${start.getDate()} de ${startMonth} - ${end.getDate()} de ${endMonth} de ${end.getFullYear()}`;
            }
            case 'month': return currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
            case 'year': return currentDate.getFullYear().toString();
        }
    }, [startDate, endDate, view, currentDate]);

    return (
        <div className="p-4 sm:p-6 bg-blue-900/20 rounded-lg border border-blue-700 shadow-lg backdrop-blur-sm">
            {eventModalState.isOpen && (
                <EventModal eventData={eventModalState.event} onClose={() => eventModalState.setIsOpen(false)} onSave={onSaveEvent} onDelete={onDeleteEvent} />
            )}
            {!isConfigured ? (
                <div className="text-center p-4 rounded-lg bg-amber-900/30 border border-amber-700">
                    <p className="text-amber-300"><strong className="font-semibold">Ação Necessária:</strong> Para usar a agenda, por favor, configure o <strong className="font-semibold">ID da sua Google Agenda</strong> no painel de Configurações.</p>
                </div>
            ) : (
            <div>
                <header className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => handleNav('today')} className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-md">Hoje</button>
                        <div className="flex items-center gap-2">
                             <button onClick={() => handleNav('prev')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                             <button onClick={() => handleNav('next')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-100 capitalize">{headerTitle}</h3>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-md">
                        <button onClick={() => setView('day')} className={`px-3 py-1 text-sm rounded ${view === 'day' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Dia</button>
                        <button onClick={() => setView('week')} className={`px-3 py-1 text-sm rounded ${view === 'week' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Semana</button>
                        <button onClick={() => setView('month')} className={`px-3 py-1 text-sm rounded ${view === 'month' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Mês</button>
                        <button onClick={() => setView('year')} className={`px-3 py-1 text-sm rounded ${view === 'year' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Ano</button>
                    </div>
                </header>
                {syncError && <p className="text-center text-red-400 bg-red-900/30 p-3 rounded-md mb-4">{syncError}</p>}
                <div className="bg-slate-800/50 p-1 sm:p-2 rounded-lg border border-slate-700">
                     {isSyncing ? (
                        <div className="text-center py-20 text-slate-500">
                            <svg className="animate-spin h-8 w-8 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Carregando eventos...
                        </div>
                    ) : <CalendarView view={view} currentDate={currentDate} events={items} onEventClick={handleEventClick} onSlotClick={handleSlotClick} /> }
                </div>
            </div>
            )}
        </div>
    );
};

const ClientCard: React.FC<{ client: Client; onArchive: (id: string, isArchived: boolean) => void; onDeleteContract: (id: string) => void; onUpdateDates: (id: string, startDate: string, endDate: string) => void; onUpdateContactInfo: (id: string, phone: string, instagram: string, email: string, cpf: string, cnpj: string, companyName: string) => void; onUpdatePackageInfo: (id: string, packageInfo: string) => void; onRenew: (link: TrackedLink) => void; pendingActions: {[key: string]: string | null}; }> = ({ client, onArchive, onDeleteContract, onUpdateDates, onUpdateContactInfo, onUpdatePackageInfo, onRenew, pendingActions }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [storyCopiedId, setStoryCopiedId] = useState<string | null>(null);
  const [isContactVisible, setIsContactVisible] = useState(false);

  const totalClicks = client.contracts.reduce((acc, c) => acc + c.clicks, 0);
  const isAnyContractPending = client.contracts.some(c => !!pendingActions[c.id]);
  const firstWorkMaterialUrl = client.contracts.flatMap(c => c.workMaterialUrls).find(wm => wm.url)?.url;

  const handleCopyClick = (e: React.MouseEvent, link: TrackedLink) => {
    e.stopPropagation();
    const url = `${GOOGLE_SCRIPT_URL}?id=${link.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  
  const handlePostStoryClick = (e: React.MouseEvent, contract: TrackedLink) => {
    e.stopPropagation();
    if (!contract.workMaterialUrls || contract.workMaterialUrls.length === 0) {
        alert("Nenhum material de trabalho encontrado para este contrato.");
        return;
    }
    const trackableUrl = `${GOOGLE_SCRIPT_URL}?id=${contract.id}`;
    navigator.clipboard.writeText(trackableUrl);
    setStoryCopiedId(contract.id);
    window.open(contract.workMaterialUrls[0].url, '_blank', 'noopener,noreferrer');
    setTimeout(() => setStoryCopiedId(null), 2000);
  };

  const handleEditContactInfo = () => {
    const linkForContact = client.contracts[0]; // Use the most recent contract for context
    const newCompanyName = prompt("Editar Nome da Empresa:", linkForContact.companyName || "");
    if (newCompanyName === null) return;
    const newPhone = prompt("Editar Telefone:", linkForContact.phone || "");
    if (newPhone === null) return;
    const newInstagram = prompt("Editar Instagram:", linkForContact.instagram || "");
    if (newInstagram === null) return;
    const newEmail = prompt("Editar E-mail:", linkForContact.email || "");
    if (newEmail === null) return;
    const newCpf = prompt("Editar CPF:", linkForContact.cpf || "");
    if (newCpf === null) return;
    const newCnpj = prompt("Editar CNPJ:", linkForContact.cnpj || "");
    if (newCnpj === null) return;

    // Update all contracts for this client with the new info for consistency
    client.contracts.forEach(c => onUpdateContactInfo(c.id, newPhone, newInstagram, newEmail, newCpf, newCnpj, newCompanyName));
  }

  const handleEditContract = (e: React.MouseEvent, contract: TrackedLink) => {
    e.stopPropagation();
    const newPackageInfo = prompt("Editar Pacote do Cliente:", contract.packageInfo);
    if (newPackageInfo !== null) {
        onUpdatePackageInfo(contract.id, newPackageInfo);
    }
    const newStartDate = prompt("Editar Data de Início (AAAA-MM-DD):", contract.startDate);
     if (newStartDate !== null) {
        const newEndDate = prompt("Editar Data de Vencimento (AAAA-MM-DD):", contract.endDate);
        if (newEndDate !== null) {
            onUpdateDates(contract.id, newStartDate, newEndDate);
        }
    }
  };

  const handleArchiveClick = (e: React.MouseEvent, contract: TrackedLink) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja ${contract.isArchived ? 'desarquivar' : 'arquivar'} este contrato?`)) {
        onArchive(contract.id, !contract.isArchived);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, contract: TrackedLink) => {
    e.stopPropagation();
    if (window.confirm('Atenção! Tem certeza que deseja DELETAR este contrato? Esta ação é irreversível e removerá também a transação financeira associada.')) {
        onDeleteContract(contract.id);
    }
  };

  return (
    <div className={`relative group flex flex-col bg-blue-900/20 border border-blue-700 rounded-lg shadow-lg hover:shadow-blue-500/20 transition-all duration-300`}>
      {isAnyContractPending && (
        <div className="absolute inset-0 bg-slate-900 bg-opacity-80 flex items-center justify-center rounded-lg z-20">
            <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
      )}
      
      <div className="p-5">
        <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-slate-100">{client.name}</h3>
              {client.companyName && <p className="text-sm text-slate-400">{client.companyName}</p>}
              <div className="mt-1"><ClientTypeTag type={client.clientType} /></div>
            </div>
             <div className="flex-shrink-0 flex items-center gap-1 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-lg font-bold">
                <span>{totalClicks}</span>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
            </div>
        </div>
        
         <div className="mt-4 p-3 bg-slate-900/40 rounded-md">
            <button onClick={() => setIsContactVisible(!isContactVisible)} className="w-full flex justify-between items-center">
                <p className="text-sm font-semibold text-slate-300">Contato do Cliente</p>
                <div className="flex items-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform text-slate-400 ${isContactVisible ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
            </button>
            {isContactVisible && (
                <div className="mt-3 pt-3 border-t border-slate-700 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.956-.5-5.688-1.448l-6.305 1.654z"/></svg>
                        {client.phone ? <a href={`https://wa.me/55${String(client.phone).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white hover:underline">{client.phone}</a> : <span className="text-slate-500 italic">Não informado</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-pink-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                        {client.instagram ? <a href={`https://instagram.com/${String(client.instagram).replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white hover:underline">{client.instagram}</a> : <span className="text-slate-500 italic">Não informado</span>}
                    </div>
                     <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        {client.email ? <a href={`mailto:${client.email}`} className="text-slate-300 hover:text-white hover:underline">{client.email}</a> : <span className="text-slate-500 italic">Não informado</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h2a2 2 0 012 2v1m-6 4h.01M9 16h.01" /></svg>
                        {client.cpf ? <span className="text-slate-300">{client.cpf}</span> : <span className="text-slate-500 italic">CPF não informado</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m5-4h1m-1 4h1" /></svg>
                        {client.cnpj ? <span className="text-slate-300">{client.cnpj}</span> : <span className="text-slate-500 italic">CNPJ não informado</span>}
                    </div>
                     <button onClick={handleEditContactInfo} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mt-2" title="Editar Contato">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                        Editar Contatos
                    </button>
                </div>
            )}
        </div>
      </div>
      
       <div className="p-5 pt-2 flex-grow flex flex-col">
        <h4 className="text-sm font-semibold text-slate-300 mb-3">Contratos</h4>
         <div className="space-y-3 flex-grow">
            {client.contracts.map(contract => (
              <div key={contract.id} className={`p-3 bg-slate-800/60 rounded-lg border border-slate-700 ${contract.isArchived ? 'opacity-50 grayscale' : ''}`}>
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-semibold text-blue-300 truncate" title={contract.id}>{contract.id.substring(0,8)}...</p>
                     <StatusTag endDate={contract.endDate} />
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                      <p>Vence em: {formatDate(contract.endDate)}</p>
                      <p className="font-semibold text-teal-300">{parsePackageValue(contract.packageInfo) > 0 ? `R$ ${parsePackageValue(contract.packageInfo).toFixed(2)}` : 'N/A'}</p>
                  </div>
                   <div className="mt-3 flex items-center justify-between text-xs">
                       <div className="flex items-center gap-2">
                            <button onClick={(e) => handleCopyClick(e, contract)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-colors">
                                {copiedId === contract.id ? 'Copiado!' : 'Rastreio'}
                            </button>
                            {contract.workMaterialUrls && contract.workMaterialUrls.length > 0 && (
                                <button onClick={(e) => handlePostStoryClick(e, contract)} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition-colors">
                                    {storyCopiedId === contract.id ? 'Link Copiado!' : 'Postar'}
                                </button>
                            )}
                        </div>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => handleEditContract(e, contract)} className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-700" title="Editar Contrato">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                        </button>
                        <button onClick={(e) => handleArchiveClick(e, contract)} className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-700" title={contract.isArchived ? 'Desarquivar' : 'Arquivar'}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                        </button>
                         <button onClick={(e) => handleDeleteClick(e, contract)} className="p-1.5 text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-700" title="Deletar Contrato">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                   </div>
              </div>
            ))}
         </div>
         <div className="w-full mt-4 flex gap-2">
            {firstWorkMaterialUrl && (
                <a href={firstWorkMaterialUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-sm bg-indigo-600/20 text-indigo-300 font-semibold py-2 rounded-md border border-indigo-700 hover:bg-indigo-600/40 transition-colors">
                    Ver Material
                </a>
            )}
            <button onClick={() => onRenew(client.contracts[0])} className="flex-1 text-center text-sm bg-green-600/20 text-green-300 font-semibold py-2 rounded-md border border-green-700 hover:bg-green-600/40 transition-colors">
                + Novo Contrato
            </button>
         </div>
       </div>
    </div>
  );
};

const RoutineChecklist: React.FC<{ tasks: RoutineTask[]; completions: TaskCompletions; onSave: (tasks: RoutineTask[]) => void; onToggleCompletion: (taskId: string) => void; }> = ({ tasks, completions, onSave, onToggleCompletion }) => {
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskFreq, setNewTaskFreq] = useState<TaskFrequency>('daily');
  const [newTaskDay, setNewTaskDay] = useState<number>(1);
  const [newTaskRepetitions, setNewTaskRepetitions] = useState(1);
  const dayOfWeekMap: { [key: number]: string } = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado', 0: 'Domingo' };
  
  const handleAddTask = () => {
    if (!newTaskText.trim()) return alert("Por favor, digite o nome da tarefa.");
    const newTask: RoutineTask = {
      id: crypto.randomUUID(),
      text: newTaskText.trim(),
      frequency: newTaskFreq,
      repetitions: newTaskFreq === 'daily' ? newTaskRepetitions : 1,
      dayOfWeek: newTaskFreq === 'weekly' ? newTaskDay : undefined,
    };
    
    onSave([...tasks, newTask]);
    setNewTaskText('');
    setNewTaskFreq('daily');
    setNewTaskRepetitions(1);
  };
  
  const handleDeleteTask = (taskId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta tarefa?")) {
        const newTasks = tasks.filter(t => t.id !== taskId);
        onSave(newTasks);
    }
  }
  
  const dailyTasks = tasks.filter(t => t.frequency === 'daily');
  const weeklyTasks = tasks.filter(t => t.frequency === 'weekly');
  
  const TaskItem: React.FC<{task: RoutineTask}> = ({ task }) => {
    const taskCompletions = completions[task.id] || [];
    const isCompleted = taskCompletions.length >= task.repetitions;
    
    return (
        <div className="flex items-center p-3 bg-slate-800/50 rounded-md hover:bg-slate-700/50 transition-colors group">
            <input 
                type="checkbox" 
                id={`task-${task.id}`} 
                checked={isCompleted} 
                onChange={() => onToggleCompletion(task.id)}
                className="h-5 w-5 rounded bg-slate-900 border-slate-600 text-blue-500 focus:ring-blue-500 cursor-pointer"
            />
            <label 
                htmlFor={`task-${task.id}`} 
                className={`ml-3 text-sm flex-1 cursor-pointer transition-all ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-200'}`}
            >
                {task.text}
            </label>
            <div className="flex items-center gap-3">
                 {task.repetitions > 1 && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isCompleted ? 'bg-green-800 text-green-300' : 'bg-slate-700 text-slate-300'}`}>
                        {taskCompletions.length}/{task.repetitions}
                    </span>
                )}
                {task.dayOfWeek !== undefined && (
                    <span className="text-xs bg-sky-800 text-sky-300 px-2 py-0.5 rounded-full">
                        {dayOfWeekMap[task.dayOfWeek]}
                    </span>
                )}
                <button onClick={() => handleDeleteTask(task.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Excluir">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        </div>
    );
  };

  return (
    <div className="p-6 bg-blue-900/20 rounded-lg border border-blue-700 shadow-lg backdrop-blur-sm space-y-8">
       <h2 className="text-2xl font-bold text-slate-100">Checklist de Rotinas</h2>
      
      {tasks.length > 0 ? (
        <>
          {dailyTasks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Rotinas Diárias</h3>
              <div className="space-y-2">
                {dailyTasks.map(task => <TaskItem key={task.id} task={task} />)}
              </div>
            </div>
          )}
          {weeklyTasks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Rotinas Semanais</h3>
              <div className="space-y-2">
                {weeklyTasks.map(task => <TaskItem key={task.id} task={task} />)}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-10
