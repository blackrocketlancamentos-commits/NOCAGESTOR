
// === NOCA GESTOR COMPLETO - API ===
// Versão: 2.0 - Restaurado

// Nomes das abas da planilha
const LINKS_SHEET_NAME = "Links";
const CLICKS_LOG_SHEET_NAME = "ClicksLog";
const FINANCEIRO_SHEET_NAME = "Financeiro";
const CONVERSAS_SHEET_NAME = "Conversas";
const CRM_SHEET_NAME = "CRM";
const CONFIGURACOES_SHEET_NAME = "Configuracoes";
const WEBHOOK_LOG_SHEET_NAME = "WebhookLog";

// --- FUNÇÕES DE RESPOSTA ---
function createJsonResponse(success, dataOrError) {
  const output = { success: success, ...(success ? { data: dataOrError } : { error: dataOrError }) };
  if (!success) Logger.log("ERROR: " + dataOrError);
  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
}

function createRedirectHtmlResponse(url, name) {
  const html = `<!DOCTYPE html><html><head><title>Redirecionando...</title><script>window.setTimeout(function(){window.top.location.href = "${url}";}, 250);</script></head><body><p>Redirecionando para ${name}...</p></body></html>`;
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function createErrorHtmlResponse(title, message) {
  const html = `<!DOCTYPE html><html><head><title>Erro</title></head><body><h1>${title}</h1><p>${message}</p></body></html>`;
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// --- FUNÇÕES AUXILIARES DA PLANILHA ---
function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) sheet.appendRow(headers);
  } else if (sheet.getLastRow() === 0 && headers && headers.length > 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function getColsMap(sheet) {
  if (!sheet || sheet.getLastRow() < 1) return {};
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colMap = {};
  headers.forEach((h, i) => {
    if (typeof h === 'string' && h.trim()) colMap[h.toLowerCase().trim().replace(/\s+/g, '')] = i;
  });
  return colMap;
}

function findRowIndexBy(sheet, colMap, key, value) {
  if (!value || sheet.getLastRow() < 2) return -1;
  const colIndex = colMap[key];
  if (colIndex === undefined) return -1;
  const range = sheet.getRange(2, colIndex + 1, sheet.getLastRow() - 1, 1);
  const result = range.createTextFinder(String(value)).matchEntireCell(true).findNext();
  return result ? result.getRow() : -1;
}

function sheetToJSON(sheet) {
  if (sheet.getLastRow() < 2) return [];
  const colMap = getColsMap(sheet);
  const headers = Object.keys(colMap);
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return values.map(row => {
    const obj = {};
    headers.forEach(header => {
      // Converte o nome da coluna para camelCase (ex: companyname -> companyName)
      const camelCaseHeader = header.charAt(0).toLowerCase() + header.slice(1);
      obj[camelCaseHeader] = row[colMap[header]];
    });
    return obj;
  });
}

// --- LÓGICA DE WEBHOOK (para Z-API) ---
function logWebhook(request) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = getOrCreateSheet(ss, WEBHOOK_LOG_SHEET_NAME, ['timestamp', 'content']);
  logSheet.insertRowBefore(2); // Insere na parte de cima
  logSheet.getRange(2, 1, 1, 2).setValues([[new Date().toISOString(), JSON.stringify(request)]]);
  if (logSheet.getLastRow() > 21) { // Mantém apenas os últimos 20 logs
    logSheet.deleteRow(22);
  }
}

// --- LÓGICA PRINCIPAL (doGet, doPost) ---

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const linksSheet = getOrCreateSheet(ss, LINKS_SHEET_NAME);
    
    if (e.parameter.id) {
      const linkId = e.parameter.id;
      const colMap = getColsMap(linksSheet);
      if (colMap['id'] === undefined) throw new Error(`Coluna 'id' não encontrada na aba '${LINKS_SHEET_NAME}'.`);
      
      const rowIndex = findRowIndexBy(linksSheet, colMap, 'id', linkId);
      if (rowIndex === -1) return createErrorHtmlResponse("Link Não Encontrado", "Este link de rastreio não foi localizado.");
      
      // Incrementa clique
      const clicksCell = linksSheet.getRange(rowIndex, colMap['clicks'] + 1);
      clicksCell.setValue((parseInt(clicksCell.getValue(), 10) || 0) + 1);

      // Loga clique
      const logSheet = getOrCreateSheet(ss, CLICKS_LOG_SHEET_NAME, ['linkId', 'timestamp']);
      logSheet.appendRow([linkId, new Date().toISOString()]);
      
      SpreadsheetApp.flush();
      
      const originalUrl = linksSheet.getRange(rowIndex, colMap['originalurl'] + 1).getValue();
      const clientName = linksSheet.getRange(rowIndex, colMap['name'] + 1).getValue();
      return createRedirectHtmlResponse(originalUrl, clientName);
    }
    return createErrorHtmlResponse("URL Incompleta", "ID de rastreio faltando.");
  } catch (err) {
    return createErrorHtmlResponse("Erro de Sistema", `Ocorreu um erro: ${err.message}`);
  }
}

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    logWebhook(request); // Loga todas as requisições POST para diagnóstico

    // Se a requisição for de um webhook da Z-API, processe-a
    if (request.type === "message" || request.phone) {
      // Lógica para salvar a mensagem na aba 'Conversas'
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const conversasSheet = getOrCreateSheet(ss, CONVERSAS_SHEET_NAME, ['chatid', 'messageid', 'text', 'isfromme', 'timestamp', 'sendername', 'attendanceMode']);
      conversasSheet.appendRow([
        request.chatId,
        request.messageId,
        request.text?.body || JSON.stringify(request.text),
        request.fromMe,
        new Date(request.timestamp * 1000).toISOString(),
        request.senderName,
        'BOT' // Default mode
      ]);
      return createJsonResponse(true, "Webhook received");
    }

    // Se for uma ação do nosso app, continue
    const action = request.action;
    const data = request.data;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    switch (action) {
      case 'PING':
        return createJsonResponse(true, { status: 'ok' });

      // Funções de Links/Contratos
      case 'GET_LINKS': {
        const linksSheet = getOrCreateSheet(ss, LINKS_SHEET_NAME);
        return createJsonResponse(true, sheetToJSON(linksSheet));
      }
      case 'CREATE': {
        const linksSheet = getOrCreateSheet(ss, LINKS_SHEET_NAME, ['id', 'name', 'companyName', 'originalUrl', 'clicks', 'workMaterialUrls', 'startDate', 'endDate', 'phone', 'instagram', 'email', 'packageInfo', 'isArchived', 'createdAt', 'clientType', 'cpf', 'cnpj']);
        const newId = Utilities.getUuid();
        const newRow = [newId, data.name, data.companyName, data.url, 0, JSON.stringify(data.workMaterialUrls || []), data.startDate, data.endDate, data.phone, data.instagram, data.email, data.packageInfo, false, new Date().toISOString(), data.clientType, data.cpf, data.cnpj];
        linksSheet.appendRow(newRow);
        // Retorna o objeto completo para o front-end
        const newLink = {};
        linksSheet.getRange(1, 1, 1, linksSheet.getLastColumn()).getValues()[0].forEach((header, i) => newLink[header] = newRow[i]);
        return createJsonResponse(true, newLink);
      }
      case 'DELETE_CONTRACT': {
          const linksSheet = getOrCreateSheet(ss, LINKS_SHEET_NAME);
          const colMap = getColsMap(linksSheet);
          const rowIndex = findRowIndexBy(linksSheet, colMap, 'id', data.id);
          if (rowIndex === -1) throw new Error('Contrato não encontrado.');
          linksSheet.deleteRow(rowIndex);
          return createJsonResponse(true, { id: data.id });
      }
      // Outras funções de update... (UPDATE_DATES, UPDATE_CONTACT_INFO, etc.)

      // Funções do Financeiro
      case 'GET_TRANSACTIONS': {
        const sheet = getOrCreateSheet(ss, FINANCEIRO_SHEET_NAME);
        return createJsonResponse(true, sheetToJSON(sheet));
      }
      case 'ADD_TRANSACTION': {
        const sheet = getOrCreateSheet(ss, FINANCEIRO_SHEET_NAME, ['id', 'date', 'description', 'type', 'amount', 'relatedContractId']);
        const newId = Utilities.getUuid();
        sheet.appendRow([newId, data.date, data.description, data.type, data.amount, data.relatedContractId || '']);
        return createJsonResponse(true, { id: newId, ...data });
      }

      // Funções do WhatsApp/CRM
      case 'GET_CONVERSATIONS': {
        const sheet = getOrCreateSheet(ss, CONVERSAS_SHEET_NAME);
        return createJsonResponse(true, sheetToJSON(sheet));
      }
      case 'GET_CRM_LEADS': {
        const sheet = getOrCreateSheet(ss, CRM_SHEET_NAME);
        return createJsonResponse(true, sheetToJSON(sheet));
      }
      case 'UPDATE_CRM_STAGE': {
        const sheet = getOrCreateSheet(ss, CRM_SHEET_NAME);
        const colMap = getColsMap(sheet);
        const rowIndex = findRowIndexBy(sheet, colMap, 'id', data.phone); // 'phone' no front-end é o 'id' aqui
        if (rowIndex === -1) throw new Error('Lead não encontrado.');
        sheet.getRange(rowIndex, colMap['stage'] + 1).setValue(data.newStage);
        return createJsonResponse(true, { success: true });
      }

      // Funções de Configurações
      case 'GET_SETTINGS': {
        const sheet = getOrCreateSheet(ss, CONFIGURACOES_SHEET_NAME, ['key', 'value']);
        if (sheet.getLastRow() < 2) return createJsonResponse(true, {});
        const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
        const settings = values.reduce((obj, row) => { obj[row[0]] = row[1]; return obj; }, {});
        return createJsonResponse(true, settings);
      }
      case 'UPDATE_SETTINGS': {
        const sheet = getOrCreateSheet(ss, CONFIGURACOES_SHEET_NAME, ['key', 'value']);
        Object.keys(data).forEach(key => {
          const rowIndex = findRowIndexBy(sheet, getColsMap(sheet), 'key', key);
          if (rowIndex !== -1) {
            sheet.getRange(rowIndex, 2).setValue(data[key]);
          } else {
            sheet.appendRow([key, data[key]]);
          }
        });
        return createJsonResponse(true, { success: true });
      }

      // Funções de Diagnóstico
      case 'GET_WEBHOOK_LOGS': {
        const sheet = getOrCreateSheet(ss, WEBHOOK_LOG_SHEET_NAME);
        return createJsonResponse(true, sheetToJSON(sheet));
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }
  } catch (err) {
    Logger.log(err);
    return createJsonResponse(false, err.message);
  }
}
