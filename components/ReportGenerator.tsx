import React, { useState } from 'react';
import { TrackedLink } from '../types';

interface ReportGeneratorProps {
  links: TrackedLink[];
  onGenerateReport: (startDate: string, endDate: string, linkId: string) => void;
  isLoading: boolean;
  error: string | null;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({ links, onGenerateReport, isLoading, error }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filter, setFilter] = useState('all');

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const setDateRange = (days: number | 'today') => {
    const end = new Date();
    let start = new Date();

    if (days === 'today') {
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(end.getDate() - (days -1));
      start.setHours(0, 0, 0, 0);
    }
    
    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
  };

  const handleSubmit = () => {
    if (!startDate || !endDate) {
      alert('Por favor, selecione a data de início e de fim.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      alert('A data de início não pode ser posterior à data de fim.');
      return;
    }
    onGenerateReport(startDate, endDate, filter);
  };
  
  const shortcuts = [
      { label: "Hoje", days: 'today' as 'today' },
      { label: "7 dias", days: 7 },
      { label: "15 dias", days: 15 },
      { label: "30 dias", days: 30 },
  ];

  return (
    <div className="p-6 bg-blue-900/20 rounded-lg border border-blue-700 shadow-lg backdrop-blur-sm space-y-6 mb-12">
      <h3 className="text-xl font-semibold text-slate-200">Relatório de Cliques por Período</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-3">
          <label htmlFor="client-filter" className="block text-sm font-medium text-slate-300 mb-1">Filtrar por Cliente</label>
          <select
            id="client-filter"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
          >
            <option value="all">Todos os Clientes (Geral)</option>
            {links.map(link => (
              <option key={link.id} value={link.id}>{link.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="start-date" className="block text-sm font-medium text-slate-300 mb-1">Data de Início</label>
           <div className="relative">
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
              style={{ colorScheme: 'dark' }}
            />
             <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
          </div>
        </div>
        
        <div>
          <label htmlFor="end-date" className="block text-sm font-medium text-slate-300 mb-1">Data de Fim</label>
           <div className="relative">
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
              style={{ colorScheme: 'dark' }}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
          </div>
        </div>

        <div className="flex items-end">
          <button onClick={handleSubmit} disabled={isLoading} className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-2 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? 'Gerando...' : 'Gerar Relatório'}
          </button>
        </div>
      </div>
        <div className="flex flex-wrap gap-2 pt-2 border-t border-blue-800/50">
            <span className="text-sm text-slate-400 self-center mr-2">Atalhos:</span>
            {shortcuts.map(s => (
                <button key={s.label} onClick={() => setDateRange(s.days)} className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-full transition-colors">
                    {s.label}
                </button>
            ))}
        </div>

      {error && <p className="text-red-400 mt-2">{error}</p>}
    </div>
  );
};