
import React, { useState } from 'react';

interface ClientInfo {
  name: string;
  phone?: string;
}

interface WhatsAppLinkFormProps {
  onUseLink: (url: string) => void;
  clients: ClientInfo[];
}

const MAX_MESSAGE_LENGTH = 1500; // A reasonable limit to suggest.

export const WhatsAppLinkForm: React.FC<WhatsAppLinkFormProps> = ({ onUseLink, clients }) => {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('Olá, vim pelo Instagram e quero mais informações sobre os serviços.');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState('');

  const formatPhoneNumber = (cleaned: string) => {
    let formatted = cleaned;
    if (cleaned.length > 2) {
        formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2)}`;
    }
    if (cleaned.length > 7) {
        formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    }
    return formatted;
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhone(formatPhoneNumber(cleaned));
  };
  
  const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientName = e.target.value;
    setSelectedClientName(clientName);
    if (clientName) {
        const selectedClient = clients.find(c => c.name === clientName);
        if (selectedClient && selectedClient.phone) {
             const cleaned = selectedClient.phone.replace(/\D/g, '').slice(0, 11);
             setPhone(formatPhoneNumber(cleaned));
        } else {
            setPhone('');
        }
    } else {
        setPhone('');
    }
  }


  const handleGenerate = () => {
    if (!phone.trim()) {
      alert('Por favor, insira um número de telefone.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
     if (cleanPhone.length < 10) {
      alert('Número de telefone inválido. Por favor, inclua o DDD.');
      return;
    }
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/55${cleanPhone}?text=${encodedMessage}`; // Adicionado 55 por padrão
    setGeneratedUrl(url);
  };

  const handleCopy = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleUseLink = () => {
      if (!generatedUrl) {
          alert("Primeiro, gere um link para poder usá-lo.");
          return;
      }
      onUseLink(generatedUrl);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">Crie um link de WhatsApp com uma mensagem personalizada para usar em seus anúncios ou na bio.</p>
      
      <div className="space-y-4">
        <div>
            <label htmlFor="wa-client-select" className="block text-sm font-medium text-slate-300 mb-1">Selecionar Cliente (Opcional)</label>
            <select
                id="wa-client-select"
                value={selectedClientName}
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
          <label htmlFor="wa-phone" className="block text-sm font-medium text-slate-300 mb-1">Número de Telefone (com DDD)</label>
          <input
            id="wa-phone"
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="(XX) XXXXX-XXXX"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
          />
           <p className="text-xs text-slate-500 mt-1">O código do país (55 - Brasil) será adicionado automaticamente.</p>
        </div>
        <div>
          <label htmlFor="wa-message" className="block text-sm font-medium text-slate-300 mb-1">Mensagem Padrão</label>
          <textarea
            id="wa-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
          />
           <div className="text-right text-xs text-slate-500 mt-1">
            {message.length} / {MAX_MESSAGE_LENGTH} caracteres
          </div>
        </div>
        <button 
          onClick={handleGenerate}
          className="w-full md:w-auto bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-2 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all duration-300 shadow-lg"
        >
          Gerar Link
        </button>
      </div>

      {generatedUrl && (
        <div className="pt-4 border-t border-blue-800/50 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1" htmlFor="wa-generated-link">
              Seu link gerado:
            </label>
            <div className="flex items-center gap-2">
                <input
                    id="wa-generated-link"
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
           <button 
            onClick={handleUseLink}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 transition-all duration-300 shadow-lg transform hover:scale-105"
          >
            ⬇️ Usar este Link no Cadastro de Contrato
          </button>
        </div>
      )}
    </div>
  );
};
