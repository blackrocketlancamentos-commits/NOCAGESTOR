
import React, { useState, useEffect, useRef } from 'react';
import { TrackedLink, WorkMaterial, ClientType } from '../types';

interface ClientInfo {
  name: string;
  companyName?: string;
  phone?: string;
  instagram?: string;
  email?: string;
  cpf?: string;
  cnpj?: string;
}

interface NewContractFormProps {
  onAddLink: (name: string, companyName: string, url: string, workMaterial: WorkMaterial | null, startDate: string, endDate: string, phone: string, instagram: string, email: string, packageInfo: string, clientType: ClientType, cpf: string, cnpj: string) => void;
  clients: ClientInfo[];
  renewalData?: Partial<TrackedLink> | null;
  prefilledUrl?: string;
}

const packageOptions = {
    "pacote_1": "Básico: 1 Feed, 4 Stories/mês (R$160)",
    "pacote_2": "Intermediário: 2 Feeds, 8 Stories/mês (R$190)",
    "pacote_3": "Premium: 2 Feeds, Stories Diários (R$497)",
    "personalizado": "Personalizado"
}

export const NewContractForm: React.FC<NewContractFormProps> = ({ onAddLink, clients, renewalData, prefilledUrl }) => {
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
  const [foundClientByPhone, setFoundClientByPhone] = useState<ClientInfo | null>(null);

  const [clientType, setClientType] = useState<ClientType>('Cliente');
  const [selectedPackage, setSelectedPackage] = useState<keyof typeof packageOptions>("pacote_1");
  const [customPackageInfo, setCustomPackageInfo] = useState('');

  const getFutureDate = (startDateStr: string, days: number): string => {
    const date = new Date(`${startDateStr}T00:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(getFutureDate(today, 30));

  const resetContractFields = () => {
    setUrl('');
    setWorkMaterialUrl('');
    setStartDate(today);
    setEndDate(getFutureDate(today, 30));
    setSelectedPackage('pacote_1');
    setCustomPackageInfo('');
    setClientType('Cliente');
  };
  
  const clearForm = () => {
    setName('');
    setCompanyName('');
    setPhone('');
    setInstagram('');
    setEmail('');
    setCpf('');
    setCnpj('');
    setSelectedClient('');
    setFoundClientByPhone(null);
    resetContractFields();
  };
  
  const populateFormWithClient = (clientData: ClientInfo) => {
      setName(clientData.name);
      setCompanyName(clientData.companyName || '');
      setPhone(clientData.phone || '');
      setInstagram(clientData.instagram || '');
      setEmail(clientData.email || '');
      setCpf(clientData.cpf || '');
      setCnpj(clientData.cnpj || '');
      setSelectedClient(clientData.name);
  };


  useEffect(() => {
    if (prefilledUrl) {
      setUrl(prefilledUrl);
      nameInputRef.current?.focus();
    }
  }, [prefilledUrl]);

 useEffect(() => {
    if (renewalData && renewalData.name) {
      const clientData = clients.find(c => c.name === renewalData.name);
      if (clientData) {
        populateFormWithClient(clientData);
      }
      resetContractFields();
    }
  }, [renewalData, clients]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setIsSuggestionsVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [suggestionsRef]);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    setEndDate(getFutureDate(newStartDate, 30));
  };

  const handleNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    setSelectedClient(''); 
    setFoundClientByPhone(null);

    const existingNames = clients.map(c => c.name);
    if (value.trim().length > 0) {
      const filteredSuggestions = existingNames.filter(
        n => n.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filteredSuggestions);
      setIsSuggestionsVisible(filteredSuggestions.length > 0);
    } else {
      setSuggestions([]);
      setIsSuggestionsVisible(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    const clientData = clients.find(c => c.name === suggestion);
    if (clientData) {
        populateFormWithClient(clientData);
    }
    setSuggestions([]);
    setIsSuggestionsVisible(false);
  };
  
  const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientName = e.target.value;
    if (clientName) {
        const clientData = clients.find(c => c.name === clientName);
        if (clientData) {
            populateFormWithClient(clientData);
        }
        resetContractFields();
    } else {
        clearForm();
        nameInputRef.current?.focus();
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhone = e.target.value;
    setPhone(newPhone);

    const cleanedPhone = newPhone.replace(/\D/g, '');
    if (cleanedPhone.length >= 10) { // Check after having at least DDD + some numbers
      const existingClient = clients.find(c => c.phone && String(c.phone).replace(/\D/g, '') === cleanedPhone);
      if (existingClient) {
        setFoundClientByPhone(existingClient);
        populateFormWithClient(existingClient);
      } else {
        setFoundClientByPhone(null);
      }
    } else {
      setFoundClientByPhone(null);
    }
  };

  const setEndDateShortcut = (days: number) => {
    setEndDate(getFutureDate(startDate, days));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("O Nome do Cliente é obrigatório.");
      return;
    }

    const workMaterial: WorkMaterial | null = workMaterialUrl.trim()
      ? { url: workMaterialUrl.trim(), type: workMaterialType }
      : null;

    const packageInfo = clientType === 'Parceiro' ? 'Permuta' : (selectedPackage === 'personalizado' ? customPackageInfo : packageOptions[selectedPackage]);

    onAddLink(name, companyName, url, workMaterial, startDate, endDate, phone, instagram, email, packageInfo, clientType, cpf, cnpj);
    
    clearForm();
  };

  const hasExistingContracts = clients.some(client => client.name.toLowerCase() === name.trim().toLowerCase() && !foundClientByPhone);

  return (
    <form id="add-link-form" onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
          <div>
            <label htmlFor="client-select" className="block text-sm font-medium text-slate-300 mb-1">Selecionar Cliente Existente (Opcional)</label>
            <select
                id="client-select"
                value={selectedClient}
                onChange={handleClientSelect}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
            >
                <option value="">Nenhum (Cadastrar Novo)</option>
                {clients.map(client => (
                    <option key={client.name} value={client.name}>{client.name}</option>
                ))}
            </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div ref={suggestionsRef} className="relative">
            <label htmlFor="link-name" className="block text-sm font-medium text-slate-300 mb-1">Nome do Contato</label>
            <input
              id="link-name"
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={handleNameInputChange}
              onFocus={handleNameInputChange}
              placeholder="Digite o nome ou selecione"
              className={`w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors ${foundClientByPhone ? 'bg-slate-700 cursor-not-allowed' : ''}`}
              autoComplete="off"
              disabled={!!foundClientByPhone}
            />
            {isSuggestionsVisible && suggestions.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <li key={index} onClick={() => handleSuggestionClick(suggestion)} className="px-4 py-2 text-sm text-slate-200 cursor-pointer hover:bg-blue-600">{suggestion}</li>
                ))}
              </ul>
            )}
            {hasExistingContracts && (
              <p className="text-amber-400 text-xs mt-1">
                Já existe um contato com este nome. Ao salvar, um novo contrato será criado para ele.
              </p>
            )}
          </div>
           <div className="md:col-span-1">
                <label htmlFor="company-name" className="block text-sm font-medium text-slate-300 mb-1">Nome da Empresa (Opcional)</label>
                <input
                  id="company-name"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Empresa Exemplo Ltda."
                  className={`w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors ${foundClientByPhone ? 'bg-slate-700 cursor-not-allowed' : ''}`}
                  disabled={!!foundClientByPhone}
                />
            </div>
          <div>
              <label htmlFor="client-type" className="block text-sm font-medium text-slate-300 mb-1">Tipo de Contato</label>
              <select id="client-type" value={clientType} onChange={(e) => setClientType(e.target.value as ClientType)}
                  className={`w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors ${foundClientByPhone ? 'bg-slate-700 cursor-not-allowed' : ''}`}
                  disabled={!!foundClientByPhone}
                >
                  <option value="Cliente">Cliente</option>
                  <option value="Lead">Lead</option>
                  <option value="Contato">Contato</option>
                  <option value="Parceiro">Parceiro</option>
              </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="link-phone" className="block text-sm font-medium text-slate-300 mb-1">Telefone (Opcional)</label>
            <input id="link-phone" type="tel" value={phone} onChange={handlePhoneChange} placeholder="+55 (11) 99999-8888"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"/>
             {foundClientByPhone ? (
                <p className="text-amber-400 text-xs mt-1">Este telefone já pertence a <strong>{foundClientByPhone.name}</strong>. Um novo contrato será adicionado a este cliente.</p>
             ) : (
                <p className="text-xs text-slate-400 mt-1">Para links WhatsApp, inclua o código do país (DDI), ex: 55119....</p>
             )}
          </div>
          <div>
            <label htmlFor="link-instagram" className="block text-sm font-medium text-slate-300 mb-1">Instagram (Opcional)</label>
            <input id="link-instagram" type="text" value={instagram} onChange={(e) => setInstagram(e.target.value.replace(/@/g, ''))} placeholder="usuario"
              className={`w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors ${foundClientByPhone ? 'bg-slate-700 cursor-not-allowed' : ''}`}
              disabled={!!foundClientByPhone}
            />
             <p className="text-xs text-slate-400 mt-1">Insira apenas o nome de usuário, sem o "@".</p>
          </div>
        </div>
        <div>
            <label htmlFor="link-email" className="block text-sm font-medium text-slate-300 mb-1">E-mail (Opcional)</label>
            <input id="link-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com"
              className={`w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors ${foundClientByPhone ? 'bg-slate-700 cursor-not-allowed' : ''}`}
              disabled={!!foundClientByPhone}
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="link-cpf" className="block text-sm font-medium text-slate-300 mb-1">CPF (Opcional)</label>
                <input id="link-cpf" type="text" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00"
                    className={`w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors ${foundClientByPhone ? 'bg-slate-700 cursor-not-allowed' : ''}`}
                    disabled={!!foundClientByPhone}
                />
            </div>
            <div>
                <label htmlFor="link-cnpj" className="block text-sm font-medium text-slate-300 mb-1">CNPJ (Opcional)</label>
                <input id="link-cnpj" type="text" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00"
                    className={`w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors ${foundClientByPhone ? 'bg-slate-700 cursor-not-allowed' : ''}`}
                    disabled={!!foundClientByPhone}
                />
            </div>
        </div>

        <div>
          <label htmlFor="link-url" className="block text-sm font-medium text-slate-300 mb-1">URL de Destino (Opcional)</label>
          <input id="link-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://wa.me/..."
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
          />
        </div>
        
        {clientType !== 'Parceiro' && (
          <div className="pt-4 border-t border-blue-800/50 space-y-4">
            <p className="text-lg font-medium text-slate-300">Detalhes do Contrato</p>
            <div>
              <label htmlFor="package-info" className="block text-sm font-medium text-slate-300 mb-1">Pacote do Cliente</label>
              <select id="package-info" value={selectedPackage} onChange={(e) => setSelectedPackage(e.target.value as keyof typeof packageOptions)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors">
                  {Object.entries(packageOptions).map(([key, value]) => ( <option key={key} value={key}>{value}</option>))}
              </select>
            </div>
            
            {selectedPackage === 'personalizado' && (
               <div>
                  <label htmlFor="custom-package-info" className="block text-sm font-medium text-slate-300 mb-1">Descreva o Pacote Personalizado</label>
                  <input id="custom-package-info" type="text" value={customPackageInfo} onChange={(e) => setCustomPackageInfo(e.target.value)}
                      placeholder="Ex: 3 feeds/semana, 10 stories/mês (R$300)" className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"/>
               </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="start-date" className="block text-xs text-slate-400 mb-1">Data de Início</label>
                    <input id="start-date" type="date" value={startDate} onChange={handleStartDateChange}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors" style={{ colorScheme: 'dark' }}/>
                </div>
                <div>
                    <label htmlFor="end-date" className="block text-xs text-slate-400 mb-1">Data de Vencimento</label>
                    <input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors" style={{ colorScheme: 'dark' }}/>
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                <span className="text-sm text-slate-400 self-center mr-2">Definir vencimento:</span>
                {[7, 15, 30].map(days => (
                    <button key={days} type="button" onClick={() => setEndDateShortcut(days)} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-full transition-colors">
                        +{days} dias
                    </button>
                ))}
            </div>
          </div>
        )}
        
        <div className="pt-4 border-t border-blue-800/50">
          <label htmlFor="work-material-url" className="block text-sm font-medium text-slate-300 mb-1">1º Material de Trabalho (Opcional)</label>
           <div className="flex flex-col sm:flex-row gap-2">
              <input id="work-material-url" type="url" value={workMaterialUrl} onChange={(e) => setWorkMaterialUrl(e.target.value)}
                placeholder="Cole aqui o link do post, vídeo, etc." className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"/>
              <select value={workMaterialType} onChange={(e) => setWorkMaterialType(e.target.value as WorkMaterial['type'])}
                className="w-full sm:w-auto px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors">
                <option value="instagram">Instagram</option>
                <option value="drive">Google Drive</option>
                <option value="other">Outro</option>
              </select>
           </div>
        </div>
      </div>
      <button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-300 shadow-lg transform hover:scale-105">
        {renewalData || foundClientByPhone ? 'Adicionar Novo Contrato' : 'Cadastrar Novo Cliente'}
      </button>
    </form>
  );
};
