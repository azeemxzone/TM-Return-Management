import React, { useState, useEffect } from 'react';
import { ActiveTab, ReturnRecord, ClaimRecord, SkuMasterItem, SkuVariant, ThemeMode, AuthUser } from './types';
import { StorageService } from './services/storageService';
import { Header } from './components/Header';
import { ReturnsForm } from './components/ReturnsForm';
import { ReturnsLogTable } from './components/ReturnsLogTable';
import { ClaimsHub } from './components/ClaimsHub';
import { SkuMasterManager } from './components/SkuMasterManager';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { GasDeploymentCenter, GasSubTab } from './components/GasDeploymentCenter';
import { AuthGateway } from './components/AuthGateway';
import { Lock, Key, X, AlertCircle, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => StorageService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<ActiveTab>('receipt');
  const [operatorName, setOperatorName] = useState<string>(() => {
    const user = StorageService.getCurrentUser();
    return user?.name || 'Zeeshan K';
  });
  const [gasSubTab, setGasSubTab] = useState<GasSubTab>('ledger_guide');
  const [showAdminUnlockModal, setShowAdminUnlockModal] = useState<boolean>(false);
  const [adminUnlockPin, setAdminUnlockPin] = useState<string>('');
  const [adminUnlockError, setAdminUnlockError] = useState<string | null>(null);

  // Theme state: Defaults to Dark Mode and remembers last action
  const [theme, setTheme] = useState<ThemeMode>(() => StorageService.getTheme());

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    StorageService.saveTheme(nextTheme);
  };

  // Sync html class for dark mode if desired
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    if (user.name) setOperatorName(user.name);
    if (user.role !== 'admin' && activeTab === 'gas_deployment') {
      setActiveTab('receipt');
    }
  };

  const handleLogout = () => {
    StorageService.logout();
    setCurrentUser(null);
    setActiveTab('receipt');
  };

  const handleOpenAuthorization = () => {
    if (currentUser?.role === 'admin') {
      setGasSubTab('auth_mechanism');
      setActiveTab('gas_deployment');
    } else {
      setAdminUnlockPin('');
      setAdminUnlockError(null);
      setShowAdminUnlockModal(true);
    }
  };

  const handleUnlockAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminUnlockError(null);
    const clean = adminUnlockPin.trim();
    const creds = StorageService.getCredentials();

    if (clean === creds.adminPin || clean === creds.adminPassword) {
      const updatedUser: AuthUser = {
        username: 'admin',
        name: currentUser?.name || 'Admin Supervisor',
        role: 'admin',
        stationId: currentUser?.stationId || 'Station 1 - Receiving',
        loginTime: StorageService.formatNormalTimestamp(new Date()),
        rememberMe: true
      };
      StorageService.setCurrentUser(updatedUser);
      setCurrentUser(updatedUser);
      setShowAdminUnlockModal(false);
      setAdminUnlockPin('');
      setGasSubTab('auth_mechanism');
      setActiveTab('gas_deployment');
    } else {
      setAdminUnlockError('Invalid Admin PIN. (Default Admin PIN: 8888 or password: tabbyadmin2026)');
    }
  };

  // Global synchronized states
  const [returns, setReturns] = useState<ReturnRecord[]>(() => StorageService.getReturns());
  const [claims, setClaims] = useState<ClaimRecord[]>(() => StorageService.getClaims());
  const [skuMaster, setSkuMaster] = useState<SkuMasterItem[]>(() => StorageService.getSkuMaster());
  const [skuVariants, setSkuVariants] = useState<SkuVariant[]>(() => StorageService.getSkuVariants());

  // Handoff state from Returns Queue -> Claims Hub
  const [claimPrefillReturn, setClaimPrefillReturn] = useState<ReturnRecord | null>(null);

  // Sync SKU variants whenever SKU master updates
  const handleUpdateSkuMaster = (updatedMaster: SkuMasterItem[]) => {
    setSkuMaster(updatedMaster);
    const updatedVariants = StorageService.getSkuVariants();
    setSkuVariants(updatedVariants);
  };

  const handleReturnSaved = (newRecord: ReturnRecord) => {
    setReturns((prev) => [newRecord, ...prev]);
  };

  const handleUpdateReturn = (updatedRecord: ReturnRecord) => {
    setReturns((prev) =>
      prev.map((r) => (r.returnEntryId === updatedRecord.returnEntryId ? updatedRecord : r))
    );
  };

  const handleDeleteReturn = (returnEntryId: string) => {
    const target = returns.find((r) => r.returnEntryId === returnEntryId);
    StorageService.deleteReturn(returnEntryId, operatorName, target?.originalOrderId);
    setReturns((prev) => prev.filter((r) => r.returnEntryId !== returnEntryId));
  };

  const handleClaimSaved = (savedClaim: ClaimRecord) => {
    setClaims((prev) => {
      const idx = prev.findIndex((c) => c.claimId === savedClaim.claimId);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = savedClaim;
        return copy;
      }
      return [savedClaim, ...prev];
    });
  };

  const handleCreateClaimFromReturn = (record: ReturnRecord) => {
    setClaimPrefillReturn(record);
    setActiveTab('claims_hub');
  };

  // Automated Active Synchronization with Google Sheets backend
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  const syncFromGoogleSheets = async (silent: boolean = false) => {
    const gasUrl = StorageService.getGasUrl();
    if (!gasUrl) return;

    if (!silent) setIsSyncing(true);
    try {
      // 1. Fetch live returns
      const retRes = await StorageService.fetchReturnsFromGas();
      if (retRes.success && retRes.returns && retRes.returns.length > 0) {
        setReturns(retRes.returns);
      }

      // 2. Fetch live SKUs
      const skuRes = await StorageService.fetchSkuCatalogFromGas();
      if (skuRes.success && skuRes.skus && skuRes.skus.length > 0) {
        setSkuMaster(skuRes.skus);
        const updatedVariants = StorageService.getSkuVariants();
        setSkuVariants(updatedVariants);
      }

      const now = new Date();
      setLastSyncTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    } catch (e) {
      console.warn('Auto-sync notice:', e);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  // Initial load and periodic active synchronization (every 45 seconds)
  useEffect(() => {
    const gasUrl = StorageService.getGasUrl();
    if (gasUrl) {
      syncFromGoogleSheets(true);
    }

    // Active continuous background poll every 45s
    const interval = setInterval(() => {
      const currentGas = StorageService.getGasUrl();
      if (currentGas) {
        syncFromGoogleSheets(true);
      }
    }, 45000);

    return () => clearInterval(interval);
  }, []);

  const openClaimsCount = claims.filter(
    (c) => c.claimStatus !== 'Recovered' && c.claimStatus !== 'Closed — No Recovery'
  ).length;

  const isLight = theme === 'light';

  // Entry-level authentication gate: Must authenticate before viewing portal
  if (!currentUser) {
    return (
      <AuthGateway
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-150 selection:bg-amber-500 selection:text-slate-950 ${
        isLight ? 'bg-slate-100/80 text-slate-900' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Brand Header with Theme Toggle & Session Controls */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        operatorName={operatorName}
        setOperatorName={setOperatorName}
        returnsCount={returns.length}
        openClaimsCount={openClaimsCount}
        theme={theme}
        toggleTheme={toggleTheme}
        onOpenAuthorization={handleOpenAuthorization}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        onManualSync={() => syncFromGoogleSheets(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onPromoteToAdmin={() => setShowAdminUnlockModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'receipt' && (
          <ReturnsForm
            returns={returns}
            skuMaster={skuMaster}
            skuVariants={skuVariants}
            onReturnSaved={handleReturnSaved}
            onUpdateReturn={handleUpdateReturn}
            onDeleteReturn={handleDeleteReturn}
            onUpdateSkuMaster={handleUpdateSkuMaster}
            onViewReturnsLog={() => setActiveTab('returns_log')}
            onViewAuthorization={isAdmin ? handleOpenAuthorization : undefined}
            operatorName={operatorName}
            theme={theme}
          />
        )}

        {activeTab === 'returns_log' && (
          <ReturnsLogTable
            returns={returns}
            onUpdateReturn={handleUpdateReturn}
            onDeleteReturn={handleDeleteReturn}
            onCreateClaimFromReturn={handleCreateClaimFromReturn}
            operatorName={operatorName}
            theme={theme}
          />
        )}

        {activeTab === 'claims_hub' && (
          <ClaimsHub
            claims={claims}
            returns={returns}
            onClaimSaved={handleClaimSaved}
            operatorName={operatorName}
            prefillReturn={claimPrefillReturn}
            onClearPrefill={() => setClaimPrefillReturn(null)}
            theme={theme}
          />
        )}

        {activeTab === 'sku_master' && (
          <SkuMasterManager
            skuMaster={skuMaster}
            skuVariants={skuVariants}
            onUpdateSkuMaster={handleUpdateSkuMaster}
            operatorName={operatorName}
            theme={theme}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard returns={returns} claims={claims} theme={theme} />
        )}

        {/* Database & Sync Hub: Hidden from regular operators; visible only to Administrators */}
        {activeTab === 'gas_deployment' && isAdmin && (
          <GasDeploymentCenter theme={theme} initialSubTab={gasSubTab} />
        )}
      </main>

      {/* Admin Unlock Modal */}
      {showAdminUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">Admin Supervisor Access</h3>
                  <p className="text-xs text-slate-500">Unlock Database &amp; Sync Hub settings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdminUnlockModal(false);
                  setAdminUnlockError(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {adminUnlockError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adminUnlockError}</span>
              </div>
            )}

            <form onSubmit={handleUnlockAdminSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                  Enter Admin PIN or Password
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type="password"
                    value={adminUnlockPin}
                    onChange={(e) => setAdminUnlockPin(e.target.value)}
                    placeholder="Enter Admin PIN (Default: 8888)"
                    autoFocus
                    required
                    className={`w-full pl-9 pr-3 py-2 text-sm font-mono font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900'
                        : 'bg-slate-800 border-slate-700 text-slate-100'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Default supervisor PIN is <code className="font-bold text-amber-500">8888</code> (or password: <code className="font-bold text-amber-500">tabbyadmin2026</code>)
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminUnlockModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                    isLight
                      ? 'border-slate-300 hover:bg-slate-100 text-slate-700'
                      : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition cursor-pointer"
                >
                  Unlock Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Professional Footer */}
      <footer
        className={`border-t py-4 text-center text-xs transition-colors ${
          isLight ? 'border-slate-200 bg-white text-slate-500' : 'border-slate-900 bg-slate-950 text-slate-500'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`font-extrabold tracking-tight ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              TABBY<span className="text-amber-500">MART</span>
            </span>
            <span>· Warehouse Returns &amp; Claims System</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span>Database: &ldquo;Warehouse Returns Master &amp; P&amp;L Ledger&rdquo;</span>
            <span>·</span>
            <span>Restricted Cloud Sync (Active)</span>
            <span>·</span>
            <span className="font-mono">User: {currentUser.name} ({currentUser.role.toUpperCase()})</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
