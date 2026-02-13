
import React, { useEffect } from 'react';

interface FeedbackToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const FeedbackToast: React.FC<FeedbackToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // Desaparece após 4 segundos

    return () => clearTimeout(timer);
  }, [onClose]);

  const typeClasses = {
    success: "bg-green-600 border border-green-500 text-white",
    error: "bg-red-600 border border-red-500 text-white",
  };
  
  const icon = {
    success: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className={`fixed top-5 right-5 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in-out max-w-sm ${typeClasses[type]}`}>
      {icon[type]}
      <p className="font-semibold text-sm">{message}</p>
    </div>
  );
};
