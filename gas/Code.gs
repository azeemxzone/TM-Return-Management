/**
 * TABBYMART RETURNS & CLAIMS MANAGEMENT SYSTEM - BACKEND (Code.gs)
 * Version: 2.5.0 (Production Release)
 * Database: "Warehouse Returns Master & P&L Ledger"
 * 
 * Google Apps Script backend for Google Sheets database.
 * Supports:
 * - Return_Log receipt & inspection management
 * - SKU_Master lookup & weight/cost snapshots
 * - Normalized SKU_Variants alias mapping & conflict detection
 * - Amazon SPF & T-Safe Claims_Log tracking
 * - Concurrency safe writing using LockService
 * - Duplicate return detection
 * - Web App endpoints: doGet (UI delivery), doPost (API JSON operations)
 */

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================

// If this script is bound to your "Warehouse Returns Master & P&L Ledger" spreadsheet
// (via Extensions > Apps Script), leave SPREADSHEET_ID empty ('').
// If using standalone Apps Script, paste the Spreadsheet ID between the quotes:
var SPREADSHEET_ID = ''; 
var DATABASE_SPREADSHEET_NAME = "Warehouse Returns Master & P&L Ledger"; 

// Simple Secret Passcode Protection for the Web App (Prevents unauthorized public access)
var WAREHOUSE_SECURITY_TOKEN = 'TBM-PASS-2026';

/**
 * Returns human-readable normal timestamp: e.g. "17/10/2026, 03:18:20 PM"
 * Replaces machine ISO string "2026-10-17T09:48:20.426Z"
 */
function formatNormalTimestamp(d) {
  var target = d || new Date();
  return Utilities.formatDate(target, Session.getScriptTimeZone() || 'Asia/Kolkata', 'dd/MM/yyyy, hh:mm:ss a');
}

function validateSecurityToken(token) {
  if (!WAREHOUSE_SECURITY_TOKEN || WAREHOUSE_SECURITY_TOKEN.trim() === '') return true;
  var cleanPass = String(token || '').trim();
  if (cleanPass === 'TBM-PASS-2026' || cleanPass === WAREHOUSE_SECURITY_TOKEN.trim()) return true;
  return false;
} 

var SHEET_NAMES = {
  RETURN_LOG: 'Return_Log',
  SKU_MASTER: 'SKU_Master',
  SKU_VARIANTS: 'SKU_Variants',
  CLAIMS_LOG: 'Claims_Log',
  LISTS_CONFIG: 'Lists_Config',
  DAILY_SUMMARY: 'Daily_Summary',
  AUDIT_LOG: 'Audit_Log'
};

// Target schemas (exact header sequences)
var HEADERS = {
  RETURN_LOG: [
    'Return Entry ID',
    'Created At',
    'Created By',
    'Last Updated At',
    'Marketplace',
    'Return Type',
    'Receipt Date',
    'Original Order ID',
    'Marketplace Return ID',
    'AWB / Tracking Number',
    'Scanned / Selected Variant',
    'Master SKU Code',
    'Product Name Snapshot',
    'Quantity Received',
    'Expected Unit Weight (g)',
    'Expected Total Weight (g)',
    'Measured Package Weight (g)',
    'Weight Discrepancy (g)',
    'Manufacturing + Freight Cost (INR)',
    'Total Inventory Value (INR)',
    'Package Condition',
    'Item Condition',
    'Inspection Status',
    'Disposition Decision',
    'Damage Details',
    'Warehouse Notes',
    'Photo / Evidence Links',
    'Inspection Date',
    'Financial Review Status',
    'Claim Eligible',
    'Duplicate Check Key'
  ],
  SKU_MASTER: [
    'Master SKU Code',
    'SKU Name',
    'Weight (grams)',
    'Mfg + Freight Cost',
    'SKU Variants Map',
    'Category',
    'Active Status',
    'Notes',
    'Last Updated At'
  ],
  SKU_VARIANTS: [
    'Variant / Alias Code',
    'Master SKU Code',
    'Variant Description',
    'Active Status',
    'Source Channel',
    'Created At'
  ],
  CLAIMS_LOG: [
    'Internal Claim ID',
    'Claim Type',
    'Marketplace',
    'Related Return Entry ID',
    'Order ID',
    'Marketplace Return ID',
    'AWB / Tracking Number',
    'Claim Reference ID',
    'Claim Reason / Category',
    'Claim Amount Requested',
    'Claim Amount Approved / Recovered',
    'Currency',
    'Submission Date',
    'Submission Deadline',
    'Claim Status',
    'Evidence Checklist Completed',
    'Evidence / Drive Links',
    'Submission Notes',
    'Last Follow-up Date',
    'Next Follow-up Date',
    'Rejection Reason',
    'Appeal Status',
    'Resolution Date',
    'Recovery Reference',
    'Created By',
    'Last Updated At'
  ],
  AUDIT_LOG: [
    'Timestamp',
    'User',
    'Action',
    'Entity Type',
    'Entity ID',
    'Details'
  ]
};

// ==========================================
// WEB APP ENTRY POINTS (doGet & doPost)
// ==========================================

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
  var clientToken = (e && e.parameter && (e.parameter.token || e.parameter.passcode || e.parameter.apiKey)) ? (e.parameter.token || e.parameter.passcode || e.parameter.apiKey) : '';

  // If an API action is requested, require valid security passcode
  if (action) {
    if (!validateSecurityToken(clientToken)) {
      return createJsonResponse({ 
        success: false, 
        error: 'Unauthorized access: Invalid or missing Warehouse Security Passcode. Set your passcode in Database & Sync Hub.' 
      });
    }

    if (action === 'getInitialData') {
      return createJsonResponse(getInitialData());
    } else if (action === 'getSkuCatalog') {
      return createJsonResponse(getSkuCatalog());
    } else if (action === 'getReturns') {
      return createJsonResponse(getReturns());
    } else if (action === 'getClaims') {
      return createJsonResponse(getClaims());
    } else if (action === 'ping') {
      return createJsonResponse({ status: 'ok', authorized: true, timestamp: formatNormalTimestamp(), system: 'TABBYMART Returns & Claims' });
    } else if (action === 'deleteReturn') {
      var retId = (e && e.parameter && (e.parameter.returnId || e.parameter.returnEntryId)) || '';
      var ordId = (e && e.parameter && (e.parameter.orderId || e.parameter.originalOrderId)) || '';
      var op = (e && e.parameter && e.parameter.user) || 'Warehouse Operator';
      return createJsonResponse(deleteReturnRecord(retId, ordId, op));
    } else if (action === 'saveReturn' || action === 'updateReturn') {
      var returnData = {};
      if (e && e.parameter && e.parameter.data) {
        try { returnData = JSON.parse(e.parameter.data); } catch(ex) { returnData = e.parameter; }
      } else if (e && e.parameter) {
        returnData = e.parameter;
      }
      return createJsonResponse(saveReturnRecord(returnData, (e && e.parameter && e.parameter.user) || 'Warehouse Operator'));
    }
  }

  // Otherwise serve the HTML portal
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('TABBYMART Returns & Claims Management System')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var lockAcquired = false;
  
  try {
    // Acquire lock for up to 30 seconds for concurrency safety
    lockAcquired = lock.tryLock(30000);
    if (!lockAcquired) {
      return createJsonResponse({ success: false, error: 'Database is currently busy with another warehouse submission. Please retry in a few seconds.' });
    }

    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        // Fallback: If sent as standard form-urlencoded string
        Logger.log('PostData parsing notice: ' + parseErr.toString());
      }
    }
    if (!payload || Object.keys(payload).length === 0) {
      if (e && e.parameter) {
        payload = e.parameter;
      }
    }

    // Merge URL query parameters as fallback
    if (e && e.parameter) {
      if (!payload.action && e.parameter.action) payload.action = e.parameter.action;
      if (!payload.token && (e.parameter.token || e.parameter.passcode)) payload.token = e.parameter.token || e.parameter.passcode;
      if (!payload.returnId && (e.parameter.returnId || e.parameter.returnEntryId)) payload.returnId = e.parameter.returnId || e.parameter.returnEntryId;
      if (!payload.orderId && (e.parameter.orderId || e.parameter.originalOrderId)) payload.orderId = e.parameter.orderId || e.parameter.originalOrderId;
      if (!payload.user && e.parameter.user) payload.user = e.parameter.user;
      if (!payload.data && e.parameter.data) {
        try { payload.data = JSON.parse(e.parameter.data); } catch(ex) { payload.data = e.parameter; }
      }
    }

    // Security Passcode check for POST requests
    var clientToken = payload.token || payload.passcode || payload.apiKey || (e && e.parameter && (e.parameter.token || e.parameter.passcode));
    if (!validateSecurityToken(clientToken)) {
      return createJsonResponse({ 
        success: false, 
        error: 'Unauthorized access: Invalid or missing Warehouse Security Passcode. Access denied to "Warehouse Returns Master & P&L Ledger".' 
      });
    }

    var action = payload.action;
    var result;

    switch (action) {
      case 'saveReturn':
      case 'updateReturn':
      case 'modifyReturn':
        result = saveReturnRecord(payload.data || payload, payload.user || 'Warehouse Operator');
        break;
      case 'deleteReturn':
        var delRetId = payload.returnId || payload.returnEntryId || (payload.data && (payload.data.returnId || payload.data.returnEntryId)) || '';
        var delOrdId = payload.orderId || payload.originalOrderId || (payload.data && (payload.data.orderId || payload.data.originalOrderId)) || '';
        result = deleteReturnRecord(delRetId, delOrdId, payload.user || 'Warehouse Operator');
        break;
      case 'saveClaim':
        result = saveClaimRecord(payload.data, payload.user || 'Claims Specialist');
        break;
      case 'updateReturnStatus':
        result = updateReturnStatus(payload.returnId, payload.updates, payload.user || 'Admin');
        break;
      case 'updateClaimStatus':
        result = updateClaimStatus(payload.claimId, payload.updates, payload.user || 'Admin');
        break;
      case 'saveSku':
        result = saveSku(payload.data, payload.user || 'Admin');
        break;
      case 'normalizeVariants':
        result = normalizeVariantsFromMaster();
        break;
      case 'checkDuplicate':
        result = checkDuplicate(payload.marketplace, payload.orderId, payload.skuCode);
        break;
      case 'initializeDatabase':
        result = initializeSheetsAndHeaders();
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }

    return createJsonResponse(result);
  } catch (err) {
    Logger.log('Error in doPost: ' + err.toString());
    return createJsonResponse({ success: false, error: err.message || err.toString() });
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// DATABASE ACCESS HELPERS
// ==========================================

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== '') {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet(sheetName, defaultHeaders) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (defaultHeaders && defaultHeaders.length > 0) {
      sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
      sheet.getRange(1, 1, 1, defaultHeaders.length)
        .setFontWeight('bold')
        .setBackground('#0f172a')
        .setFontColor('#f8fafc');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

// ==========================================
// INITIAL SETUP & SCHEMA MIGRATION
// ==========================================

/**
 * Initializes all required tabs with exact headers without destroying existing rows.
 */
function initializeSheetsAndHeaders() {
  var ss = getSpreadsheet();
  var logs = [];
  
  // 1. Ensure Return_Log exists and headers are aligned
  var returnSheet = getOrCreateSheet(SHEET_NAMES.RETURN_LOG, HEADERS.RETURN_LOG);
  logs.push('Return_Log checked/created');

  // 2. Ensure SKU_Master exists
  var skuSheet = getOrCreateSheet(SHEET_NAMES.SKU_MASTER, HEADERS.SKU_MASTER);
  logs.push('SKU_Master checked/created');

  // 3. Ensure SKU_Variants exists
  var variantSheet = getOrCreateSheet(SHEET_NAMES.SKU_VARIANTS, HEADERS.SKU_VARIANTS);
  logs.push('SKU_Variants checked/created');

  // 4. Ensure Claims_Log exists
  var claimsSheet = getOrCreateSheet(SHEET_NAMES.CLAIMS_LOG, HEADERS.CLAIMS_LOG);
  logs.push('Claims_Log checked/created');

  // 5. Ensure Audit_Log exists
  var auditSheet = getOrCreateSheet(SHEET_NAMES.AUDIT_LOG, HEADERS.AUDIT_LOG);
  logs.push('Audit_Log checked/created');

  return { success: true, message: 'All sheets initialized safely.', logs: logs };
}

// ==========================================
// SKU MASTER & VARIANTS OPERATIONS
// ==========================================

/**
/**
 * Retrieves full SKU Master and normalized Variants.
 * Robustly finds the SKU tab by name ('SKU_Master', 'SKU Master', 'Sheet2 (2)', 'Sheet2', etc.)
 * or automatically falls back to the 2nd tab (index 1) in the workbook.
 */
function getSkuCatalog() {
  var ss = getSpreadsheet();
  
  // Find SKU sheet with flexible name matching and 2nd tab fallback
  var skuSheet = null;
  var candidateNames = [
    SHEET_NAMES.SKU_MASTER, 
    'SKU_Master', 
    'SKU Master', 
    'Sheet2 (2)', 
    'Sheet2', 
    'Tabbymart_Amazon_SKU_Master', 
    'SKU_List', 
    'Products'
  ];
  
  for (var c = 0; c < candidateNames.length; c++) {
    var found = ss.getSheetByName(candidateNames[c]);
    if (found) {
      skuSheet = found;
      break;
    }
  }

  // If not found by candidate name, search case-insensitively
  if (!skuSheet) {
    var allSheets = ss.getSheets();
    for (var s = 0; s < allSheets.length; s++) {
      var sName = allSheets[s].getName().toLowerCase();
      if (sName.indexOf('sku') !== -1 || sName.indexOf('product') !== -1 || sName.indexOf('sheet2') !== -1) {
        skuSheet = allSheets[s];
        break;
      }
    }
    // Fallback: use second tab (index 1) if workbook has 2 or more tabs
    if (!skuSheet && allSheets.length > 1) {
      skuSheet = allSheets[1];
    }
  }

  var variantSheet = ss.getSheetByName(SHEET_NAMES.SKU_VARIANTS) || ss.getSheetByName('SKU_Variants');
  
  var masterList = [];
  var variantList = [];
  var variantToMasterMap = {};
  var conflicts = [];

  if (skuSheet && skuSheet.getLastRow() > 1) {
    var rawHeaders = skuSheet.getRange(1, 1, 1, skuSheet.getLastColumn()).getValues()[0];
    var colMap = {
      skuCode: 0,
      skuName: 1,
      weight: 2,
      cost: 3,
      variantsMap: 4,
      category: 5,
      active: 6
    };

    // Dynamically detect column header positions (handles 'Mfg + Frieght', 'Weight (grams)', etc.)
    for (var h = 0; h < rawHeaders.length; h++) {
      var head = String(rawHeaders[h] || '').trim().toLowerCase();
      if (head.indexOf('sku code') !== -1 || head === 'code' || head === 'sku' || head.indexOf('item code') !== -1) {
        colMap.skuCode = h;
      } else if (head.indexOf('sku name') !== -1 || head.indexOf('product name') !== -1 || head === 'title' || head === 'name') {
        colMap.skuName = h;
      } else if (head.indexOf('weight') !== -1 || head.indexOf('grams') !== -1 || head === 'wt') {
        colMap.weight = h;
      } else if (head.indexOf('mfg') !== -1 || head.indexOf('freight') !== -1 || head.indexOf('frieght') !== -1 || head.indexOf('cost') !== -1 || head.indexOf('price') !== -1) {
        colMap.cost = h;
      } else if (head.indexOf('variants map') !== -1 || head.indexOf('aliases') !== -1 || head.indexOf('variant') !== -1 || head.indexOf('alias') !== -1) {
        colMap.variantsMap = h;
      } else if (head.indexOf('category') !== -1) {
        colMap.category = h;
      } else if (head.indexOf('active') !== -1 || head.indexOf('status') !== -1) {
        colMap.active = h;
      }
    }

    var data = skuSheet.getRange(2, 1, skuSheet.getLastRow() - 1, skuSheet.getLastColumn()).getValues();
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var code = String(row[colMap.skuCode] || '').trim();
      if (!code) continue;

      var name = String(row[colMap.skuName] || '').trim();
      var weight = parseFloat(row[colMap.weight]) || 0;
      var costVal = parseFloat(row[colMap.cost]) || 0;
      var rawMap = String(row[colMap.variantsMap] || '').trim();
      var cat = colMap.category < row.length ? String(row[colMap.category] || 'General').trim() : 'General';
      var actVal = colMap.active < row.length ? row[colMap.active] : true;
      var isActive = (actVal === undefined || actVal === '' || actVal === true || String(actVal).toLowerCase() === 'active');

      masterList.push({
        skuCode: code,
        skuName: name || code,
        weightGrams: weight,
        mfgFreightCost: costVal,
        variantsMapRaw: rawMap,
        category: cat,
        active: isActive,
        lastUpdatedAt: formatNormalTimestamp(new Date())
      });

      // Parse inline aliases from the raw map directly so they are immediately searchable
      if (rawMap) {
        var lines = rawMap.split(/[\r\n,]+/);
        for (var k = 0; k < lines.length; k++) {
          var alias = lines[k].trim();
          if (!alias) continue;
          var cleanAlias = alias.toUpperCase();
          if (!variantToMasterMap[cleanAlias]) {
            variantToMasterMap[cleanAlias] = code;
            variantList.push({
              variantCode: cleanAlias,
              masterSkuCode: code,
              description: name,
              active: isActive,
              sourceChannel: 'Master Alias Map',
              createdAt: formatNormalTimestamp(new Date())
            });
          }
        }
      }
    }
  }

  if (variantSheet && variantSheet.getLastRow() > 1) {
    var vData = variantSheet.getRange(2, 1, variantSheet.getLastRow() - 1, variantSheet.getLastColumn()).getValues();
    for (var j = 0; j < vData.length; j++) {
      var vRow = vData[j];
      var alias = String(vRow[0] || '').trim().toUpperCase();
      var masterSku = String(vRow[1] || '').trim();
      if (!alias || !masterSku) continue;

      if (variantToMasterMap[alias] && variantToMasterMap[alias] !== masterSku) {
        conflicts.push({
          variantCode: alias,
          firstMasterSku: variantToMasterMap[alias],
          secondMasterSku: masterSku
        });
      } else {
        variantToMasterMap[alias] = masterSku;
      }

      variantList.push({
        variantCode: alias,
        masterSkuCode: masterSku,
        description: String(vRow[2] || ''),
        active: vRow[3] === undefined || vRow[3] === '' ? true : (vRow[3] === true || String(vRow[3]).toLowerCase() === 'active'),
        sourceChannel: String(vRow[4] || 'Omnichannel')
      });
    }
  }

  return {
    success: true,
    masterList: masterList,
    variantList: variantList,
    variantToMasterMap: variantToMasterMap,
    conflicts: conflicts,
    sheetNameFound: skuSheet ? skuSheet.getName() : 'No SKU Sheet Found',
    totalRowsFound: skuSheet ? skuSheet.getLastRow() : 0
  };
}

/**
 * Normalizes newline-separated aliases from SKU_Master into SKU_Variants tab.
 */
function normalizeVariantsFromMaster() {
  var ss = getSpreadsheet();
  var skuSheet = ss.getSheetByName(SHEET_NAMES.SKU_MASTER);
  var variantSheet = getOrCreateSheet(SHEET_NAMES.SKU_VARIANTS, HEADERS.SKU_VARIANTS);

  if (!skuSheet || skuSheet.getLastRow() <= 1) {
    return { success: false, error: 'SKU_Master sheet is empty or not found.' };
  }

  var skuData = skuSheet.getRange(2, 1, skuSheet.getLastRow() - 1, skuSheet.getLastColumn()).getValues();
  var rowsToAdd = [];
  var existingAliases = {};

  // Check existing variants to avoid duplicate rows
  if (variantSheet.getLastRow() > 1) {
    var curV = variantSheet.getRange(2, 1, variantSheet.getLastRow() - 1, 2).getValues();
    for (var e = 0; e < curV.length; e++) {
      var existAlias = String(curV[e][0] || '').trim().toUpperCase();
      if (existAlias) existingAliases[existAlias] = true;
    }
  }

  var now = formatNormalTimestamp(new Date());

  for (var i = 0; i < skuData.length; i++) {
    var masterSku = String(skuData[i][0]).trim();
    var variantsMapRaw = String(skuData[i][4] || '');
    if (!masterSku || !variantsMapRaw) continue;

    // Split by newlines or commas
    var lines = variantsMapRaw.split(/[\r\n,]+/);
    for (var k = 0; k < lines.length; k++) {
      var alias = lines[k].trim();
      if (!alias) continue;
      var cleanAlias = alias.toUpperCase();
      if (!existingAliases[cleanAlias]) {
        rowsToAdd.push([
          cleanAlias,
          masterSku,
          'Normalized from SKU_Master map',
          true,
          'Auto-Import',
          now
        ]);
        existingAliases[cleanAlias] = true;
      }
    }
  }

  if (rowsToAdd.length > 0) {
    variantSheet.getRange(variantSheet.getLastRow() + 1, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);
  }

  return { success: true, message: 'Normalized ' + rowsToAdd.length + ' new variants successfully.' };
}

// ==========================================
// RETURN LOGGING & DUPLICATE PREVENTION
// ==========================================

function checkDuplicate(marketplace, orderId, skuCode) {
  if (!orderId) return { isDuplicate: false };
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.RETURN_LOG);
  if (!sheet || sheet.getLastRow() <= 1) return { isDuplicate: false };

  var checkKey = (marketplace || '').trim().toUpperCase() + '-' + (orderId || '').trim().toUpperCase() + '-' + (skuCode || '').trim().toUpperCase();
  var lastRow = sheet.getLastRow();
  // Read Return ID (col 1), Order ID (col 8), Duplicate Key (col 31)
  var rangeData = sheet.getRange(2, 1, lastRow - 1, 31).getValues();

  for (var i = 0; i < rangeData.length; i++) {
    var row = rangeData[i];
    var rowKey = String(row[30] || ''); // Col 31 is duplicate key
    var rowOrderId = String(row[7] || '').trim().toUpperCase(); // Col 8 is Original Order ID
    var rowReturnId = String(row[0] || '');

    if (rowKey === checkKey || (rowOrderId === (orderId || '').trim().toUpperCase() && row[11] === skuCode)) {
      return {
        isDuplicate: true,
        existingReturnId: rowReturnId,
        existingDate: row[6],
        existingMarketplace: row[4]
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Flexibly locates the Return Log sheet by candidate names or content.
 */
function getReturnSheet(ss) {
  var candidateNames = [
    SHEET_NAMES.RETURN_LOG,
    'Return_Log',
    'Return Log',
    'Returns',
    'Returns_Log',
    'Return_Master',
    'Returns Master',
    'Sheet1'
  ];
  for (var i = 0; i < candidateNames.length; i++) {
    var sh = ss.getSheetByName(candidateNames[i]);
    if (sh) return sh;
  }
  var allSheets = ss.getSheets();
  for (var j = 0; j < allSheets.length; j++) {
    var name = allSheets[j].getName().toLowerCase();
    if (name.indexOf('return') !== -1) {
      return allSheets[j];
    }
  }
  return allSheets[0]; // fallback to first tab
}

/**
 * Removes any completely blank rows in the sheet so no gaps or empty lines remain.
 */
function cleanupBlankRows(sheet) {
  try {
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol < 1) return;

    var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    // Loop backwards from bottom to top to safely delete rows
    for (var r = values.length - 1; r >= 0; r--) {
      var isBlank = true;
      for (var c = 0; c < values[r].length; c++) {
        var cell = values[r][c];
        if (cell !== null && cell !== undefined && String(cell).trim() !== '') {
          isBlank = false;
          break;
        }
      }
      if (isBlank) {
        sheet.deleteRow(r + 2);
      }
    }
  } catch (e) {
    Logger.log('cleanupBlankRows notice: ' + e.toString());
  }
}

/**
 * Searches across ALL columns for matching returnId or orderId.
 * Returns an array of 1-indexed sheet row numbers (e.g. [3]).
 */
function findRowIndices(sheet, returnId, orderId) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return [];

  var cleanReturnId = String(returnId || '').trim();
  var cleanOrderId = String(orderId || '').trim().toUpperCase();
  var cleanOrdAlpha = cleanOrderId.replace(/[^A-Z0-9]/g, '');
  var cleanRetAlpha = cleanReturnId.replace(/[^A-Z0-9]/g, '');

  if (!cleanReturnId && !cleanOrderId) return [];

  var startRow = 1;
  var row1Values = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var isRow1Header = false;
  for (var h = 0; h < row1Values.length; h++) {
    var hVal = String(row1Values[h] || '').toUpperCase();
    if (hVal.indexOf('ORDER') !== -1 || hVal.indexOf('RETURN') !== -1 || hVal.indexOf('SKU') !== -1 || hVal.indexOf('TIMESTAMP') !== -1) {
      isRow1Header = true;
      break;
    }
  }
  if (isRow1Header) {
    if (lastRow <= 1) return [];
    startRow = 2;
  }

  var numRows = lastRow - startRow + 1;
  if (numRows <= 0) return [];

  var values = sheet.getRange(startRow, 1, numRows, lastCol).getValues();
  var matchedIndices = [];

  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    var matched = false;

    // Check every cell in this row
    for (var c = 0; c < row.length; c++) {
      var rawVal = row[c];
      if (rawVal === null || rawVal === undefined) continue;
      var val = String(rawVal).trim();
      if (!val) continue;

      var valUpper = val.toUpperCase();

      // 1. Exact match on Return Entry ID
      if (cleanReturnId && valUpper === cleanReturnId.toUpperCase()) {
        matched = true;
        break;
      }

      // 2. Exact match on Order ID
      if (cleanOrderId && valUpper === cleanOrderId) {
        matched = true;
        break;
      }

      // 3. Substring match for Order ID (if length >= 6)
      if (cleanOrderId && cleanOrderId.length >= 6 && valUpper.indexOf(cleanOrderId) !== -1) {
        matched = true;
        break;
      }

      // 4. Substring match for Return ID (if length >= 8)
      if (cleanReturnId && cleanReturnId.length >= 8 && valUpper.indexOf(cleanReturnId.toUpperCase()) !== -1) {
        matched = true;
        break;
      }

      // 5. Alphanumeric match (ignoring dashes, slashes, spaces)
      var valAlpha = valUpper.replace(/[^A-Z0-9]/g, '');
      if (cleanOrdAlpha && cleanOrdAlpha.length >= 4) {
        if (valAlpha === cleanOrdAlpha || (valAlpha.length >= 6 && valAlpha.indexOf(cleanOrdAlpha) !== -1)) {
          matched = true;
          break;
        }
      }
      if (cleanRetAlpha && cleanRetAlpha.length >= 4) {
        if (valAlpha === cleanRetAlpha || (valAlpha.length >= 8 && valAlpha.indexOf(cleanRetAlpha) !== -1)) {
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      matchedIndices.push(r + startRow); // 1-indexed row number in Google Sheet
    }
  }

  return matchedIndices;
}

function saveReturnRecord(data, operator) {
  var ss = getSpreadsheet();
  var sheet = getReturnSheet(ss) || getOrCreateSheet(SHEET_NAMES.RETURN_LOG, HEADERS.RETURN_LOG);
  var normalTimestamp = formatNormalTimestamp(new Date());

  var qty = parseInt(data.quantityReceived, 10) || 1;
  var unitWeight = parseFloat(data.expectedUnitWeightGrams) || 0;
  var totalWeight = unitWeight * qty;
  var measuredWeight = parseFloat(data.measuredPackageWeightGrams) || 0;
  var weightDiscrepancy = measuredWeight > 0 ? (measuredWeight - totalWeight) : 0;
  var unitCost = parseFloat(data.mfgFreightCost) || 0;
  var totalInventoryVal = unitCost * qty;

  var dupKey = (data.marketplace || '').trim().toUpperCase() + '-' + 
                 (data.originalOrderId || '').trim().toUpperCase() + '-' + 
                 (data.masterSkuCode || '').trim().toUpperCase() + '-' + 
                 (data.returnType || '').trim().toUpperCase();

  var isClaimEligible = (
    data.itemCondition === 'Not Sellable' ||
    data.dispositionDecision === 'Claim Filing Required (SPF/T-Safe)' ||
    (totalWeight > 0 && Math.abs(weightDiscrepancy) > (totalWeight * 0.15))
  );

  var returnEntryId = data.returnEntryId || '';
  var orderId = data.originalOrderId || '';

  // Look for any existing matching rows in primary sheet
  var matchingRows = findRowIndices(sheet, returnEntryId, orderId);

  // If not found in primary sheet, check other sheets before creating new
  var targetSheet = sheet;
  if (matchingRows.length === 0) {
    var allSheets = ss.getSheets();
    for (var s = 0; s < allSheets.length; s++) {
      var otherSheet = allSheets[s];
      if (otherSheet.getName() === sheet.getName()) continue;
      if (otherSheet.getName() === SHEET_NAMES.AUDIT_LOG) continue;
      var otherMatches = findRowIndices(otherSheet, returnEntryId, orderId);
      if (otherMatches.length > 0) {
        matchingRows = otherMatches;
        targetSheet = otherSheet;
        break;
      }
    }
  }

  // CASE 1: MODIFY & REPLACE EXISTING ITEM IN PLACE (No new line item added!)
  if (matchingRows.length > 0) {
    var primaryRow = matchingRows[0];
    if (!returnEntryId) {
      returnEntryId = String(targetSheet.getRange(primaryRow, 1).getValue() || '').trim();
    }

    targetSheet.getRange(primaryRow, 4).setValue(normalTimestamp); // Last Updated At
    targetSheet.getRange(primaryRow, 5).setValue(data.marketplace || 'Meesho');
    targetSheet.getRange(primaryRow, 6).setValue(data.returnType || 'Customer Return');
    if (data.receiptDate) targetSheet.getRange(primaryRow, 7).setValue(data.receiptDate);
    if (data.originalOrderId) targetSheet.getRange(primaryRow, 8).setValue(data.originalOrderId);
    if (data.marketplaceReturnId) targetSheet.getRange(primaryRow, 9).setValue(data.marketplaceReturnId);
    if (data.awbTrackingNumber) targetSheet.getRange(primaryRow, 10).setValue(data.awbTrackingNumber);
    if (data.scannedVariant) targetSheet.getRange(primaryRow, 11).setValue(data.scannedVariant);
    if (data.masterSkuCode) targetSheet.getRange(primaryRow, 12).setValue(data.masterSkuCode);
    if (data.productNameSnapshot) targetSheet.getRange(primaryRow, 13).setValue(data.productNameSnapshot);
    targetSheet.getRange(primaryRow, 14).setValue(qty);
    targetSheet.getRange(primaryRow, 15).setValue(unitWeight);
    targetSheet.getRange(primaryRow, 16).setValue(totalWeight);
    targetSheet.getRange(primaryRow, 17).setValue(measuredWeight);
    targetSheet.getRange(primaryRow, 18).setValue(weightDiscrepancy);
    targetSheet.getRange(primaryRow, 19).setValue(unitCost);
    targetSheet.getRange(primaryRow, 20).setValue(totalInventoryVal);
    targetSheet.getRange(primaryRow, 21).setValue(data.packageCondition || 'Intact / Undamaged');
    targetSheet.getRange(primaryRow, 22).setValue(data.itemCondition || 'Sellable');
    targetSheet.getRange(primaryRow, 23).setValue(data.inspectionStatus || (data.itemCondition === 'Sellable' ? 'Restock Approved' : 'Damaged / Write-off Review'));
    targetSheet.getRange(primaryRow, 24).setValue(data.dispositionDecision || 'Restock to Active Inventory');
    targetSheet.getRange(primaryRow, 25).setValue(data.damageDetails || '');
    targetSheet.getRange(primaryRow, 26).setValue(data.warehouseNotes || '');
    if (data.financialReviewStatus) targetSheet.getRange(primaryRow, 29).setValue(data.financialReviewStatus);
    targetSheet.getRange(primaryRow, 30).setValue(isClaimEligible ? 'YES' : 'NO');
    targetSheet.getRange(primaryRow, 31).setValue(dupKey);

    // If there were redundant duplicate rows created previously for this item, delete them so only 1 row exists
    if (matchingRows.length > 1) {
      for (var d = matchingRows.length - 1; d >= 1; d--) {
        targetSheet.deleteRow(matchingRows[d]);
      }
    }

    // Clean up any empty rows so no blank lines remain
    cleanupBlankRows(targetSheet);

    // Force Google Sheets to commit modifications immediately
    SpreadsheetApp.flush();

    logAudit(operator || 'Warehouse Operator', 'UPDATE_RETURN', 'Return_Log', returnEntryId, 'Modified in place for Order: ' + data.originalOrderId + ', Condition: ' + data.itemCondition);

    return {
      success: true,
      returnEntryId: returnEntryId,
      updated: true,
      rowModified: primaryRow,
      timestamp: normalTimestamp,
      claimEligible: isClaimEligible,
      message: 'Existing record modified and replaced in place in database (no new line item added).'
    };
  }

  // CASE 2: BRAND NEW RETURN ENTRY
  // Strict Duplicate Prevention for NEW entries
  var dupCheck = checkDuplicate(data.marketplace, data.originalOrderId, data.masterSkuCode);
  if (dupCheck.isDuplicate) {
    return {
      success: false,
      error: 'DUPLICATE SUBMISSION BLOCKED: Order ID "' + data.originalOrderId + '" was already logged on ' + dupCheck.existingDate + ' under Return ID ' + dupCheck.existingReturnId + '. Duplicate entries are blocked to prevent double-crediting.'
    };
  }

  // Generate unique ID: TBM-RET-YYYYMMDD-XXXX
  var now = new Date();
  var dateStr = Utilities.formatDate(now, Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyyMMdd');
  var randomDigits = Math.floor(1000 + Math.random() * 9000);
  returnEntryId = 'TBM-RET-' + dateStr + '-' + randomDigits;

  var row = [
    returnEntryId,
    normalTimestamp,
    operator || 'Warehouse Operator',
    normalTimestamp,
    data.marketplace || 'Meesho',
    data.returnType || 'Customer Return',
    data.receiptDate || Utilities.formatDate(now, Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyy-MM-dd'),
    data.originalOrderId || '',
    data.marketplaceReturnId || '',
    data.awbTrackingNumber || '',
    data.scannedVariant || '',
    data.masterSkuCode || '',
    data.productNameSnapshot || '',
    qty,
    unitWeight,
    totalWeight,
    measuredWeight,
    weightDiscrepancy,
    unitCost,
    totalInventoryVal,
    data.packageCondition || 'Intact / Undamaged',
    data.itemCondition || 'Sellable',
    data.inspectionStatus || (data.itemCondition === 'Sellable' ? 'Restock Approved' : 'Damaged / Write-off Review'),
    data.dispositionDecision || 'Restock to Active Inventory',
    data.damageDetails || '',
    data.warehouseNotes || '',
    data.photoEvidenceLinks || '',
    data.inspectionDate || '',
    data.financialReviewStatus || (data.itemCondition === 'Sellable' ? 'Approved' : 'Pending Review'),
    isClaimEligible ? 'YES' : 'NO',
    dupKey
  ];

  sheet.appendRow(row);
  cleanupBlankRows(sheet);

  // Log Audit
  logAudit(operator, 'CREATE_RETURN', 'Return_Log', returnEntryId, 'Marketplace: ' + data.marketplace + ', SKU: ' + data.masterSkuCode);

  return {
    success: true,
    returnEntryId: returnEntryId,
    timestamp: normalTimestamp,
    claimEligible: isClaimEligible
  };
}

function deleteReturnRecord(returnId, orderId, operator) {
  var ss = getSpreadsheet();
  if (!ss) {
    return { success: false, error: 'Cannot connect to spreadsheet database.' };
  }

  var cleanRet = String(returnId || '').trim();
  var cleanOrd = String(orderId || '').trim();

  if (!cleanRet && !cleanOrd) {
    return { success: false, error: 'Cannot delete: Both Return Entry ID and Order ID are missing.' };
  }

  var allSheets = ss.getSheets();
  var totalDeleted = 0;
  var deletedFromSheets = [];

  // Search across EVERY sheet in the entire workbook
  for (var s = 0; s < allSheets.length; s++) {
    var curSheet = allSheets[s];
    var sName = curSheet.getName();

    // Skip audit log and list configs
    if (sName === SHEET_NAMES.AUDIT_LOG || sName === 'Audit_Log') continue;
    if (sName === SHEET_NAMES.LISTS_CONFIG || sName === 'Lists_Config') continue;
    if (curSheet.getLastRow() < 1) continue;

    var matchedRowIndices = findRowIndices(curSheet, cleanRet, cleanOrd);
    if (matchedRowIndices && matchedRowIndices.length > 0) {
      // Delete rows from bottom to top so index shifts do not affect subsequent deletions
      for (var i = matchedRowIndices.length - 1; i >= 0; i--) {
        curSheet.deleteRow(matchedRowIndices[i]);
        totalDeleted++;
      }
      cleanupBlankRows(curSheet);
      deletedFromSheets.push(sName);
    }
  }

  // Force Google Sheets to write and commit all row deletions immediately!
  SpreadsheetApp.flush();

  if (totalDeleted > 0) {
    try {
      logAudit(
        operator || 'Warehouse Operator',
        'DELETE_RETURN',
        'Return_Log',
        cleanRet || cleanOrd,
        'Permanently deleted ' + totalDeleted + ' row(s) from [' + deletedFromSheets.join(', ') + '] for Order: ' + (cleanOrd || cleanRet)
      );
      SpreadsheetApp.flush();
    } catch(auditErr) {
      Logger.log('logAudit notice: ' + auditErr.toString());
    }

    return { 
      success: true, 
      deletedCount: totalDeleted,
      sheets: deletedFromSheets,
      message: 'Permanently deleted ' + totalDeleted + ' matching row(s) from ' + deletedFromSheets.join(', ') + ' and removed blank lines in Google Sheets.' 
    };
  }

  return { 
    success: false, 
    error: 'Record not found in any sheet for Return ID: "' + cleanRet + '" or Order ID: "' + cleanOrd + '". Scanned ' + allSheets.length + ' sheet(s).' 
  };
}

// ==========================================
// CLAIMS LOGGING & MANAGEMENT
// ==========================================

function saveClaimRecord(data, specialist) {
  var ss = getSpreadsheet();
  var sheet = getOrCreateSheet(SHEET_NAMES.CLAIMS_LOG, HEADERS.CLAIMS_LOG);

  var now = new Date();
  var dateStr = Utilities.formatDate(now, Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyyMMdd');
  var randomDigits = Math.floor(1000 + Math.random() * 9000);
  var claimId = 'TBM-CLM-' + dateStr + '-' + randomDigits;

  var row = [
    claimId,
    data.claimType || 'Amazon SPF',
    data.marketplace || 'Amazon',
    data.relatedReturnEntryId || '',
    data.orderId || '',
    data.marketplaceReturnId || '',
    data.awbTrackingNumber || '',
    data.claimReferenceId || '',
    data.claimReason || 'Damaged Item Returned',
    Number(data.claimAmountRequested) || 0,
    Number(data.claimAmountApproved) || 0,
    data.currency || 'INR',
    data.submissionDate || Utilities.formatDate(now, Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyy-MM-dd'),
    data.submissionDeadline || '',
    data.claimStatus || 'Potential Claim',
    data.evidenceChecklistCompleted ? 'YES' : 'NO',
    data.evidenceDriveLinks || '',
    data.submissionNotes || '',
    data.lastFollowupDate || '',
    data.nextFollowupDate || '',
    data.rejectionReason || '',
    data.appealStatus || 'None',
    data.resolutionDate || '',
    data.recoveryReference || '',
    specialist || 'Claims Specialist',
    formatNormalTimestamp(now)
  ];

  sheet.appendRow(row);

  logAudit(specialist, 'CREATE_CLAIM', 'Claims_Log', claimId, 'Type: ' + data.claimType + ', Order: ' + data.orderId + ', Amount: ₹' + data.claimAmountRequested);

  return {
    success: true,
    claimId: claimId
  };
}

function updateReturnStatus(returnId, updates, user) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.RETURN_LOG);
  if (!sheet) return { success: false, error: 'Return_Log sheet not found' };

  var lastRow = sheet.getLastRow();
  var idCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (var i = 0; i < idCol.length; i++) {
    if (String(idCol[i][0]).trim() === String(returnId).trim()) {
      var rowNum = i + 2;
      var now = formatNormalTimestamp(new Date());
      sheet.getRange(rowNum, 4).setValue(now); // Last Updated At
      
      if (updates.inspectionStatus) sheet.getRange(rowNum, 23).setValue(updates.inspectionStatus);
      if (updates.dispositionDecision) sheet.getRange(rowNum, 24).setValue(updates.dispositionDecision);
      if (updates.financialReviewStatus) sheet.getRange(rowNum, 29).setValue(updates.financialReviewStatus);
      if (updates.warehouseNotes) sheet.getRange(rowNum, 26).setValue(updates.warehouseNotes);

      logAudit(user, 'UPDATE_RETURN', 'Return_Log', returnId, JSON.stringify(updates));
      return { success: true, message: 'Return ' + returnId + ' updated successfully.' };
    }
  }

  return { success: false, error: 'Return ID not found: ' + returnId };
}

function updateClaimStatus(claimId, updates, user) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.CLAIMS_LOG);
  if (!sheet) return { success: false, error: 'Claims_Log sheet not found' };

  var lastRow = sheet.getLastRow();
  var idCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (var i = 0; i < idCol.length; i++) {
    if (String(idCol[i][0]).trim() === String(claimId).trim()) {
      var rowNum = i + 2;
      var now = formatNormalTimestamp(new Date());
      sheet.getRange(rowNum, 26).setValue(now); // Last Updated At

      if (updates.claimStatus) sheet.getRange(rowNum, 15).setValue(updates.claimStatus);
      if (updates.claimAmountApproved !== undefined) sheet.getRange(rowNum, 11).setValue(Number(updates.claimAmountApproved));
      if (updates.recoveryReference) sheet.getRange(rowNum, 24).setValue(updates.recoveryReference);
      if (updates.resolutionDate) sheet.getRange(rowNum, 23).setValue(updates.resolutionDate);
      if (updates.rejectionReason) sheet.getRange(rowNum, 21).setValue(updates.rejectionReason);

      logAudit(user, 'UPDATE_CLAIM', 'Claims_Log', claimId, JSON.stringify(updates));
      return { success: true, message: 'Claim ' + claimId + ' updated successfully.' };
    }
  }

  return { success: false, error: 'Claim ID not found: ' + claimId };
}

// ==========================================
// AUDIT LOGGING
// ==========================================

function logAudit(user, action, entityType, entityId, details) {
  try {
    var ss = getSpreadsheet();
    var sheet = getOrCreateSheet(SHEET_NAMES.AUDIT_LOG, HEADERS.AUDIT_LOG);
    sheet.appendRow([
      formatNormalTimestamp(new Date()),
      user || 'System',
      action,
      entityType,
      entityId,
      details || ''
    ]);
  } catch (e) {
    Logger.log('Audit log failure: ' + e.toString());
  }
}

// ==========================================
// DATA RETRIEVAL (GETTERS FOR INITIAL LOAD)
// ==========================================

function getReturns() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.RETURN_LOG);
  var returns = [];
  if (!sheet || sheet.getLastRow() <= 1) return returns;

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.RETURN_LOG.length).getValues();
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    returns.push({
      returnEntryId: String(r[0]),
      createdAt: String(r[1]),
      createdBy: String(r[2]),
      lastUpdatedAt: String(r[3]),
      marketplace: String(r[4]),
      returnType: String(r[5]),
      receiptDate: String(r[6]),
      originalOrderId: String(r[7]),
      marketplaceReturnId: String(r[8]),
      awbTrackingNumber: String(r[9]),
      scannedVariant: String(r[10]),
      masterSkuCode: String(r[11]),
      productNameSnapshot: String(r[12]),
      quantityReceived: Number(r[13]) || 1,
      expectedUnitWeightGrams: Number(r[14]) || 0,
      expectedTotalWeightGrams: Number(r[15]) || 0,
      measuredPackageWeightGrams: Number(r[16]) || 0,
      weightDiscrepancy: Number(r[17]) || 0,
      mfgFreightCost: Number(r[18]) || 0,
      totalInventoryValue: Number(r[19]) || 0,
      packageCondition: String(r[20]),
      itemCondition: String(r[21]),
      inspectionStatus: String(r[22]),
      dispositionDecision: String(r[23]),
      damageDetails: String(r[24]),
      warehouseNotes: String(r[25]),
      photoEvidenceLinks: String(r[26]),
      inspectionDate: String(r[27]),
      financialReviewStatus: String(r[28]),
      claimEligible: String(r[29]) === 'YES',
      duplicateCheckKey: String(r[30])
    });
  }
  return returns;
}

function getClaims() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.CLAIMS_LOG);
  var claims = [];
  if (!sheet || sheet.getLastRow() <= 1) return claims;

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.CLAIMS_LOG.length).getValues();
  for (var i = 0; i < data.length; i++) {
    var c = data[i];
    if (!c[0]) continue;
    claims.push({
      claimId: String(c[0]),
      claimType: String(c[1]),
      marketplace: String(c[2]),
      relatedReturnEntryId: String(c[3]),
      orderId: String(c[4]),
      marketplaceReturnId: String(c[5]),
      awbTrackingNumber: String(c[6]),
      claimReferenceId: String(c[7]),
      claimReason: String(c[8]),
      claimAmountRequested: Number(c[9]) || 0,
      claimAmountApproved: Number(c[10]) || 0,
      currency: String(c[11] || 'INR'),
      submissionDate: String(c[12]),
      submissionDeadline: String(c[13]),
      claimStatus: String(c[14]),
      evidenceChecklistCompleted: String(c[15]) === 'YES',
      evidenceDriveLinks: String(c[16]),
      submissionNotes: String(c[17]),
      lastFollowupDate: String(c[18]),
      nextFollowupDate: String(c[19]),
      rejectionReason: String(c[20]),
      appealStatus: String(c[21]),
      resolutionDate: String(c[22]),
      recoveryReference: String(c[23]),
      createdBy: String(c[24]),
      lastUpdatedAt: String(c[25])
    });
  }
  return claims;
}

function getInitialData() {
  var catalog = getSkuCatalog();
  var returns = getReturns();
  var claims = getClaims();

  return {
    success: true,
    skuCatalog: catalog,
    returns: returns,
    claims: claims,
    serverTime: formatNormalTimestamp(new Date()),
    system: 'TABBYMART Returns & Claims Management System'
  };
}
