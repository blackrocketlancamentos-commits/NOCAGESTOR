
import React, { useState } from 'react';
import { Settings, ChatConversation, WhatsAppLead } from '../types';
import { CrmView } from './NocaWhatsApp/CrmView';
import { DisparosView } from './NocaWhatsApp/DisparosView';
import { ChatView } from './NocaWhatsApp/ChatView';

interface NocaWhatsAppPanelProps {
  settings: Settings;
  conversations: ChatConversation[];
  onSendMessage: (id: string, message: string) => Promise<void>;
  isLoading: boolean;
  googleScriptUrl: string;
  onSetAttendanceMode: (phone: string, mode: 'BOT' | 'HUMANO') => void;
  crmLeads: WhatsAppLead[];
  onUpdateCrmStage: (id: string, newStage: string) => void;
}

type ActiveView = 'conversas' | 'crm' | 'disparos';

export const NocaWhatsAppPanel: React.FC<NocaWhatsAppPanelProps> = ({ settings, conversations, onSendMessage, isLoading, googleScriptUrl, onSetAttendanceMode, crmLeads, onUpdateCrmStage }) => {
  const [activeView, setActiveView] = useState<ActiveView>('conversas');

  const baseButtonClass = "px-4 py-2 text-sm font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900";
  const activeButtonClass = "bg-green-600 text-white shadow-md";
  const inactiveButtonClass = "bg-slate-800 text-slate-300 hover:bg-slate-700";

  return (
    <div className="p-6 bg-green-900/20 rounded-lg border border-green-700 shadow-lg backdrop-blur-sm">
        <div className="mb-6 flex items-center gap-2 border-b border-green-800/50 pb-4">
            <button onClick={() => setActiveView('conversas')} className={`${baseButtonClass} ${activeView === 'conversas' ? activeButtonClass : inactiveButtonClass}`}>Conversas</button>
            <button onClick={() => setActiveView('crm')} className={`${baseButtonClass} ${activeView === 'crm' ? activeButtonClass : inactiveButtonClass}`}>Visão CRM</button>
            <button onClick={() => setActiveView('disparos')} className={`${baseButtonClass} ${activeView === 'disparos' ? activeButtonClass : inactiveButtonClass}`}>Disparos</button>
        </div>
        
        {activeView === 'conversas' && <ChatView conversations={conversations} onSendMessage={onSendMessage} isLoading={isLoading} googleScriptUrl={googleScriptUrl} onSetAttendanceMode={onSetAttendanceMode} />}
        {activeView === 'crm' && <CrmView leads={crmLeads} onUpdateStage={onUpdateCrmStage} />}
        {activeView === 'disparos' && <DisparosView contacts={crmLeads} settings={settings} />}
    </div>
  );
};
