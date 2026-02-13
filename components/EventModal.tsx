
import React, { useState, useEffect } from 'react';
import { AgendaItem } from '../types';

interface EventModalProps {
    eventData: Partial<AgendaItem> | null;
    onClose: () => void;
    onSave: (event: Omit<AgendaItem, 'id'> | AgendaItem) => Promise<void>;
    onDelete: (eventId: string) => Promise<void>;
}

export const EventModal: React.FC<EventModalProps> = ({ eventData, onClose, onSave, onDelete }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (eventData) {
            const start = new Date(eventData.start || new Date());
            const end = new Date(eventData.end || new Date());

            setTitle(eventData.title || '');
            setDescription(eventData.description || '');
            setStartDate(start.toISOString().split('T')[0]);
            setStartTime(start.toTimeString().substring(0, 5));
            setEndDate(end.toISOString().split('T')[0]);
            setEndTime(end.toTimeString().substring(0, 5));
        }
    }, [eventData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) {
            alert('O título é obrigatório.');
            return;
        }

        setIsSaving(true);
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);

        if (startDateTime >= endDateTime) {
            alert('A data/hora de término deve ser posterior à de início.');
            setIsSaving(false);
            return;
        }

        const payload = {
            ...eventData,
            title,
            description,
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
            isAllDay: false,
        };
        
        await onSave(payload as AgendaItem); // Type assertion, as 'id' might be missing for new events
        setIsSaving(false);
    };

    const handleDelete = async () => {
        if (eventData?.id) {
             setIsSaving(true);
             await onDelete(eventData.id);
             setIsSaving(false);
        }
    };

    if (!eventData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 modal-overlay" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-2xl w-full max-w-lg modal-content" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <header className="flex justify-between items-center p-4 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-slate-100">{eventData.id ? 'Editar Evento' : 'Novo Evento'}</h2>
                        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </header>

                    <div className="p-5 space-y-4">
                        <div>
                            <label htmlFor="event-title" className="block text-sm font-medium text-slate-300 mb-1">Título</label>
                            <input type="text" id="event-title" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="event-start-date" className="block text-sm font-medium text-slate-300 mb-1">Início</label>
                                <div className="flex gap-2">
                                     <input type="date" id="event-start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md" style={{ colorScheme: 'dark' }} />
                                     <input type="time" id="event-start-time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md" style={{ colorScheme: 'dark' }} />
                                </div>
                            </div>
                             <div>
                                <label htmlFor="event-end-date" className="block text-sm font-medium text-slate-300 mb-1">Término</label>
                                <div className="flex gap-2">
                                     <input type="date" id="event-end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md" style={{ colorScheme: 'dark' }}/>
                                     <input type="time" id="event-end-time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md" style={{ colorScheme: 'dark' }} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="event-description" className="block text-sm font-medium text-slate-300 mb-1">Descrição</label>
                            <textarea id="event-description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400"></textarea>
                        </div>
                    </div>
                    
                    <footer className="flex justify-between items-center p-4 bg-slate-900/50 rounded-b-lg">
                        <div>
                            {eventData.id && (
                                <button type="button" onClick={handleDelete} disabled={isSaving} className="px-4 py-2 text-sm bg-red-800 hover:bg-red-700 text-white font-semibold rounded-md disabled:opacity-50">
                                    Excluir
                                </button>
                            )}
                        </div>
                         <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-md">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md disabled:opacity-50">
                               {isSaving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </footer>
                </form>
            </div>
        </div>
    );
};
