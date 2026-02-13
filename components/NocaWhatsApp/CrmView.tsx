
import React, { useState, useEffect } from 'react';
import { WhatsAppColumn, WhatsAppLead } from '../../types';

interface CrmViewProps {
  leads: WhatsAppLead[];
  onUpdateStage: (id: string, newStage: string) => void;
}

const initialColumns: Omit<WhatsAppColumn, 'leads'>[] = [
  { id: 'new', title: 'Novo Contato' },
  { id: 'negotiation', title: 'Em Negociação' },
  { id: 'payment', title: 'Aguardando Pagamento' },
  { id: 'active', title: 'Cliente Ativo' },
];

const LeadCard: React.FC<{
    lead: WhatsAppLead;
    isDragging: boolean;
    onDragStart: () => void;
}> = ({ lead, isDragging, onDragStart }) => (
    <div 
        draggable
        onDragStart={onDragStart}
        className={`p-3 bg-slate-800 rounded-lg border border-slate-700 shadow-sm cursor-grab hover:bg-slate-700 hover:border-blue-500 transition-colors ${isDragging ? 'opacity-50' : ''}`}
    >
        <div className="flex items-start justify-between">
            <p className="text-sm font-semibold text-slate-200">{lead.name}</p>
            <span className="text-xs text-slate-500">{lead.timestamp || ''}</span>
        </div>
        <p className="text-xs text-slate-400 mt-1 truncate">{lead.lastMessage || lead.phone}</p>
    </div>
);

export const CrmView: React.FC<CrmViewProps> = ({ leads, onUpdateStage }) => {
    const [columns, setColumns] = useState<WhatsAppColumn[]>(initialColumns.map(c => ({...c, leads: []})));
    const [draggingLead, setDraggingLead] = useState<{ leadId: string; sourceColId: string } | null>(null);
    const [dragOverColId, setDragOverColId] = useState<string | null>(null);

    useEffect(() => {
        const leadsByStage: Record<string, WhatsAppLead[]> = {
            new: [], negotiation: [], payment: [], active: [],
        };

        leads.forEach(lead => {
            const stage = lead.stage || 'new';
            if (leadsByStage[stage]) {
                leadsByStage[stage].push(lead);
            } else {
                leadsByStage.new.push(lead); // Fallback for unknown stages
            }
        });
        
        setColumns(prev => prev.map(col => ({
            ...col,
            leads: leadsByStage[col.id] || []
        })));

    }, [leads]);

    const handleDragStart = (leadId: string, sourceColId: string) => {
        setDraggingLead({ leadId, sourceColId });
    };

    const handleDragOver = (e: React.DragEvent, colId: string) => {
        e.preventDefault();
        if (colId !== dragOverColId) {
            setDragOverColId(colId);
        }
    };

    const handleDragLeave = () => {
        setDragOverColId(null);
    };

    const handleDrop = (destColId: string) => {
        if (!draggingLead) return;

        const { leadId, sourceColId } = draggingLead;
        if (sourceColId === destColId) {
            setDraggingLead(null);
            setDragOverColId(null);
            return;
        }

        let leadToMove: WhatsAppLead | undefined;
        const newColumns = columns.map(col => {
            if (col.id === sourceColId) {
                leadToMove = col.leads.find(l => l.id === leadId);
                return { ...col, leads: col.leads.filter(l => l.id !== leadId) };
            }
            return col;
        });

        if (leadToMove) {
            const finalColumns = newColumns.map(col => {
                if (col.id === destColId) {
                    return { ...col, leads: [...col.leads, leadToMove!] };
                }
                return col;
            });
            setColumns(finalColumns); // Optimistic UI update
            onUpdateStage(leadToMove.id, destColId); // Persist change
        }

        setDraggingLead(null);
        setDragOverColId(null);
    };

  return (
    <div>
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-3">
            <h3 className="text-lg font-bold text-slate-100">Funil de Vendas</h3>
            <div className="flex items-center gap-2 w-full md:w-auto">
                 <input type="text" placeholder="Buscar..." className="w-full md:w-auto px-3 py-1.5 text-sm bg-slate-900/50 border border-slate-600 rounded-md focus:ring-2 focus:ring-green-400"/>
                 <button className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-md">Filtrar</button>
            </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 md:overflow-x-auto pb-4">
           {columns.map(column => (
                <div 
                    key={column.id}
                    onDragOver={(e) => handleDragOver(e, column.id)}
                    onDrop={() => handleDrop(column.id)}
                    onDragLeave={handleDragLeave}
                    className={`w-full md:w-72 md:flex-shrink-0 bg-slate-900/50 p-3 rounded-lg border border-slate-700 transition-colors ${dragOverColId === column.id ? 'bg-slate-700/50' : ''}`}
                >
                    <h4 className="font-semibold text-slate-200 mb-3 text-center text-sm tracking-wider">{column.title} <span className="text-slate-500 ml-1">({column.leads.length})</span></h4>
                    <div className="space-y-3 min-h-[300px] md:h-[400px] overflow-y-auto pr-1">
                       {column.leads.map(lead => 
                           <LeadCard 
                               key={lead.id} 
                               lead={lead} 
                               isDragging={draggingLead?.leadId === lead.id}
                               onDragStart={() => handleDragStart(lead.id, column.id)}
                           />
                       )}
                       {dragOverColId === column.id && (
                          <div className="h-24 rounded-lg border-2 border-dashed border-green-500 bg-green-500/10 flex items-center justify-center">
                            <p className="text-sm text-green-400">Solte aqui</p>
                          </div>
                       )}
                    </div>
                </div>
           ))}
        </div>
    </div>
  );
};
