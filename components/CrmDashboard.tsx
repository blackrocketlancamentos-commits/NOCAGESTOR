
import React, { useState } from 'react';
import { CrmData } from '../types';

const StatCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700 flex flex-col ${className}`}>
        <h3 className="text-sm font-medium text-slate-400 mb-2">{title}</h3>
        <div className="flex-grow flex flex-col justify-center">{children}</div>
    </div>
);

const formatDate = (date: Date) => date.toISOString().split('T')[0];

export const CrmDashboard: React.FC = () => {
    // Placeholder para os dados que virão da API no futuro
    const [crmData, setCrmData] = useState<CrmData>({
        conversationsToday: 0,
        newLeads: 0,
        status: {
            attending: 0,
            waiting: 0,
            lost: 0,
            remarketing: 0,
            client: 0,
        }
    });
    const [isLoading, setIsLoading] = useState(false); // Será usado quando a API for integrada

    // Lógica de filtro de data (similar ao Dashboard principal)
    const [startDate, setStartDate] = useState(formatDate(new Date()));
    const [endDate, setEndDate] = useState(formatDate(new Date()));
    
    const setDateRange = (days: number | 'today') => {
        const end = new Date();
        let start = new Date();
        if (days === 'today') {
            start.setHours(0, 0, 0, 0);
        } else {
            start.setDate(end.getDate() - (days - 1));
            start.setHours(0, 0, 0, 0);
        }
        setStartDate(formatDate(start));
        setEndDate(formatDate(end));
    };

    const shortcuts = [
      { label: "Hoje", days: 'today' as 'today' },
      { label: "7 dias", days: 7 },
      { label: "15 dias", days: 15 },
      { label: "30 dias", days: 30 },
    ];

    return (
        <div className="p-6 bg-blue-900/20 rounded-lg border border-blue-700 shadow-lg backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-100">Visão Geral de CRM (Leads)</h2>
                     <p className="text-xs text-amber-400">Dados de demonstração. Integração com Z-API pendente.</p>
                     <p className="text-xs text-sky-400 mt-1">Filtro de tempo afeta todos os indicadores abaixo.</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                    {shortcuts.map(s => (
                        <button key={s.label} onClick={() => setDateRange(s.days)} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-full transition-colors">
                            {s.label}
                        </button>
                    ))}
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-2 py-1 text-xs bg-slate-700 text-slate-200 rounded-md border border-slate-600" style={{ colorScheme: 'dark' }} />
                    <span className="text-slate-400 text-xs">até</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-2 py-1 text-xs bg-slate-700 text-slate-200 rounded-md border border-slate-600" style={{ colorScheme: 'dark' }} />
                </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Conversas Hoje">
                    <p className="text-4xl font-bold text-sky-400">{isLoading ? '...' : crmData.conversationsToday}</p>
                </StatCard>
                <StatCard title="Novos Leads/Contatos">
                    <p className="text-4xl font-bold text-green-400">{isLoading ? '...' : crmData.newLeads}</p>
                </StatCard>
                <StatCard title="Leads Perdidos">
                    <p className="text-4xl font-bold text-red-400">{isLoading ? '...' : crmData.status.lost}</p>
                </StatCard>
                <StatCard title="Viraram Clientes">
                    <p className="text-4xl font-bold text-teal-400">{isLoading ? '...' : crmData.status.client}</p>
                </StatCard>
                <div className="col-span-2 lg:col-span-4 p-5 bg-slate-800/50 rounded-lg border border-slate-700">
                     <h3 className="text-sm font-medium text-slate-400 mb-3">Leads por Status</h3>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="font-bold text-2xl text-yellow-400">{isLoading ? '...' : crmData.status.attending}</p>
                            <p className="text-xs text-slate-300">Atendendo</p>
                        </div>
                         <div>
                            <p className="font-bold text-2xl text-blue-400">{isLoading ? '...' : crmData.status.waiting}</p>
                            <p className="text-xs text-slate-300">Aguardando Resposta</p>
                        </div>
                         <div>
                            <p className="font-bold text-2xl text-purple-400">{isLoading ? '...' : crmData.status.remarketing}</p>
                            <p className="text-xs text-slate-300">Remarketing</p>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};
