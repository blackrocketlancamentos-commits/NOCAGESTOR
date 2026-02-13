
import React, { useState } from 'react';

interface InfoModalProps {
  content: {
    title: string;
    link: string;
  };
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ content, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-blue-700 shadow-2xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-5 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Link Rastreável Gerado</h2>
            <p className="text-sm font-semibold text-blue-300">
              {content.title}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="p-6 space-y-4">
            <p className="text-sm text-slate-300">Seu link rastreável está pronto! Copie e use em suas campanhas, bio, anúncios, etc.</p>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    readOnly
                    value={content.link}
                    className="w-full flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md text-slate-200 text-sm"
                />
                <button
                    onClick={handleCopy}
                    className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors"
                >
                    {copied ? 'Copiado!' : 'Copiar'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
