import { ReturnRecord, SkuMasterItem, SkuVariant, ClaimRecord, AuditLogItem } from '../types';
import { INITIAL_SKU_MASTER, INITIAL_SKU_VARIANTS, INITIAL_RETURNS, INITIAL_CLAIMS, parseVariantsFromMaster } from '../data/initialData';

const KEYS = {
  RETURNS: 'tabbymart_returns_v2',
  SKU_MASTER: 'tabbymart_sku_master_v2',
  SKU_VARIANTS: 'tabbymart_sku_variants_v2',
  CLAIMS: 'tabbymart_claims_v2',
  AUDIT: 'tabbymart_audit_v2',
  GAS_URL: 'tabbymart_gas_web_app_url',
  SHEET_ID: 'tabbymart_sheet_id',
  THEME: 'tabbymart_theme_mode',
  PASSCODE: 'tabbymart_warehouse_passcode_v2'
};

export type ThemeMode = 'light' | 'dark';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingReturn?: ReturnRecord;
}

export interface AliasConflict {
  variantCode: string;
  firstMasterSku: string;
  secondMasterSku: string;
}

export class StorageService {
  /**
   * Formats dates as clean, standard human-readable timestamps:
   * e.g. "17/10/2026, 03:18:20 PM" instead of raw machine ISO "2026-10-17T09:48:20.426Z"
   */
  static formatNormalTimestamp(d: Date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = d.getHours();
    const min = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const hh12 = pad(hh % 12 || 12);
    return `${dd}/${mm}/${yyyy}, ${hh12}:${min}:${ss} ${ampm}`;
  }

  /**
   * Ensures any input date/timestamp string is returned as Date+Time format (DD/MM/YYYY, hh:mm:ss AM/PM).
   * Automatically converts legacy ISO strings like "2026-10-18T07:47:41.377Z" to Date+Time.
   */
  static formatDisplayTimestamp(dateStr?: string): string {
    if (!dateStr || !dateStr.trim()) return this.formatNormalTimestamp(new Date());
    const trimmed = dateStr.trim();
    // Already in standard format
    if (trimmed.includes('/') && (trimmed.includes('AM') || trimmed.includes('PM'))) {
      return trimmed;
    }
    // Attempt parse
    try {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return this.formatNormalTimestamp(parsed);
      }
    } catch {}
    return trimmed;
  }

  static getWarehousePasscode(): string {
    return localStorage.getItem(KEYS.PASSCODE) || 'TBM-PASS-2026';
  }

  static saveWarehousePasscode(passcode: string): void {
    localStorage.setItem(KEYS.PASSCODE, passcode.trim());
  }

  static getReturns(): ReturnRecord[] {
    try {
      const data = localStorage.getItem(KEYS.RETURNS);
      let list: ReturnRecord[] = [];
      if (!data) {
        list = INITIAL_RETURNS.map((r) => ({
          ...r,
          createdAt: this.formatDisplayTimestamp(r.createdAt),
          lastUpdatedAt: this.formatDisplayTimestamp(r.lastUpdatedAt)
        }));
        localStorage.setItem(KEYS.RETURNS, JSON.stringify(list));
        return list;
      }
      list = JSON.parse(data);
      // Migrate any legacy ISO timestamps currently stored in user's browser
      let hasLegacy = false;
      list = list.map((r) => {
        const cleanCreated = this.formatDisplayTimestamp(r.createdAt);
        const cleanUpdated = this.formatDisplayTimestamp(r.lastUpdatedAt);
        if (cleanCreated !== r.createdAt || cleanUpdated !== r.lastUpdatedAt) {
          hasLegacy = true;
          return { ...r, createdAt: cleanCreated, lastUpdatedAt: cleanUpdated };
        }
        return r;
      });
      if (hasLegacy) {
        localStorage.setItem(KEYS.RETURNS, JSON.stringify(list));
      }
      return list;
    } catch {
      return INITIAL_RETURNS;
    }
  }

  static saveReturns(returns: ReturnRecord[]): void {
    const cleaned = returns.map((r) => ({
      ...r,
      createdAt: this.formatDisplayTimestamp(r.createdAt),
      lastUpdatedAt: this.formatDisplayTimestamp(r.lastUpdatedAt)
    }));
    localStorage.setItem(KEYS.RETURNS, JSON.stringify(cleaned));
  }

  static getSkuMaster(): SkuMasterItem[] {
    try {
      const data = localStorage.getItem(KEYS.SKU_MASTER);
      if (!data) {
        localStorage.setItem(KEYS.SKU_MASTER, JSON.stringify(INITIAL_SKU_MASTER));
        return INITIAL_SKU_MASTER;
      }
      let list: SkuMasterItem[] = JSON.parse(data);
      let hasLegacy = false;
      list = list.map((item) => {
        const cleanUpdated = this.formatDisplayTimestamp(item.lastUpdatedAt);
        if (cleanUpdated !== item.lastUpdatedAt) {
          hasLegacy = true;
          return { ...item, lastUpdatedAt: cleanUpdated };
        }
        return item;
      });
      if (hasLegacy) {
        localStorage.setItem(KEYS.SKU_MASTER, JSON.stringify(list));
      }
      return list;
    } catch {
      return INITIAL_SKU_MASTER;
    }
  }

  static saveSkuMaster(list: SkuMasterItem[]): void {
    const cleaned = list.map((item) => ({
      ...item,
      lastUpdatedAt: this.formatDisplayTimestamp(item.lastUpdatedAt)
    }));
    localStorage.setItem(KEYS.SKU_MASTER, JSON.stringify(cleaned));
    // Automatically keep normalized variants updated
    const normalized = parseVariantsFromMaster(cleaned);
    this.saveSkuVariants(normalized);
  }

  static getSkuVariants(): SkuVariant[] {
    try {
      const data = localStorage.getItem(KEYS.SKU_VARIANTS);
      if (!data) {
        const variants = parseVariantsFromMaster(this.getSkuMaster());
        localStorage.setItem(KEYS.SKU_VARIANTS, JSON.stringify(variants));
        return variants;
      }
      let list: SkuVariant[] = JSON.parse(data);
      let hasLegacy = false;
      list = list.map((v) => {
        const cleanCreated = this.formatDisplayTimestamp(v.createdAt);
        if (cleanCreated !== v.createdAt) {
          hasLegacy = true;
          return { ...v, createdAt: cleanCreated };
        }
        return v;
      });
      if (hasLegacy) {
        localStorage.setItem(KEYS.SKU_VARIANTS, JSON.stringify(list));
      }
      return list;
    } catch {
      return INITIAL_SKU_VARIANTS;
    }
  }

  static saveSkuVariants(variants: SkuVariant[]): void {
    const cleaned = variants.map((v) => ({
      ...v,
      createdAt: this.formatDisplayTimestamp(v.createdAt)
    }));
    localStorage.setItem(KEYS.SKU_VARIANTS, JSON.stringify(cleaned));
  }

  static getClaims(): ClaimRecord[] {
    try {
      const data = localStorage.getItem(KEYS.CLAIMS);
      if (!data) {
        localStorage.setItem(KEYS.CLAIMS, JSON.stringify(INITIAL_CLAIMS));
        return INITIAL_CLAIMS;
      }
      let list: ClaimRecord[] = JSON.parse(data);
      let hasLegacy = false;
      list = list.map((c) => {
        const cleanUpdated = this.formatDisplayTimestamp(c.lastUpdatedAt);
        if (cleanUpdated !== c.lastUpdatedAt) {
          hasLegacy = true;
          return { ...c, lastUpdatedAt: cleanUpdated };
        }
        return c;
      });
      if (hasLegacy) {
        localStorage.setItem(KEYS.CLAIMS, JSON.stringify(list));
      }
      return list;
    } catch {
      return INITIAL_CLAIMS;
    }
  }

  static saveClaims(claims: ClaimRecord[]): void {
    const cleaned = claims.map((c) => ({
      ...c,
      lastUpdatedAt: this.formatDisplayTimestamp(c.lastUpdatedAt)
    }));
    localStorage.setItem(KEYS.CLAIMS, JSON.stringify(cleaned));
  }

  static getAuditLogs(): AuditLogItem[] {
    try {
      const data = localStorage.getItem(KEYS.AUDIT);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static logAudit(user: string, action: string, entityType: string, entityId: string, details: string): void {
    const logs = this.getAuditLogs();
    logs.unshift({
      timestamp: this.formatNormalTimestamp(new Date()),
      user: user || 'Warehouse Operator',
      action,
      entityType,
      entityId,
      details
    });
    // Keep last 300 logs
    if (logs.length > 300) logs.length = 300;
    localStorage.setItem(KEYS.AUDIT, JSON.stringify(logs));
  }

  static getTheme(): ThemeMode {
    try {
      const mode = localStorage.getItem(KEYS.THEME);
      if (mode === 'dark' || mode === 'light') {
        return mode;
      }
      return 'light'; // Default mode is Light
    } catch {
      return 'light';
    }
  }

  static saveTheme(mode: ThemeMode): void {
    try {
      localStorage.setItem(KEYS.THEME, mode);
    } catch {}
  }

  static getGasUrl(): string {
    return localStorage.getItem(KEYS.GAS_URL) || '';
  }

  static saveGasUrl(url: string): void {
    localStorage.setItem(KEYS.GAS_URL, url.trim());
  }

  static getSheetId(): string {
    return localStorage.getItem(KEYS.SHEET_ID) || '';
  }

  static saveSheetId(id: string): void {
    localStorage.setItem(KEYS.SHEET_ID, id.trim());
  }

  // Lookup existing return by Order ID
  static findReturnByOrderId(orderId: string): ReturnRecord | undefined {
    if (!orderId || !orderId.trim()) return undefined;
    const cleanOrder = orderId.trim().toUpperCase();
    const list = this.getReturns();
    return list.find((r) => r.originalOrderId.trim().toUpperCase() === cleanOrder);
  }

  // Update existing return record
  static updateReturnRecord(updatedRecord: ReturnRecord, operator: string = 'Warehouse Operator'): boolean {
    const list = this.getReturns();
    const cleanRetId = (updatedRecord.returnEntryId || '').trim();
    const cleanOrdId = (updatedRecord.originalOrderId || '').trim().toUpperCase();

    // Match by returnEntryId OR by originalOrderId to ensure existing item is modified
    let idx = list.findIndex((r) => cleanRetId && r.returnEntryId === cleanRetId);
    if (idx === -1 && cleanOrdId) {
      idx = list.findIndex((r) => r.originalOrderId.trim().toUpperCase() === cleanOrdId);
    }

    if (idx !== -1) {
      list[idx] = updatedRecord;
      this.saveReturns(list);
      this.logAudit(
        operator,
        'UPDATE_RETURN',
        'Return_Log',
        updatedRecord.returnEntryId,
        `Order ID: ${updatedRecord.originalOrderId}, Condition: ${updatedRecord.itemCondition}`
      );
      // Trigger background sync to Google Apps Script as an in-place update
      this.syncReturnToGas(updatedRecord, true);
      return true;
    }
    return false;
  }

  // Delete return record if wrongly entered (matches by Return ID or Order ID)
  static deleteReturn(returnEntryId: string, operator: string = 'Warehouse Operator', orderId?: string): boolean {
    const list = this.getReturns();
    const cleanRetId = (returnEntryId || '').trim();
    const cleanOrdId = (orderId || '').trim().toUpperCase();
    const cleanOrdAlpha = cleanOrdId.replace(/[^A-Z0-9]/g, '');

    const target = list.find(
      (r) => (cleanRetId && r.returnEntryId.trim().toUpperCase() === cleanRetId.toUpperCase()) ||
             (cleanOrdId && r.originalOrderId.trim().toUpperCase() === cleanOrdId) ||
             (cleanOrdAlpha && cleanOrdAlpha.length >= 4 && r.originalOrderId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanOrdAlpha)
    );

    const actualReturnId = target?.returnEntryId || cleanRetId;
    const actualOrderId = target?.originalOrderId || cleanOrdId;
    const actualOrdUpper = actualOrderId.trim().toUpperCase();
    const actualOrdAlpha = actualOrdUpper.replace(/[^A-Z0-9]/g, '');

    const filtered = list.filter((r) => {
      const rRetUpper = r.returnEntryId.trim().toUpperCase();
      const rOrdUpper = r.originalOrderId.trim().toUpperCase();
      const rOrdAlpha = rOrdUpper.replace(/[^A-Z0-9]/g, '');

      // Exclude if Return ID matches
      if (cleanRetId && rRetUpper === cleanRetId.toUpperCase()) return false;
      if (actualReturnId && rRetUpper === actualReturnId.trim().toUpperCase()) return false;

      // Exclude if Order ID matches
      if (cleanOrdId && rOrdUpper === cleanOrdId) return false;
      if (actualOrdUpper && rOrdUpper === actualOrdUpper) return false;
      if (cleanOrdAlpha && cleanOrdAlpha.length >= 4 && rOrdAlpha === cleanOrdAlpha) return false;
      if (actualOrdAlpha && actualOrdAlpha.length >= 4 && rOrdAlpha === actualOrdAlpha) return false;

      return true;
    });

    this.saveReturns(filtered);
    this.logAudit(
      operator,
      'DELETE_RETURN',
      'Return_Log',
      actualReturnId || actualOrderId,
      `Deleted return entry for Order ID: ${actualOrderId || 'Unknown'}`
    );
    // Trigger deletion sync in Google Sheets backend
    this.syncDeleteReturnToGas(actualReturnId, actualOrderId, operator);
    return true;
  }

  // Async delete return method that awaits both local storage removal and Google Sheets backend sync
  static async deleteReturnAsync(returnEntryId: string, operator: string = 'Warehouse Operator', orderId?: string): Promise<{ success: boolean; message?: string }> {
    this.deleteReturn(returnEntryId, operator, orderId);
    return await this.syncDeleteReturnToGas(returnEntryId, orderId, operator);
  }

  // Universal Google Apps Script dispatcher
  // Uses /api/gas-proxy on Node.js server first (no CORS, follows 302 redirects), falls back to direct fetch
  static async sendGasRequest(options: {
    action: string;
    queryParams?: Record<string, any>;
    payload?: any;
    method?: 'GET' | 'POST';
  }): Promise<{ success: boolean; data?: any; message?: string; error?: string }> {
    const rawGasUrl = this.getGasUrl();
    if (!rawGasUrl || !rawGasUrl.trim()) {
      return { success: true, message: 'Saved locally (Google Apps Script Web App URL not configured).' };
    }
    const gasUrl = rawGasUrl.trim();
    const token = this.getWarehousePasscode().trim();
    const sheetId = this.getSheetId().trim();

    const mergedQueryParams = {
      action: options.action,
      token,
      sheetId,
      ...(options.queryParams || {})
    };

    const mergedPayload = {
      action: options.action,
      token,
      sheetId,
      ...(options.payload || {})
    };

    // 1. Attempt via Server Proxy (/api/gas-proxy)
    try {
      const proxyRes = await fetch('/api/gas-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gasUrl,
          method: options.method || 'POST',
          queryParams: mergedQueryParams,
          payload: mergedPayload
        })
      });

      if (proxyRes.ok) {
        const result = await proxyRes.json();
        if (result && typeof result === 'object') {
          if (result.success !== false) {
            return {
              success: true,
              data: result,
              message: result.message || 'Operation processed successfully in Google Sheet.'
            };
          } else {
            return {
              success: false,
              data: result,
              error: result.error || 'Google Apps Script reported an error.'
            };
          }
        }
      }
    } catch (proxyErr) {
      console.warn('[Proxy Notice]: /api/gas-proxy unreachable, proceeding with client direct fallback', proxyErr);
    }

    // 2. Direct client fetch fallback
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(mergedQueryParams)) {
        if (v !== undefined && v !== null) {
          qs.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
        }
      }
      const directUrl = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}${qs.toString()}`;

      if (options.method === 'GET') {
        const getRes = await fetch(directUrl);
        const getData = await getRes.json();
        return { success: getData.success !== false, data: getData, message: getData.message, error: getData.error };
      } else {
        await fetch(directUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(mergedPayload),
          mode: 'no-cors'
        });
        // Also call secondary GET to guarantee processing
        try {
          await fetch(directUrl, { method: 'GET', mode: 'no-cors' });
        } catch {}
        return { success: true, message: 'Request dispatched to Google Apps Script.' };
      }
    } catch (directErr: any) {
      return { success: false, error: directErr?.message || 'Failed to dispatch request to Google Apps Script.' };
    }
  }

  // Background sync deletion to Google Apps Script Web App
  static async syncDeleteReturnToGas(returnEntryId: string, orderId?: string, operator: string = 'Warehouse Operator'): Promise<{ success: boolean; message?: string }> {
    const cleanRetId = (returnEntryId || '').trim();
    const cleanOrdId = (orderId || '').trim();

    const res = await this.sendGasRequest({
      action: 'deleteReturn',
      queryParams: {
        returnId: cleanRetId,
        orderId: cleanOrdId,
        returnEntryId: cleanRetId,
        originalOrderId: cleanOrdId,
        user: operator
      },
      payload: {
        returnId: cleanRetId,
        orderId: cleanOrdId,
        returnEntryId: cleanRetId,
        originalOrderId: cleanOrdId,
        user: operator,
        data: {
          returnId: cleanRetId,
          orderId: cleanOrdId,
          returnEntryId: cleanRetId,
          originalOrderId: cleanOrdId
        }
      },
      method: 'POST'
    });

    if (res.success) {
      return {
        success: true,
        message: res.message || `✓ Permanently deleted record for Order "${cleanOrdId || cleanRetId}" from Google Sheets.`
      };
    } else {
      return {
        success: false,
        message: res.error || 'Failed to delete record from Google Sheets.'
      };
    }
  }

  // Duplicate check logic
  static checkDuplicate(marketplace: string, orderId: string, skuCode: string, returnType: string): DuplicateCheckResult {
    if (!orderId || !orderId.trim()) return { isDuplicate: false };
    const cleanOrderId = orderId.trim().toUpperCase();
    const cleanMarketplace = (marketplace || '').trim().toUpperCase();
    const cleanSku = (skuCode || '').trim().toUpperCase();

    const returns = this.getReturns();
    const existing = returns.find((r) => {
      const matchOrder = r.originalOrderId.trim().toUpperCase() === cleanOrderId;
      const matchMkt = r.marketplace.trim().toUpperCase() === cleanMarketplace;
      const matchSku = r.masterSkuCode.trim().toUpperCase() === cleanSku;
      return matchOrder && (matchMkt || matchSku || cleanOrderId.length >= 3);
    });

    if (existing) {
      return { isDuplicate: true, existingReturn: existing };
    }
    return { isDuplicate: false };
  }

  // Conflict detection among variants
  static checkVariantConflicts(variants: SkuVariant[]): AliasConflict[] {
    const map = new Map<string, string>();
    const conflicts: AliasConflict[] = [];

    for (const v of variants) {
      const alias = v.variantCode.trim().toUpperCase();
      if (!alias) continue;
      if (map.has(alias)) {
        const existingMaster = map.get(alias)!;
        if (existingMaster !== v.masterSkuCode) {
          conflicts.push({
            variantCode: alias,
            firstMasterSku: existingMaster,
            secondMasterSku: v.masterSkuCode
          });
        }
      } else {
        map.set(alias, v.masterSkuCode);
      }
    }
    return conflicts;
  }

  // Unique ID generation
  static generateReturnId(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `TBM-RET-${yyyy}${mm}${dd}-${rand}`;
  }

  static generateClaimId(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `TBM-CLM-${yyyy}${mm}${dd}-${rand}`;
  }

  // Fetch live SKU Master and Variants from Google Apps Script Web App
  static async fetchSkuCatalogFromGas(): Promise<{
    success: boolean;
    count?: number;
    message?: string;
    sheetNameFound?: string;
    skus?: SkuMasterItem[];
  }> {
    const gasUrl = this.getGasUrl();
    if (!gasUrl) {
      return { 
        success: false, 
        message: 'Google Apps Script Web App URL is not set in Database & Sync Hub. Please configure it first.' 
      };
    }

    try {
      const token = this.getWarehousePasscode();
      const sheetId = this.getSheetId();
      const url = `${gasUrl.trim()}${gasUrl.includes('?') ? '&' : '?'}action=getSkuCatalog&token=${encodeURIComponent(token)}&sheetId=${encodeURIComponent(sheetId)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data && data.masterList && data.masterList.length > 0) {
        this.saveSkuMaster(data.masterList);
        if (data.variantList && data.variantList.length > 0) {
          this.saveSkuVariants(data.variantList);
        }
        return {
          success: true,
          count: data.masterList.length,
          sheetNameFound: data.sheetNameFound || 'SKU tab',
          skus: data.masterList,
          message: `Successfully loaded ${data.masterList.length} SKUs from Google Sheet tab "${data.sheetNameFound || 'SKU_Master'}"!`
        };
      } else {
        return {
          success: false,
          sheetNameFound: data ? data.sheetNameFound : undefined,
          message: data && data.sheetNameFound 
            ? `Connected to sheet, but tab "${data.sheetNameFound}" had 0 data rows. Check that your SKU records start on row 2.`
            : 'Connected, but no SKU rows found in the sheet. Ensure the tab has headers and data.'
        };
      }
    } catch (e: any) {
      return {
        success: false,
        message: `Failed to fetch SKUs: ${e.message || 'CORS or Web App access restricted. Ensure Web App deployment is set to "Anyone".'}`
      };
    }
  }

  // Live Auto-fetch Returns from Google Apps Script Web App
  static async fetchReturnsFromGas(): Promise<{
    success: boolean;
    count?: number;
    returns?: ReturnRecord[];
    message?: string;
  }> {
    const gasUrl = this.getGasUrl();
    if (!gasUrl) {
      return { success: false, message: 'Google Apps Script Web App URL is not set.' };
    }

    try {
      const token = this.getWarehousePasscode();
      const sheetId = this.getSheetId();
      const url = `${gasUrl.trim()}${gasUrl.includes('?') ? '&' : '?'}action=getReturns&token=${encodeURIComponent(token)}&sheetId=${encodeURIComponent(sheetId)}`;
      const res = await fetch(url);
      const data = await res.json();

      let list: ReturnRecord[] = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data && Array.isArray(data.returns)) {
        list = data.returns;
      }

      if (list && list.length > 0) {
        this.saveReturns(list);
        return {
          success: true,
          count: list.length,
          returns: list,
          message: `Successfully synchronized ${list.length} returns from Google Sheet "Return_Log"!`
        };
      }

      return {
        success: true,
        count: 0,
        returns: [],
        message: 'Connected to Google Sheet, no existing return rows found.'
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Failed to fetch returns: ${e.message || 'Could not connect to Web App'}`
      };
    }
  }

  // Parse pasted TSV / CSV rows directly copied from Google Sheets tab
  static importSkuMasterFromText(rawText: string): { 
    success: boolean; 
    count: number; 
    message: string;
    skus?: SkuMasterItem[];
  } {
    if (!rawText || !rawText.trim()) {
      return { success: false, count: 0, message: 'No text provided. Please paste rows copied from your Google Sheet.' };
    }

    const lines = rawText.trim().split(/\r?\n/);
    if (lines.length === 0) {
      return { success: false, count: 0, message: 'Empty lines provided.' };
    }

    let startIdx = 0;
    let colMap = {
      skuCode: 0,
      skuName: 1,
      weight: 2,
      cost: 3,
      variantsMap: 4,
      category: 5
    };

    const firstLine = lines[0].toLowerCase();
    const hasHeader = 
      firstLine.includes('sku') || 
      firstLine.includes('code') || 
      firstLine.includes('weight') || 
      firstLine.includes('mfg') ||
      firstLine.includes('frieght') ||
      firstLine.includes('freight');

    if (hasHeader) {
      startIdx = 1;
      const headers = lines[0].includes('\t') ? lines[0].split('\t') : lines[0].split(',');
      for (let h = 0; h < headers.length; h++) {
        const head = headers[h].trim().toLowerCase();
        if (head.includes('sku code') || head === 'code' || head === 'sku' || head.includes('item code')) {
          colMap.skuCode = h;
        } else if (head.includes('sku name') || head.includes('product name') || head === 'title' || head === 'name') {
          colMap.skuName = h;
        } else if (head.includes('weight') || head.includes('grams') || head === 'wt') {
          colMap.weight = h;
        } else if (head.includes('mfg') || head.includes('freight') || head.includes('frieght') || head.includes('cost') || head.includes('price')) {
          colMap.cost = h;
        } else if (head.includes('variants map') || head.includes('aliases') || head.includes('variant') || head.includes('map')) {
          colMap.variantsMap = h;
        } else if (head.includes('category')) {
          colMap.category = h;
        }
      }
    }

    const imported: SkuMasterItem[] = [];

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.includes('\t') ? line.split('\t') : line.split(',');
      const rawCode = cols[colMap.skuCode] || cols[0] || '';
      const code = rawCode.trim().replace(/^["']|["']$/g, '');
      if (!code) continue;

      const rawName = cols[colMap.skuName] !== undefined ? cols[colMap.skuName] : (cols[1] || code);
      const name = rawName.trim().replace(/^["']|["']$/g, '');
      
      const rawWeight = cols[colMap.weight] !== undefined ? cols[colMap.weight] : (cols[2] || '0');
      const cleanWeight = parseFloat(String(rawWeight).replace(/[^0-9.]/g, '')) || 0;

      const rawCost = cols[colMap.cost] !== undefined ? cols[colMap.cost] : (cols[3] || '0');
      const cleanCost = parseFloat(String(rawCost).replace(/[^0-9.]/g, '')) || 0;

      const rawVariants = cols[colMap.variantsMap] !== undefined ? cols[colMap.variantsMap] : (cols[4] || '');
      const variantsMap = rawVariants.trim().replace(/^["']|["']$/g, '');

      const rawCategory = cols[colMap.category] !== undefined ? cols[colMap.category] : (cols[5] || 'General');
      const cat = rawCategory.trim().replace(/^["']|["']$/g, '') || 'General';

      imported.push({
        skuCode: code.toUpperCase(),
        skuName: name || code,
        weightGrams: cleanWeight,
        mfgFreightCost: cleanCost,
        variantsMapRaw: variantsMap,
        category: cat,
        active: true,
        lastUpdatedAt: this.formatNormalTimestamp(new Date())
      });
    }

    if (imported.length > 0) {
      this.saveSkuMaster(imported);
      return {
        success: true,
        count: imported.length,
        skus: imported,
        message: `Successfully imported ${imported.length} SKUs into the local catalog!`
      };
    }

    return { 
      success: false, 
      count: 0, 
      message: 'Could not parse any valid SKU rows. Ensure you copied columns: SKU Code, SKU Name, Weight, Mfg + Freight.' 
    };
  }

  // Push return to configured Google Apps Script Web App (handles both new entry and in-place modify)
  static async syncReturnToGas(returnRecord: ReturnRecord, isUpdate: boolean = false): Promise<{ success: boolean; message?: string }> {
    const actionName = isUpdate ? 'updateReturn' : 'saveReturn';
    const res = await this.sendGasRequest({
      action: actionName,
      queryParams: {
        user: returnRecord.createdBy || 'Warehouse Operator',
        returnId: returnRecord.returnEntryId,
        orderId: returnRecord.originalOrderId,
        data: returnRecord
      },
      payload: {
        action: actionName,
        isUpdate: isUpdate,
        user: returnRecord.createdBy || 'Warehouse Operator',
        returnId: returnRecord.returnEntryId,
        orderId: returnRecord.originalOrderId,
        data: returnRecord
      },
      method: 'POST'
    });

    if (res.success) {
      return {
        success: true,
        message: res.message || (isUpdate 
          ? `✓ Modified and replaced record "${returnRecord.returnEntryId}" in Google Sheets.` 
          : `✓ Saved new return "${returnRecord.returnEntryId}" to Google Sheets.`)
      };
    } else {
      return {
        success: false,
        message: res.error || (isUpdate 
          ? 'Failed to update record in Google Sheets. Please ensure your script is deployed.' 
          : 'Failed to save record to Google Sheets.')
      };
    }
  }

  // Live Test Authorization mechanism against configured Google Apps Script Web App
  static async testAuthorization(): Promise<{
    success: boolean;
    authorized: boolean;
    latencyMs: number;
    message: string;
    timestamp?: string;
  }> {
    const gasUrl = this.getGasUrl();
    if (!gasUrl) {
      return {
        success: false,
        authorized: false,
        latencyMs: 0,
        message: 'No Google Apps Script Web App URL configured. Please paste your Web App URL in Database & Sync Hub.'
      };
    }

    const startTime = performance.now();
    const token = this.getWarehousePasscode();
    const sheetId = this.getSheetId();
    const url = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}action=ping&token=${encodeURIComponent(token)}&sheetId=${encodeURIComponent(sheetId)}`;

    try {
      const res = await fetch(url);
      const latencyMs = Math.round(performance.now() - startTime);
      const data = await res.json();

      if (data && data.status === 'ok') {
        return {
          success: true,
          authorized: true,
          latencyMs,
          message: 'Authorization SUCCESSFUL: Google Apps Script Web App validated security passcode and granted read/write access to "Warehouse Returns Master & P&L Ledger".',
          timestamp: data.timestamp
        };
      } else if (data && data.error) {
        return {
          success: false,
          authorized: false,
          latencyMs,
          message: `Authorization FAILED: ${data.error}`
        };
      }
      return {
        success: false,
        authorized: false,
        latencyMs,
        message: 'Received unexpected response from Web App.'
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        authorized: false,
        latencyMs,
        message: `Network or CORS error connecting to Web App (${err?.message || 'Failed to fetch'}). Verify that your Apps Script Web App deployment is set to "Who has access: Anyone".`
      };
    }
  }

  // Push claim to configured Google Apps Script Web App
  static async syncClaimToGas(claimRecord: ClaimRecord): Promise<{ success: boolean; message?: string }> {
    const gasUrl = this.getGasUrl();
    if (!gasUrl) {
      return { success: true, message: 'Saved locally (GAS Web App URL not configured yet).' };
    }

    try {
      await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveClaim',
          token: this.getWarehousePasscode(),
          user: claimRecord.createdBy,
          data: claimRecord
        }),
        mode: 'no-cors'
      });
      return { success: true, message: 'Dispatched claim to Google Apps Script Web App.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to connect to Google Apps Script.' };
    }
  }

  // Export CSV
  static exportReturnsToCsv(): void {
    const returns = this.getReturns();
    if (returns.length === 0) return;

    const headers = Object.keys(returns[0]);
    const csvRows = [headers.join(',')];

    for (const r of returns) {
      const values = headers.map((header) => {
        const val = (r as any)[header];
        const escaped = ('' + (val !== undefined && val !== null ? val : '')).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TABBYMART_Returns_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
