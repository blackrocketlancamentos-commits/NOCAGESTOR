
import React, { useState, useEffect } from 'react';
import { Settings } from '../types.ts';
import { WebhookDiagnostics } from './WebhookDiagnostics.tsx';

interface SettingsPanelProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => Promise<void>;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSettingsChange }) => {
    const [calendarId, setCalendarId] = useState('');
    const [zapiInstanceId, setZapiInstanceId] = useState('');
    const [zapiToken, setZapiToken] = useState('');
    const [zapiClientToken, setZapiClientToken] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setCalendarId(settings.googleCalendarId || '');
        setZapiInstanceId(settings.zapiInstanceId || '');
        setZapiToken(settings.zapiToken || '');
        setZapiClientToken(settings.zapiClientToken || '');
    }, [settings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSettingsChange({ 
                ...settings, 
                googleCalendarId: calendarId.trim(),
                zapiInstanceId: zapiInstanceId.trim(),
                zapiToken: zapiToken.trim(),
                zapiClientToken: zapiClientToken.trim()
            });
        } catch (error) {
            // Error is handled by the parent component (App.tsx)
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="p-6 bg-blue-900/20 rounded-lg border border-blue-700 shadow-lg backdrop-blur-sm space-y-8">
            <h2 className="text-2xl font-bold text-slate-100">Configurações</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Coluna da Esquerda: Credenciais */}
                <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-slate-200 border-b border-blue-800 pb-2">Credenciais e Integrações</h3>
                     <div className="space-y-6 p-4 bg-slate-800/40 rounded-lg border border-slate-700">
                         <div>
                            <label htmlFor="google-calendar-id" className="block text-lg font-medium text-slate-300 mb-1">ID da Google Agenda</label>
                            <p className="text-xs text-slate-400 mb-2">Necessário para criar tarefas e eventos automaticamente.</p>
                            <input 
                                id="google-calendar-id" 
                                type="text" 
                                value={calendarId}
                                onChange={(e) => setCalendarId(e.target.value)}
                                placeholder="seu-email@gmail.com" 
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400"
                            />
                         </div>
                         <div className="space-y-4">
                            <h4 className="block text-lg font-medium text-slate-300 mb-1">Credenciais Z-API</h4>
                            <p className="text-xs text-slate-400 mb-2">Credenciais para enviar mensagens pelo NOCA WhatsApp.</p>
                             <div>
                                <label htmlFor="zapi-instance-id" className="block text-sm font-medium text-slate-400 mb-1">ID da Instância</label>
                                <input 
                                    id="zapi-instance-id" 
                                    type="text" 
                                    value={zapiInstanceId}
                                    onChange={(e) => setZapiInstanceId(e.target.value)}
                                    placeholder="Cole o ID da sua instância Z-API" 
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400"
                                />
                             </div>
                             <div>
                                <label htmlFor="zapi-token" className="block text-sm font-medium text-slate-400 mb-1">Token da Instância</label>
                                <input 
                                    id="zapi-token" 
                                    type="password" 
                                    value={zapiToken}
                                    onChange={(e) => setZapiToken(e.target.value)}
                                    placeholder="Cole o Token da sua instância Z-API" 
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400"
                                />
                             </div>
                              <div>
                                <label htmlFor="zapi-client-token" className="block text-sm font-medium text-slate-400 mb-1">Token de Segurança (Client-Token)</label>
                                <input 
                                    id="zapi-client-token" 
                                    type="password" 
                                    value={zapiClientToken}
                                    onChange={(e) => setZapiClientToken(e.target.value)}
                                    placeholder="Cole o Client-Token da sua conta Z-API" 
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400"
                                />
                             </div>
                         </div>
                    </div>
                     <div className="flex items-center gap-4 pt-4 border-t border-blue-800/50">
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-2 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-wait"
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Credenciais'}
                        </button>
                    </div>
                </div>

                {/* Coluna da Direita: Diagnóstico de Webhook */}
                 <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-slate-200 border-b border-blue-800 pb-2">Webhook e Diagnóstico</h3>
                    <WebhookDiagnostics />
                </div>
            </div>
        </div>
    );
};