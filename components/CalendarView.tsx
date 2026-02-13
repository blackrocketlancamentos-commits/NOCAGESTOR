
import React, { useState, useEffect, useRef } from 'react';
import { AgendaItem } from '../types';

interface CalendarViewProps {
  view: 'day' | 'week' | 'month' | 'year';
  currentDate: Date;
  events: AgendaItem[];
  onEventClick: (event: AgendaItem) => void;
  onSlotClick: (date: Date) => void;
}

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOUR_HEIGHT_REM = 3;

const CurrentTimeIndicator: React.FC = () => {
    const [topPosition, setTopPosition] = useState(0);
    const indicatorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updatePosition = () => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const newTop = (hours + minutes / 60) * HOUR_HEIGHT_REM;
            setTopPosition(newTop);
        };

        updatePosition();
        const intervalId = setInterval(updatePosition, 60000); // Update every minute

        return () => clearInterval(intervalId);
    }, []);
    
    // Only render if it's within the viewable hours
    if (topPosition > 24 * HOUR_HEIGHT_REM) return null;

    return (
        <div ref={indicatorRef} className="absolute left-0 right-0 z-20 flex items-center" style={{ top: `${topPosition}rem`}}>
            <div className="w-2 h-2 -ml-1 bg-red-500 rounded-full"></div>
            <div className="h-0.5 flex-grow bg-red-500"></div>
        </div>
    );
};


const DayView: React.FC<{ currentDate: Date; events: AgendaItem[], onEventClick: (event: AgendaItem) => void, onSlotClick: (date: Date) => void }> = ({ currentDate, events, onEventClick, onSlotClick }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = currentDate.toDateString() === today.toDateString();

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = events.filter(e => {
        const eventDate = new Date(e.start);
        return eventDate.toDateString() === currentDate.toDateString();
    });
    
    const handleGridClick = (hour: number, e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const minute = Math.floor((y / rect.height) * 60);
        const clickedDate = new Date(currentDate);
        clickedDate.setHours(hour, minute);
        onSlotClick(clickedDate);
    };

    return (
        <div className="flex flex-col">
            <div className="grid grid-cols-[3rem_1fr] flex-shrink-0">
                <div className="w-12"></div>
                <div className="text-center py-2 border-b border-slate-700">
                    <span className="text-xs text-slate-400">{WEEK_DAYS[currentDate.getDay()]}</span>
                    <span className={`block text-lg font-bold ${isToday ? 'bg-blue-500 text-white rounded-full h-7 w-7 mx-auto flex items-center justify-center' : 'text-slate-200'}`}>{currentDate.getDate()}</span>
                </div>
            </div>
            <div className="grid grid-cols-[3rem_1fr] overflow-y-auto" style={{ height: `${HOUR_HEIGHT_REM * 12}rem`}}>
                <div className="w-12 border-r border-slate-700">
                    {hours.map(h => (
                        <div key={h} className="text-right pr-2 text-xs text-slate-500 -mt-2" style={{height: `${HOUR_HEIGHT_REM}rem`}}>
                           {h > 0 ? `${h}:00` : ''}
                        </div>
                    ))}
                </div>
                <div className="relative">
                    {hours.map(h => <div key={h} onClick={(e) => handleGridClick(h, e)} className="border-b border-slate-700/50" style={{height: `${HOUR_HEIGHT_REM}rem`}}></div>)}
                    {isToday && <CurrentTimeIndicator />}
                    {dayEvents.map(event => {
                        const start = new Date(event.start);
                        const end = new Date(event.end);
                        const top = (start.getHours() + start.getMinutes() / 60) * HOUR_HEIGHT_REM;
                        const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
                        const height = (durationMinutes / 60) * HOUR_HEIGHT_REM;

                        return (
                            <div 
                                key={event.id}
                                onClick={() => onEventClick(event)}
                                className="absolute left-1 right-1 bg-sky-800/80 backdrop-blur-sm text-white p-1.5 rounded-md z-10 border border-sky-600 cursor-pointer hover:bg-sky-700/80"
                                style={{ top: `${top}rem`, height: `${Math.max(height, 1.5)}rem`}}
                                title={`${event.title}\n${event.description}`}
                            >
                                <p className="text-xs font-bold truncate">{event.title}</p>
                                <p className="text-[10px] truncate">{start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit'})}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const MonthView: React.FC<{ currentDate: Date; events: AgendaItem[] }> = ({ currentDate, events }) => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - monthStart.getDay());
    const endDate = new Date(monthEnd);
    endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()));

    const days = [];
    let day = new Date(startDate);

    while (day <= endDate) {
        days.push(new Date(day));
        day.setDate(day.getDate() + 1);
    }

    const today = new Date();
    today.setHours(0,0,0,0);

    return (
        <div className="grid grid-cols-7">
            {WEEK_DAYS.map(day => (
                <div key={day} className="text-center text-xs font-bold text-slate-400 py-2 border-b border-slate-700">{day}</div>
            ))}
            {days.map((d, i) => {
                const isCurrentMonth = d.getMonth() === currentDate.getMonth();
                const isToday = d.getTime() === today.getTime();
                const dayEvents = events.filter(e => new Date(e.start).toDateString() === d.toDateString());

                return (
                    <div key={i} className={`relative min-h-[6rem] sm:min-h-[7rem] border-b border-r border-slate-700 p-1 ${isCurrentMonth ? 'bg-slate-800/30' : 'bg-slate-900/40'}`}>
                        <span className={`text-xs ${isToday ? 'bg-blue-500 text-white rounded-full flex items-center justify-center h-5 w-5 font-bold' : isCurrentMonth ? 'text-slate-300' : 'text-slate-600'}`}>
                            {d.getDate()}
                        </span>
                        <div className="mt-1 space-y-1">
                            {dayEvents.slice(0, 2).map(event => (
                                 <div key={event.id} className="text-[10px] bg-blue-800 text-white p-1 rounded-md truncate" title={event.title}>
                                    {event.title}
                                </div>
                            ))}
                            {dayEvents.length > 2 && (
                                 <div className="text-[10px] text-slate-400">+ {dayEvents.length - 2} mais</div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const WeekView: React.FC<{ currentDate: Date; events: AgendaItem[]; onEventClick: (event: AgendaItem) => void, onSlotClick: (date: Date) => void }> = ({ currentDate, events, onEventClick, onSlotClick }) => {
    const weekStart = new Date(currentDate);
    const dayOfWeek = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));


    const days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const handleGridClick = (hour: number, day: Date, e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const minute = Math.floor((y / rect.height) * 60);
        const clickedDate = new Date(day);
        clickedDate.setHours(hour, minute);
        onSlotClick(clickedDate);
    };

    return (
        <div className="flex flex-col">
            <div className="grid grid-cols-[3rem_1fr] flex-shrink-0">
                <div className="w-12"></div>
                <div className="grid grid-cols-7">
                    {days.map(d => {
                        const isToday = d.toDateString() === today.toDateString();
                        return (
                            <div key={d.toISOString()} className="text-center py-2 border-b border-slate-700">
                                <span className="text-xs text-slate-400">{WEEK_DAYS[d.getDay()]}</span>
                                <span className={`block text-lg font-bold ${isToday ? 'bg-blue-500 text-white rounded-full h-7 w-7 mx-auto flex items-center justify-center' : 'text-slate-200'}`}>{d.getDate()}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
            <div className="grid grid-cols-[3rem_1fr] overflow-y-auto" style={{ height: `${HOUR_HEIGHT_REM * 12}rem`}}>
                <div className="w-12 border-r border-slate-700">
                    {hours.map(h => (
                        <div key={h} className="text-right pr-2 text-xs text-slate-500 -mt-2" style={{height: `${HOUR_HEIGHT_REM}rem`}}>
                           {h > 0 ? `${h}:00` : ''}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 relative">
                     {days.map((d, dayIndex) => (
                         <div key={dayIndex} className="border-r border-slate-700 relative">
                            {hours.map(h => <div key={h} onClick={(e) => handleGridClick(h, d, e)} className="border-b border-slate-700/50" style={{height: `${HOUR_HEIGHT_REM}rem`}}></div>)}
                        </div>
                     ))}
                     {days.findIndex(d => d.toDateString() === new Date().toDateString()) !== -1 && <CurrentTimeIndicator />}
                     {events.map(event => {
                        const start = new Date(event.start);
                        const end = new Date(event.end);
                        const eventDayIndex = days.findIndex(d => d.toDateString() === start.toDateString());
                        if (eventDayIndex === -1) return null;

                        const top = (start.getHours() + start.getMinutes() / 60) * HOUR_HEIGHT_REM;
                        const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
                        const height = (durationMinutes / 60) * HOUR_HEIGHT_REM;

                        return (
                            <div 
                                key={event.id}
                                onClick={() => onEventClick(event)}
                                className="absolute bg-sky-800/80 text-white p-1.5 rounded-md z-10 border border-sky-600 cursor-pointer hover:bg-sky-700/80 overflow-hidden"
                                style={{ 
                                    top: `${top}rem`, 
                                    height: `${Math.max(height, 1.5)}rem`,
                                    left: `calc(${(100/7) * eventDayIndex}% + 0.25rem)`,
                                    width: `calc(${(100/7)}% - 0.5rem)`
                                }}
                                title={`${event.title}\n${event.description}`}
                            >
                                <p className="text-[11px] font-bold truncate">{event.title}</p>
                                <p className="text-[10px] truncate">{start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit'})}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const YearView: React.FC<{ currentDate: Date; events: AgendaItem[] }> = ({ currentDate, events }) => {
    const year = currentDate.getFullYear();

    const MiniMonth: React.FC<{ month: number }> = ({ month }) => {
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const startDate = new Date(monthStart);
        startDate.setDate(startDate.getDate() - monthStart.getDay());
        const endDate = new Date(monthEnd);
        endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()));

        const days = [];
        let day = new Date(startDate);
        while (day <= endDate) {
            days.push(new Date(day));
            day.setDate(day.getDate() + 1);
        }

        const eventsByDay: { [key: string]: number } = events.reduce((acc, event) => {
            const eventDate = new Date(event.start).toDateString();
            acc[eventDate] = (acc[eventDate] || 0) + 1;
            return acc;
        }, {} as {[key: string]: number});

        return (
            <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                <h4 className="font-bold text-center text-sm text-blue-300 mb-2">{MONTH_NAMES[month]}</h4>
                <div className="grid grid-cols-7 text-center text-[10px] text-slate-500">
                    {WEEK_DAYS.map(d => <span key={d}>{d[0]}</span>)}
                </div>
                <div className="grid grid-cols-7 text-center text-xs">
                    {days.map((d, i) => {
                        const isCurrentMonth = d.getMonth() === month;
                        const hasEvents = eventsByDay[d.toDateString()] > 0;
                        return (
                            <span key={i} className={`p-0.5 ${!isCurrentMonth ? 'text-slate-600' : 'text-slate-200'} ${hasEvents ? 'bg-blue-500/50 rounded-full' : ''}`}>
                                {d.getDate()}
                            </span>
                        );
                    })}
                </div>
            </div>
        );
    };
    
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {MONTH_NAMES.map((_, i) => <MiniMonth key={i} month={i} />)}
        </div>
    );
};


export const CalendarView: React.FC<CalendarViewProps> = ({ view, currentDate, events, onEventClick, onSlotClick }) => {
    switch(view) {
        case 'day':
            return <DayView currentDate={currentDate} events={events} onEventClick={onEventClick} onSlotClick={onSlotClick}/>;
        case 'week':
            return <WeekView currentDate={currentDate} events={events} onEventClick={onEventClick} onSlotClick={onSlotClick}/>;
        case 'month':
            return <MonthView currentDate={currentDate} events={events} />;
        case 'year':
            return <YearView currentDate={currentDate} events={events} />;
        default:
            return <WeekView currentDate={currentDate} events={events} onEventClick={onEventClick} onSlotClick={onSlotClick}/>;
    }
};
