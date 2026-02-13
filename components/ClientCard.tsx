
import React, { useState } from 'react';
import { Client, TrackedLink, WorkMaterial, ClientType } from '../types';
import { getStatus, parsePackageValue } from '../utils';
import { GOOGLE_SCRIPT_URL } from '../config';

interface ClientCardProps {
  client: Client;
  onArchive: (id: string, isArchived: boolean) => void;
  onDeleteContract: (id: string) => void;
  onUpdateDates: (id: string, startDate: string, endDate: string) => void;
  onUpdateContactInfo: (id: string, phone: string, instagram: string, email: string, cpf: string, cnpj: string, companyName: string) => void;
  onUpdatePackageInfo: (id: string, packageInfo: string) => void;
  onRenew: (link: TrackedLink) => void;
  pendingActions: {[key: string]: string | null};
}

const StatusTag: React.FC<{endDate?: string}> = ({ endDate }) => {
    const status = getStatus(endDate);
    if (!status) return null;
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.color} ${status.textColor}`}>{status.text}</span>;
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
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeStyles[type] || typeStyles.Contato}`}>
            {type}
        </span>
    );
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/D';
  const date = new Date(`${dateString}T00:00:00`);
  if (isNaN(date.getTime())) { return 'N/D'; }
  return date.toLocaleDateString('pt-BR');
};

export const ClientCard: React.FC<ClientCardProps> = ({ client, onArchive, onDeleteContract, onUpdateDates, onUpdateContactInfo, onUpdatePackageInfo, onRenew, pendingActions }) => {
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
