// === 🌊 NOQUINHA – BOT NOCA + 🔗 NOCA GESTOR API ===
// Versão: 5.9 - Garante a formatação de texto na leitura do histórico de chat.

// ----------------------------------------------------------
// CONFIG GERAL 
// ----------------------------------------------------------
var TEST_MODE = false;

// Nomes das Abas da Planilha
const LINKS_SHEET_NAME = "Página1";
const CLICKS_LOG_SHEET_NAME = "ClicksLog";
const FINANCEIRO_SHEET_NAME = "Financeiro";
const SHEET_HIST_CHAT = "HISTORICO_CHAT";
const SHEET_ATENDIMENTO = "ATENDIMENTO_STATE";
const SHEET_CRM_NOCA = "CRM_NOCA";
const SETTINGS_SHEET_NAME = "Config";
const ROUTINE_TASKS_SHEET_NAME = "RoutineTasks";
const WEBHOOK_LOG_SHEET_NAME = "WebhookLog"; // Para depuração

const CRM_HEADERS = ["ID_CONTATO", "Nome", "Telefone", "Origem", "TipoContato", "FaseFunil", "PacoteInteresse", "DataPrimeiroContato", "DataUltimoContato", "Observacoes"];


// --- FUNÇÃO PARA CRIAR UM LEAD DE TESTE (EXECUTAR MANUALMENTE 1 VEZ) ---
// Para usar:
// 1. Abra o editor do Apps Script.
// 2. No topo, ao lado de "Depurar", selecione a função "addFakeLeadAndConversation".
// 3. Clique em "Executar".
// 4. Verifique seu app NOCA Gestor. Um novo lead chamado "Lead de Teste" deve aparecer na aba WhatsApp.
function addFakeLeadAndConversation() {
  const fakePhone = `5511999999999`;
  const fakeId = `${fakePhone}@c.us`;
  const fakeName = "Lead de Teste";

  // Adiciona o lead ao CRM
  addOrUpdateCrmContact_({
    id: fakeId,
    phone: fakePhone,
    name: fakeName,
    type: "Lead",
    stage: "new"
  });

  // Adiciona a mensagem ao histórico
  logMessageToHistory_(fakeId, "RECEBIDA", "Olá, gostaria de um orçamento.");
  Utilities.sleep(1000); // Pausa para garantir timestamps diferentes
  logMessageToHistory_(fakeId, "BOT", "Olá! Seja bem-vindo à NOCA. Como posso te ajudar?");
  Utilities.sleep(1000);
  logMessageToHistory_(fakeId, "RECEBIDA", "Gostaria de saber mais sobre os pacotes de marketing.");
  Utilities.sleep(1000);
  logMessageToHistory_(fakeId, "BOT", "Claro! Temos pacotes a partir de R$160. Você tem alguma preferência?");


  Logger.log(`Lead de teste "${fakeName}" e sua conversa de exemplo foram adicionados com sucesso.`);
}


// --- FUNÇÃO PARA POPULAR DADOS FALSOS (EXECUTAR MANUALMENTE 1 VEZ) ---
// Para usar:
// 1. IMPORTANTE: Apague todos os dados (exceto o cabeçalho) das abas "Página1" e "CRM_NOCA" para evitar duplicatas e remover os clientes antigos.
// 2. Abra o editor do Apps Script.
// 3. No topo, ao lado de "Depurar", selecione a função "populateWithDummyData".
// 4. Clique em "Executar".
// 5. Verifique sua planilha. Os novos parceiros devem ter sido adicionados.
// 6. ATENÇÃO: Execute apenas uma vez após limpar as abas.
function populateWithDummyData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LINKS_SHEET_NAME);
  if (!sheet) {
    Logger.log(`Aba "${LINKS_SHEET_NAME}" não encontrada.`);
    return;
  }

  const newClients = [
    "TROPICAL FRUIT", "SEJA ALDEIA", "SPORT POINT", "ERICA NAILS", "LOVE ENERGY", 
    "INNOVA", "KM PELA VIDA", "LAIS NUTRI", "LUCIANA FOTO", "TAVERNA VIKING",
    "PORTINARI", "OXE é JAZZ", "ACADEMIA", "APARTAMENTO MÃE", "YARA DENTISTA",
    "LOGOS INTERNET", "PATA CLUBE", "INGLÊS - KILANE"
  ];

  const colMap = getColsMap(sheet);
  const requiredCols = ['id', 'name', 'url', 'clicks', 'createdat', 'startdate', 'enddate', 'phone', 'instagram', 'isarchived', 'packageinfo', 'email', 'clienttype', 'cpf', 'cnpj', 'companyname', 'workmaterialurl'];
  validateRequiredColumns(colMap, requiredCols);

  newClients.forEach((clientName, index) => {
    const today = new Date();
    const startDate = new Date(today.getTime() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + (30 + Math.floor(Math.random() * 60)) * 24 * 60 * 60 * 1000); // 1 a 3 meses de contrato

    const newRow = new Array(sheet.getLastColumn()).fill('');
    const newId = Utilities.getUuid();
    
    const phone = `119${String(80000000 + index).padStart(8, '0')}`;
    const cleanName = clientName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const instagram = `${cleanName}${index}`;
    const email = `${cleanName}@example.com`;

    newRow[colMap['id']] = newId;
    newRow[colMap['name']] = clientName;
    newRow[colMap['url']] = `https://wa.me/55${phone}`;
    newRow[colMap['clicks']] = Math.floor(Math.random() * 250);
    newRow[colMap['createdat']] = new Date().toISOString();
    newRow[colMap['startdate']] = startDate.toISOString().split('T')[0];
    newRow[colMap['enddate']] = endDate.toISOString().split('T')[0];
    newRow[colMap['phone']] = phone;
    newRow[colMap['instagram']] = instagram;
    newRow[colMap['isarchived']] = false;
    newRow[colMap['clienttype']] = "Parceiro";
    newRow[colMap['packageinfo']] = "Permuta";
    newRow[colMap['email']] = email;
    newRow[colMap['cpf']] = '';
    newRow[colMap['cnpj']] = '';
    newRow[colMap['companyname']] = clientName;

    // Adiciona materiais de trabalho para alguns clientes para testar o novo botão "Postar Stories"
    if (index % 3 === 0) {
        newRow[colMap['workmaterialurl']] = JSON.stringify([{ url: `https://instagram.com/${instagram}`, type: 'instagram' }]);
    } else {
        newRow[colMap['workmaterialurl']] = JSON.stringify([]);
    }

    sheet.appendRow(newRow);

    // Nenhuma transação financeira para "Permuta"

    addOrUpdateCrmContact_({
      id: phone + "@c.us", // Simula um ID do WhatsApp
      phone: phone,
      name: clientName,
      type: "Parceiro",
      stage: 'active',
      packageInfo: "Permuta"
    });
  });
  
  Logger.log(`${newClients.length} novos clientes (parceiros) foram adicionados com sucesso.`);
}


// --- FUNÇÕES DE LÓGICA DE CALENDÁRIO ---

function parsePackageTasks(packageInfo) {
  if (!packageInfo || typeof packageInfo !== 'string') { return { feeds: 0, stories: 0 }; }
  const feedMatch = packageInfo.match(/(\d+)\s*Feed/i);
  const storiesMatch = packageInfo.match(/(\d+)\s*Stories/i);
  const dailyStoriesMatch = packageInfo.match(/Stories Diários/i);
  return {
    feeds: feedMatch ? parseInt(feedMatch[1], 10) : 0,
    stories: storiesMatch ? parseInt(storiesMatch[1], 10) : (dailyStoriesMatch ? 30 : 0)
  };
}

function createCalendarEvent(calendarId, title, date, description) {
  try {
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (calendar) { calendar.createAllDayEvent(title, date, { description: description }); }
  } catch (e) {
    Logger.log('Falha ao criar evento no calendário para o ID ' + calendarId + ': ' + e.toString());
  }
}

function schedulePackageTasks(calendarId, clientName, packageInfo, startDateStr, endDateStr) {
  if (!calendarId || !packageInfo || !startDateStr || !endDateStr) return;
  const { feeds, stories } = parsePackageTasks(packageInfo);
  if (feeds === 0 && stories === 0) return;
  const startDate = new Date(startDateStr + 'T00:00:00Z');
  const endDate = new Date(endDateStr + 'T00:00:00Z');
  const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const descriptionTemplate = `Tarefa de criação para o cliente ${clientName}.\n\nStatus:\n- Copy: [Pendente]\n- Criativo: [Pendente]`;
  if (feeds > 0) {
    const feedInterval = durationDays / feeds;
    for (let i = 0; i < feeds; i++) {
      const eventDate = new Date(startDate);
      eventDate.setDate(startDate.getDate() + Math.floor(i * feedInterval));
      createCalendarEvent(calendarId, `[Feed ${i + 1}] - ${clientName}`, eventDate, descriptionTemplate);
    }
  }
  if (stories > 0) {
    const storyInterval = durationDays / stories;
    for (let i = 0; i < stories; i++) {
      const eventDate = new Date(startDate);
      eventDate.setDate(startDate.getDate() + Math.floor(i * storyInterval));
      createCalendarEvent(calendarId, `[Story ${i + 1}] - ${clientName}`, eventDate, descriptionTemplate);
    }
  }
}

function scheduleRoutineTask(calendarId, title, frequency, dayOfWeek, time) {
    if (!calendarId || !title) return;
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) throw new Error("Agenda com ID '" + calendarId + "' não encontrada.");
    const eventTitle = `[Rotina] - ${title}`;
    const description = `Tarefa de rotina gerada pelo NOCA Gestor.`;
    if (frequency === 'daily') {
        if (time) {
            const [hours, minutes] = time.split(':').map(Number);
            const eventDate = new Date(); eventDate.setHours(hours, minutes, 0, 0);
            calendar.createEvent(eventTitle, eventDate, eventDate, { description: description });
        } else {
            calendar.createAllDayEvent(eventTitle, new Date(), { description: description });
        }
    } else if (frequency === 'weekly' && dayOfWeek !== undefined) {
        const weekdayMap = [CalendarApp.Weekday.SUNDAY, CalendarApp.Weekday.MONDAY, CalendarApp.Weekday.TUESDAY, CalendarApp.Weekday.WEDNESDAY, CalendarApp.Weekday.THURSDAY, CalendarApp.Weekday.FRIDAY, CalendarApp.Weekday.SATURDAY];
        const googleWeekday = weekdayMap[dayOfWeek];
        if (!googleWeekday) throw new Error("Dia da semana inválido.");
        const recurrence = CalendarApp.newRecurrence().addWeeklyRule().onWeekDay(googleWeekday);
        const today = new Date();
        let daysUntilTarget = dayOfWeek - today.getDay();
        if (daysUntilTarget < 0) daysUntilTarget += 7;
        const firstEventDate = new Date(); firstEventDate.setDate(today.getDate() + daysUntilTarget);
        calendar.createAllDayEventSeries(eventTitle, firstEventDate, recurrence, { description: description });
    }
}


// --- FUNÇÕES DE LÓGICA FINANCEIRA ---

function parsePackageValue(packageInfo) {
    if (!packageInfo) return 0;
    const match = packageInfo.match(/R\$\s*([\d.,]+)/);
    if (!match || !match[1]) return 0;
    const numberStr = match[1].trim().replace(/\./g, '').replace(',', '.');
    return parseFloat(numberStr) || 0;
}

function addTransaction(transactionData) {
  const sheet = getOrCreateSheet_(SpreadsheetApp.getActiveSpreadsheet(), FINANCEIRO_SHEET_NAME, ['id', 'date', 'description', 'type', 'amount', 'relatedContractId']);
  const newId = Utilities.getUuid();
  sheet.appendRow([ newId, transactionData.date || new Date().toISOString(), transactionData.description, transactionData.type, transactionData.amount, transactionData.relatedContractId || '']);
  return { ...transactionData, id: newId };
}


// --- FUNÇÕES DE LÓGICA DE CRM ---
function addOrUpdateCrmContact_(contactData) {
  const crmSheet = getOrCreateSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEET_CRM_NOCA, CRM_HEADERS);
  const rawId = contactData.id; // ID completo (ex: 55...@c.us)
  if (!rawId) return; 

  const colMap = getColsMap(crmSheet);
  let rowIndex = -1;
  
  if (crmSheet.getLastRow() > 1) {
    const idColumn = crmSheet.getRange(2, colMap['id_contato'] + 1, crmSheet.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < idColumn.length; i++) {
      if (idColumn[i][0] == rawId) {
        rowIndex = i + 2;
        break;
      }
    }
  }

  if (rowIndex !== -1) { // Contato existente
    // Atualiza o que for fornecido
    if (contactData.name) crmSheet.getRange(rowIndex, colMap['nome'] + 1).setValue(contactData.name);
    if (contactData.stage) crmSheet.getRange(rowIndex, colMap['fasefunil'] + 1).setValue(contactData.stage);
    if (contactData.type) crmSheet.getRange(rowIndex, colMap['tipocontato'] + 1).setValue(contactData.type);
    crmSheet.getRange(rowIndex, colMap['dataultimocontato'] + 1).setValue(new Date());
  } else { // Novo contato
    const newRow = new Array(crmSheet.getLastColumn()).fill('');
    newRow[colMap['id_contato']] = rawId;
    newRow[colMap['nome']] = contactData.name || rawId; // Usa o ID se o nome não vier
    newRow[colMap['telefone']] = normalizePhone_(rawId); // Apenas números para a coluna 'Telefone'
    newRow[colMap['origem']] = 'WhatsApp';
    newRow[colMap['tipocontato']] = contactData.type || 'Lead';
    newRow[colMap['fasefunil']] = contactData.stage || 'new';
    newRow[colMap['pacoteinteresse']] = contactData.packageInfo || '';
    newRow[colMap['dataprimeirocontato']] = new Date();
    newRow[colMap['dataultimocontato']] = new Date();
    crmSheet.appendRow(newRow);
  }
}



// --- FUNÇÕES DE RESPOSTA HTML ---
function createRedirectHtmlResponse(url, name) {
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Redirecionando...</title><script src="https://cdn.tailwindcss.com"></script><script>window.setTimeout(function(){window.top.location.href = "${url}";}, 500);</script></head><body class="bg-gray-900 text-white flex items-center justify-center min-h-screen font-sans p-4"><div class="text-center bg-blue-900/30 p-8 rounded-lg border border-blue-700 shadow-lg"><div class="flex justify-center items-center mb-4"><svg class="animate-spin -ml-1 mr-3 h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div><h1 class="text-2xl font-bold text-slate-100">Redirecionando para ${name}...</h1><p class="mt-2 text-slate-300">Por favor, aguarde um instante.</p><div class="mt-6 text-sm"><p class="text-slate-400">O redirecionamento não funcionou?</p><a href="${url}" target="_top" class="inline-block mt-1 text-blue-400 underline hover:text-blue-300 font-semibold">Clique aqui para continuar</a></div></div></body></html>`;
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function createErrorHtmlResponse(title, message) {
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Erro - Contador de Cliques</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-900 text-white flex items-center justify-center min-h-screen"><div class="max-w-lg w-full mx-auto text-center bg-red-900/50 p-8 rounded-lg border border-red-700 shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg><h1 class="text-3xl font-bold text-red-300">${title}</h1><p class="mt-2 text-red-200">${message}</p><p class="mt-6 text-sm text-gray-400">Este é um link de rastreio da plataforma NOCA.</p></div></body></html>`;
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


// --- FUNÇÕES AUXILIARES DA PLANILHA ---
function getColsMap(sheet) {
  if (!sheet || sheet.getLastRow() < 1) { return {}; }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colMap = {};
  headers.forEach((header, i) => { if (typeof header === 'string' && header.trim() !== '') { colMap[header.toLowerCase().trim()] = i; } });
  return colMap;
}

function validateRequiredColumns(colMap, requiredCols) {
  for (const col of requiredCols) { if (colMap[col] === undefined) { throw new Error(`COLUMN_NOT_FOUND: A coluna obrigatória "${col}" não foi encontrada.`); } }
}

function findRowIndexById(sheet, colMap, id) {
  if (!id || sheet.getLastRow() < 2) { return -1; }
  const idColumnIndex = colMap['id']; if (idColumnIndex === undefined) { return -1; }
  const searchRange = sheet.getRange(2, idColumnIndex + 1, sheet.getLastRow() - 1, 1);
  const textFinder = searchRange.createTextFinder(String(id)).matchEntireCell(true);
  const searchResult = textFinder.findNext();
  return searchResult ? searchResult.getRow() : -1;
}

function normalizePhone_(p) { return String(p || "").replace(/\D/g, ""); }

function normalizeIdToJid_(id) {
  if (!id || (typeof id !== 'string' && typeof id !== 'number')) return null;
  const idStr = String(id);
  if (idStr.includes('@g.us') || idStr.includes('@c.us')) {
    return idStr; // Already a valid JID (Just ID)
  }
  if (idStr.includes('@')) {
    return idStr; // Some other format, respect it
  }
  const cleanedId = idStr.replace(/[^0-9]/g, '');
  if (cleanedId.length < 10) return idStr; // Not a phone number, return original
  return cleanedId + '@c.us';
}

function getOrCreateSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) { sheet = ss.insertSheet(name); if (headers && headers.length) sheet.appendRow(headers); }
  else if (sheet.getLastRow() === 0 && headers && headers.length) { sheet.appendRow(headers); }
  return sheet;
}

function getHeaderIndex_(sheet, headerName) {
    if (sheet.getLastRow() === 0) return -1;
    const firstRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const target = String(headerName || "").toLowerCase().trim();
    for (let i = 0; i < firstRow.length; i++) { if (String(firstRow[i] || "").toLowerCase().trim() === target) return i; }
    return -1;
}

function getSettings_(spreadsheet) {
  const sheet = getOrCreateSheet_(spreadsheet, SETTINGS_SHEET_NAME, ['Key', 'Value']);
  const settings = {};
  if (sheet.getLastRow() > 1) {
    const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2);
    const values = range.getValues();
    values.forEach(row => {
      if (row[0]) { settings[row[0]] = row[1]; }
    });
  }
  return settings;
}


// --- ROTAS PRINCIPAIS (doGet, doPost) ---

function doGet(e) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const linksSheet = spreadsheet.getSheetByName(LINKS_SHEET_NAME);
    if (!linksSheet) { return createErrorHtmlResponse("Erro de Configuração", `A planilha (aba) com o nome "${LINKS_SHEET_NAME}" não foi encontrada.`); }
    if (e.parameter.id) {
       if (linksSheet.getLastRow() < 2) { return createErrorHtmlResponse("Link Inválido", "Não há links cadastrados na planilha ainda."); }
      const colMap = getColsMap(linksSheet);
      validateRequiredColumns(colMap, ['id', 'name', 'url', 'clicks']);
      const linkId = e.parameter.id;
      const rowIndex = findRowIndexById(linksSheet, colMap, linkId);
      if (rowIndex !== -1) {
          const rowData = linksSheet.getRange(rowIndex, 1, 1, linksSheet.getLastColumn()).getValues()[0];
          const url = rowData[colMap['url']];
          const name = rowData[colMap['name']];
          const currentClicks = parseInt(rowData[colMap['clicks']], 10) || 0;
          linksSheet.getRange(rowIndex, colMap['clicks'] + 1).setValue(currentClicks + 1); 
          const clicksLogSheet = getOrCreateSheet_(spreadsheet, CLICKS_LOG_SHEET_NAME, ['id', 'timestamp']);
          clicksLogSheet.appendRow([linkId, new Date().toISOString()]);
          SpreadsheetApp.flush();
          return createRedirectHtmlResponse(url, name);
      }
      return createErrorHtmlResponse("Link Não Encontrado", `O link com o ID "${linkId}" não foi localizado na sua planilha.`);
    }
    return createErrorHtmlResponse("URL Incompleta", "Este é o endereço do seu script de rastreio, mas ele precisa de um ID para funcionar. Ex: .../exec?id=xxxxxx");
  } catch (error) {
    Logger.log(error);
    return createErrorHtmlResponse("Erro de Configuração", `Ocorreu um erro ao processar o link: ${error.message}`);
  }
}

function doPost(e) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // DEBUG: Log all incoming webhook requests to a separate sheet for inspection.
  try {
    const logSheet = getOrCreateSheet_(spreadsheet, WEBHOOK_LOG_SHEET_NAME, ["Timestamp", "RawContent"]);
    const content = e.postData ? e.postData.contents : "No postData received";
    logSheet.appendRow([new Date(), content]);
  } catch (logError) {
    Logger.log("Failed to write to WebhookLog: " + logError.toString());
  }

  try {
    const request = JSON.parse(e.postData.contents);
    
    // Router: Z-API Webhook vs. NOCA Gestor Action
    if (request.action) {
      return handleNocaGestorAction_(request, spreadsheet);
    } else {
      return handleZapiWebhook_(request, spreadsheet);
    }
  } catch (error) {
    Logger.log("doPost Error: " + error.toString());
    // Also log the parsing error to the sheet for easier debugging.
    try {
        const logSheet = spreadsheet.getSheetByName(WEBHOOK_LOG_SHEET_NAME);
        if (logSheet) {
            logSheet.appendRow([new Date(), "ERROR PARSING: " + (e.postData ? e.postData.contents : "N/A"), "Error: " + error.message]);
        }
    } catch(logError) {
        // ignore if logging the error fails
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}


// --- MANIPULADOR DE AÇÕES DO NOCA GESTOR ---
function handleNocaGestorAction_(request, spreadsheet) {
    const action = request.action;
    const reqData = request.data;
    const linksSheet = spreadsheet.getSheetByName(LINKS_SHEET_NAME);
    let colMap = linksSheet ? getColsMap(linksSheet) : {};

    const actionsWithoutSheet = ['PING', 'GET_SETTINGS', 'UPDATE_SETTINGS', 'GET_ROUTINE_TASKS', 'UPDATE_ROUTINE_TASKS', 'ADD_ROUTINE_TASK', 'GET_CALENDAR_EVENTS', 'CREATE_CALENDAR_EVENT', 'UPDATE_CALENDAR_EVENT', 'DELETE_CALENDAR_EVENT', 'ADD_TRANSACTION', 'GET_TRANSACTIONS', 'GET_CONVERSATIONS', 'SET_ATTENDANCE_MODE', 'SEND_HUMAN_MESSAGE', 'GET_CRM_LEADS', 'UPDATE_CRM_STAGE', 'GET_WEBHOOK_LOGS'];
    if (!linksSheet && !actionsWithoutSheet.includes(action)) { 
      throw new Error('SHEET_NOT_FOUND'); 
    }

    switch(action) {
      // Ação de Diagnóstico
      case 'PING': {
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: { status: 'ok' } })).setMimeType(ContentService.MimeType.JSON);
      }
      case 'GET_WEBHOOK_LOGS': {
        const logSheet = getOrCreateSheet_(spreadsheet, WEBHOOK_LOG_SHEET_NAME, ["Timestamp", "RawContent"]);
        if (logSheet.getLastRow() < 2) {
            return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] })).setMimeType(ContentService.MimeType.JSON);
        }
        const lastRow = logSheet.getLastRow();
        const startRow = Math.max(2, lastRow - 19); // Pega as últimas 20 entradas
        const numRows = lastRow - startRow + 1;
        const values = logSheet.getRange(startRow, 1, numRows, 2).getValues();
        const logs = values.map(row => ({
            timestamp: row[0],
            content: row[1]
        })).reverse(); // Mostra as mais recentes primeiro
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: logs })).setMimeType(ContentService.MimeType.JSON);
      }
      // Ações de Links e Contratos
      case 'GET_LINKS': {
        if (linksSheet.getLastRow() < 2) return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] })).setMimeType(ContentService.MimeType.JSON);
        validateRequiredColumns(colMap, ['id', 'name', 'url', 'clicks', 'createdat']);
        const range = linksSheet.getRange(2, 1, linksSheet.getLastRow() - 1, linksSheet.getLastColumn());
        const values = range.getValues();
        const headers = linksSheet.getRange(1, 1, 1, linksSheet.getLastColumn()).getValues()[0].map(h => String(h).toLowerCase().trim());
        const links = values.map(row => {
          const link = {};
          headers.forEach((header, i) => {
            const key = header.replace(/ /g, ''); // Remove spaces
            if(key === 'workmaterialurl') { try { link['workMaterialUrls'] = row[i] ? JSON.parse(row[i]) : []; } catch (e) { link['workMaterialUrls'] = []; }
            } else if (key === 'isarchived') { link[key] = row[i] === true || String(row[i]).toLowerCase() === 'true';
            } else { link[key] = row[i]; }
          });
          return link;
        });
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: links })).setMimeType(ContentService.MimeType.JSON);
      }
      case 'CREATE': {
        const requiredCols = ['id', 'name', 'url', 'clicks', 'createdat', 'startdate', 'enddate', 'phone', 'instagram', 'isarchived', 'packageinfo', 'email', 'clienttype', 'cpf', 'cnpj', 'companyname'];
        if (linksSheet.getLastRow() === 0) {
            linksSheet.appendRow(requiredCols);
            colMap = getColsMap(linksSheet);
        }
        validateRequiredColumns(colMap, requiredCols);
        const workMaterialUrlsString = reqData.workMaterialUrls ? JSON.stringify(reqData.workMaterialUrls) : JSON.stringify([]);
        const newRow = new Array(linksSheet.getLastColumn()).fill('');
        newRow[colMap['id']] = reqData.id || Utilities.getUuid();
        newRow[colMap['name']] = reqData.name; newRow[colMap['url']] = reqData.url; newRow[colMap['clicks']] = 0; newRow[colMap['createdat']] = new Date().toISOString(); newRow[colMap['startdate']] = reqData.startDate; newRow[colMap['enddate']] = reqData.endDate; newRow[colMap['phone']] = reqData.phone; newRow[colMap['instagram']] = reqData.instagram; newRow[colMap['isarchived']] = false; newRow[colMap['packageinfo']] = reqData.packageInfo; newRow[colMap['email']] = reqData.email; newRow[colMap['clienttype']] = reqData.clientType;
        newRow[colMap['cpf']] = reqData.cpf;
        newRow[colMap['cnpj']] = reqData.cnpj;
        newRow[colMap['companyname']] = reqData.companyName;
        if(colMap['workmaterialurl'] !== undefined) newRow[colMap['workmaterialurl']] = workMaterialUrlsString;
        linksSheet.appendRow(newRow);
        const contractValue = parsePackageValue(reqData.packageInfo);
        if (contractValue > 0) { addTransaction({ date: new Date().toISOString(), description: `Contrato: ${reqData.name}`, type: 'receita', amount: contractValue, relatedContractId: newRow[colMap['id']] }); }
        if (reqData.googleCalendarId) { schedulePackageTasks(reqData.googleCalendarId, reqData.name, reqData.packageInfo, reqData.startDate, reqData.endDate); }
        const clientTypeToStageMap = { 'Cliente': 'active', 'Parceiro': 'active', 'Lead': 'negotiation', 'Contato': 'new' };
        const whatsappId = reqData.phone ? (reqData.phone.includes('@') ? reqData.phone : normalizePhone_(reqData.phone) + '@c.us') : null;
        addOrUpdateCrmContact_({ id: whatsappId, phone: reqData.phone, name: reqData.name, type: reqData.clientType, stage: clientTypeToStageMap[reqData.clientType] || 'new', packageInfo: reqData.packageInfo });
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: reqData })).setMimeType(ContentService.MimeType.JSON);
      }
      case 'CREATE_SIMPLE_TRACKER': {
        validateRequiredColumns(colMap, ['id', 'name', 'url', 'clicks', 'createdat']);
        const newId = Utilities.getUuid();
        const newRow = new Array(linksSheet.getLastColumn()).fill('');
        newRow[colMap['id']] = newId;
        newRow[colMap['name']] = reqData.name;
        newRow[colMap['url']] = reqData.url;
        newRow[colMap['clicks']] = 0;
        newRow[colMap['createdat']] = new Date().toISOString();
        newRow[colMap['isarchived']] = false;
        // Preenche outros campos com 'N/A' ou vazio para manter a estrutura da linha
        newRow[colMap['startdate']] = ''; newRow[colMap['enddate']] = ''; newRow[colMap['phone']] = ''; newRow[colMap['instagram']] = ''; newRow[colMap['packageinfo']] = ''; newRow[colMap['email']] = ''; newRow[colMap['clienttype']] = 'Contato';
        newRow[colMap['cpf']] = '';
        newRow[colMap['cnpj']] = '';
        newRow[colMap['companyname']] = '';
        newRow[colMap['workmaterialurl']] = JSON.stringify([]);
        linksSheet.appendRow(newRow);
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: { id: newId } })).setMimeType(ContentService.MimeType.JSON);
      }
       case 'DELETE_CONTRACT': {
        validateRequiredColumns(colMap, ['id']);
        const contractId = reqData.id;
        
        // Deleta o contrato
        const rowIndex = findRowIndexById(linksSheet, colMap, contractId);
        if (rowIndex === -1) throw new Error('Contrato não encontrado para deletar.');
        linksSheet.deleteRow(rowIndex);

        // Deleta a transação financeira associada
        const financeSheet = spreadsheet.getSheetByName(FINANCEIRO_SHEET_NAME);
        if (financeSheet && financeSheet.getLastRow() > 1) {
            const financeColMap = getColsMap(financeSheet);
            if (financeColMap['relatedcontractid'] !== undefined) {
                const searchRange = financeSheet.getRange(2, financeColMap['relatedcontractid'] + 1, financeSheet.getLastRow() - 1, 1);
                const textFinder = searchRange.createTextFinder(String(contractId)).matchEntireCell(true);
                const searchResult = textFinder.findNext();
                if (searchResult) {
                    financeSheet.deleteRow(searchResult.getRow());
                }
            }
        }
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: { id: contractId } })).setMimeType(ContentService.MimeType.JSON);
      }
      case 'ARCHIVE_LINK': {
        validateRequiredColumns(colMap, ['id', 'isarchived']);
        const rowIndex = findRowIndexById(linksSheet, colMap, reqData.id); if (rowIndex === -1) throw new Error('Link não encontrado.');
        linksSheet.getRange(rowIndex, colMap['isarchived'] + 1).setValue(reqData.isArchived);
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: { id: reqData.id } })).setMimeType(ContentService.MimeType.JSON);
      }
      case 'UPDATE_PACKAGE_INFO': {
        validateRequiredColumns(colMap, ['id', 'packageinfo']);
        const rowIndex = findRowIndexById(linksSheet, colMap, reqData.id); if (rowIndex === -1) throw new Error('Link não encontrado.');
        linksSheet.getRange(rowIndex, colMap['packageinfo'] + 1).setValue(reqData.packageInfo);
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: { id: reqData.id } })).setMimeType(ContentService.MimeType.JSON);
      }
      case 'UPDATE_DATES': {
        validateRequiredColumns(colMap, ['id', 'startdate', 'enddate']);
        const rowIndex = findRowIndexById(linksSheet, colMap, reqData.id); if (rowIndex === -1) throw new Error('Link não encontrado.');
        linksSheet.getRange(rowIndex, colMap['startdate'] + 1).setValue(reqData.startDate);
        linksSheet.getRange(rowIndex, colMap['enddate'] + 1).setValue(reqData.endDate);
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: { id: reqData.id } })).setMimeType(ContentService.MimeType.JSON);
      }
      case 'UPDATE_CONTACT_INFO': {
        validateRequiredColumns(colMap, ['id', 'phone', 'instagram', 'email', 'cpf', 'cnpj', 'companyname']);
        const rowIndex = findRowIndexById(linksSheet, colMap, reqData.id); if (rowIndex === -1) throw new Error('Link não encontrado.');
        linksSheet.getRange(rowIndex, colMap['phone'] + 1).setValue(reqData.phone);
        linksSheet.getRange(rowIndex, colMap['instagram'] + 1).setValue(reqData.instagram);
        linksSheet.getRange(rowIndex, colMap['email'] + 1).setValue(reqData.email);
        linksSheet.getRange(rowIndex, colMap['cpf'] + 1).setValue(reqData.cpf);
        linksSheet.getRange(rowIndex, colMap['cnpj'] + 1).setValue(reqData.cnpj);
        linksSheet.getRange(rowIndex, colMap['companyname'] + 1).setValue(reqData.companyName);
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: { id: reqData.id } })).setMimeType(ContentService.MimeType.JSON);
      }
      case 'GET_REPORT': {
        if (!linksSheet || linksSheet.getLastRow() < 2) {
          return ContentService.createTextOutput(JSON.stringify({ success: true, data: { totalClicks: 0, links: [], startDate: reqData.startDate, endDate: reqData.endDate } })).setMimeType(ContentService.MimeType.JSON);
        }

        const clicksLogSheet = spreadsheet.getSheetByName(CLICKS_LOG_SHEET_NAME);
        if (!clicksLogSheet || clicksLogSheet.getLastRow() < 2) {
            return ContentService.createTextOutput(JSON.stringify({ success: true, data: { totalClicks: 0, links: [], startDate: reqData.startDate, endDate: reqData.endDate, filterName: 'Geral' } })).setMimeType(ContentService.MimeType.JSON);
        }

        const logValues = clicksLogSheet.getRange(2, 1, clicksLogSheet.getLastRow() - 1, 2).getValues();
        const start = new Date(reqData.startDate + 'T00:00:00Z').getTime();
        const end = new Date(reqData.endDate + 'T23:59:59Z').getTime();

        const clicksInPeriod = {};
        let totalClicks = 0;
        
        const linkFilter = reqData.linkId !== 'all' ? reqData.linkId : null;

        logValues.forEach(row => {
            const clickId = row[0];
            const clickDate = new Date(row[1]).getTime();
            if (clickDate >= start && clickDate <= end) {
                if (!linkFilter || String(linkFilter) === String(clickId)) {
                    clicksInPeriod[clickId] = (clicksInPeriod[clickId] || 0) + 1;
                    totalClicks++;
                }
            }
        });
        
        validateRequiredColumns(colMap, ['id', 'name']);
        const allLinksValues = linksSheet.getRange(2, 1, linksSheet.getLastRow() - 1, linksSheet.getLastColumn()).getValues();
        const linkIdToNameMap = {};
        allLinksValues.forEach(row => {
            linkIdToNameMap[row[colMap['id']]] = row[colMap['name']];
        });

        const reportLinks = Object.keys(clicksInPeriod).map(id => ({
            id: id,
            name: linkIdToNameMap[id] || 'Nome não encontrado',
            clicksInPeriod: clicksInPeriod[id]
        })).sort((a, b) => b.clicksInPeriod - a.clicksInPeriod);

        const filterName = linkFilter ? linkIdToNameMap[linkFilter] : 'Geral';

        return ContentService.createTextOutput(JSON.stringify({ success: true, data: { totalClicks, links: reportLinks, startDate: reqData.startDate, endDate: reqData.endDate, filterName } })).setMimeType(ContentService.MimeType.JSON);
      }
      // Ações do Calendário
      case 'GET_CALENDAR_EVENTS': {
        const { calendarId, startDate, endDate } = reqData; if (!calendarId) throw new Error("ID da Google Agenda não fornecido.");
        const calendar = CalendarApp.getCalendarById(calendarId); if (!calendar) throw new Error("Agenda não encontrada.");
        const events = calendar.getEvents(new Date(startDate), new Date(endDate + 'T23:59:59Z'));
        const formattedEvents = events.map(event => ({ id: event.getId(), title: event.getTitle(), start: event.getStartTime().toISOString(), end: event.getEndTime().toISOString(), isAllDay: event.isAllDayEvent(), description: event.getDescription() }));
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: formattedEvents })).setMimeType(ContentService.MimeType.JSON);
      }
      case 'CREATE_CALENDAR_EVENT': {
          const { calendarId, title, start, end, description } = reqData;
          const calendar = CalendarApp.getCalendarById(calendarId); if (!calendar) throw new Error("Agenda não encontrada.");
          const newEvent = calendar.createEvent(title, new Date(start), new Date(end), { description: description });
          const formattedEvent = { id: newEvent.getId(), title: newEvent.getTitle(), start: newEvent.getStartTime().toISOString(), end: newEvent.getEndTime().toISOString(), isAllDay: newEvent.isAllDayEvent(), description: newEvent.getDescription() };
          return ContentService.createTextOutput(JSON.stringify({ success: true, data: formattedEvent })).setMimeType(ContentService.MimeType.JSON);
      }
      case 'UPDATE_CALENDAR_EVENT': {
          const { calendarId, id, title, start, end, description } = reqData;
          const calendar = CalendarApp.getCalendarById(calendarId); if (!calendar) throw new Error("Agenda não encontrada.");
          const event = calendar.getEventById(id); if (!event) throw new Error("Evento não encontrado.");
          event.setTitle(title);
          event.setTime(new Date(start), new Date(end));
          event.setDescription(description);
          return ContentService.createTextOutput(JSON.stringify({ success: true, data: { message: "Evento atualizado."} })).setMimeType(ContentService.MimeType.JSON);
      }
      case 'DELETE_CALENDAR_EVENT': {
          const { calendarId, eventId } = reqData;
          const calendar = CalendarApp.getCalendarById(calendarId); if (!calendar) throw new Error("Agenda não encontrada.");
          const event = calendar.getEventById(eventId); if (!event) throw new Error("Evento não encontrado para deletar.");
          event.deleteEvent();
          return ContentService.createTextOutput(JSON.stringify({ success: true, data: { message: "Evento deletado."} })).setMimeType(ContentService.MimeType.JSON);
      }
      case 'ADD_ROUTINE_TASK': {
        const { calendarId, text, frequency, dayOfWeek, time } = reqData;
        scheduleRoutineTask(calendarId, text, frequency, dayOfWeek, time);
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: { message: "Tarefa de rotina agendada." } })).setMimeType(ContentService.MimeType.JSON);
      }
      // Ações Financeiras
      case 'GET_TRANSACTIONS': {
          const sheet = getOrCreateSheet_(spreadsheet, FINANCEIRO_SHEET_NAME, ['id', 'date', 'description', 'type', 'amount', 'relatedContractId']);
          if (sheet.getLastRow() < 2) return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] })).setMimeType(ContentService.MimeType.JSON);
          const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
          const values = range.getValues(); 
          const headersMap = getColsMap(sheet);
          const transactions = values.map(row => ({ 
              id: row[headersMap['id']], 
              date: row[headersMap['date']], 
              description: row[headersMap['description']], 
              type: row[headersMap['type']], 
              amount: row[headersMap['amount']], 
              relatedContractId: row[headersMap['relatedcontractid']] 
          }));
          return ContentService.createTextOutput(JSON.stringify({ success: true, data: transactions })).setMimeType(ContentService.MimeType.JSON);
      }
      case 'ADD_TRANSACTION': {
          const newTransaction = addTransaction(reqData);
          return ContentService.createTextOutput(JSON.stringify({ success: true, data: newTransaction })).setMimeType(ContentService.MimeType.JSON);
      }
      // Ações de CRM
      case 'GET_CRM_LEADS': {
        const crmSheet = getOrCreateSheet_(spreadsheet, SHEET_CRM_NOCA, CRM_HEADERS);
        if (crmSheet.getLastRow() < 2) return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] })).setMimeType(ContentService.MimeType.JSON);
        const range = crmSheet.getRange(2, 1, crmSheet.getLastRow() - 1, crmSheet.getLastColumn());
        const values = range.getValues();
        const colMap = getColsMap(crmSheet);
        const leads = values.map(row => {
          return {
            id: row[colMap['id_contato']],
            name: row[colMap['nome']],
            phone: row[colMap['telefone']], // Assume a coluna Telefone tem o número normalizado
            stage: row[colMap['fasefunil']]
          };
        });
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: leads })).setMimeType(ContentService.MimeType.JSON);
      }
      case 'UPDATE_CRM_STAGE': {
        const { phone, newStage } = reqData; // Phone aqui é o ID_CONTATO
        if (!phone || !newStage) throw new Error("ID do Contato e nova fase são obrigatórios.");
        addOrUpdateCrmContact_({ id: phone, stage: newStage });
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: { phone, newStage } })).setMimeType(ContentService.MimeType.JSON);
      }
      // Ações do WhatsApp / Chat
      case 'SET_ATTENDANCE_MODE': {
        const { phone, mode } = reqData; if (!phone || !mode) throw new Error("Telefone e modo são obrigatórios.");
        setModoAtendimento_(phone, mode);
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: { phone, mode } })).setMimeType(ContentService.MimeType.JSON);
      }
      case 'GET_CONVERSATIONS': {
        const sheet = getOrCreateSheet_(spreadsheet, SHEET_HIST_CHAT, ["Phone","Direcao","Mensagem","DataHora"]);
        if (sheet.getLastRow() < 2) return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] })).setMimeType(ContentService.MimeType.JSON);
        
        // Garante que a coluna "Phone" seja tratada como texto para evitar problemas de formatação com JIDs.
        sheet.getRange("A:A").setNumberFormat("@");

        const crmSheet = getOrCreateSheet_(spreadsheet, SHEET_CRM_NOCA, CRM_HEADERS);
        const idToNameMap = {};
        if (crmSheet.getLastRow() > 1) {
          const crmData = crmSheet.getRange(2, 1, crmSheet.getLastRow() - 1, crmSheet.getLastColumn()).getValues();
          const idColIdx = getHeaderIndex_(crmSheet, "ID_CONTATO"); 
          const nameColIdx = getHeaderIndex_(crmSheet, "Nome");
          if(idColIdx > -1 && nameColIdx > -1) { 
            crmData.forEach(row => { 
              const rawId = row[idColIdx]; 
              if (rawId) idToNameMap[rawId] = row[nameColIdx]; 
            }); 
          }
        }

        const attendanceSheet = getOrCreateSheet_(spreadsheet, SHEET_ATENDIMENTO, ["Phone","ModoAtendimento","UltimaAtualizacao"]);
        const phoneToModeMap = {};
        if(attendanceSheet.getLastRow() > 1) { 
            const attendanceData = attendanceSheet.getRange(2, 1, attendanceSheet.getLastRow() - 1, 2).getValues(); 
            attendanceData.forEach(row => { 
                const phoneId = String(row[0] || ""); 
                if (phoneId) phoneToModeMap[phoneId] = row[1]; 
            }); 
        }

        const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
        const values = range.getValues();
        const displayValues = range.getDisplayValues();

        const messages = values
          .map((row, index) => {
              const displayRow = displayValues[index];
              const rawChatId = String(displayRow[0] || ""); // Use display value for ID to prevent number precision loss
              const timestamp = row[3]; // Use value for Date object

              return { 
                messageid: rawChatId + '_' + (timestamp ? new Date(timestamp).getTime() : 'no-ts') + '_' + (index + 2), // Use original index from sheet for a truly unique key
                chatid: rawChatId, 
                sendername: idToNameMap[rawChatId] || rawChatId, 
                text: row[2], 
                timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(), 
                isfromme: (row[1] === 'BOT' || row[1] === 'HUMANO'), 
                attendanceMode: phoneToModeMap[rawChatId] || 'BOT' 
              };
          })
          .filter(msg => msg.chatid && msg.chatid.trim() !== ''); // Filter out empty rows AFTER mapping

        return ContentService.createTextOutput(JSON.stringify({ success: true, data: messages })).setMimeType(ContentService.MimeType.JSON);
      }
      case 'SEND_HUMAN_MESSAGE': {
        const { phone, message } = reqData; 
        if (!phone || !message) throw new Error("Telefone e mensagem são obrigatórios.");

        const settings = getSettings_(spreadsheet);
        const { zapiInstanceId, zapiToken, zapiClientToken } = settings;

        if (!zapiInstanceId || !zapiToken) {
          throw new Error("Credenciais da Z-API (ID da Instância e Token) não configuradas no NOCA Gestor.");
        }

        const apiUrl = `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiToken}/send-text`;
        const payload = { phone: phone, message: message }; 
        
        const headers = {};
        if (zapiClientToken) {
          headers['Client-Token'] = zapiClientToken;
        }

        const options = { 
          'method': 'post', 
          'contentType': 'application/json', 
          'payload': JSON.stringify(payload),
          'headers': headers,
          'muteHttpExceptions': true
        };

        const response = UrlFetchApp.fetch(apiUrl, options);
        const responseCode = response.getResponseCode();
        const responseBody = response.getContentText();

        if (responseCode === 200) {
            logMessageToHistory_(phone, "HUMANO", message);
            return ContentService.createTextOutput(JSON.stringify({ success: true, data: { message: "Enviado com sucesso." } })).setMimeType(ContentService.MimeType.JSON);
        } else {
            let errorMessage = `Falha ao enviar mensagem via Z-API (Código: ${responseCode})`;
            try {
              const errorJson = JSON.parse(responseBody);
              if (errorJson.error) {
                errorMessage += `: ${errorJson.error}`;
              } else {
                errorMessage += `. Resposta: ${responseBody}`;
              }
            } catch (e) {
                errorMessage += `. Resposta: ${responseBody}`;
            }
            throw new Error(errorMessage);
        }
      }
      // Ações de Configurações
      case 'GET_SETTINGS': {
        const settings = getSettings_(spreadsheet);
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: settings })).setMimeType(ContentService.MimeType.JSON);
      }
      case 'UPDATE_SETTINGS': {
        const sheet = getOrCreateSheet_(spreadsheet, SETTINGS_SHEET_NAME, ['Key', 'Value']);
        const newSettings = reqData;
        const data = sheet.getDataRange().getValues();
        const existingKeys = {};
        for (let i = 1; i < data.length; i++) {
          existingKeys[data[i][0]] = i + 1;
        }
        for (const key in newSettings) {
          const value = newSettings[key];
          if (existingKeys[key]) {
            sheet.getRange(existingKeys[key], 2).setValue(value);
          } else {
            sheet.appendRow([key, value]);
          }
        }
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: { message: "Settings updated" } })).setMimeType(ContentService.MimeType.JSON);
      }
       // Ações de Rotinas
      case 'GET_ROUTINE_TASKS': {
        const sheet = getOrCreateSheet_(spreadsheet, ROUTINE_TASKS_SHEET_NAME, ['id', 'text', 'frequency', 'dayOfWeek', 'time', 'isCustom', 'isArchived']);
        const customTasks = [];
        const archivedDefaultTaskIds = [];
        if (sheet.getLastRow() > 1) {
          const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
          const colMap = getColsMap(sheet);
          values.forEach(row => {
            const isCustom = row[colMap['iscustom']];
            const isArchived = row[colMap['isarchived']];
            const id = row[colMap['id']];
            if (isCustom === true) {
              customTasks.push({
                id: id,
                text: row[colMap['text']],
                frequency: row[colMap['frequency']],
                dayOfWeek: row[colMap['dayofweek']],
                time: row[colMap['time']],
                isCustom: true,
                isArchived: isArchived === true
              });
            } else if (isArchived === true) {
              archivedDefaultTaskIds.push(id);
            }
          });
        }
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: { customTasks, archivedDefaultTaskIds } })).setMimeType(ContentService.MimeType.JSON);
      }
      case 'UPDATE_ROUTINE_TASKS': {
        const headers = ['id', 'text', 'frequency', 'dayOfWeek', 'time', 'isCustom', 'isArchived'];
        const sheet = getOrCreateSheet_(spreadsheet, ROUTINE_TASKS_SHEET_NAME, headers);
        sheet.clearContents();
        sheet.appendRow(headers);
        
        reqData.customTasks.forEach(task => {
          sheet.appendRow([task.id, task.text, task.frequency, task.dayOfWeek || '', task.time || '', true, task.isArchived]);
        });

        reqData.archivedDefaultTaskIds.forEach(id => {
          sheet.appendRow([id, '', '', '', '', false, true]);
        });
        
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: { message: "Routine tasks updated" } })).setMimeType(ContentService.MimeType.JSON);
      }
      default:
        throw new Error('Ação desconhecida: ' + action + '. Verifique se você publicou a versão mais recente do script (Implantar > Nova implantação).');
    }
}


// --- MANIPULADOR DE WEBHOOK Z-API ---
function handleZapiWebhook_(json, spreadsheet) {
  const textoMensagem = (json.text && json.text.message) || json.body || json.message || '[Mídia]';
  const rawPhoneId = json.phone || json.chatId; // chatId pode ser o ID do grupo
  if(rawPhoneId){
    const jid = normalizeIdToJid_(rawPhoneId); // NORMALIZA O ID
    if (jid) {
      // Cria ou atualiza o contato no CRM ANTES de registrar a mensagem
      addOrUpdateCrmContact_({ id: jid, name: json.senderName });
      logMessageToHistory_(jid, "RECEBIDA", textoMensagem);
    }
  }

  // Exemplo de como você chamaria a lógica do bot:
  // processaMensagemRecebida(json);

  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}


// --- FUNÇÕES HELPER PARA O CHAT ---
function logMessageToHistory_(phone, direction, message) {
  try {
    const sheet = getOrCreateSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEET_HIST_CHAT, ["Phone","Direcao","Mensagem","DataHora"]);
    // Garante que a coluna "Phone" seja tratada como texto para evitar problemas de formatação com JIDs.
    if (sheet.getRange("A1").getNumberFormat() !== "@") {
      sheet.getRange("A:A").setNumberFormat("@");
    }
    sheet.appendRow([phone, direction, message, new Date()]);
  } catch (e) {
    Logger.log("Falha ao registrar mensagem no histórico para " + phone + ": " + e.toString());
  }
}

function setModoAtendimento_(phone, mode) {
  const rawPhoneId = String(phone || ""); 
  if (!rawPhoneId) return;
  const sheet = getOrCreateSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEET_ATENDIMENTO, ["Phone","ModoAtendimento","UltimaAtualizacao"]);
  if (sheet.getLastRow() < 2) { 
    sheet.appendRow([rawPhoneId, mode, new Date()]); 
    return; 
  }
  const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1);
  const result = range.createTextFinder(rawPhoneId).matchEntireCell(true).findNext();
  if (result) {
    const rowIndex = result.getRow();
    sheet.getRange(rowIndex, 2).setValue(mode); 
    sheet.getRange(rowIndex, 3).setValue(new Date());
  } else {
    sheet.appendRow([rawPhoneId, mode, new Date()]);
  }
}