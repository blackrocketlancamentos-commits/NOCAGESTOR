import React, { useState, useEffect, useRef } from 'react';
import { ChatConversation, ChatMessage } from '../../types';

interface ChatViewProps {
  conversations: ChatConversation[];
  onSendMessage: (id: string, message: string) => Promise<void>;
  isLoading: boolean;
  googleScriptUrl: string;
  onSetAttendanceMode: (phone: string, mode: 'BOT' | 'HUMANO') => void;
}

const BotToggle: React.FC<{ isBotActive: boolean; onToggle: (isActive: boolean) => void }> = ({ isBotActive, onToggle }) => {
    return (
        <label htmlFor="bot-toggle" className="flex items-center cursor-pointer">
            <span className="mr-2 text-xs font-medium text-slate-300">Bot Ativo</span>
            <div className="relative">
                <input 
                    id="bot-toggle" 
                    type="checkbox" 
                    className="sr-only" 
                    checked={isBotActive} 
                    onChange={(e) => onToggle(e.target.checked)}
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${isBotActive ? 'bg-green-500' : 'bg-slate-600'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isBotActive ? 'transform translate-x-4' : ''}`}></div>
            </div>
        </label>
    );
};


export const ChatView: React.FC<ChatViewProps> = ({ conversations, onSendMessage, isLoading, googleScriptUrl, onSetAttendanceMode }) => {
    const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (selectedConversation) {
            const updatedConversation = conversations.find(c => c.id === selectedConversation.id);
            setSelectedConversation(updatedConversation || null);
        } else if (conversations.length > 0) {
            // No mobile, não pré-selecione para mostrar a lista primeiro.
            if (window.innerWidth >= 768) {
              setSelectedConversation(conversations[0]);
            }
        }
    }, [conversations]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [selectedConversation?.messages]);

    const handleSelectConversation = (conv: ChatConversation) => {
        setSelectedConversation(conv);
    };
    
    const handleSendMessage = () => {
        if (!newMessage.trim() || !selectedConversation) return;
        onSendMessage(selectedConversation.id, newMessage.trim());
        setNewMessage('');
    };
    
    const handleCopy = () => {
        navigator.clipboard.writeText(googleScriptUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleToggleBot = (isActive: boolean) => {
        if (selectedConversation) {
            onSetAttendanceMode(selectedConversation.id, isActive ? 'BOT' : 'HUMANO');
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-[75vh] text-slate-400">Carregando conversas...</div>;
    }
    
    if (conversations.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center h-[75vh] text-center text-slate-400 p-4">
              <h3 className="text-xl font-bold text-slate-200 mb-2">Nenhuma Conversa Encontrada</h3>
              <p className="max-w-md">Para começar a receber mensagens, você precisa configurar o webhook na sua instância da Z-API.</p>
              <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700 w-full max-w-lg">
                <p className="text-sm font-semibold text-slate-300">Sua URL de Webhook:</p>
                <p className="text-xs text-slate-400 mb-2">Aponte o webhook de `on-message-received` da Z-API para esta URL.</p>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        readOnly
                        value={googleScriptUrl}
                        className="w-full flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md text-slate-200 text-sm"
                    />
                    <button
                        onClick={handleCopy}
                        className="flex-shrink-0 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors"
                    >
                        {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                </div>
              </div>
          </div>
        );
    }


    return (
        <div className="relative flex h-[75vh] bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
            {/* Sidebar with conversations */}
            <div className={`w-full md:w-1/3 border-r border-slate-700 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                <header className="p-3 bg-slate-800 border-b border-slate-700 flex-shrink-0">
                    <input type="text" placeholder="Pesquisar ou começar uma nova conversa" className="w-full px-3 py-1.5 text-sm bg-slate-900/50 border border-slate-600 rounded-md focus:ring-2 focus:ring-green-400" />
                </header>
                <div className="flex-1 overflow-y-auto">
                    {conversations.map(conv => (
                        <button
                            key={conv.id}
                            onClick={() => handleSelectConversation(conv)}
                            className={`w-full text-left flex items-center gap-3 p-3 border-b border-slate-800 transition-colors ${selectedConversation?.id === conv.id ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
                        >
                            <img src={conv.avatarUrl} alt={conv.name} className="w-10 h-10 rounded-full" />
                            <div className="flex-1 overflow-hidden">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-slate-200 truncate">{conv.name}</p>
                                    <p className="text-xs text-slate-500 flex-shrink-0">{conv.lastMessageTime}</p>
                                </div>
                                <p className="text-sm text-slate-400 truncate">{conv.lastMessage}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={`w-full md:w-2/3 flex flex-col ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
                {selectedConversation ? (
                    <>
                        <header className="p-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelectedConversation(null)} className="md:hidden text-slate-300 hover:text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                </button>
                                <img src={selectedConversation.avatarUrl} alt={selectedConversation.name} className="w-8 h-8 rounded-full" />
                                <p className="font-semibold text-slate-200">{selectedConversation.name}</p>
                            </div>
                            <BotToggle isBotActive={selectedConversation.attendanceMode === 'BOT'} onToggle={handleToggleBot} />
                        </header>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-800/50" style={{backgroundImage: "url('https://i.redd.it/qwd83gr4b2561.png')", backgroundBlendMode: 'overlay', backgroundSize: 'contain'}}>
                            {selectedConversation.messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg shadow-md ${msg.sender === 'me' ? 'bg-green-800 text-slate-100' : 'bg-slate-700 text-slate-200'}`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                        <p className="text-xs text-slate-400 text-right mt-1">{msg.timestamp}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <footer className="p-3 bg-slate-800 border-t border-slate-700 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Digite uma mensagem"
                                    className="flex-1 px-4 py-2 text-sm bg-slate-700 border border-slate-600 rounded-full focus:ring-2 focus:ring-green-400 focus:outline-none"
                                />
                                <button onClick={handleSendMessage} className="bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                                </button>
                            </div>
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-center text-slate-500">
                        <div>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            <p className="font-semibold text-lg text-slate-400">Selecione uma conversa</p>
                            <p className="text-sm">Escolha um contato na lista para ver as mensagens.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
