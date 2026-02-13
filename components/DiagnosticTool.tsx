
import React, { useState } from 'react';
import { GOOGLE_SCRIPT_URL } from '../config';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export const DiagnosticTool: React.FC = () => {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setErrorDetails(null);
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'PING' }),
        redirect: 'follow'
      });
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const result = await response.json();
        if (result.success && result.data?.status === 'ok') {
            setTestStatus('success');
        } else {
            setTestStatus('error');
            setErrorDetails(`A resposta da API não foi a esperada. Detalhes: ${JSON.stringify(result)}`);
        }
      } else {
         setTestStatus('error');
         const responseText = await response.text();
         if (responseText.includes("Página não encontrada") || responseText.includes("file cannot be opened")) {
             setErrorDetails("Recebemos uma resposta de 'Página não encontrada' do Google. Isso significa que a URL está correta, mas a permissão de acesso está errada. Você PRECISA criar uma nova implantação e garantir que a opção 'Quem pode acessar' esteja definida como 'Qualquer pessoa'.");
         } else {
             setErrorDetails("A URL não retornou um JSON válido. Isso geralmente indica um erro de permissão ou configuração na implantação do script.");
         }
      }
    } catch (e: any) {
        setTestStatus('error');
        if (e instanceof TypeError) { // Often indicates a CORS or network error
             setErrorDetails("Erro de Conexão ou URL Inválida. Não foi possível alcançar a URL. Verifique se a URL no arquivo config.ts está exatamente igual à URL da 'implantação do app da web' fornecida pelo Google. Ela deve começar com https://script.google.com/macros/s/...");
        } else {
             setErrorDetails(`Ocorreu um erro inesperado: ${e.message}`);
        }
    }
  };


  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans flex items-center justify-center p-4">
      <div className="max-w-3xl w-full mx-auto text-left bg-slate-900/50 p-6 md:p-8 rounded-lg border border-blue-700 shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-amber-300 mb-6">Guia de Configuração e Diagnóstico</h2>
        
        <div className="mb-8 p-6 rounded-lg bg-slate-800/50 border border-slate-700">
            <p className="text-center text-slate-300 mb-4">
              Parece que o aplicativo não consegue se conectar à sua Planilha Google. Vamos verificar a sua configuração.
            </p>
            <div className="flex justify-center">
                 <button 
                    onClick={handleTestConnection}
                    disabled={testStatus === 'testing'}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-wait"
                 >
                    {testStatus === 'testing' ? (
                        <>
                         <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         Testando...
                        </>
                    ) : (
                        "▶️ Testar Conexão"
                    )}
                 </button>
            </div>
            
            {testStatus !== 'idle' && testStatus !== 'testing' && (
                <div className={`mt-6 p-4 rounded-lg border ${testStatus === 'success' ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}`}>
                    <h4 className={`font-bold text-lg mb-2 ${testStatus === 'success' ? 'text-green-300' : 'text-red-300'}`}>
                        {testStatus === 'success' ? '✅ Conexão bem-sucedida!' : '❌ Erro na Conexão'}
                    </h4>
                    <p className="text-sm text-slate-300">
                        {testStatus === 'success' 
                            ? "A comunicação com sua Planilha Google está funcionando! Se o app ainda não carregou, faça uma atualização forçada da página (Cmd+Shift+R ou Ctrl+F5) para limpar o cache."
                            : errorDetails
                        }
                    </p>
                </div>
            )}
        </div>

        <div className="space-y-6 text-slate-300">
            <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-800">
                <h3 className="font-bold text-lg text-slate-100 mb-2">Passo 1: Abra o Editor de Scripts do Google</h3>
                <p>Abra o seu projeto de script. Se não souber onde está, acesse pelo link:</p>
                <a href="https://script.google.com/home" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-blue-400 underline hover:text-blue-300">script.google.com/home</a>
            </div>
            
            <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-800">
                <h3 className="font-bold text-lg text-slate-100 mb-2">Passo 2: Crie uma NOVA Implantação (O Passo Mais Importante!)</h3>
                <ol className="list-decimal list-inside space-y-3 pl-2">
                    <li>No canto superior direito, clique no botão azul <strong className="bg-blue-600 px-2 py-1 rounded">Implantar</strong>.</li>
                    <li>No menu que aparecer, selecione <strong className="bg-green-600 text-white px-2 py-1 rounded">"Nova implantação"</strong>.</li>
                    <li className="text-amber-300"><strong>NÃO</strong> use "Gerenciar implantações". Atualizar uma implantação antiga geralmente não corrige o problema de permissão. Você <strong>PRECISA</strong> criar uma nova.</li>
                </ol>
            </div>
            
            <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-800">
                <h3 className="font-bold text-lg text-slate-100 mb-2">Passo 3: Configure o Acesso Correto</h3>
                <ol className="list-decimal list-inside space-y-3 pl-2">
                    <li>Na nova tela, ao lado de "Quem pode acessar", mude a opção para <strong className="bg-green-600 text-white px-2 py-1 rounded">"Qualquer pessoa"</strong>.</li>
                    <li><em className="text-slate-400">Se estiver definido como "Apenas eu" ou "Qualquer pessoa na sua organização", o aplicativo NÃO funcionará.</em></li>
                    <li>Clique no botão azul <strong className="bg-blue-600 px-2 py-1 rounded">Implantar</strong>.</li>
                </ol>
            </div>

            <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-800">
                <h3 className="font-bold text-lg text-slate-100 mb-2">Passo 4: Copie a URL do App da Web</h3>
                <p>Após a implantação, o Google mostrará uma janela com a <strong className="text-amber-300">URL do app da web</strong>. Copie essa URL. Ela termina com <code className="bg-slate-700 text-xs p-1 rounded">/exec</code>.</p>
            </div>
            
            <div className="mt-8 p-6 rounded-lg bg-green-900/30 border border-green-800">
                <h3 className="font-bold text-xl text-green-300 mb-3">✅ Passo Final: Atualize o arquivo de configuração</h3>
                <p>Agora que você tem a URL correta, preciso que você me forneça o arquivo <code className="bg-slate-700 text-sm p-1 rounded">config.ts</code> atualizado.</p>
                 <p className="mt-3">Abra o arquivo <code className="bg-slate-700 text-sm p-1 rounded">config.ts</code> na lista de arquivos, cole sua nova URL e me envie o conteúdo completo do arquivo aqui no chat.</p>
            </div>
        </div>
      </div>
    </div>
  );
};
