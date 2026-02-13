
import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { WebhookLogEntry } from '../types';
import { GOOGLE_SCRIPT_URL } from '../config';

export const WebhookDiagnostics: React.FC = () => {
    const [logs, setLogs] = useState<WebhookLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchLogs = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.getWebhookLogs();
            setLogs(data);
        } catch (e) {
            setError('Falha ao carregar os logs. A aba "WebhookLog" existe na sua planilha?');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(GOOGLE_SCRIPT_URL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6 p-4 bg-slate-800/40 rounded-lg border border-slate-700">
            <h4 className="block text-lg font-medium text-amber-300 mb-1">Diagnóstico de Webhook</h4>
            <p className="text-xs text-slate-300 -mt-4">Use esta ferramenta para verificar se as mensagens do WhatsApp estão chegando ao NOCA Gestor.</p>
            
            <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-300">Checklist de Configuração:</p>
                <ul className="list-disc list-inside space-y-2 text-sm text-slate-300">
                    <li>Copie a URL abaixo.</li>
                    <li>Na Z-API, cole a URL no campo do webhook <code className="bg-slate-700 text-xs p-1 rounded">on-message-received</code>.</li>
                    <li>No Google Apps Script, certifique-se de que a última implantação está configurada para "Quem pode acessar": <strong className="text-green-400">Qualquer pessoa</strong>.</li>
                </ul>
                 <div>
                    <label htmlFor="webhook-url-diag" className="block text-sm font-medium text-slate-300 mb-1">Sua URL de Webhook</label>
                    <div className="flex items-center gap-2">
                        <input id="webhook-url-diag" type="text" readOnly value={GOOGLE_SCRIPT_URL} className="w-full px-4 py-2 bg-slate-900/70 border border-slate-700 rounded-md text-slate-400 text-xs cursor-not-allowed" />
                        <button onClick={handleCopy} className="flex-shrink-0 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors">{copied ? 'Copiado!' : 'Copiar'}</button>
                    </div>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <h5 className="font-semibold text-slate-300">Registros Recebidos (últimos 20)</h5>
                    <button onClick={fetchLogs} disabled={isLoading} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-50">
                        {isLoading ? 'Atualizando...' : 'Atualizar'}
                    </button>
                </div>
                <div className="bg-slate-900 rounded-md p-3 max-h-80 overflow-y-auto border border-slate-600 text-xs font-mono">
                    {isLoading && <p className="text-slate-400">Carregando...</p>}
                    {error && <p className="text-red-400">{error}</p>}
                    {!isLoading && !error && logs.length === 0 && (
                        <p className="text-slate-500">Nenhum registro de webhook encontrado. Envie uma mensagem de teste para o seu número e clique em "Atualizar". Se nada aparecer, verifique o checklist acima.</p>
                    )}
                    {logs.map((log, index) => (
                        <div key={index} className="p-2 border-b border-slate-700 last:border-b-0">
                            <p className="text-green-400 font-semibold">[{new Date(log.timestamp).toLocaleString('pt-BR')}]</p>
                            <pre className="whitespace-pre-wrap break-all text-slate-300">{log.content}</pre>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
