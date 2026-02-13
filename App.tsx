
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as api from './services/api';
import { TrackedLink, Client, ReportData, WorkMaterial, AgendaItem, FinancialTransaction, Settings, RawChatMessage, ChatConversation, LinkStatus, RoutineTask, ClientType, WhatsAppLead, TaskCompletions } from './types';
import { GOOGLE_SCRIPT_URL } from './config';
import { DiagnosticTool } from './components/DiagnosticTool';
import { NewContractForm } from './components/NewContractForm';
import { ReportModal } from './components/ReportModal';
import { InfoModal } from './components/InfoModal';
import { Dashboard } from './components/Dashboard';
import { ClientListRow } from './components/ClientListRow';
import { ClientCard } from './components/ClientCard';
import { ReportGenerator } from './components/ReportGenerator';
import { WhatsAppLinkForm } from './components/WhatsAppLinkForm';
import { SimpleTrackerForm } from './components/SimpleTrackerForm';
import { AgendaPanel } from './components/AgendaPanel';
import { RoutineChecklist } from './components/RoutineChecklist';
import { ErpPanel } from './components/ErpPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { NocaWhatsAppPanel } from './components/NocaWhatsAppPanel';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useDailyResetLocalStorage } from './hooks/useDailyResetLocalStorage';
import { getStatus, parsePackageValue, processRawMessagesIntoConversations } from './utils';
import { TabNavigation, Tab } from './components/TabNavigation';
import { FeedbackToast } from './components/FeedbackToast';


const App: React.FC = () => {
    const [links, setLinks] = useState<TrackedLink[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSetupRequired, setIsSetupRequired] = useState(false);
    const [pendingActions, setPendingActions] = useState<{[key: string]: string | null}>({});
    
    const [viewMode, setViewMode] = useLocalStorage<'list' | 'grid'>('viewMode', 'list');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | LinkStatus>('all');
    const [showArchived, setShowArchived] = useState(false);

    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isReportLoading, setIsReportLoading] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [infoModalContent, setInfoModalContent] = useState<{ title: string; link: string } | null>(null);

    const [renewalData, setRenewalData] = useState<Partial<TrackedLink> | null>(null);
    const [prefilledUrl, setPrefilledUrl] = useState<string>('');
    const [formKey, setFormKey] = useState(Date.now());
    
    const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
    const [isAgendaSyncing, setIsAgendaSyncing] = useState(false);
    const [agendaError, setAgendaError] = useState<string | null>(null);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Partial<AgendaItem> | null>(null);


    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [settings, setSettings] = useState<Settings>({});
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [isConversationsLoading, setIsConversationsLoading] = useState(false);
    const [routineTasks, setRoutineTasks] = useLocalStorage<RoutineTask[]>('routineTasks', []);
    const [taskCompletions, setTaskCompletions] = useDailyResetLocalStorage<TaskCompletions>('taskCompletions', {});

    const [crmLeads, setCrmLeads] = useState<WhatsAppLead[]>([]);
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [activeTab, setActiveTab] = useState<Tab>('gestao');


    const fetchAllData = useCallback(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [linksData, transactionsData, conversationsData, settingsData, crmLeadsData] = await Promise.all([
            api.getLinks(),
            api.getTransactions(),
            api.getConversations(),
            api.getSettings(),
            api.getCrmLeads()
        ]);

        setLinks(linksData);
        setTransactions(transactionsData);
        setSettings(settingsData);
        setCrmLeads(crmLeadsData);
        
        setConversations(processRawMessagesIntoConversations(conversationsData, linksData, crmLeadsData));

      } catch (e: any) {
        setError(`Falha ao carregar os dados da sua planilha. Verifique se as abas e colunas estão nomeadas corretamente. Detalhes: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    }, []);

    useEffect(() => {
        const initializeApp = async () => {
            setIsLoading(true);
            setError(null);

            if (GOOGLE_SCRIPT_URL === "") {
                setIsSetupRequired(true);
                setIsLoading(false);
                return;
            }

            try {
                // Primeiro, testa a conexão com um simples PING.
                await api.ping();
                
                // Se o PING for bem-sucedido, a conexão está boa.
                setIsSetupRequired(false);
                // Agora, busca todos os dados.
                await fetchAllData();
            } catch (e: any) {
                // QUALQUER erro durante o teste de conexão inicial significa um problema de configuração.
                console.error("Falha no teste de conexão inicial:", e);
                setIsSetupRequired(true);
                setIsLoading(false); // Para o carregamento para mostrar a ferramenta de diagnóstico.
            }
        };

        initializeApp();
    }, [fetchAllData]);

    const handleAction = async <T,>(id: string, actionType: string, apiCall: () => Promise<T>, updateState: (data: T) => void) => {
        setPendingActions(prev => ({...prev, [id]: actionType}));
        try {
            const result = await apiCall();
            updateState(result);
        } catch (e: any) {
            setFeedback({ message: `Erro ao ${actionType}: ${e.message}`, type: 'error' });
        } finally {
            setPendingActions(prev => ({...prev, [id]: null}));
        }
    };
    
    const handleAddLink = (name: string, companyName: string, url: string, workMaterial: WorkMaterial | null, startDate: string, endDate: string, phone: string, instagram: string, email: string, packageInfo: string, clientType: ClientType, cpf: string, cnpj: string) => {
        const isExistingClient = clients.some(c => c.name.toLowerCase() === name.trim().toLowerCase());
        
        const newLinkData: any = { 
            name, companyName, url, clicks: 0, createdAt: new Date().toISOString(),
            id: `temp-${Date.now()}`, 
            workMaterialUrls: workMaterial ? [workMaterial] : [],
            startDate, endDate, phone, instagram, email, packageInfo, clientType, cpf, cnpj
        };
        handleAction(newLinkData.id, 'adicionar', () => api.addLink(newLinkData, settings.googleCalendarId),
          (newLink) => {
              setLinks(prev => [...prev.filter(l => l.id !== newLinkData.id), newLink]);
              setTransactions(prev => [...prev, {
                id: `trans-${newLink.id}`, date: new Date().toISOString(), description: `Venda Contrato - ${newLink.name}`,
                type: 'receita', amount: parsePackageValue(newLink.packageInfo),
              }]);
              
              const cleanPhone = String(phone || '').replace(/\D/g, '');
              const whatsappId = cleanPhone ? `${cleanPhone}@c.us` : `local-${Date.now()}`;
              const clientTypeToStageMap: Record<ClientType, string> = { 'Cliente': 'active', 'Parceiro': 'active', 'Lead': 'negotiation', 'Contato': 'new' };
              const newLead: WhatsAppLead = { id: whatsappId, phone: cleanPhone, name, stage: clientTypeToStageMap[clientType] || 'new' };
              
              setCrmLeads(prev => [...prev.filter(l => String(l.phone || '').replace(/\D/g, '') !== cleanPhone), newLead]);

              setFormKey(Date.now());
              setRenewalData(null);
              
              if (isExistingClient) {
                  setFeedback({ message: `Novo pacote adicionado para ${name}!`, type: 'success' });
              } else {
                  setFeedback({ message: `Novo cliente ${name} cadastrado com sucesso!`, type: 'success' });
              }
          }
        );
    };

    const handleUpdateDates = (id: string, startDate: string, endDate: string) => {
        handleAction(id, 'atualizar datas', () => api.updateDates(id, startDate, endDate),
            () => setLinks(prev => prev.map(l => l.id === id ? { ...l, startDate, endDate } : l)));
    };

    const handleUpdateContactInfo = (id: string, phone: string, instagram: string, email: string, cpf: string, cnpj: string, companyName: string) => {
        handleAction(id, 'atualizar contato', () => api.updateContactInfo(id, phone, instagram, email, cpf, cnpj, companyName),
            () => setLinks(prev => prev.map(l => l.id === id ? { ...l, phone, instagram, email, cpf, cnpj, companyName } : l)));
    };

    const handleUpdatePackageInfo = (id: string, packageInfo: string) => {
        handleAction(id, 'atualizar pacote', () => api.updatePackageInfo(id, packageInfo),
            () => setLinks(prev => prev.map(l => l.id === id ? { ...l, packageInfo } : l)));
    };
    
    const handleArchive = (id: string, isArchived: boolean) => {
        handleAction(id, 'arquivar', () => api.archiveLink(id, isArchived),
            () => setLinks(prev => prev.map(l => l.id === id ? { ...l, isArchived } : l)));
    };

    const handleDeleteContract = (id: string) => {
        handleAction(id, 'deletar', () => api.deleteContract(id),
            () => {
                setLinks(prev => prev.filter(l => l.id !== id));
                setTransactions(prev => prev.filter(t => t.id !== `trans-${id}` && t.relatedContractId !== id));
                setFeedback({ message: "Contrato deletado com sucesso.", type: 'success' });
            }
        );
    };

    const handleGenerateReport = async (startDate: string, endDate: string, linkId: string) => {
      setIsReportLoading(true);
      setReportError(null);
      try {
        const selectedLinkName = links.find(l => l.id === linkId)?.name;
        const data = await api.getReport(startDate, endDate, linkId);
        setReportData({ ...data, filterName: linkId === 'all' ? 'Todos' : selectedLinkName || 'Desconhecido' });
      } catch (error) {
        setReportError('Falha ao gerar o relatório. Tente novamente.');
      } finally {
        setIsReportLoading(false);
      }
    };
    
    const handleRenew = (link: TrackedLink) => {
        setRenewalData(link);
        setActiveTab('gestao');
        setTimeout(() => {
            const addForm = document.getElementById('add-link-form');
            addForm?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }
    
    const handleUseWhatsAppLink = (url: string) => {
        setPrefilledUrl(url);
        setActiveTab('gestao');
        setTimeout(() => {
            const addForm = document.getElementById('add-link-form');
            addForm?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }
    
     const handleUseSimpleTracker = (name: string, url: string) => {
        setPrefilledUrl(url);
        setRenewalData({ name });
        setActiveTab('gestao');
        setTimeout(() => {
            const addForm = document.getElementById('add-link-form');
            addForm?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    const handleSyncAgenda = useCallback(async (startDate: string, endDate: string) => {
        if (!settings.googleCalendarId) {
            setAgendaError("ID da Google Agenda não configurado.");
            return;
        }
        setIsAgendaSyncing(true);
        setAgendaError(null);
        try {
            const events = await api.getCalendarEvents(settings.googleCalendarId, startDate, endDate);
            setAgendaItems(events);
        } catch (e: any) {
            setAgendaError(`Erro ao sincronizar: ${e.message}`);
        } finally {
            setIsAgendaSyncing(false);
        }
    }, [settings.googleCalendarId]);
    
    const handleSaveEvent = async (eventData: Omit<AgendaItem, 'id'> | AgendaItem) => {
        if (!settings.googleCalendarId) {
            setFeedback({ message: "ID da Google Agenda não configurado.", type: "error"});
            return;
        }
        try {
            if ('id' in eventData) { // Update
                await api.updateCalendarEvent(settings.googleCalendarId, eventData);
                setAgendaItems(prev => prev.map(e => e.id === eventData.id ? eventData : e));
                setFeedback({ message: "Evento atualizado com sucesso!", type: "success"});
            } else { // Create
                const newEvent = await api.createCalendarEvent(settings.googleCalendarId, eventData);
                setAgendaItems(prev => [...prev, newEvent]);
                setFeedback({ message: "Evento criado com sucesso!", type: "success"});
            }
            setIsEventModalOpen(false);
            setSelectedEvent(null);
        } catch(e: any) {
            setFeedback({ message: `Erro ao salvar evento: ${e.message}`, type: "error"});
        }
    };
    
    const handleDeleteEvent = async (eventId: string) => {
        if (!settings.googleCalendarId) return;
        if (!window.confirm("Tem certeza que deseja excluir este evento?")) return;

        try {
            await api.deleteCalendarEvent(settings.googleCalendarId, eventId);
            setAgendaItems(prev => prev.filter(e => e.id !== eventId));
            setFeedback({ message: "Evento excluído com sucesso!", type: "success"});
            setIsEventModalOpen(false);
            setSelectedEvent(null);
        } catch(e: any) {
             setFeedback({ message: `Erro ao excluir evento: ${e.message}`, type: "error"});
        }
    };
    
    const handleSendMessage = async (id: string, message: string) => {
       if (!settings.zapiInstanceId || !settings.zapiToken) {
            setFeedback({ message: "Configure as credenciais da Z-API nas Configurações.", type: 'error' });
            return;
        }
        try {
             await api.sendHumanMessage(id, message);
             const conversationsData = await api.getConversations();
             setConversations(processRawMessagesIntoConversations(conversationsData, links, crmLeads));
        } catch(e: any) {
             setFeedback({ message: `Erro ao enviar mensagem: ${e.message}`, type: 'error' });
        }
    };

     const handleSetAttendanceMode = async (phone: string, mode: 'BOT' | 'HUMANO') => {
        try {
            await api.setAttendanceMode(phone, mode);
            setConversations(prev => prev.map(c => c.id === phone ? { ...c, attendanceMode: mode } : c));
        } catch (e: any) {
            setFeedback({ message: `Erro ao mudar modo de atendimento: ${e.message}`, type: 'error' });
        }
    };
    
    const handleUpdateCrmStage = async (id: string, newStage: string) => {
        setCrmLeads(prev => prev.map(lead => lead.id === id ? { ...lead, stage: newStage } : lead));
        try {
            await api.updateCrmStage(id, newStage);
        } catch (e: any) {
            setFeedback({ message: `Erro ao atualizar fase do lead: ${e.message}`, type: 'error' });
            const crmLeadsData = await api.getCrmLeads();
            setCrmLeads(crmLeadsData);
        }
    };

    const handleSaveSettings = async (newSettings: Settings) => {
        try {
            await api.updateSettings(newSettings);
            setSettings(newSettings);
            setFeedback({ message: "Configurações salvas com sucesso!", type: 'success' });
        } catch (e: any) {
            setFeedback({ message: `Erro ao salvar configurações: ${e.message}`, type: 'error' });
            throw e; 
        }
    };

    const handleSaveRoutineTasks = (newTasks: RoutineTask[]) => {
      setRoutineTasks(newTasks);
      setFeedback({ message: 'Rotinas salvas com sucesso!', type: 'success' });
    };

    const handleToggleTaskCompletion = (taskId: string) => {
      const task = routineTasks.find(t => t.id === taskId);
      if (!task) return;

      setTaskCompletions(prev => {
        const completions = prev[taskId] || [];
        if (completions.length >= task.repetitions) {
          // Task is fully complete, so un-complete it
          const { [taskId]: _, ...rest } = prev;
          return rest;
        } else {
          // Task is not fully complete, add a completion
          return {
            ...prev,
            [taskId]: [...completions, Date.now()]
          };
        }
      });
    };

    const clients = useMemo(() => {
        const clientMap: {[key: string]: Client} = {};
        links.forEach(link => {
            if (!clientMap[link.name]) {
                clientMap[link.name] = { name: link.name, contracts: [], companyName: link.companyName, phone: link.phone, instagram: link.instagram, email: link.email, cpf: link.cpf, cnpj: link.cnpj };
            }
            clientMap[link.name].contracts.push(link);
        });
        return Object.values(clientMap).map(client => {
            client.contracts.sort((a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime());
            const latestContract = client.contracts[0];
            if (latestContract) {
                client.phone = latestContract.phone;
                client.instagram = latestContract.instagram;
                client.email = latestContract.email;
                client.clientType = latestContract.clientType;
                client.companyName = latestContract.companyName;
                client.cpf = latestContract.cpf;
                client.cnpj = latestContract.cnpj;
            }
            return client;
        });
    }, [links]);
    
    const filteredClients = useMemo(() => {
        return clients.filter(client => {
            const hasActiveContracts = client.contracts.some(c => !c.isArchived);
            const hasArchivedContracts = client.contracts.some(c => c.isArchived);

            if (!showArchived && !hasActiveContracts) return false;
            if (showArchived && !hasArchivedContracts && !hasActiveContracts) return false;

            const searchMatch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) || (client.companyName && client.companyName.toLowerCase().includes(searchTerm.toLowerCase()));
            
            if (filterStatus === 'all') return searchMatch;

            return client.contracts.some(c => {
                const status = getStatus(c.endDate);
                return status && status.text === filterStatus;
            }) && searchMatch;
        });
    }, [clients, searchTerm, filterStatus, showArchived]);
    
    const clientInfoForForms = useMemo(() => clients.map(c => ({ name: c.name, companyName: c.companyName, phone: c.phone, instagram: c.instagram, email: c.email, cpf: c.cpf, cnpj: c.cnpj })), [clients]);


    if (isLoading) return <div className="flex h-screen items-center justify-center"><div className="text-white">Carregando Gestor...</div></div>;
    if (isSetupRequired) return <DiagnosticTool />;
    if (error) return (
        <div className="flex h-screen items-center justify-center p-4">
            <div className="text-center bg-red-900/50 p-8 rounded-lg border border-red-700 max-w-lg">
                <h2 className="text-2xl font-bold text-red-300">Ocorreu um Erro</h2>
                <p className="mt-2 text-red-200">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md">
                    Recarregar a Página
                </button>
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'gestao':
                return (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-6">
                                <h2 className="text-2xl font-bold text-white">Ferramentas de Link</h2>
                                 <div className="p-6 bg-slate-800/50 rounded-lg border border-slate-700 shadow-lg">
                                    <h3 className="text-lg font-bold text-slate-100 mb-3">Link Rápido de WhatsApp</h3>
                                    <WhatsAppLinkForm onUseLink={handleUseWhatsAppLink} clients={clientInfoForForms} />
                                 </div>
                                 <div className="p-6 bg-slate-800/50 rounded-lg border border-slate-700 shadow-lg">
                                     <h3 className="text-lg font-bold text-slate-100 mb-3">Link de Rastreio Customizado</h3>
                                    <SimpleTrackerForm onUseForContract={handleUseSimpleTracker} clients={clientInfoForForms} onTrackerCreated={fetchAllData} />
                                 </div>
                            </div>
                            <div className="lg:col-span-2 space-y-6">
                                <h2 className="text-2xl font-bold text-white">Cadastro de Cliente / Contrato</h2>
                                <div className="p-6 bg-slate-800/50 rounded-lg border border-slate-700 shadow-lg">
                                   <NewContractForm key={formKey} onAddLink={handleAddLink} clients={clientInfoForForms} renewalData={renewalData} prefilledUrl={prefilledUrl} />
                                </div>
                            </div>
                        </div>

                        <section>
                            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                                <h2 className="text-3xl font-bold text-white">Clientes e Contratos</h2>
                                <div className="flex items-center gap-4">
                                    <input type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 w-full md:w-auto"/>
                                    <div className="p-1 bg-slate-800 rounded-md">
                                        <button onClick={() => setViewMode('grid')} className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-blue-600' : ''}`}>Grid</button>
                                        <button onClick={() => setViewMode('list')} className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-blue-600' : ''}`}>Lista</button>
                                    </div>
                                </div>
                            </div>

                            {filteredClients.length === 0 ? (
                                <div className="text-center py-16 px-6 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                                    <h3 className="text-xl font-semibold text-slate-300">Nenhum cliente encontrado</h3>
                                    <p className="mt-2 text-slate-400">Use o formulário acima ou ajuste seus filtros.</p>
                                </div>
                            ) : (
                                viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredClients.map(client => (
                                            <ClientCard key={client.name} client={client} onArchive={handleArchive} onDeleteContract={handleDeleteContract} onUpdateDates={handleUpdateDates} onUpdateContactInfo={handleUpdateContactInfo} onUpdatePackageInfo={handleUpdatePackageInfo} onRenew={handleRenew} pendingActions={pendingActions} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="hidden md:flex items-center text-xs font-semibold text-slate-400 p-3">
                                            <div className="md:w-[4%]"></div>
                                            <div className="md:w-[26%] pl-2">Cliente</div>
                                            <div className="md:w-[12%] text-center">Tipo</div>
                                            <div className="md:w-[12%] text-center">Plano</div>
                                            <div className="md:w-[10%] text-center">Contratos</div>
                                            <div className="md:w-[10%] text-center">Cliques Totais</div>
                                            <div className="md:w-[26%] text-center">Ações</div>
                                        </div>
                                        {filteredClients.map(client => (
                                            <ClientListRow key={client.name} client={client} onArchive={handleArchive} onDeleteContract={handleDeleteContract} onRenew={handleRenew} isPending={client.contracts.some(c => !!pendingActions[c.id])} onUpdateDates={handleUpdateDates} onUpdateContactInfo={handleUpdateContactInfo} onUpdatePackageInfo={handleUpdatePackageInfo} />
                                        ))}
                                    </div>
                                )
                            )}
                        </section>
                    </>
                );
            case 'dashboard':
                return <Dashboard links={links} />;
            case 'whatsapp':
                return <NocaWhatsAppPanel 
                        settings={settings}
                        conversations={conversations}
                        onSendMessage={handleSendMessage}
                        isLoading={isConversationsLoading}
                        googleScriptUrl={GOOGLE_SCRIPT_URL}
                        onSetAttendanceMode={handleSetAttendanceMode}
                        crmLeads={crmLeads}
                        onUpdateCrmStage={handleUpdateCrmStage}
                    />;
            case 'agenda':
                return <AgendaPanel 
                        isActive={activeTab === 'agenda'}
                        items={agendaItems}
                        onSync={handleSyncAgenda}
                        isSyncing={isAgendaSyncing}
                        syncError={agendaError}
                        isConfigured={!!settings.googleCalendarId}
                        onSaveEvent={handleSaveEvent}
                        onDeleteEvent={handleDeleteEvent}
                        eventModalState={{
                            isOpen: isEventModalOpen,
                            event: selectedEvent,
                            setIsOpen: setIsEventModalOpen,
                            setEvent: setSelectedEvent
                        }}
                    />;
            case 'rotinas':
                return <RoutineChecklist
                        tasks={routineTasks}
                        completions={taskCompletions}
                        onSave={handleSaveRoutineTasks}
                        onToggleCompletion={handleToggleTaskCompletion}
                    />;
            case 'financeiro':
                 return <ErpPanel
                        transactions={transactions}
                        onTransactionAdded={fetchAllData}
                    />;
            case 'relatorios':
                return <ReportGenerator links={links} onGenerateReport={handleGenerateReport} isLoading={isReportLoading} error={reportError} />;
            case 'configuracoes':
                 return <SettingsPanel
                        settings={settings}
                        onSettingsChange={handleSaveSettings}
                    />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 sm:p-8">
            {feedback && <FeedbackToast message={feedback.message} type={feedback.type} onClose={() => setFeedback(null)} />}
            <main className="max-w-7xl mx-auto space-y-8">
                <header className="text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                        <span className="text-blue-400">NOCA</span> Gestor
                    </h1>
                </header>
                
                <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
                
                <div className="mt-6 space-y-8">
                    {renderContent()}
                </div>

            </main>
            {reportData && <ReportModal reportData={reportData} onClose={() => setReportData(null)} />}
            {infoModalContent && <InfoModal content={infoModalContent} onClose={() => setInfoModalContent(null)} />}
        </div>
    );
};

export default App;
