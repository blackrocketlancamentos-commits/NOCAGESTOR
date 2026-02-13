
import React, { useState } from 'react';
import { Client, TrackedLink, ClientType } from '../types';
import { getStatus, parsePackageValue, parseContractType } from '../utils';
import { GOOGLE_SCRIPT_URL } from '../config';

interface ClientListRowProps {
  client: Client;
  onArchive: (id: string, isArchived: boolean) => void;
  onRenew: (link: TrackedLink) => void;
  isPending: boolean;
  onUpdateDates: (id: string, startDate: string, endDate: string) => void;
  onUpdateContactInfo: (id: string, phone: string, instagram: string, email: string, cpf: string, cnpj: string, companyName: string) => void;
  onUpdatePackageInfo: (id: string, packageInfo: string) => void;
  onDeleteContract: (id: string) => void;
}

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

    return (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${typeStyles[type] || typeStyles.Contato}`}>
            {type}
        </span>
    );
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

    return (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${style}`}>
            {plan}
        </span>
    );
};


const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/D';
  const date = new Date(`${dateString}T00:00:00`);
  if (isNaN(date.getTime())) { return 'N/D'; }
  return date.toLocaleDateString('pt-BR');
};

export const ClientListRow: React.FC<ClientListRowProps> = ({ client, onArchive, onRenew, isPending, onUpdateDates, onUpdateContactInfo, onUpdatePackageInfo, onDeleteContract }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [storyCopiedId, setStoryCopiedId] = useState<string | null>(null);

    const totalClicks = client.contracts.reduce((acc, c) => acc + c.clicks, 0);
    const firstWorkMaterialUrl = client.contracts.flatMap(c => c.workMaterialUrls).find(wm => wm.url)?.url;
    
    const latestContract = client.contracts[0];
    const contractType = latestContract ? parseContractType(latestContract.packageInfo) : 'N/A';

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
        <div className={`bg-slate-800/50 rounded-lg transition-colors duration-300 ${isExpanded ? 'bg-slate-700/50' : 'hover:bg-slate-700/50'}`}>
            {isPending && (
                <div className="absolute inset-0 bg-slate-900 bg-opacity-80 flex items-center justify-center rounded-lg z-20">
                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                </div>
            )}
            {/* Main Client Row */}
            <div className="flex flex-wrap md:flex-nowrap md:items-center text-sm w-full p-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="md:w-[4%] text-center text-slate-400">
                     <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mx-auto transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7-7" /></svg>
                </div>
                <div className="w-full md:w-[26%] pl-2 pr-4">
                    <p className="font-bold text-slate-100 truncate" title={client.name}>{client.name}</p>
                    {client.companyName && <p className="text-xs text-slate-400 truncate" title={client.companyName}>{client.companyName}</p>}
                </div>
                <div className="w-1/3 md:w-[12%] text-center my-2 md:my-0">
                    <ClientTypeTag type={client.clientType} />
                </div>
                 <div className="w-1/3 md:w-[12%] text-center my-2 md:my-0">
                    <PlanTag plan={contractType} />
                </div>
                <div className="w-1/3 md:w-[10%] text-center my-2 md:my-0">
                    <span className="font-semibold text-lg text-slate-100 bg-blue-900/50 px-3 py-1 rounded-full">{client.contracts.length}</span>
                </div>
                 <div className="w-1/3 md:w-[10%] text-center font-bold text-lg text-blue-300 my-2 md:my-0">{totalClicks}</div>
                 <div className="w-full md:w-[26%] flex items-center justify-center gap-2 mt-3 md:mt-0 md:ml-auto">
                    <button onClick={(e) => { e.stopPropagation(); onRenew(client.contracts[0]); }} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-semibold transition-colors">Novo Contrato</button>
                </div>
            </div>

            {/* Expanded Contracts List */}
            {isExpanded && (
                <div className="px-4 pb-3 space-y-2">
                    <div className="p-3 my-2 bg-slate-900/40 rounded-md border border-slate-700">
                        <p className="text-sm font-semibold text-slate-300 mb-2">Informações de Contato</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
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
                             <button onClick={(e) => {
                                e.stopPropagation();
                                const linkForContact = client.contracts[0];
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
                                client.contracts.forEach(c => onUpdateContactInfo(c.id, newPhone, newInstagram, newEmail, newCpf, newCnpj, newCompanyName));
                            }} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mt-2" title="Editar Contato">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                                Editar Contatos
                            </button>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center p-2 text-xs font-semibold text-slate-400 border-y border-slate-700">
                        <div className="w-[15%]">ID Contrato</div>
                        <div className="w-[10%] text-center">Status</div>
                        <div className="w-[12%] text-center">Vencimento</div>
                        <div className="w-[10%] text-center">Valor</div>
                        <div className="w-[8%] text-center">Cliques</div>
                        <div className="w-[45%] text-center">Ações</div>
                    </div>
                    {client.contracts.map(contract => (
                         <div key={contract.id} className={`flex flex-wrap items-center p-2 rounded-md hover:bg-slate-900/50 ${contract.isArchived ? 'opacity-50' : ''}`}>
                            <div className="w-full md:w-[15%] font-medium text-blue-300 truncate mb-2 md:mb-0" title={contract.id}>{contract.id.substring(0, 8)}...</div>
                            <div className="w-1/3 md:w-[10%] text-center"><StatusTag endDate={contract.endDate} /></div>
                            <div className="w-1/3 md:w-[12%] text-center text-slate-300">{formatDate(contract.endDate)}</div>
                            <div className="w-1/3 md:w-[10%] text-center font-semibold text-teal-300">{parsePackageValue(contract.packageInfo) > 0 ? `R$ ${parsePackageValue(contract.packageInfo).toFixed(2)}` : 'N/A'}</div>
                            <div className="w-1/3 md:w-[8%] text-center font-bold text-lg text-blue-300">{contract.clicks}</div>
                            <div className="w-full md:w-[45%] flex items-center justify-center gap-2 mt-3 md:mt-0">
                                <button onClick={(e) => handleCopyClick(e, contract)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-colors">
                                    {copiedId === contract.id ? 'Copiado!' : 'Link Rastreio'}
                                </button>
                                {contract.workMaterialUrls && contract.workMaterialUrls.length > 0 && (
                                    <button onClick={(e) => handlePostStoryClick(e, contract)} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-semibold transition-colors">
                                        {storyCopiedId === contract.id ? 'Link Copiado!' : 'Postar Stories'}
                                    </button>
                                )}
                                <button onClick={(e) => handleEditContract(e, contract)} className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-700" title="Editar Contrato">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                                 </button>
                                <button onClick={(e) => {e.stopPropagation(); onRenew(contract)}} className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-700" title="Criar Novo Contrato (Renovação)">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                 </button>
                                <button onClick={(e) => handleArchiveClick(e, contract)} className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-700" title={contract.isArchived ? 'Desarquivar' : 'Arquivar'}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                </button>
                                <button onClick={(e) => handleDeleteClick(e, contract)} className="p-1.5 text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-700" title="Deletar Contrato">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                 </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
