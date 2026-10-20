import React, { useState, useEffect } from 'react';
import { ActiveTab, ReturnRecord, ClaimRecord, SkuMasterItem, SkuVariant, ThemeMode } from './types';
import { StorageService } from './services/storageService';
import { Header } from './components/Header';
import { ReturnsForm } from './components/ReturnsForm';
import { ReturnsLogTable } from './components/ReturnsLogTable';
import { ClaimsHub } from './components/ClaimsHub';
import { SkuMasterManager } from './components/SkuMasterManager';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { GasDeploymentCenter, GasSubTab } from './components/GasDeploymentCenter';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('receipt');
  const [operatorName, setOperatorName] = useState<string>('Station 1 - Ramesh K.');
  const [gasSubTab, setGasSubTab] = useState<GasSubTab>('ledger_guide');

  // Theme state: Defaults to Light Mode and remembers last action
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

  // Global synchronized states
  const [returns, setReturns] = useState<ReturnRecord[]>(() => StorageService.getReturns());
  const [claims, setClaims] = useState<ClaimRecord[]>(() => StorageService.getClaims());
  const [skuMaster, setSkuMaster] = useState<SkuMasterItem[]>(() => StorageService.getSkuMaster());
  const [skuVariants, setSkuVariants] = useState<SkuVariant[]>(() => StorageService.getSkuVariants());

  // Handoff state from Returns Queue -> Claims Hub
  const [claimPrefillReturn, setClaimPrefillReturn] = useState<ReturnRecord | null>(null);

  const handleOpenAuthorization = () => {
    setGasSubTab('auth_mechanism');
    setActiveTab('gas_deployment');
  };

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

  const openClaimsCount = claims.filter(
    (c) => c.claimStatus !== 'Recovered' && c.claimStatus !== 'Closed — No Recovery'
  ).length;

  const isLight = theme === 'light';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-150 selection:bg-amber-500 selection:text-slate-950 ${
        isLight ? 'bg-slate-100/80 text-slate-900' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Brand Header with Theme Toggle */}
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
            onViewAuthorization={handleOpenAuthorization}
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

        {activeTab === 'gas_deployment' && (
          <GasDeploymentCenter theme={theme} initialSubTab={gasSubTab} />
        )}
      </main>

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
            <span>Marketplace: Meesho (Default) · Amazon · Flipkart</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
