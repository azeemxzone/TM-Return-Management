import { ReturnRecord, SkuMasterItem, SkuVariant, ClaimRecord, AuditLogItem, AuthUser, UserRole } from '../types';
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
  PASSCODE: 'tabbymart_warehouse_passcode_v2',
  AUTH_SESSION: 'tabbymart_auth_session_v2',
  CUSTOM_CREDS: 'tabbymart_custom_creds_v2'
};

// Embedded default Google Apps Script Web App URL
// Pre-configured for TABBYMART's "Warehouse Returns Master & P&L Ledger"
export const DEFAULT_EMBEDDED_GAS_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GAS_URL) || 
  'https://script.google.com/macros/s/AKfycbzE4_JnfY5jpz4QnuXY5p2ZDy7SwUpezjouJXNkN2aZmfslYu_IcVAHNd5CggUZNf-7/exec';

export const STATION_PRESETS = [
  { id: 'Station 1 - Receiving & Unboxing', label: 'Station 1 - Receiving & Unboxing' },
  { id: 'Station 2 - Weighing & Inspection', label: 'Station 2 - Weighing & Inspection' },
  { id: 'Station 3 - QC & Disposition', label: 'Station 3 - QC & Disposition' },
  { id: 'Station 4 - RTO Courier Returns', label: 'Station 4 - RTO Courier Returns' },
  { id: 'Station 5 - SPF & Claims Desk', label: 'Station 5 - SPF & Claims Desk' },
  { id: 'Mobile Handheld Scanner Unit', label: 'Mobile Handheld Scanner Unit' },
];

export interface StoredCredentials {
  adminPin: string;
  adminPassword: string;
  operatorPin: string;
  operatorPassword: string;
}

export const DEFAULT_CREDENTIALS: StoredCredentials = {
  adminPin: '888888',
  adminPassword: 'tabbyadmin2026',
  operatorPin: '123456',
  operatorPassword: 'tabby123'
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
      return 'dark'; // Default mode is Dark
    } catch {
      return 'dark';
    }
  }

  static saveTheme(mode: ThemeMode): void {
    try {
      localStorage.setItem(KEYS.THEME, mode);
    } catch {}
  }

  private static universalLoaded = false;

  /**
   * Initializes universal configuration.
   * 1. Checks URL query parameters (?gasUrl=...&passcode=...) for instant 1-click station sync.
   * 2. Checks backend /api/gas-config (if running fullstack Node).
   * 3. Falls back to static /gas-config.json (for static GitHub Pages deployment on www.tabbymart.com).
   * Ensures that any Google Apps Script Web App URL or PIN applies universally across all warehouse stations and browsers!
   */
  static async initUniversalConfig(): Promise<{ gasUrl: string; credentials?: StoredCredentials }> {
    // 1. Check for URL query parameter handoff (e.g. 1-click sync link from admin)
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const queryGasUrl = urlParams.get('gasUrl');
        const queryPasscode = urlParams.get('passcode') || urlParams.get('token');
        const querySheetId = urlParams.get('sheetId');
        let didUpdate = false;

        if (queryGasUrl && queryGasUrl.trim().startsWith('https://script.google.com/macros/s/')) {
          localStorage.setItem(KEYS.GAS_URL, queryGasUrl.trim());
          didUpdate = true;
        }
        if (queryPasscode && queryPasscode.trim()) {
          localStorage.setItem(KEYS.PASSCODE, queryPasscode.trim());
          didUpdate = true;
        }
        if (querySheetId && querySheetId.trim()) {
          localStorage.setItem(KEYS.SHEET_ID, querySheetId.trim());
          didUpdate = true;
        }

        if (didUpdate) {
          // Clean up address bar query params without reloading
          const cleanUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
          this.universalLoaded = true;
          return { gasUrl: this.getGasUrl(), credentials: this.getCredentials() };
        }
      } catch (e) {
        console.warn('[StorageService]: Error parsing URL parameters', e);
      }
    }

    // 2. Possibility 1: If sheetId exists, attempt to pull Config tab from Google Sheets
    const activeSheetId = localStorage.getItem(KEYS.SHEET_ID) || '';
    if (activeSheetId) {
      try {
        const sheetConfig = await this.fetchSheetConfigTab(activeSheetId);
        if (sheetConfig) {
          const remoteGasUrl = sheetConfig.gasUrl || sheetConfig.Web_App_URL || sheetConfig.Gas_URL;
          if (remoteGasUrl && remoteGasUrl.startsWith('https://script.google.com')) {
            localStorage.setItem(KEYS.GAS_URL, remoteGasUrl.trim());
          }
          const remotePass = sheetConfig.warehousePasscode || sheetConfig.Passcode;
          if (remotePass) {
            localStorage.setItem(KEYS.PASSCODE, remotePass.trim());
          }
          if (sheetConfig.adminPin || sheetConfig.operatorPin) {
            this.saveCredentials({
              ...(sheetConfig.adminPin ? { adminPin: sheetConfig.adminPin } : {}),
              ...(sheetConfig.operatorPin ? { operatorPin: sheetConfig.operatorPin } : {})
            });
          }
        }
      } catch {}
    }

    // 3. Fetch universal configuration from server or static /gas-config.json
    try {
      let res: Response | null = await fetch('/api/gas-config').catch(() => null);
      if (!res || !res.ok) {
        // Fallback to static gas-config.json (hosted on GitHub Pages /dist/gas-config.json)
        res = await fetch(`/gas-config.json?_t=${Date.now()}`).catch(() => null);
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data && (data.success || data.gasUrl)) {
          if (data.gasUrl && typeof data.gasUrl === 'string' && data.gasUrl.trim().startsWith('https://script.google.com')) {
            const currentStored = localStorage.getItem(KEYS.GAS_URL);
            // If local storage is empty, uses outdated dummy placeholder, or doesn't match universal default
            if (!currentStored || currentStored.includes('AKfycbz_tabbymart_returns_master') || !currentStored.startsWith('https://script.google.com')) {
              localStorage.setItem(KEYS.GAS_URL, data.gasUrl.trim());
            }
          }
          if (data.sheetId) {
            localStorage.setItem(KEYS.SHEET_ID, data.sheetId.trim());
          }
          if (data.warehousePasscode) {
            localStorage.setItem(KEYS.PASSCODE, data.warehousePasscode.trim());
          }
          if (data.credentials && typeof data.credentials === 'object') {
            const current = this.getCredentials();
            const merged = { ...current, ...data.credentials };
            localStorage.setItem(KEYS.CUSTOM_CREDS, JSON.stringify(merged));
          }
          this.universalLoaded = true;
          return { gasUrl: this.getGasUrl(), credentials: this.getCredentials() };
        }
      }
    } catch (e) {
      console.warn('[StorageService]: Failed to fetch universal server config, using local cache', e);
    }
    return { gasUrl: this.getGasUrl(), credentials: this.getCredentials() };
  }

  /**
   * Possibility 1: Read public Google Sheet Config tab via Google Visualization API
   * Format: https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:json&sheet=Config
   */
  static async fetchSheetConfigTab(sheetId: string): Promise<Record<string, string> | null> {
    if (!sheetId || !sheetId.trim()) return null;
    try {
      const cleanId = sheetId.trim();
      const url = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:json&sheet=Config`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const text = await res.text();
      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);/);
      if (!match || !match[1]) return null;
      const json = JSON.parse(match[1]);
      const table = json.table;
      if (!table || !table.rows) return null;

      const configMap: Record<string, string> = {};
      for (const row of table.rows) {
        if (!row.c || row.c.length < 2) continue;
        const key = row.c[0]?.v !== undefined ? String(row.c[0].v).trim() : '';
        const val = row.c[1]?.v !== undefined ? String(row.c[1].v).trim() : '';
        if (key && val) {
          configMap[key] = val;
        }
      }
      return configMap;
    } catch (e) {
      console.warn('[StorageService]: Could not read Google Sheet Config tab', e);
      return null;
    }
  }

  /**
   * Generates a 1-click station synchronization URL that can be opened on Browser 2,
   * mobile barcode scanners, or any warehouse tablet to automatically set the Google Apps Script Web App URL and PIN.
   */
  static getStationSyncLink(): string {
    if (typeof window === 'undefined') return '';
    const base = `${window.location.origin}${window.location.pathname}`;
    const params = new URLSearchParams();
    params.set('gasUrl', this.getGasUrl());
    const pass = this.getWarehousePasscode();
    if (pass) params.set('passcode', pass);
    const sheetId = this.getSheetId();
    if (sheetId) params.set('sheetId', sheetId);
    return `${base}?${params.toString()}`;
  }

  static getGasUrl(): string {
    const custom = localStorage.getItem(KEYS.GAS_URL);
    // If the browser still has the old dummy placeholder stored, migrate immediately to the user's real embedded URL
    if (custom && custom.includes('AKfycbz_tabbymart_returns_master')) {
      localStorage.setItem(KEYS.GAS_URL, DEFAULT_EMBEDDED_GAS_URL);
      return DEFAULT_EMBEDDED_GAS_URL;
    }
    if (custom && custom.trim() && custom.trim().startsWith('https://script.google.com')) {
      return custom.trim();
    }
    return DEFAULT_EMBEDDED_GAS_URL;
  }

  static getCustomGasUrl(): string {
    return localStorage.getItem(KEYS.GAS_URL) || '';
  }

  static isUsingEmbeddedGasUrl(): boolean {
    const current = this.getGasUrl();
    const custom = localStorage.getItem(KEYS.GAS_URL);
    return !custom || !custom.trim() || custom.trim() === DEFAULT_EMBEDDED_GAS_URL || current === DEFAULT_EMBEDDED_GAS_URL;
  }

  static saveGasUrl(url: string): void {
    const clean = (url || '').trim();
    if (!clean) {
      localStorage.removeItem(KEYS.GAS_URL);
    } else {
      localStorage.setItem(KEYS.GAS_URL, clean);
    }

    // Persist universally to the server so ALL browsers & stations get the updated URL
    try {
      fetch('/api/gas-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gasUrl: clean || DEFAULT_EMBEDDED_GAS_URL })
      }).catch((e) => console.warn('[StorageService] Universal gas-config sync warning:', e));
    } catch {}
  }

  static resetToEmbeddedGasUrl(): void {
    localStorage.removeItem(KEYS.GAS_URL);
    try {
      fetch('/api/gas-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gasUrl: DEFAULT_EMBEDDED_GAS_URL })
      }).catch(() => {});
    } catch {}
  }

  static getSheetId(): string {
    return localStorage.getItem(KEYS.SHEET_ID) || '';
  }

  static saveSheetId(id: string): void {
    const clean = id.trim();
    localStorage.setItem(KEYS.SHEET_ID, clean);
    try {
      fetch('/api/gas-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId: clean })
      }).catch(() => {});
    } catch {}
  }

  // ============================================================
  // AUTHENTICATION & ACCESS CONTROL SERVICE (6-DIGIT PIN ARCHITECTURE)
  // ============================================================

  static getCredentials(): StoredCredentials {
    try {
      const raw = localStorage.getItem(KEYS.CUSTOM_CREDS);
      if (!raw) return DEFAULT_CREDENTIALS;
      return { ...DEFAULT_CREDENTIALS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_CREDENTIALS;
    }
  }

  static async saveCredentialsAsync(creds: Partial<StoredCredentials>): Promise<{ success: boolean; message: string }> {
    const current = this.getCredentials();
    const updated = { ...current, ...creds };
    localStorage.setItem(KEYS.CUSTOM_CREDS, JSON.stringify(updated));

    // Save universally to the server config so updated PINs apply across all stations
    try {
      const res = await fetch('/api/gas-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: updated })
      });
      if (res.ok) {
        return { success: true, message: 'Station credentials saved to backend and active universally.' };
      }
    } catch {}
    return { success: true, message: 'Station credentials saved to local storage.' };
  }

  static saveCredentials(creds: Partial<StoredCredentials>): void {
    this.saveCredentialsAsync(creds).catch(() => {});
  }

  /**
   * Admin-only utility to update both the 6-Digit Operator PIN and separate 6-Digit Admin PIN.
   * Requires providing the existing Admin PIN for verification.
   */
  static updatePins(
    currentAdminPin: string,
    newOperatorPin: string,
    newAdminPin: string
  ): { success: boolean; message: string } {
    const creds = this.getCredentials();
    const cleanCurrent = currentAdminPin.trim();
    const cleanOp = newOperatorPin.trim();
    const cleanAdm = newAdminPin.trim();

    if (cleanCurrent !== creds.adminPin && cleanCurrent !== creds.adminPassword) {
      return { success: false, message: 'Current Admin PIN is incorrect. Authorization denied.' };
    }

    if (!/^\d{6}$/.test(cleanOp)) {
      return { success: false, message: 'New Operator PIN must be exactly 6 numeric digits (0-9).' };
    }

    if (!/^\d{6}$/.test(cleanAdm)) {
      return { success: false, message: 'New Admin PIN must be exactly 6 numeric digits (0-9).' };
    }

    if (cleanOp === cleanAdm) {
      return { success: false, message: 'Operator PIN and Admin PIN should be different for security.' };
    }

    this.saveCredentials({
      operatorPin: cleanOp,
      adminPin: cleanAdm
    });

    this.logAudit(
      'Admin Supervisor',
      'PIN_UPDATE',
      'Security_Credentials',
      'PINs',
      'Operator and Admin 6-digit access PINs updated successfully.'
    );

    return {
      success: true,
      message: '✓ Both 6-Digit Station PINs updated successfully and stored in the backend. Factory default PINs are nullified.'
    };
  }

  static getCurrentUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(KEYS.AUTH_SESSION);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static setCurrentUser(user: AuthUser | null): void {
    try {
      if (user) {
        localStorage.setItem(KEYS.AUTH_SESSION, JSON.stringify(user));
        this.logAudit(
          user.name || user.username,
          'LOGIN',
          'Auth_Session',
          user.username,
          `Logged into ${user.stationId} with role: ${user.role.toUpperCase()}`
        );
      } else {
        const prev = this.getCurrentUser();
        if (prev) {
          this.logAudit(
            prev.name || prev.username,
            'LOGOUT',
            'Auth_Session',
            prev.username,
            `Logged out from station: ${prev.stationId}`
          );
        }
        localStorage.removeItem(KEYS.AUTH_SESSION);
      }
    } catch {}
  }

  static logout(): void {
    this.setCurrentUser(null);
  }

  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  static isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  /**
   * Authenticate warehouse staff securely via 6-digit Station PIN
   */
  static authenticateWithPin(
    pin: string,
    stationId: string = 'Station 1 - Receiving & Unboxing',
    customOperatorName?: string
  ): { success: boolean; user?: AuthUser; message?: string } {
    const cleanPin = (pin || '').trim();
    if (!cleanPin) {
      return { success: false, message: 'Please enter your 6-digit Station PIN.' };
    }

    const creds = this.getCredentials();
    const activeAdminPin = (creds.adminPin || '').trim();
    const activeOpPin = (creds.operatorPin || '').trim();

    // Check Admin PIN - STRICTLY matches active adminPin (or adminPassword if configured)
    // Default 888888 is nullified if adminPin has been changed!
    if (cleanPin === activeAdminPin || (creds.adminPassword && cleanPin === creds.adminPassword)) {
      const user: AuthUser = {
        username: 'admin',
        name: customOperatorName?.trim() || 'Admin Supervisor',
        role: 'admin',
        stationId,
        loginTime: this.formatNormalTimestamp(new Date()),
        rememberMe: true
      };
      this.setCurrentUser(user);
      return { success: true, user, message: 'Welcome back, Administrator. Full system unlocked.' };
    }

    // Check Operator PIN - STRICTLY matches active operatorPin (or operatorPassword if configured)
    // Default 123456 is nullified if operatorPin has been changed!
    if (cleanPin === activeOpPin || (creds.operatorPassword && cleanPin === creds.operatorPassword)) {
      const user: AuthUser = {
        username: 'operator',
        name: customOperatorName?.trim() || 'Zeeshan K',
        role: 'operator',
        stationId,
        loginTime: this.formatNormalTimestamp(new Date()),
        rememberMe: true
      };
      this.setCurrentUser(user);
      return { success: true, user, message: `Station Authorized: Ready for returns receipt at ${stationId}.` };
    }

    return {
      success: false,
      message: 'Invalid 6-Digit PIN. Authorization denied.'
    };
  }

  /**
   * Authenticate via full Username & Password
   */
  static authenticateWithCredentials(
    username: string,
    pass: string,
    stationId: string = 'Station 1 - Receiving & Unboxing',
    customName?: string,
    rememberMe: boolean = true
  ): { success: boolean; user?: AuthUser; message?: string } {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (pass || '').trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, message: 'Please enter both Username and Password.' };
    }

    const creds = this.getCredentials();

    if (cleanUser === 'admin' && cleanPass === creds.adminPassword) {
      const user: AuthUser = {
        username: 'admin',
        name: customName?.trim() || 'Administrator',
        role: 'admin',
        stationId,
        loginTime: this.formatNormalTimestamp(new Date()),
        rememberMe
      };
      this.setCurrentUser(user);
      return { success: true, user, message: 'Administrator authenticated successfully.' };
    }

    if (
      (cleanUser === 'operator' || cleanUser === 'staff' || cleanUser === 'tabby' || cleanUser === 'warehouse') &&
      cleanPass === creds.operatorPassword
    ) {
      const user: AuthUser = {
        username: cleanUser,
        name: customName?.trim() || 'Zeeshan K',
        role: 'operator',
        stationId,
        loginTime: this.formatNormalTimestamp(new Date()),
        rememberMe
      };
      this.setCurrentUser(user);
      return { success: true, user, message: `Operator authorized for ${stationId}.` };
    }

    return {
      success: false,
      message: 'Incorrect username or password. Check credentials or use Station PIN.'
    };
  }

  // Lookup existing return by Order ID
  static findReturnByOrderId(orderId: string): ReturnRecord | undefined {
    if (!orderId || !orderId.trim()) return undefined;
    const cleanOrder = orderId.trim().toUpperCase();
    const list = this.getReturns();
    return list.find((r) => r.originalOrderId.trim().toUpperCase() === cleanOrder);
  }

  // Update existing return record
  static updateReturnRecord(
    updatedRecord: ReturnRecord,
    operator: string = 'Warehouse Operator',
    triggerSync: boolean = false
  ): boolean {
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
      // Only trigger unawaited background sync if explicitly requested (callers await syncReturnToGas directly)
      if (triggerSync) {
        this.syncReturnToGas(updatedRecord, true);
      }
      return true;
    }
    return false;
  }

  // Delete return record if wrongly entered (matches by Return ID or Order ID)
  static deleteReturn(
    returnEntryId: string,
    operator: string = 'Warehouse Operator',
    orderId?: string,
    triggerSync: boolean = false
  ): boolean {
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
    // Only trigger unawaited sync if explicitly requested (deleteReturnAsync handles awaited sync)
    if (triggerSync) {
      this.syncDeleteReturnToGas(actualReturnId, actualOrderId, operator);
    }
    return true;
  }

  // Async delete return method that awaits both local storage removal and Google Sheets backend sync
  static async deleteReturnAsync(
    returnEntryId: string,
    operator: string = 'Warehouse Operator',
    orderId?: string
  ): Promise<{ success: boolean; message?: string }> {
    this.deleteReturn(returnEntryId, operator, orderId, false);
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

      // 1. Try server proxy first if running with backend
      let data: any = null;
      try {
        const proxyRes = await fetch('/api/gas-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gasUrl,
            method: 'GET',
            queryParams: { action: 'getSkuCatalog', token, sheetId }
          })
        });
        if (proxyRes.ok) {
          data = await proxyRes.json();
        }
      } catch {}

      // 2. Direct client fetch fallback (e.g. static GitHub Pages)
      if (!data) {
        const url = `${gasUrl.trim()}${gasUrl.includes('?') ? '&' : '?'}action=getSkuCatalog&token=${encodeURIComponent(token)}&sheetId=${encodeURIComponent(sheetId)}`;
        const res = await fetch(url);
        data = await res.json();
      }

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
      const isFetchFail = String(e?.message || '').includes('Failed to fetch');
      return {
        success: false,
        message: isFetchFail
          ? 'Google Apps Script blocked cross-origin access ("Failed to fetch"). In Apps Script, click Deploy > Manage deployments > Edit > set "Who has access" to "Anyone" (no Code.gs changes needed!). Your Google Sheet remains 100% private to you.'
          : `Failed to fetch SKUs: ${e?.message || 'Check Web App connection.'}`
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

      // 1. Try server proxy first if running with backend
      let data: any = null;
      try {
        const proxyRes = await fetch('/api/gas-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gasUrl,
            method: 'GET',
            queryParams: { action: 'getReturns', token, sheetId }
          })
        });
        if (proxyRes.ok) {
          data = await proxyRes.json();
        }
      } catch {}

      // 2. Direct client fetch fallback
      if (!data) {
        const url = `${gasUrl.trim()}${gasUrl.includes('?') ? '&' : '?'}action=getReturns&token=${encodeURIComponent(token)}&sheetId=${encodeURIComponent(sheetId)}`;
        const res = await fetch(url);
        data = await res.json();
      }

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
      const isFetchFail = String(e?.message || '').includes('Failed to fetch');
      return {
        success: false,
        message: isFetchFail
          ? 'Google Apps Script blocked cross-origin access ("Failed to fetch"). In Apps Script, click Deploy > Manage deployments > Edit > set "Who has access" to "Anyone" (no Code.gs changes needed!). Your Google Sheet remains 100% private to you.'
          : `Failed to fetch returns: ${e?.message || 'Could not connect to Web App'}`
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
        returnId: returnRecord.returnEntryId,
        orderId: returnRecord.originalOrderId,
        isUpdate: isUpdate ? 'true' : 'false',
        user: returnRecord.createdBy || 'Warehouse Operator'
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
      // 1. Try server proxy if available
      let data: any = null;
      try {
        const proxyRes = await fetch('/api/gas-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gasUrl,
            method: 'GET',
            queryParams: { action: 'ping', token, sheetId }
          })
        });
        if (proxyRes.ok) {
          data = await proxyRes.json();
        }
      } catch {}

      // 2. Direct client fetch fallback
      if (!data) {
        const res = await fetch(url);
        data = await res.json();
      }

      const latencyMs = Math.round(performance.now() - startTime);

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
      // Run diagnostic check via no-cors
      try {
        await fetch(url, { method: 'GET', mode: 'no-cors' });
        return {
          success: false,
          authorized: false,
          latencyMs,
          message: 'Endpoint is live, but Google blocked direct cross-origin data reads ("Failed to fetch"). In Apps Script, open Deploy > Manage deployments > Edit > set "Who has access" to "Anyone" (no Code.gs changes needed!). Your Google Sheet remains 100% private to you.'
        };
      } catch {
        return {
          success: false,
          authorized: false,
          latencyMs,
          message: `Connection note: Failed to fetch. In Google Apps Script, ensure your Web App deployment is configured with "Who has access: Anyone". If set to "Only myself", browsers on tabbymart.com are blocked by Google.`
        };
      }
    }
  }

  // Push claim to configured Google Apps Script Web App
  static async syncClaimToGas(claimRecord: ClaimRecord): Promise<{ success: boolean; message?: string }> {
    const res = await this.sendGasRequest({
      action: 'saveClaim',
      queryParams: {
        claimId: claimRecord.claimId,
        orderId: claimRecord.orderId,
        user: claimRecord.createdBy || 'Claims Specialist'
      },
      payload: {
        action: 'saveClaim',
        user: claimRecord.createdBy || 'Claims Specialist',
        data: claimRecord
      },
      method: 'POST'
    });

    if (res.success) {
      return { success: true, message: res.message || 'Dispatched claim to Google Apps Script Web App.' };
    } else {
      return { success: false, message: res.error || 'Failed to dispatch claim to Google Apps Script.' };
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
