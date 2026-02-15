
import React from 'react';
import { ReportData } from '../types';

interface ReportModalProps {
  reportData: ReportData;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ reportData, onClose }) => {
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-blue-700 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-5 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Relatório de Cliques</h2>
            <p className="text-sm font-semibold text-blue-300">
              Filtro: {reportData.filterName || 'Geral'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Período: {formatDate(reportData.startDate)} a {formatDate(reportData.endDate)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="p-6 flex-grow overflow-y-auto">
            <div className="text-center bg-blue-900/30 p-6 rounded-lg mb-6">
                <p className="text-lg text-slate-300">Total de Cliques no Período</p>
                <p className="text-6xl font-bold text-green-400">{reportData.totalClicks}</p>
            </div>

            {reportData.links.length > 0 ? (
                <div className="space-y-3">
                    {reportData.links.map(link => (
                        <div key={link.id} className="flex justify-between items-center bg-slate-800/50 p-4 rounded-lg">
                            <span className="font-semibold text-slate-200">{link.name}</span>
                            <span className="text-lg font-bold text-blue-300 bg-blue-500/20 px-3 py-1 rounded-full">{link.clicksInPeriod}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10">
                    <p className="text-slate-400">Nenhum clique foi registrado neste período.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
