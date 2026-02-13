
import React, { useState, useEffect, useMemo } from 'react';
import { AgendaItem } from '../types';
import { CalendarView } from './CalendarView';
import { EventModal } from './EventModal';

interface EventModalState {
    isOpen: boolean;
    event: Partial<AgendaItem> | null;
    setIsOpen: (isOpen: boolean) => void;
    setEvent: (event: Partial<AgendaItem> | null) => void;
}

interface AgendaPanelProps {
  isActive: boolean;
  items: AgendaItem[];
  onSync: (startDate: string, endDate: string) => void;
  isSyncing: boolean;
  syncError: string | null;
  isConfigured: boolean;
  onSaveEvent: (eventData: Omit<AgendaItem, 'id'> | AgendaItem) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
  eventModalState: EventModalState;
}

const getDayRange = (date: Date) => {
    const start = new Date(date);
    const end = new Date(date);
    return { start, end };
};

const getWeekRange = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    start.setDate(diff);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return { start, end };
};

const getMonthRange = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start, end };
};

const getYearRange = (date: Date) => {
    const start = new Date(date.getFullYear(), 0, 1);
    const end = new Date(date.getFullYear(), 11, 31);
    return { start, end };
};


export const AgendaPanel: React.FC<AgendaPanelProps> = ({ isActive, items, onSync, isSyncing, syncError, isConfigured, onSaveEvent, onDeleteEvent, eventModalState }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'day' | 'week' | 'month' | 'year'>('day');

    // Default to 'day' view on mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setView('day');
            } else {
                setView('week');
            }
        };
        handleResize(); // Set initial view
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { startDate, endDate } = useMemo(() => {
        let range;
        switch(view) {
            case 'day':
                range = getDayRange(currentDate);
                break;
            case 'week':
                range = getWeekRange(currentDate);
                break;
            case 'month':
                range = getMonthRange(currentDate);
                break;
            case 'year':
                range = getYearRange(currentDate);
                break;
        }
        return {
            startDate: range.start.toISOString().split('T')[0],
            endDate: range.end.toISOString().split('T')[0]
        };
    }, [currentDate, view]);

    useEffect(() => {
        if (isActive && isConfigured) {
            onSync(startDate, endDate);
        }
    }, [isActive, isConfigured, startDate, endDate, onSync]);
    
    const handleNav = (direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') {
            setCurrentDate(new Date());
            return;
        }

        const newDate = new Date(currentDate);
        const increment = direction === 'next' ? 1 : -1;

        switch(view) {
            case 'day':
                newDate.setDate(newDate.getDate() + increment);
                break;
            case 'week':
                newDate.setDate(newDate.getDate() + (7 * increment));
                break;
            case 'month':
                newDate.setMonth(newDate.getMonth() + increment);
                break;
            case 'year':
                newDate.setFullYear(newDate.getFullYear() + increment);
                break;
        }
        setCurrentDate(newDate);
    };
    
    const handleEventClick = (event: AgendaItem) => {
        eventModalState.setEvent(event);
        eventModalState.setIsOpen(true);
    };
    
    const handleSlotClick = (date: Date) => {
        const end = new Date(date.getTime() + 60 * 60 * 1000); // Default 1 hour duration
        eventModalState.setEvent({
            title: '',
            description: '',
            start: date.toISOString(),
            end: end.toISOString(),
            isAllDay: false
        });
        eventModalState.setIsOpen(true);
    };

    const headerTitle = useMemo(() => {
        switch(view) {
            case 'day':
                return currentDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
            case 'week': {
                const start = new Date(startDate + 'T00:00:00');
                const end = new Date(endDate + 'T00:00:00');
                const startMonth = start.toLocaleString('pt-BR', { month: 'long' });
                const endMonth = end.toLocaleString('pt-BR', { month: 'long' });
                
                if (startMonth === endMonth) {
                    return `${start.getDate()} - ${end.getDate()} de ${endMonth} de ${end.getFullYear()}`;
                }
                return `${start.getDate()} de ${startMonth} - ${end.getDate()} de ${endMonth} de ${end.getFullYear()}`;
            }
            case 'month':
                 return currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
            case 'year':
                return currentDate.getFullYear().toString();
        }
    }, [startDate, endDate, view, currentDate]);

    return (
        <div className="p-4 sm:p-6 bg-blue-900/20 rounded-lg border border-blue-700 shadow-lg backdrop-blur-sm">
            {eventModalState.isOpen && (
                <EventModal 
                    eventData={eventModalState.event} 
                    onClose={() => eventModalState.setIsOpen(false)} 
                    onSave={onSaveEvent}
                    onDelete={onDeleteEvent}
                />
            )}

            {!isConfigured ? (
                <div className="text-center p-4 rounded-lg bg-amber-900/30 border border-amber-700">
                    <p className="text-amber-300">
                       <strong className="font-semibold">Ação Necessária:</strong> Para usar a agenda, por favor, configure o <strong className="font-semibold">ID da sua Google Agenda</strong> no painel de Configurações.
                    </p>
                </div>
            ) : (
            <div>
                <header className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => handleNav('today')} className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-md">Hoje</button>
                        <div className="flex items-center gap-2">
                             <button onClick={() => handleNav('prev')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                             <button onClick={() => handleNav('next')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-100 capitalize">{headerTitle}</h3>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-md">
                        <button onClick={() => setView('day')} className={`px-3 py-1 text-sm rounded ${view === 'day' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Dia</button>
                        <button onClick={() => setView('week')} className={`px-3 py-1 text-sm rounded ${view === 'week' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Semana</button>
                        <button onClick={() => setView('month')} className={`px-3 py-1 text-sm rounded ${view === 'month' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Mês</button>
                        <button onClick={() => setView('year')} className={`px-3 py-1 text-sm rounded ${view === 'year' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Ano</button>
                    </div>
                </header>

                {syncError && <p className="text-center text-red-400 bg-red-900/30 p-3 rounded-md mb-4">{syncError}</p>}
                
                <div className="bg-slate-800/50 p-1 sm:p-2 rounded-lg border border-slate-700">
                     {isSyncing ? (
                        <div className="text-center py-20 text-slate-500">
                            <svg className="animate-spin h-8 w-8 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Carregando eventos...
                        </div>
                    ) : <CalendarView view={view} currentDate={currentDate} events={items} onEventClick={handleEventClick} onSlotClick={handleSlotClick} /> }
                </div>
            </div>
            )}
        </div>
    );
};
