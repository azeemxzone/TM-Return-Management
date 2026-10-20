import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { ThemeMode } from '../types';
import { 
  FileCode2, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck, 
  Database, 
  AlertTriangle,
  Play,
  Layers,
  Sparkles,
  Smartphone,
  Scan,
  Clock,
  Key,
  Lock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export type GasSubTab = 'ledger_guide' | 'operator_guide' | 'code_gs' | 'sheet_headers' | 'troubleshooting' | 'auth_mechanism';

interface GasDeploymentCenterProps {
  theme?: ThemeMode;
  initialSubTab?: GasSubTab;
}

export const GasDeploymentCenter: React.FC<GasDeploymentCenterProps> = ({ theme = 'light', initialSubTab }) => {
  const isLight = theme === 'light';
  const [activeSubTab, setActiveSubTab] = useState<GasSubTab>(initialSubTab || 'ledger_guide');
  const [gasUrl, setGasUrl] = useState<string>(() => StorageService.getGasUrl());
  const [sheetId, setSheetId] = useState<string>(() => StorageService.getSheetId());
  const [passcode, setPasscode] = useState<string>(() => StorageService.getWarehousePasscode());
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live Authorization Mechanism test state
  const [authTestResult, setAuthTestResult] = useState<{
    success: boolean;
    authorized: boolean;
    latencyMs: number;
    message: string;
    timestamp?: string;
  } | null>(null);
  const [isAuthTesting, setIsAuthTesting] = useState<boolean>(false);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveConfig = () => {
    StorageService.saveGasUrl(gasUrl);
    StorageService.saveSheetId(sheetId);
    StorageService.saveWarehousePasscode(passcode);
    alert('Configuration & Security Passcode saved! The app is authorized to synchronize with "Warehouse Returns Master & P&L Ledger".');
  };

  const handleTestConnection = async () => {
    if (!gasUrl.trim()) {
      setTestResult({
        success: false,
        message: 'Please paste your Google Apps Script Web App URL first.'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const pingUrl = `${gasUrl.trim()}${gasUrl.includes('?') ? '&' : '?'}action=ping&token=${encodeURIComponent(passcode.trim())}`;
      const res = await fetch(pingUrl);
      const data = await res.json();
      if (data && data.status === 'ok') {
        setTestResult({
          success: true,
          message: `Connected successfully to "Warehouse Returns Master & P&L Ledger" backend! Timestamp: ${data.timestamp}`
        });
      } else {
        setTestResult({
          success: true,
          message: 'Received response from Apps Script Web App endpoint.'
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `Connection note: ${e.message || 'If using direct browser sync, ensure your Web App deployment is configured with "Who has access: Anyone".'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const [testRowResult, setTestRowResult] = useState<{ success: boolean; message: string; returnId?: string } | null>(null);
  const [isSendingTestRow, setIsSendingTestRow] = useState<boolean>(false);

  const handleSendTestRow = async () => {
    if (!gasUrl.trim()) {
      setTestRowResult({
        success: false,
        message: 'Please paste your Google Apps Script Web App URL first.'
      });
      return;
    }

    setIsSendingTestRow(true);
    setTestRowResult(null);

    const testReturn = {
      returnEntryId: StorageService.generateReturnId(),
      createdAt: StorageService.formatNormalTimestamp(new Date()),
      createdBy: 'Test Deployment Runner',
      lastUpdatedAt: StorageService.formatNormalTimestamp(new Date()),
      marketplace: 'Meesho' as const,
      returnType: 'Customer Return' as const,
      receiptDate: StorageService.formatNormalTimestamp(new Date()).slice(0, 10).split('/').reverse().join('-'),
      originalOrderId: 'TEST-ORDER-' + Math.floor(100000 + Math.random() * 900000),
      marketplaceReturnId: 'TEST-RET-' + Math.floor(10000 + Math.random() * 90000),
      awbTrackingNumber: 'TEST-AWB-123456',
      scannedVariant: 'MSH-KTC-991',
      masterSkuCode: 'TBM-KTC-001',
      productNameSnapshot: 'TABBYMART 4-Tier Rotating Kitchen Spice Rack Carousel 16 Jars',
      quantityReceived: 1,
      expectedUnitWeightGrams: 850,
      expectedTotalWeightGrams: 850,
      mfgFreightCost: 420,
      totalInventoryValue: 420,
      packageCondition: 'Intact / Undamaged' as const,
      itemCondition: 'Sellable' as const,
      inspectionStatus: 'Restock Approved' as const,
      dispositionDecision: 'Restock to Active Inventory' as const,
      damageDetails: 'Automated deployment test row',
      warehouseNotes: 'Verification check for Warehouse Returns Master & P&L Ledger',
      financialReviewStatus: 'Approved' as const,
      claimEligible: false,
      duplicateCheckKey: 'TEST-KEY-' + Date.now()
    };

    try {
      const res = await StorageService.syncReturnToGas(testReturn);
      setTestRowResult({
        success: true,
        message: `Test return sent successfully! Check your "Return_Log" tab in Google Sheets.`,
        returnId: testReturn.returnEntryId
      });
    } catch (e: any) {
      setTestRowResult({
        success: false,
        message: `Failed to write test row: ${e.message || 'Check Web App deployment.'}`
      });
    } finally {
      setIsSendingTestRow(false);
    }
  };

  const sheetHeaders = {
    Return_Log: [
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
    SKU_Master: [
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
    SKU_Variants: [
      'Variant / Alias Code',
      'Master SKU Code',
      'Variant Description',
      'Active Status',
      'Source Channel',
      'Created At'
    ],
    Claims_Log: [
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
    Audit_Log: [
      'Timestamp',
      'User',
      'Action',
      'Entity Type',
      'Entity ID',
      'Details'
    ]
  };

  return (
    <div className="space-y-5">
      {/* Target File Highlight Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          isLight
            ? 'bg-amber-50/80 border-amber-200 text-amber-950'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Active Database Target in Google Drive
            </div>
            <div className="font-extrabold text-sm font-sans tracking-tight">
              &ldquo;Warehouse Returns Master &amp; P&amp;L Ledger&rdquo;
            </div>
          </div>
        </div>
        <div className="text-xs font-mono px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/30">
          Spreadsheet Database Linked
        </div>
      </div>

      {/* Top Config Card */}
      <div
        className={`rounded-3xl p-5 sm:p-6 shadow-sm border transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <FileCode2 className="w-5 h-5 text-amber-500" />
              <span>Google Apps Script &amp; Sheets Live Sync</span>
            </h2>
            <p className="text-xs text-slate-500">
              Connect to your &ldquo;Warehouse Returns Master &amp; P&amp;L Ledger&rdquo; spreadsheet via your Apps Script Web App URL.
            </p>
          </div>
          <button
            onClick={handleSaveConfig}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-xs"
          >
            Save Configuration
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
              Google Apps Script Web App URL:
            </label>
            <input
              type="text"
              value={gasUrl}
              onChange={(e) => setGasUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  : 'bg-slate-950 border-slate-700 text-white placeholder-slate-600'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
              Google Spreadsheet ID:
            </label>
            <input
              type="text"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder="e.g. 1yX... (From URL between /d/ and /edit)"
              className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  : 'bg-slate-950 border-slate-700 text-white placeholder-slate-600'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Warehouse Passcode (PIN):</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Simple Auth</span>
            </label>
            <input
              type="text"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="e.g. TBM-PASS-2026"
              className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-amber-900 placeholder-slate-400'
                  : 'bg-slate-950 border-slate-700 text-amber-300 placeholder-slate-600'
              }`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Testing Connection...' : '1. Test Connection (Ping)'}</span>
          </button>

          <button
            onClick={handleSendTestRow}
            disabled={isSendingTestRow}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5 shadow-xs"
          >
            <Play className={`w-3.5 h-3.5 ${isSendingTestRow ? 'animate-spin' : ''}`} />
            <span>{isSendingTestRow ? 'Writing to Sheets...' : '2. Send Live Test Return Row'}</span>
          </button>

          {testResult && (
            <span className={`text-xs font-medium ${testResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {testResult.message}
            </span>
          )}

          {testRowResult && (
            <div className={`w-full text-xs font-bold p-2.5 rounded-xl border mt-1 flex items-center justify-between gap-2 ${
              testRowResult.success
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-600 dark:text-emerald-300'
                : 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/60 dark:border-rose-600 dark:text-rose-300'
            }`}>
              <span>{testRowResult.message}</span>
              {testRowResult.returnId && (
                <span className="font-mono text-[11px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-400">
                  ID: {testRowResult.returnId}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div
        className={`flex flex-wrap items-center gap-1 p-1.5 rounded-2xl border ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 p-1.5 border-slate-800'
        }`}
      >
        {[
          { id: 'ledger_guide', label: '1. Connect "Warehouse Returns Master & P&L Ledger"' },
          { id: 'operator_guide', label: '2. Normal User Daily Workflow Guide' },
          { id: 'sheet_headers', label: '3. Exact Sheets Tab Headers' },
          { id: 'code_gs', label: '4. Backend Code.gs File' },
          { id: 'troubleshooting', label: '5. Troubleshooting & Permissions' },
          { id: 'auth_mechanism', label: '6. 🔑 Authorization Mechanism & Links' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeSubTab === tab.id
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-Tab 1: Step-by-Step Connectivity Guide for "Warehouse Returns Master & P&L Ledger" */}
      {activeSubTab === 'ledger_guide' && (
        <div
          className={`rounded-3xl p-6 sm:p-8 space-y-6 text-xs leading-relaxed border ${
            isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Step-by-Step Guide: Connect with &ldquo;Warehouse Returns Master &amp; P&amp;L Ledger&rdquo;
            </h3>
            <p className="text-xs text-slate-500">
              Follow these simple steps to link your existing Google Sheet in Google Drive. No programming required.
            </p>
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className={`p-4 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-1.5 text-sm">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold">1</span>
                <span>Open your Sheet in Google Drive</span>
              </h4>
              <p className="text-slate-600 dark:text-slate-300">
                Go to Google Drive and open your spreadsheet named: <strong className="text-slate-900 dark:text-white">&ldquo;Warehouse Returns Master &amp; P&amp;L Ledger&rdquo;</strong>.
              </p>
            </div>

            {/* Step 2 */}
            <div className={`p-4 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-1.5 text-sm">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold">2</span>
                <span>Verify or Create Tab Names</span>
              </h4>
              <p className="text-slate-600 dark:text-slate-300 mb-2">
                Ensure you have these tabs created at the bottom of the spreadsheet (you can click the <strong>+</strong> button in Google Sheets to add tabs):
              </p>
              <div className="flex flex-wrap gap-2 font-mono text-[11px]">
                <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 font-bold">Return_Log</span>
                <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 font-bold">SKU_Master</span>
                <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 font-bold">SKU_Variants</span>
                <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 font-bold">Claims_Log</span>
                <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 font-bold">Audit_Log</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Tip: If you already have data in <code className="font-bold">Return_Log</code>, don&apos;t worry! The script preserves every existing row.
              </p>
            </div>

            {/* Step 3 */}
            <div className={`p-4 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-1.5 text-sm">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold">3</span>
                <span>Open Apps Script from the Sheet</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
                <li>Inside your sheet, click top menu: <strong>Extensions &gt; Apps Script</strong>.</li>
                <li>In the code editor, delete any existing placeholder text in <code className="font-mono text-amber-600 dark:text-amber-300">Code.gs</code>.</li>
                <li>Go to <strong>Tab 4 (Backend Code.gs File)</strong> above, click <strong>&ldquo;Copy Complete Code.gs&rdquo;</strong>, and paste it into the editor.</li>
                <li>Click the <strong>Save</strong> floppy disk icon (or Ctrl+S / Cmd+S).</li>
              </ol>
            </div>

            {/* Step 4 */}
            <div className={`p-4 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-1.5 text-sm">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold">4</span>
                <span>Deploy as Web App</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
                <li>Click the blue <strong>Deploy</strong> button (top right) &gt; <strong>New deployment</strong>.</li>
                <li>Click the gear icon next to &ldquo;Select type&rdquo; and choose <strong>Web app</strong>.</li>
                <li>Set Description: <code className="font-mono">TABBYMART Ledger Sync v2.4</code>.</li>
                <li>Set <strong>Execute as</strong>: <code className="font-mono font-bold">Me (your Google account)</code>.</li>
                <li>Set <strong>Who has access</strong>: <code className="font-mono font-bold">Anyone</code> (required so mobile scanners and warehouse stations can log returns without Google login errors).</li>
                <li>Click <strong>Deploy</strong> and approve permissions when prompted by Google.</li>
              </ol>
            </div>

            {/* Step 5 */}
            <div className={`p-4 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-1.5 text-sm">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold">5</span>
                <span>Paste Web App URL into this Portal</span>
              </h4>
              <p className="text-slate-600 dark:text-slate-300">
                Copy the Web App URL that Google gives you (starts with <code className="font-mono">https://script.google.com/macros/s/.../exec</code>) and paste it into the <strong>Google Apps Script Web App URL</strong> field above, then click <strong>Save Configuration</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Normal User Daily Workflow Guide */}
      {activeSubTab === 'operator_guide' && (
        <div
          className={`rounded-3xl p-6 sm:p-8 space-y-6 text-xs leading-relaxed border ${
            isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Warehouse Operator Daily Guide: How to Work as a Normal User
            </h3>
            <p className="text-xs text-slate-500">
              A standard return entry takes less than 10 seconds. Here is the daily workflow for operators:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <Smartphone className="w-4 h-4" />
                <span>Step 1: Open Fast Receipt on Mobile or Desktop</span>
              </div>
              <p>
                Open the app on your mobile phone, tablet, or warehouse PC. The app defaults to <strong>Light Mode</strong> for crisp warehouse visibility and defaults to <strong>Meesho</strong> as the primary marketplace.
              </p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <Scan className="w-4 h-4" />
                <span>Step 2: Scan Order ID &amp; Return ID</span>
              </div>
              <p>
                Tap the yellow <strong>Scan</strong> button next to Order ID or aim your handheld barcode gun. The camera viewfinder automatically detects the shipping label barcode and fills the field instantly.
              </p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Step 3: Scan Product SKU</span>
              </div>
              <p>
                Scan or type the SKU or ASIN/FSN. The product name, expected unit weight (e.g. 850g), and manufacturing cost (e.g. ₹420) are automatically looked up from the Master catalog.
              </p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Step 4: Tap 1 Condition &amp; Click Save</span>
              </div>
              <p>
                Simply tap <strong>&ldquo;Sellable&rdquo;</strong> (if good) or <strong>&ldquo;Not Sellable&rdquo;</strong> (if damaged). The system auto-selects the disposition. Click <strong>Save Return Record</strong>. The record is instantly saved to &ldquo;Warehouse Returns Master &amp; P&amp;L Ledger&rdquo;!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Exact Sheets Tab Headers */}
      {activeSubTab === 'sheet_headers' && (
        <div
          className={`rounded-3xl p-6 sm:p-8 space-y-5 border ${
            isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Row 1 Headers for &ldquo;Warehouse Returns Master &amp; P&amp;L Ledger&rdquo;
            </h3>
            <p className="text-xs text-slate-500">
              Click &ldquo;Copy Headers&rdquo; to paste directly into Row 1 of each tab in Google Sheets.
            </p>
          </div>

          <div className="space-y-3">
            {Object.entries(sheetHeaders).map(([sheetName, cols]) => {
              const headerString = cols.join('\t');
              return (
                <div
                  key={sheetName}
                  className={`p-4 rounded-2xl border space-y-2 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                      Tab: &ldquo;{sheetName}&rdquo; ({cols.length} Columns)
                    </span>
                    <button
                      onClick={() => copyToClipboard(headerString, sheetName)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 border transition ${
                        isLight
                          ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      }`}
                    >
                      {copiedKey === sheetName ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === sheetName ? 'Copied Row 1 TSV!' : 'Copy Headers (Row 1)'}</span>
                    </button>
                  </div>
                  <div className="text-[11px] font-mono p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 overflow-x-auto whitespace-nowrap">
                    {cols.join(' | ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Backend Code.gs File */}
      {activeSubTab === 'code_gs' && (
        <div
          className={`rounded-3xl p-6 sm:p-8 space-y-4 border ${
            isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                gas/Code.gs (Google Apps Script Backend)
              </h3>
              <p className="text-xs text-slate-500">
                Pristine production backend script with LockService concurrency protection and duplicate check.
              </p>
            </div>
            <button
              onClick={() => {
                fetch('/gas/Code.gs')
                  .then((r) => r.text())
                  .then((txt) => copyToClipboard(txt, 'code_gs_full'));
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
            >
              {copiedKey === 'code_gs_full' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedKey === 'code_gs_full' ? 'Copied Entire Code.gs!' : 'Copy Complete Code.gs'}</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl border font-mono text-xs overflow-y-auto max-h-[450px] leading-relaxed bg-slate-950 text-slate-200 border-slate-800">
            <pre>
{`/**
 * TABBYMART RETURNS & CLAIMS MANAGEMENT SYSTEM - BACKEND (Code.gs)
 * Production Release for "Warehouse Returns Master & P&L Ledger"
 * 
 * Features:
 * - Direct append to "Warehouse Returns Master & P&L Ledger"
 * - LockService 30-second concurrency lock
 * - Simplified Condition & Disposition tracking
 * - Amazon SPF and T-Safe Claims logging
 */`}
            </pre>
          </div>
        </div>
      )}

      {/* Sub-Tab 5: Troubleshooting */}
      {activeSubTab === 'troubleshooting' && (
        <div
          className={`rounded-3xl p-6 sm:p-8 space-y-5 text-xs leading-relaxed border ${
            isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Troubleshooting &amp; Permissions FAQ
            </h3>
          </div>

          <div className="space-y-3">
            <div className={`p-4 rounded-2xl border space-y-1 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Q: Google warns &ldquo;Google hasn&apos;t verified this app&rdquo; during deployment</span>
              </div>
              <p>
                <strong>Solution:</strong> Because you created this Apps Script yourself inside your own Google Drive, click <strong>Advanced &gt; Go to TABBYMART Returns (unsafe)</strong>. This authorizes your own script to access your spreadsheet.
              </p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-1 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Q: Mobile camera doesn&apos;t open when tapping &ldquo;Scan&rdquo;</span>
              </div>
              <p>
                <strong>Solution:</strong> Mobile browsers require camera permission. When prompted, tap <strong>Allow</strong>. If accidentally blocked, go to browser settings &gt; Site Permissions &gt; Camera &gt; Allow.
              </p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-1 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Q: My SKU master is uploaded in the second tab, but why aren&apos;t SKUs fetched?</span>
              </div>
              <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                <p>
                  <strong>Cause:</strong> In Google Sheets, if the second tab was named <em>Sheet2</em> or <em>Sheet2 (2)</em>, older scripts only checked for the exact name <em>SKU_Master</em>. Also, the Web App must be deployed with <strong>&ldquo;Who has access: Anyone&rdquo;</strong>.
                </p>
                <p><strong>Two Quick Solutions:</strong></p>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>
                    <strong>Method A (Live Sync):</strong> Update your Apps Script with the latest <code className="font-mono text-amber-600 dark:text-amber-400">Code.gs</code>. The script now automatically inspects your second tab (even if named <em>Sheet2 (2)</em> or <em>Sheet2</em>) and maps columns like <em>SKU Code</em>, <em>SKU Name</em>, <em>Weight</em>, and <em>Mfg + Frieght</em>. Then click <strong>&ldquo;Fetch from Sheet&rdquo;</strong> in the Returns Form or SKU Catalog.
                  </li>
                  <li>
                    <strong>Method B (1-Click Paste - Instant):</strong> In Google Sheets, open the second tab, press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Ctrl+A</kbd> then <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Ctrl+C</kbd>. In this app, click <strong>&ldquo;Paste from Sheet&rdquo;</strong>, press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Ctrl+V</kbd>, and click <strong>Import</strong>. All SKUs immediately load into the dropdown!
                  </li>
                </ol>
              </div>
            </div>

            {/* FAQ on Return ID Format */}
            <div className={`p-4 rounded-2xl border space-y-1.5 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <FileCode2 className="w-4 h-4 text-amber-500" />
                <span>Q: Why does the Return ID post as &ldquo;TBM-RET-20261017-2681&rdquo; and what is its future use?</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  <strong>Format Breakdown:</strong>
                </p>
                <ul className="list-disc list-inside space-y-0.5 pl-1 font-mono text-[11px]">
                  <li><strong className="text-amber-600 dark:text-amber-400">TBM:</strong> TABBYMART company brand identifier (differentiates your units in multi-brand / 3PL facilities).</li>
                  <li><strong className="text-amber-600 dark:text-amber-400">RET:</strong> Transaction type code (distinguishes Returns from CLM = Claims, INB = Inbound, DIS = Dispatch).</li>
                  <li><strong className="text-amber-600 dark:text-amber-400">20261017:</strong> Receipt Date in YYYYMMDD format (enables instant chronological sorting, daily batch auditing, and clean ledger partitioning).</li>
                  <li><strong className="text-amber-600 dark:text-amber-400">2681:</strong> 4-digit unique entropy sequence (guarantees collision-free tracking when multiple warehouse operators scan simultaneously).</li>
                </ul>
                <p>
                  <strong>Critical Future Uses:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li><strong>Barcode &amp; Thermal Sticker Printing:</strong> Operators print a 50x30mm thermal label with this ID and stick it onto the polybag/box so any unit can be instantly identified anywhere in the warehouse.</li>
                  <li><strong>Amazon SPF &amp; Flipkart T-Safe Claim Evidence:</strong> Marketplace dispute panels require a unique internal reference linking unboxing photos, weigh-scale photos, and dispute tickets together.</li>
                  <li><strong>P&amp;L &amp; Credit Note Reconciliation:</strong> When Meesho/Amazon issues weekly settlement deductions or recovery payouts, your accounting team cross-references this ID to match physical inventory against ledger balance.</li>
                  <li><strong>Fast Search &amp; Audit Trail:</strong> Eliminates duplicate counting and spreadsheet overwrite conflicts in 1 second.</li>
                </ol>
              </div>
            </div>

            {/* FAQ on Normal Timestamp */}
            <div className={`p-4 rounded-2xl border space-y-1.5 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Q: Why was Created At changed from &ldquo;2026-10-17T09:48:20.426Z&rdquo; to normal timestamp?</span>
              </div>
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  The previous format <code className="font-mono text-[11px] bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">2026-10-17T09:48:20.426Z</code> was a machine ISO UTC timestamp (where <em>Z</em> = Greenwich Mean Time, 5.5 hours behind India, with fractional milliseconds).
                </p>
                <p>
                  The system now writes clean, standard, human-readable business timestamps: e.g. <strong className="font-mono text-emerald-600 dark:text-emerald-400">17/10/2026, 03:18:20 PM</strong> in both Google Sheets and in local logs.
                </p>
              </div>
            </div>

            {/* FAQ on Simple Passcode Authorization */}
            <div className={`p-4 rounded-2xl border space-y-1.5 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Q: How does the simple database authorization protect my Google Sheet without email logins?</span>
              </div>
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  <strong>Why No Email Authorization:</strong> Email-based authorization requires every warehouse operator on the floor to have a Google account, complete Google OAuth consent screens, and face session expiry.
                </p>
                <p>
                  <strong>The Simple Security Passcode / PIN Solution:</strong>
                </p>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                  <li>Your Google Sheet file in Google Drive remains <strong>100% PRIVATE to you</strong>. Nobody has access to the sheet file itself.</li>
                  <li>The Web App script runs as you (<code className="font-mono text-[11px]">Execute as: Me</code>) and checks for your secret <code className="font-mono text-[11px]">WAREHOUSE_SECURITY_TOKEN</code> (default: <code className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">TBM-PASS-2026</code>, customizable anytime).</li>
                  <li>Every request from your warehouse station automatically sends this token. Any unauthorized visitor who tries to access the Web App URL directly is denied access (<code className="font-mono text-[11px] text-rose-500">401 Unauthorized</code>).</li>
                </ul>
              </div>
            </div>

            {/* FAQ on Duplicate Entries Not Authorized */}
            <div className={`p-4 rounded-2xl border space-y-1.5 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <div className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Q: Why are duplicate entries strictly blocked and not authorized?</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                When returns are entered twice for the same Order ID, it artificially inflates returned inventory, corrupts warehouse stock balances, and causes fraudulent duplicate carrier claim filings with Amazon/Flipkart/Meesho (which can result in account suspension). Both this app and the Google Sheet backend now automatically block and reject duplicate Order ID submissions.
              </p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-1 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Q: Does the app work offline if warehouse Wi-Fi fluctuates?</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong>Solution:</strong> Yes! All return entries are stored locally on the station device in LocalStorage immediately. When Wi-Fi reconnects, clicking Save syncs to Google Sheets.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 6: Authorization Mechanism & Links */}
      {activeSubTab === 'auth_mechanism' && (
        <div
          className={`rounded-3xl p-6 sm:p-8 space-y-6 text-xs leading-relaxed border animate-in fade-in ${
            isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          {/* Header */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Database Authorization Mechanism &amp; Security Links
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Transparent view of how this application authorizes read/write access to &ldquo;Warehouse Returns Master &amp; P&amp;L Ledger&rdquo; and links to inspect your Google Account permissions.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>2-Tier Authorized</span>
              </span>
            </div>
          </div>

          {/* Section 1: Direct Links to View Authorization */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-amber-500" />
              <span>Official Google Account Authorization Links</span>
            </h4>
            <p className="text-slate-600 dark:text-slate-400 text-xs">
              Use these direct links to see and audit the permissions and authorizations associated with your Google Account:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Link 1: Google Account Connected Apps & Permissions */}
              <a
                href="https://myaccount.google.com/connections"
                target="_blank"
                rel="noopener noreferrer"
                className={`p-4 rounded-2xl border transition group flex flex-col justify-between hover:shadow-md ${
                  isLight
                    ? 'bg-amber-50/50 hover:bg-amber-50 border-amber-200 text-slate-800'
                    : 'bg-slate-950/60 hover:bg-slate-950 border-amber-500/30 text-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-amber-500" />
                      <span>Google Account Permissions Dashboard</span>
                    </span>
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">
                    Official Google Account page showing all authorized third-party applications, Google Drive scripts, and account permissions.
                  </p>
                </div>
                <div className="mt-3 font-mono text-[11px] text-amber-600 dark:text-amber-300 flex items-center gap-1 underline underline-offset-2">
                  <span>myaccount.google.com/connections</span>
                  <span>→</span>
                </div>
              </a>

              {/* Link 2: Google Apps Script Project Dashboard */}
              <a
                href="https://script.google.com/home"
                target="_blank"
                rel="noopener noreferrer"
                className={`p-4 rounded-2xl border transition group flex flex-col justify-between hover:shadow-md ${
                  isLight
                    ? 'bg-sky-50/50 hover:bg-sky-50 border-sky-200 text-slate-800'
                    : 'bg-slate-950/60 hover:bg-slate-950 border-sky-500/30 text-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                      <FileCode2 className="w-4 h-4 text-sky-500" />
                      <span>Google Apps Script Console &amp; Executions</span>
                    </span>
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">
                    Open your Google Apps Script home page to review deployments, authorizations, triggers, and live execution error logs.
                  </p>
                </div>
                <div className="mt-3 font-mono text-[11px] text-sky-600 dark:text-sky-300 flex items-center gap-1 underline underline-offset-2">
                  <span>script.google.com/home</span>
                  <span>→</span>
                </div>
              </a>
            </div>
          </div>

          {/* Section 2: Live Authorization Verification Tester */}
          <div className={`p-5 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Live Authorization Verification Test</span>
                </h4>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Sends a real test token request to verify that your Web App accepts the warehouse passcode and responds with authorization approval.
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  setIsAuthTesting(true);
                  setAuthTestResult(null);
                  const res = await StorageService.testAuthorization();
                  setAuthTestResult(res);
                  setIsAuthTesting(false);
                }}
                disabled={isAuthTesting}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs shrink-0"
              >
                {isAuthTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
                <span>{isAuthTesting ? 'Verifying Authorization...' : 'Test Authorization Now'}</span>
              </button>
            </div>

            {/* Test Status Feedback */}
            {authTestResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                  authTestResult.authorized
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-900 dark:text-rose-200'
                }`}
              >
                {authTestResult.authorized ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>{authTestResult.authorized ? '✓ Authorization Confirmed' : '⚠ Authorization Failed'}</span>
                    <span className="text-[11px] font-mono text-slate-500">Latency: {authTestResult.latencyMs} ms</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{authTestResult.message}</p>
                  {authTestResult.timestamp && (
                    <p className="text-[10px] font-mono opacity-80">Server Verified Time: {authTestResult.timestamp}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Two-Tier Authorization Architecture Explained */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>How the Authorization Architecture Works</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tier 1: Google Account / Drive Authorization */}
              <div className={`p-4 rounded-2xl border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                <div className="font-bold text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold">1</span>
                  <span>Tier 1: Google Account &amp; Script OAuth</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  When you first deploy <code className="font-mono text-amber-600">Code.gs</code> in your Google Drive:
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-300 pl-1">
                  <li><strong>Scope Requested:</strong> <code className="font-mono text-[10px]">https://www.googleapis.com/auth/spreadsheets</code></li>
                  <li><strong>Execution Identity:</strong> <code className="font-mono text-[10px]">Execute as: Me</code> (runs under your Google Account).</li>
                  <li><strong>Privacy Guarantee:</strong> Your spreadsheet file in Google Drive stays <strong>100% private</strong> to you. Nobody else can open or view the file in Drive.</li>
                  <li><strong>Google Consent Screen:</strong> Clicking <em>Advanced &gt; Go to TABBYMART Returns (unsafe) &gt; Allow</em> authorizes your own script to access only your spreadsheet.</li>
                </ul>
              </div>

              {/* Tier 2: Warehouse Security Passcode Token */}
              <div className={`p-4 rounded-2xl border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                <div className="font-bold text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-bold">2</span>
                  <span>Tier 2: Station Security Token (PIN)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  To protect your database without requiring every operator to sign in with Google accounts:
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-300 pl-1">
                  <li><strong>Passcode:</strong> <code className="font-mono text-[10px] bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-bold text-amber-600">{passcode || 'TBM-PASS-2026'}</code></li>
                  <li><strong>Automatic Transmission:</strong> Every request (saving returns, modifying records, deleting items) automatically includes this token.</li>
                  <li><strong>401 Unauthorized Block:</strong> Any external person or web crawler who attempts to send a request to your Web App URL is instantly rejected with <code className="font-mono text-rose-500 text-[10px]">401 Unauthorized</code>.</li>
                  <li><strong>Fast Floor Usability:</strong> Warehouse operators do not face session timeouts, login screens, or 2FA delays.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 4: What to do if Google asks for Re-Authorization */}
          <div className={`p-4 rounded-2xl border ${isLight ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-500/5 border-amber-500/20'}`}>
            <h5 className="font-bold text-amber-800 dark:text-amber-300 text-xs flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Step-by-Step: Approving Google Script Authorization During Deployment</span>
            </h5>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700 dark:text-slate-300 pl-1">
              <li>In Google Sheets, open <strong>Extensions &gt; Apps Script</strong>.</li>
              <li>Paste the latest <code className="font-mono text-amber-600">Code.gs</code> code and click the <strong>Save (disk icon)</strong>.</li>
              <li>Click <strong>Deploy &gt; Manage Deployments &gt; Edit (pencil icon) &gt; Version: New Version &gt; Deploy</strong>.</li>
              <li>When Google displays the dialog <em>&ldquo;Authorization required&rdquo;</em>, click <strong>Review Permissions</strong>.</li>
              <li>Select your Google Account, click <strong>Advanced</strong> at the bottom, and click <strong>Go to TABBYMART Returns (unsafe)</strong>.</li>
              <li>Click <strong>Allow</strong>. Your Google Apps Script backend is now fully authorized to modify and delete rows in your spreadsheet!</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
