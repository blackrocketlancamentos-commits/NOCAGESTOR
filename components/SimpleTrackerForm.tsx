
import React, { useState } from 'react';
import * as api from '../services/api';

interface ClientInfo {
  name: string;
}

interface SimpleTrackerFormProps {
  onUseForContract: (name: string, url: string) => void;
  onTrackerCreated: () => void;
  clients: ClientInfo[];
}

export const SimpleTrackerForm: React.FC<SimpleTrackerFormProps> = ({ onUseForContract, onTrackerCreated, clients }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleAction = async () => {
    if (!name.trim() || !url.trim()) {
      alert('Por favor, preencha o nome e a URL de destino.');
      return;
    }
    try {
      new URL(url);
    } catch (_) {
      alert("Por favor, insira uma URL válida.");
      return;
    }

    if (selectedClient) {
        // Ação para cliente existente: preencher formulário principal
        onUseForContract(name, url);
    } else {
        // Ação para novo link (campanha): criar link e mostrar no modal
        setIsLoading(true);
        try {
            const result = await api.createSimpleTracker(name, url);
            const fullUrl = `${window.location.origin.replace(/\/$/, '')}${window.location.pathname.replace(/\/$/, '')}?id=${result.id}`;
            setGeneratedUrl(fullUrl);
            onTrackerCreated(); // Refresh data in parent
            // Resetar campos após sucesso
            setName('');
            setUrl('');
            setSelectedClient('');
        } catch (e: any) {
            alert(`Erro ao criar link rastreável: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    }
  };

  const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientName = e.target.value;
    setSelectedClient(clientName);
    setName(clientName); // Preenche o nome do cliente no campo de identificação
    setGeneratedUrl(''); // Limpa o link gerado se mudar a seleção
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
      if (selectedClient) {
          setSelectedClient(''); // Desseleciona se o nome for alterado manualmente
      }
      setGeneratedUrl(''); // Limpa o link gerado se mudar o nome
  }
  
  const handleCopy = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">Crie um link para qualquer URL de destino. Use para rastrear campanhas ou para iniciar um novo contrato.</p>
      
      <div className="space-y-4">
        <div>
            <label htmlFor="st-client-select" className="block text-sm font-medium text-slate-300 mb-1">Selecionar Cliente Existente (Opcional)</label>
            <select
                id="st-client-select"
                value={selectedClient}
                onChange={handleClientSelect}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
            >
                <option value="">Nenhum (Digitar Manualmente)</option>
                {clients.map(client => (
                    <option key={client.name} value={client.name}>{client.name}</option>
                ))}
            </select>
        </div>
        <div>
          <label htmlFor="st-name" className="block text-sm font-medium text-slate-300 mb-1">Nome / Identificação do Link</label>
          <input
            id="st-name"
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="Ex: Campanha Dia das Mães, Bio do Instagram"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
          />
        </div>
        <div>
          <label htmlFor="st-url" className="block text-sm font-medium text-slate-300 mb-1">URL de Destino</label>
          <input
            id="st-url"
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setGeneratedUrl(''); }}
            placeholder="https://seusite.com/produto"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
          />
        </div>
        
        {generatedUrl && !selectedClient && (
          <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300" htmlFor="generated-tracker-link">
                Link Rastreável
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="generated-tracker-link"
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="w-full flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md text-slate-200 text-sm"
                />
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors"
                >
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
        )}

        <button 
          onClick={handleAction}
          disabled={isLoading}
          className="w-full flex items-center justify-center bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 transition-all duration-300 shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait"
        >
            {isLoading ? 'Gerando...' : (
                selectedClient ? (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        Usar para Contrato de Cliente
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        Gerar Link Rastreável
                    </>
                )
            )}
        </button>
      </div>
    </div>
  );
};
