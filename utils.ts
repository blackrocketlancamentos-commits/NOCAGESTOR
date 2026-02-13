// FIX: Import missing types, now defined in `types.ts`.
import { LinkStatus, RawChatMessage, ChatConversation, ChatMessage, TrackedLink, WhatsAppLead } from './types';

export const getStatus = (endDate?: string): { text: LinkStatus; color: string; textColor: string; } | null => {
    if (!endDate) return null;
    const end = new Date(`${endDate}T00:00:00`);
     if (isNaN(end.getTime())) { return null; }

    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return { text: 'Vencido', color: 'bg-red-600', textColor: 'text-white' };
    }
    if (diffDays < 2) {
        return { text: 'Vence Hoje/Amanhã', color: 'bg-orange-500', textColor: 'text-white' };
    }
    if (diffDays <= 7) {
        return { text: 'A Vencer', color: 'bg-yellow-400', textColor: 'text-black' };
    }
    return { text: 'Ativo', color: 'bg-green-500', textColor: 'text-white' };
};

export const parsePackageValue = (packageInfo?: string): number => {
    if (!packageInfo) return 0;
    const match = packageInfo.match(/R\$\s*([\d.,]+)/);
    if (!match || !match[1]) {
        return 0;
    }
    const numberStr = match[1].trim();
    const cleanedStr = numberStr.includes(',')
      ? numberStr.replace(/\./g, '').replace(',', '.')
      : numberStr;
    return parseFloat(cleanedStr) || 0;
};

export const parseContractType = (packageInfo?: string): string => {
    if (!packageInfo) return 'N/A';
    const lowerCaseInfo = packageInfo.toLowerCase();
    if (lowerCaseInfo.includes('permuta')) return 'Permuta';
    if (lowerCaseInfo.includes('premium')) return 'Premium';
    if (lowerCaseInfo.includes('básico')) return 'Básico';
    if (packageInfo.length < 25 && !packageInfo.includes(':')) return packageInfo;
    return 'Personalizado';
};

/**
 * Expande uma string de notação científica para uma string de número completo.
 * Lida com a representação de números longos do Google Sheets (ex: '2.09E+14').
 */
function expandScientificNotation(str: string): string {
  const strValue = String(str);
  if (!strValue || !strValue.toLowerCase().includes('e+')) {
    return strValue;
  }

  const [base, exponentStr] = strValue.toLowerCase().split('e+');
  const exponent = parseInt(exponentStr, 10);
  
  let [integerPart, fractionalPart] = base.split('.');
  if (!fractionalPart) {
      fractionalPart = '';
  }
  
  const numWithoutDecimal = integerPart + fractionalPart;
  const digitsToMove = exponent - fractionalPart.length;

  if (digitsToMove >= 0) {
    return numWithoutDecimal + '0'.repeat(digitsToMove);
  } else {
    // Este caso (resultado decimal) não deve ocorrer para IDs de telefone, mas está aqui por segurança.
    const splitPoint = numWithoutDecimal.length + digitsToMove;
    return numWithoutDecimal.substring(0, splitPoint) + '.' + numWithoutDecimal.substring(splitPoint);
  }
}

const normalizeIdToJid = (id: any): string => {
  if (!id) return '';
  let idString = String(id).trim();

  // FIX: Expande a notação científica PRIMEIRO para garantir que o ID numérico seja completo.
  idString = expandScientificNotation(idString);

  if (idString.endsWith('@g.us')) {
    return idString;
  }
  if (idString.endsWith('@c.us')) {
    return idString;
  }
  
  const numberPart = idString.split('@')[0];
  const cleanedId = numberPart.replace(/\D/g, '');
  
  if (cleanedId.length >= 10) {
    return `${cleanedId}@c.us`;
  }
  
  if (idString.includes('-') && !idString.includes('@')) {
    return `${idString}@g.us`;
  }

  return idString; // Fallback
};

export const processRawMessagesIntoConversations = (
  rawMessages: RawChatMessage[],
  contracts: TrackedLink[],
  crmLeads: WhatsAppLead[]
): ChatConversation[] => {
  if (!rawMessages || rawMessages.length === 0) {
    return [];
  }
  
  const normalizePhone = (phone: any = ''): string => {
    return String(phone || '').replace(/\D/g, '');
  }

  const messagesByChatId = rawMessages.reduce((acc, msg) => {
    const normalizedId = normalizeIdToJid(msg.chatid);
    if (!normalizedId) return acc; // Pula IDs vazios/inválidos

    if (!acc[normalizedId]) {
      acc[normalizedId] = [];
    }
    // Adiciona a mensagem com o ID já normalizado
    acc[normalizedId].push({ ...msg, chatid: normalizedId });
    return acc;
  }, {} as Record<string, RawChatMessage[]>);

  const conversations: (ChatConversation & { lastMessageTimestamp: number })[] = Object.entries(messagesByChatId).map(([chatId, messages]) => {
    const sortedMessages = messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const lastMessage = sortedMessages[sortedMessages.length - 1];
    
    // 1. Tenta encontrar o nome no CRM pelo ID de chat completo (mais confiável)
    // Normalizamos o ID do lead do CRM também para uma correspondência correta
    let contactName = crmLeads.find(l => normalizeIdToJid(l.id) === chatId)?.name;

    // 2. Se não encontrado, tenta encontrar nos contratos pelo número de telefone normalizado
    if (!contactName) {
      const normalizedChatIdPhonePart = chatId.split('@')[0];
      const contractInfo = contracts.find(c => c.phone && normalizePhone(c.phone) === normalizedChatIdPhonePart);
      if (contractInfo) {
        contactName = contractInfo.name;
      }
    }
    
    // 3. Fallback para o sendername do backend (que também vem do CRM), depois o próprio ID
    const name = contactName || lastMessage.sendername || chatId;
    
    // Usa o chatId normalizado para detectar o grupo
    const conversationType = chatId.includes('@g.us') ? 'group' : 'individual';

    const formattedMessages: ChatMessage[] = sortedMessages.map(msg => ({
      id: msg.messageid,
      text: msg.text,
      sender: msg.isfromme ? 'me' : 'contact',
      timestamp: new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }));

    const conversation: ChatConversation & { lastMessageTimestamp: number } = {
      id: chatId, // Este agora é o ID normalizado
      name: name,
      type: conversationType,
      avatarUrl: `https://i.pravatar.cc/40?u=${chatId}`,
      lastMessage: lastMessage.text,
      lastMessageTime: new Date(lastMessage.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      unreadCount: 0,
      messages: formattedMessages,
      attendanceMode: lastMessage.attendanceMode || 'BOT',
      lastMessageTimestamp: new Date(lastMessage.timestamp).getTime()
    };
    return conversation;
  });

  return conversations
    .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp)
    .map(({ lastMessageTimestamp, ...convo }) => convo);
};