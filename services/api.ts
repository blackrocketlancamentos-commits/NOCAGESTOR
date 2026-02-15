
import { GOOGLE_SCRIPT_URL } from '../config.ts';
import { TrackedLink, ReportData, WorkMaterial, AgendaItem, RoutineTask, FinancialTransaction, RawChatMessage, Settings, WhatsAppLead, WebhookLogEntry } from '../types.ts';
import { GoogleGenAI } from "@google/genai";

async function callApi(action: string, data: object = {}) {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action, data }),
        redirect: 'follow'
    });

    let result;
    try {
        result = await response.json();
    } catch (e) {
        throw new Error("RESPONSE_NOT_JSON");
    }
    
    if (!result.success) {
        throw new Error(result.error || 'Ocorreu um erro na API');
    }
    
    return result.data;
}

export const ping = async (): Promise<{ status: string }> => {
    return callApi('PING');
};

export const getLinks = async (): Promise<TrackedLink[]> => {
    const result = await callApi('GET_LINKS', {});
    return result.map((link: any) => ({
      ...link, 
      companyName: link.companyname,
      clicks: Number(link.clicks) || 0,
      workMaterialUrls: Array.isArray(link.workMaterialUrls) ? link.workMaterialUrls : [],
    }));
};

export const addLink = async (linkData: TrackedLink, googleCalendarId?: string): Promise<TrackedLink> => {
    return callApi('CREATE', { ...linkData, googleCalendarId });
};

export const createSimpleTracker = async (name: string, url: string): Promise<{id: string}> => {
    return callApi('CREATE_SIMPLE_TRACKER', { name, url });
};

export const incrementClick = async (id: string): Promise<{id: string, clicks: number}> => {
    return callApi('UPDATE_CLICK', { id });
};

export const updateWorkMaterials = async (id: string, workMaterialUrls: WorkMaterial[]): Promise<{id: string}> => {
    return callApi('UPDATE_WORK_MATERIALS', { id, workMaterialUrls });
};

export const updateDates = async (id: string, startDate: string, endDate: string): Promise<{id: string}> => {
    return callApi('UPDATE_DATES', { id, startDate, endDate });
};

export const updateContactInfo = async (id: string, phone: string, instagram: string, email: string, cpf: string, cnpj: string, companyName: string): Promise<{id: string}> => {
    return callApi('UPDATE_CONTACT_INFO', { id, phone, instagram, email, cpf, cnpj, companyName });
}

export const archiveLink = async (id: string, isArchived: boolean): Promise<{id: string}> => {
    return callApi('ARCHIVE_LINK', { id, isArchived });
};

export const deleteContract = async (id: string): Promise<{id: string}> => {
    return callApi('DELETE_CONTRACT', { id });
};

export const updatePackageInfo = async (id: string, packageInfo: string): Promise<{id:string}> => {
    return callApi('UPDATE_PACKAGE_INFO', { id, packageInfo });
};

export const getReport = async (startDate: string, endDate: string, linkId: string): Promise<ReportData> => {
    return callApi('GET_REPORT', { startDate, endDate, linkId });
}

export const getCalendarEvents = async (calendarId: string, startDate: string, endDate: string): Promise<AgendaItem[]> => {
    return callApi('GET_CALENDAR_EVENTS', { calendarId, startDate, endDate });
}

export const createCalendarEvent = async (calendarId: string, eventData: Omit<AgendaItem, 'id'>): Promise<AgendaItem> => {
    return callApi('CREATE_CALENDAR_EVENT', { calendarId, ...eventData });
};

export const updateCalendarEvent = async (calendarId: string, eventData: AgendaItem): Promise<{success: boolean}> => {
    return callApi('UPDATE_CALENDAR_EVENT', { calendarId, ...eventData });
};

export const deleteCalendarEvent = async (calendarId: string, eventId: string): Promise<{success: boolean}> => {
    return callApi('DELETE_CALENDAR_EVENT', { calendarId, eventId });
};


export const addRoutineTaskToCalendar = async (task: Omit<RoutineTask, 'id' | 'isCustom'>, calendarId: string): Promise<{success: boolean}> => {
    return callApi('ADD_ROUTINE_TASK', { ...task, calendarId });
}

export const generateWhatsAppMessage = async (campaignName: string, prompt: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const fullPrompt = `
          Crie uma mensagem de WhatsApp curta, amigável e profissional para uma campanha de marketing chamada "${campaignName}".
          O objetivo da campanha é: "${prompt}".
          A mensagem deve ser otimizada para conversão e incluir uma chamada para ação clara. Não inclua saudações como "Olá," ou despedidas, apenas o corpo da mensagem.
          Use emojis de forma moderada e relevante.
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: fullPrompt
        });
        
        const text = response.text;
        if (text) {
          return text.trim();
        }
        throw new Error('A IA não retornou uma mensagem.');

    } catch (error) {
        console.error("Erro ao gerar mensagem com IA:", error);
        throw new Error("Não foi possível gerar a mensagem. Verifique a chave de API e tente novamente.");
    }
};


export const sendHumanMessage = async (id: string, message: string): Promise<any> => {
    return callApi('SEND_HUMAN_MESSAGE', { phone: id, message });
};

export const getConversations = async (): Promise<RawChatMessage[]> => {
    return callApi('GET_CONVERSATIONS');
};

export const setAttendanceMode = async (phone: string, mode: 'BOT' | 'HUMANO'): Promise<void> => {
    await callApi('SET_ATTENDANCE_MODE', { phone, mode });
}

// --- CRM API ---
export const getCrmLeads = async (): Promise<WhatsAppLead[]> => {
    return callApi('GET_CRM_LEADS');
}

export const updateCrmStage = async (id: string, newStage: string): Promise<any> => {
    // Backend expects a key named 'phone' but it should contain the full ID
    return callApi('UPDATE_CRM_STAGE', { phone: id, newStage });
}


// --- Settings API ---
export const getSettings = async (): Promise<Settings> => {
    return callApi('GET_SETTINGS');
};

export const updateSettings = async (settings: Settings): Promise<{success: boolean}> => {
    return callApi('UPDATE_SETTINGS', settings);
};

// --- Routine Tasks API ---
export const getRoutineTasks = async (): Promise<{ customTasks: RoutineTask[], archivedDefaultTaskIds: string[] }> => {
    return callApi('GET_ROUTINE_TASKS');
};

export const updateRoutineTasks = async (tasksData: { customTasks: RoutineTask[], archivedDefaultTaskIds: string[] }): Promise<{success: boolean}> => {
    return callApi('UPDATE_ROUTINE_TASKS', tasksData);
};


// --- Financial API ---
export const getTransactions = async (): Promise<FinancialTransaction[]> => {
    const result = await callApi('GET_TRANSACTIONS');
    return result.map((t: any) => ({ ...t, amount: Number(t.amount) || 0 }));
};

export const addTransaction = async (transaction: Omit<FinancialTransaction, 'id'>): Promise<FinancialTransaction> => {
    return callApi('ADD_TRANSACTION', transaction);
};

// --- Diagnostics API ---
export const getWebhookLogs = async (): Promise<WebhookLogEntry[]> => {
    return callApi('GET_WEBHOOK_LOGS');
};
