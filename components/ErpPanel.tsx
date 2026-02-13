
import React, { useState, useEffect, useMemo } from 'react';
import { FinancialTransaction } from '../types';
import * as api from '../services/api';

interface ErpPanelProps {
  transactions: FinancialTransaction[];
  onTransactionAdded: () => void;
}

const StatCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700 flex flex-col ${className}`}>
        <h3 className="text-sm font-medium text-slate-400 mb-2">{title}</h3>
        <div className="flex-grow flex flex-col justify-center">{children}</div>
    </div>
);

export const ErpPanel: React.FC<ErpPanelProps> = ({ transactions, onTransactionAdded }) => {
    const [isExpenseFormVisible, setIsExpenseFormVisible] = useState(false);
    const [expenseDescription, setExpenseDescription] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');

    const { totalRevenue, totalExpenses, netProfit } = useMemo(() => {
        const totalRevenue = transactions
            .filter(t => t.type === 'receita')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const totalExpenses = transactions
            .filter(t => t.type === 'despesa')
            .reduce((sum, t) => sum + t.amount, 0);

        const netProfit = totalRevenue - totalExpenses;
        return { totalRevenue, totalExpenses, netProfit };
    }, [transactions]);

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseDescription || !expenseAmount) {
            alert("Preencha a descrição e o valor da despesa.");
            return;
        }
        const amount = parseFloat(expenseAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("O valor da despesa deve ser um número positivo.");
            return;
        }

        try {
            await api.addTransaction({
                date: new Date().toISOString(),
                description: expenseDescription,
                type: 'despesa',
                amount: amount,
            });
            onTransactionAdded(); // Callback to refresh data in App.tsx
            setExpenseDescription('');
            setExpenseAmount('');
            setIsExpenseFormVisible(false);
        } catch (error) {
            alert(`Erro ao adicionar despesa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    };

    return (
        <div className="p-6 bg-blue-900/20 rounded-lg border border-blue-700 shadow-lg backdrop-blur-sm space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard title="Receita Total">
                     <p className="text-3xl font-bold text-green-400">
                        R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     </p>
                </StatCard>
                <StatCard title="Despesa Total">
                    <p className="text-3xl font-bold text-red-400">
                        R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </StatCard>
                 <StatCard title="Lucro Líquido">
                    <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-teal-400' : 'text-orange-400'}`}>
                       R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </StatCard>
            </div>

            <div>
                <div className="flex justify-between items-center mb-3">
                     <h3 className="text-lg font-semibold text-slate-200">Extrato de Transações (Livro-Caixa)</h3>
                     <button onClick={() => setIsExpenseFormVisible(!isExpenseFormVisible)} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors">
                        + Lançar Despesa
                     </button>
                </div>

                {isExpenseFormVisible && (
                    <form onSubmit={handleAddExpense} className="p-4 mb-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
                        <h4 className="font-semibold text-slate-300">Nova Despesa</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input type="text" placeholder="Descrição (ex: Ferramenta de E-mail)" value={expenseDescription} onChange={e => setExpenseDescription(e.target.value)}
                                className="md:col-span-2 px-3 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400" />
                            <input type="number" placeholder="Valor (R$)" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)}
                                className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400" />
                        </div>
                        <div className="flex gap-2">
                             <button type="submit" className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md">Salvar</button>
                             <button type="button" onClick={() => setIsExpenseFormVisible(false)} className="px-4 py-2 text-sm bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-md">Cancelar</button>
                        </div>
                    </form>
                )}

                <div className="overflow-x-auto max-h-72">
                     <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-800/60 sticky top-0">
                            <tr>
                                <th scope="col" className="px-4 py-2">Data</th>
                                <th scope="col" className="px-4 py-2">Descrição</th>
                                <th scope="col" className="px-4 py-2 text-center">Tipo</th>
                                <th scope="col" className="px-4 py-2 text-right">Valor (R$)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length > 0 ? [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                                <tr key={t.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                                    <td className="px-4 py-2 text-slate-300">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-4 py-2 font-medium text-slate-100">{t.description}</td>
                                    <td className="px-4 py-2 text-center">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${t.type === 'receita' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{t.type}</span>
                                    </td>
                                    <td className={`px-4 py-2 text-right font-semibold ${t.type === 'receita' ? 'text-green-300' : 'text-red-300'}`}>
                                        {t.type === 'despesa' && '- '}{t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-6 text-slate-500 italic">Nenhuma transação registrada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
