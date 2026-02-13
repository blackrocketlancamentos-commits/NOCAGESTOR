
import React, { useState } from 'react';
import { WhatsAppLead, Settings } from '../../types';
import * as api from '../../services/api';

interface DisparosViewProps {
  contacts: WhatsAppLead[];
  settings: Settings;
}

export const DisparosView: React.FC<DisparosViewProps> = ({ contacts, settings }) => {
    const [selectedContacts, setSelectedContacts] = useState<WhatsAppLead[]>([]);
    const [campaignName, setCampaignName] = useState('');
    const [campaignTags, setCampaignTags] = useState('');
    const [message, setMessage] = useState('');
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [sendDelay, setSendDelay] = useState(5); // Delay em segundos
    const [isSending, setIsSending] = useState(false);
    const [sendStatus, setSendStatus] = useState({ sent: 0, failed: 0, total: 0, progress: 0 });
    const [failedMessages, setFailedMessages] = useState<string[]>([]);

    const availableContacts: WhatsAppLead[] = contacts.filter(c => c.phone);

    const handleToggleContact = (contact: WhatsAppLead) => {
        setSelectedContacts(prev => 
            prev.some(c => c.id === contact.id)
                ? prev.filter(c => c.id !== contact.id)
                : [...prev, contact]
        );
    };

    const handleGenerateMessage = async () => {
        if (!aiPrompt.trim()) {
            alert("Por favor, descreva o objetivo da mensagem.");
            return;
        }
        setIsGenerating(true);
        try {
            const generatedMsg = await api.generateWhatsAppMessage(campaignName || "Nossa Campanha", aiPrompt);
            setMessage(generatedMsg);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Ocorreu um erro desconhecido.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleSend = async () => {
        if (selectedContacts.length === 0 || !message.trim()) {
            return alert("Selecione pelo menos um contato e escreva uma mensagem.");
        }
        if (!settings.zapiInstanceId || !settings.zapiToken) {
            return alert("Credenciais da Z-API não configuradas. Por favor, adicione-as no painel de Configurações.");
        }

        setIsSending(true);
        setFailedMessages([]);
        setSendStatus({ sent: 0, failed: 0, total: selectedContacts.length, progress: 0 });

        for (let i = 0; i < selectedContacts.length; i++) {
            const contact = selectedContacts[i];
            try {
                // In Z-API, 'phone' parameter must be the full ID for sending.
                // The `contact.id` from CRM leads holds the full ID (`...c.us`), while `contact.phone` holds the normalized number.
                await api.sendHumanMessage(contact.id, message);
                setSendStatus(prev => ({ ...prev, sent: prev.sent + 1 }));
            } catch (error) {
                console.error(`Falha ao enviar para ${contact.name}:`, error);
                setSendStatus(prev => ({ ...prev, failed: prev.failed + 1 }));
                setFailedMessages(prev => [...prev, `${contact.name} (${contact.phone})`]);
            }
            
            setSendStatus(prev => ({ ...prev, progress: ((i + 1) / prev.total) * 100 }));
            
            // Pausa entre as mensagens, exceto na última
            if (i < selectedContacts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, sendDelay * 1000));
            }
        }

        setTimeout(() => {
            alert(`Disparo da campanha "${campaignName}" concluído!`);
            setIsSending(false);
        }, 500);
    };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna de Configuração */}
        <div className="space-y-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <div>
                <h3 className="font-semibold text-slate-200 mb-2">1. Selecionar Contatos</h3>
                <div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-slate-800 rounded-md">
                   {availableContacts.map(contact => (
                        <div key={contact.id} className="flex items-center gap-2 p-2 bg-slate-900/70 rounded">
                            <input
                                type="checkbox"
                                id={`contact-${contact.id}`}
                                checked={selectedContacts.some(c => c.id === contact.id)}
                                onChange={() => handleToggleContact(contact)}
                                className="h-4 w-4 rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500"
                            />
                            <label htmlFor={`contact-${contact.id}`} className="text-sm text-slate-300 flex-1">{contact.name}</label>
                        </div>
                   ))}
                </div>
            </div>
             <div>
                <h3 className="font-semibold text-slate-200 mb-2">2. Detalhes da Campanha</h3>
                <div className="space-y-3">
                    <input type="text" placeholder="Nome da Campanha (Ex: Promoção de Inverno)" value={campaignName} onChange={e => setCampaignName(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-green-400"/>
                    <input type="text" placeholder="Tags (separadas por vírgula)" value={campaignTags} onChange={e => setCampaignTags(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-green-400"/>
                </div>
            </div>
            <div>
                <h3 className="font-semibold text-slate-200 mb-2">3. Criar Mensagem</h3>
                 <div className="space-y-3 p-3 bg-slate-800 rounded-md border border-slate-600">
                    <textarea placeholder="Objetivo da mensagem (para IA)" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={2}
                        className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-green-400"
                    />
                    <button onClick={handleGenerateMessage} disabled={isGenerating} className="w-full text-sm px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait">
                        {isGenerating ? 'Gerando...' : '✨ Gerar com IA'}
                    </button>
                    <textarea placeholder="Sua mensagem aparecerá aqui..." value={message} onChange={e => setMessage(e.target.value)} rows={5}
                        className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-green-400"
                    />
                </div>
            </div>
             <div>
                <h3 className="font-semibold text-slate-200 mb-2">4. Configurar Disparo</h3>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                    Atraso entre mensagens:
                    <input type="number" min="1" value={sendDelay} onChange={e => setSendDelay(Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-slate-800 border border-slate-600 rounded-md"/>
                    segundos
                </label>
                 <p className="text-xs text-slate-500 mt-1">Um atraso maior ajuda a evitar bloqueios no WhatsApp.</p>
            </div>
        </div>

        {/* Coluna de Pré-visualização e Envio */}
        <div className="space-y-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700 flex flex-col">
            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-700 pb-2">Revisão e Envio</h3>
            <div className="flex-grow space-y-4">
                <div>
                    <p className="text-sm font-semibold text-slate-400">Contatos Selecionados ({selectedContacts.length})</p>
                    <div className="text-xs text-slate-300 mt-1 max-h-40 overflow-y-auto p-2 bg-slate-800 rounded-md">
                        {selectedContacts.length > 0 ? selectedContacts.map(c => c.name).join(', ') : <span className="text-slate-500 italic">Nenhum contato selecionado.</span>}
                    </div>
                </div>
                <div>
                    <p className="text-sm font-semibold text-slate-400">Mensagem</p>
                    <div className="text-sm text-slate-200 mt-1 whitespace-pre-wrap p-3 bg-slate-800 rounded-md min-h-[100px]">
                       {message || <span className="text-slate-500 italic">Sua mensagem aparecerá aqui.</span>}
                    </div>
                </div>
            </div>
            
            {isSending && (
                <div className="space-y-2">
                    <p className="text-sm text-center text-yellow-400">Enviando campanha...</p>
                    <div className="w-full bg-slate-700 rounded-full h-2.5">
                        <div className="bg-green-600 h-2.5 rounded-full" style={{width: `${sendStatus.progress}%`}}></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>{sendStatus.sent + sendStatus.failed} de {sendStatus.total}</span>
                        <div>
                            <span className="text-green-400">Sucesso: {sendStatus.sent}</span>
                            <span className="mx-2">|</span>
                            <span className="text-red-400">Falhas: {sendStatus.failed}</span>
                        </div>
                    </div>
                     {failedMessages.length > 0 && (
                        <div className="mt-2">
                            <p className="text-xs text-red-400">Falha ao enviar para:</p>
                            <ul className="text-xs text-slate-400 list-disc list-inside max-h-20 overflow-y-auto">
                                {failedMessages.map(fm => <li key={fm}>{fm}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <button onClick={handleSend} disabled={isSending} className="w-full mt-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                {isSending ? 'Enviando...' : `Iniciar Disparo para ${selectedContacts.length} Contato(s)`}
            </button>
        </div>
    </div>
  );
};
