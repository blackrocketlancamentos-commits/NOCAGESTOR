
import React, { useState, useEffect, useCallback } from 'react';
import { TrackedLink, ReportData } from '../types.ts';
import * as api from '../services/api.ts';
import { parsePackageValue } from '../utils.ts';
import { CrmDashboard } from './CrmDashboard.tsx';


interface DashboardProps {
  links: TrackedLink[];
}

const getDaysUntilExpiry = (endDate?: string): number | null => {
    if (!endDate) return null;
    const end = new Date(`${endDate}T00:00:00`);
    if (isNaN(end.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
};

const parsePackageName = (packageInfo?: string): string => {
    if (!packageInfo) return 'Não Informado';
    if (packageInfo.toLowerCase().includes('personalizado')) return 'Personalizado';
    const match = packageInfo.match(/^([^:]+)/);
    return match ? match[1].trim() : 'Outro';
};


const StatCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700 flex flex-col ${className}`}>
        <h3 className="text-sm font-medium text-slate-400 mb-2">{title}</h3>
        <div className="flex-grow flex flex-col justify-center">{children}</div>
    </div>
);

const formatDate = (date: Date) => date.toISOString().split('T')[0];

export const Dashboard: React.FC<DashboardProps> = ({ links }) => {
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isLoadingClicks, setIsLoadingClicks] = useState(true);
    const [clicksError, setClicksError] = useState<string | null>(null);
    const [startDate, setStartDate] = useState(formatDate(new Date()));
    const [endDate, setEndDate] = useState(formatDate(new Date()));


    const fetchClicks = useCallback(async () => {
        if (!startDate || !endDate) return;
        setIsLoadingClicks(true);
        setClicksError(null);
        try {
            const report = await api.getReport(startDate, endDate, 'all');
            setReportData(report);
        } catch (error) {
            console.error("Failed to fetch dashboard clicks report:", error);
            setReportData(null);
            setClicksError("Failed to fetch");
        } finally {
            setIsLoadingClicks(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchClicks();
    }, [fetchClicks]);

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

    const activeLinks = links.filter(link => !link.isArchived);

    const contractsToExpire = {
        todayOrTomorrow: activeLinks.filter(l => { const d = getDaysUntilExpiry(l.endDate); return d !== null && d >= 0 && d < 2; }).length,
        sevenDays: activeLinks.filter(l => { const d = getDaysUntilExpiry(l.endDate); return d !== null && d >= 2 && d <= 7; }).length,
        fifteenDays: activeLinks.filter(l => { const d = getDaysUntilExpiry(l.endDate); return d !== null && d > 7 && d <= 15; }).length,
    };
    
    const packageCounts = activeLinks.reduce((acc, link) => {
        const name = parsePackageName(link.packageInfo);
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const totalValue = activeLinks.reduce((sum, link) => {
        return sum + parsePackageValue(link.packageInfo);
    }, 0);

    const shortcuts = [
      { label: "Hoje", days: 'today' as 'today' },
      { label: "7 dias", days: 7 },
      { label: "15 dias", days: 15 },
      { label: "30 dias", days: 30 },
    ];
    
    const renderClicksContent = () => {
        if (isLoadingClicks) {
            return <div className="animate-pulse h-10 bg-slate-700 rounded w-3/4 mx-auto"></div>;
        }
        if (clicksError) {
            return (
                <div className="text-center">
                    <p className="text-sm text-yellow-400 font-semibold">Falha ao carregar</p>
                    <button onClick={fetchClicks} className="mt-2 text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md">
                        Tentar Novamente
                    </button>
                </div>
            )
        }
        return (
            <>
                <p className="text-4xl font-bold text-sky-400">{reportData?.totalClicks ?? 0}</p>
                <p className="text-[10px] text-slate-500 mt-1">Filtro de tempo aplicado</p>
            </>
        )
    }

    return (
        <>
            <div className="p-6 bg-blue-900/20 rounded-lg border border-blue-700 shadow-lg backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                     <h2 className="text-2xl font-bold text-slate-100">Dashboard de Performance</h2>
                    <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    
                    <StatCard title="Clientes Ativos">
                        <p className="text-4xl font-bold text-green-400">{activeLinks.length}</p>
                    </StatCard>
                    <StatCard title="Cliques no Período">
                       <div className="text-center">
                           {renderClicksContent()}
                       </div>
                    </StatCard>

                    <StatCard title="Contratos a Vencer">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-300">Hoje/Amanhã</span>
                                <span className="font-bold text-lg text-orange-400 bg-orange-500/20 px-2.5 py-0.5 rounded-full">{contractsToExpire.todayOrTomorrow}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-300">Próximos 7 dias</span>
                                <span className="font-bold text-lg text-yellow-400 bg-yellow-500/20 px-2.5 py-0.5 rounded-full">{contractsToExpire.sevenDays}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-300">Próximos 15 dias</span>
                                <span className="font-bold text-lg text-sky-400 bg-sky-500/20 px-2.5 py-0.5 rounded-full">{contractsToExpire.fifteenDays}</span>
                            </div>
                        </div>
                    </StatCard>

                    <StatCard title="Pacotes Ativos">
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-2">
                            {Object.entries(packageCounts).length > 0 ? Object.entries(packageCounts).map(([name, count]) => (
                                <div key={name} className="flex justify-between items-center text-sm">
                                    <span className="text-slate-300 truncate pr-2" title={name}>{name}</span>
                                    <span className="font-semibold text-blue-300">{count}</span>
                                </div>
                            )) : <p className="text-sm text-slate-500">Nenhum pacote ativo.</p>}
                        </div>
                    </StatCard>

                    <StatCard title="Valor Acumulado (Ativos)">
                        <p className="text-4xl font-bold text-teal-400">
                            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </StatCard>
                </div>
            </div>
            <div className="mt-8">
                <CrmDashboard />
            </div>
        </>
    );
};