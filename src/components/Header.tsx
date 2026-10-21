import React, { useState, useEffect } from 'react';
import { ActiveTab, ThemeMode, AuthUser } from '../types';
import { 
  PackageCheck, 
  Layers, 
  ShieldAlert, 
  Database, 
  BarChart3, 
  FileCode2, 
  Wifi, 
  Clock, 
  UserCircle2, 
  Download,
  Sun,
  Moon,
  Key,
  RefreshCw,
  LogOut,
  ShieldCheck,
  ShieldAlert as ShieldAlertIcon
} from 'lucide-react';
import { StorageService } from '../services/storageService';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  operatorName: string;
  setOperatorName: (name: string) => void;
  returnsCount: number;
  openClaimsCount: number;
  theme: ThemeMode;
  toggleTheme: () => void;
  onOpenAuthorization?: () => void;
  isSyncing?: boolean;
  lastSyncTime?: string;
  onManualSync?: () => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onPromoteToAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  operatorName,
  setOperatorName,
  returnsCount,
  openClaimsCount,
  theme,
  toggleTheme,
  onOpenAuthorization,
  isSyncing = false,
  lastSyncTime = '',
  onManualSync,
  currentUser,
  onLogout,
  onPromoteToAdmin
}) => {
  const [time, setTime] = useState<string>('');
  const [hasGasUrl, setHasGasUrl] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const gasUrl = StorageService.getGasUrl();
    setHasGasUrl(Boolean(gasUrl));

    return () => clearInterval(interval);
  }, [activeTab]);

  const isAdmin = currentUser?.role === 'admin';

  // Standard nav items available to operators
  const allNavItems = [
    {
      id: 'receipt' as ActiveTab,
      label: 'Fast Receipt',
      icon: PackageCheck,
      badge: null,
      adminOnly: false
    },
    {
      id: 'returns_log' as ActiveTab,
      label: 'Returns Queue',
      icon: Layers,
      badge: returnsCount > 0 ? returnsCount : null,
      adminOnly: false
    },
    {
      id: 'claims_hub' as ActiveTab,
      label: 'SPF & T-Safe Claims',
      icon: ShieldAlert,
      badge: openClaimsCount > 0 ? openClaimsCount : null,
      adminOnly: false
    },
    {
      id: 'sku_master' as ActiveTab,
      label: 'SKU & Variants Master',
      icon: Database,
      badge: null,
      adminOnly: false
    },
    {
      id: 'analytics' as ActiveTab,
      label: 'Analytics & KPIs',
      icon: BarChart3,
      badge: null,
      adminOnly: false
    },
    {
      id: 'gas_deployment' as ActiveTab,
      label: 'Database & Sync Hub',
      icon: FileCode2,
      badge: hasGasUrl ? 'Sync' : 'Setup',
      adminOnly: true // HIDDEN for regular warehouse operators
    }
  ];

  // If user is not admin, hide the GAS deployment / settings tab completely!
  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  const isLight = theme === 'light';

  return (
    <header
      className={`border-b sticky top-0 z-40 transition-colors ${
        isLight
          ? 'bg-white border-slate-200 text-slate-800 shadow-sm'
          : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}
    >
      {/* Top Banner Bar */}
      <div
        className={`max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 border-b text-xs transition-colors ${
          isLight
            ? 'bg-slate-50 border-slate-200 text-slate-600'
            : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono font-medium">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>IST (Warehouse): {time || 'Loading...'}</span>
          </div>
          <span className={isLight ? 'text-slate-300' : 'text-slate-700'}>|</span>
          <div className="flex items-center gap-1.5">
            <Wifi className={`w-3.5 h-3.5 ${hasGasUrl ? 'text-emerald-500' : 'text-amber-500'} ${isSyncing ? 'animate-pulse' : ''}`} />
            <span className="font-medium">
              {hasGasUrl
                ? (isSyncing ? 'Syncing with Google Sheets...' : (lastSyncTime ? `Live Google Sheet Active (${lastSyncTime})` : 'Google Sheets Sync Active'))
                : 'Connected to "Warehouse Returns Master & P&L Ledger"'}
            </span>
            {hasGasUrl && onManualSync && (
              <button
                type="button"
                onClick={onManualSync}
                disabled={isSyncing}
                title="Refresh latest data from Google Sheets"
                className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-500' : ''}`} />
              </button>
            )}
          </div>
          {/* Only Admins can see the raw Auth Mechanism & Links button */}
          {isAdmin && onOpenAuthorization && (
            <>
              <span className={isLight ? 'text-slate-300' : 'text-slate-700'}>|</span>
              <button
                type="button"
                onClick={onOpenAuthorization}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition shadow-2xs cursor-pointer"
                title="View Database Authorization Mechanism & Google Account Permissions"
              >
                <Key className="w-3 h-3 text-amber-500" />
                <span>🔑 Admin Setup &amp; Links</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* User Role Badge */}
          {currentUser && (
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                  isAdmin
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                }`}
                title={`Logged in as ${currentUser.name} (${currentUser.role.toUpperCase()})`}
              >
                {isAdmin ? '👑 Admin' : '⚡ Operator'}
              </span>
              {!isAdmin && onPromoteToAdmin && (
                <button
                  type="button"
                  onClick={onPromoteToAdmin}
                  className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
                  title="Unlock Administrator features with Admin PIN"
                >
                  Unlock Admin
                </button>
              )}
            </div>
          )}

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
              isLight
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-amber-400 shadow-xs'
                : 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
            }`}
            title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode (Current: ${isLight ? 'Light' : 'Dark'})`}
          >
            {isLight ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                <span>Dark</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5">
            <UserCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              title="Station / Operator Name"
              className={`rounded px-2 py-0.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 w-32 border ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800'
                  : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            />
          </div>

          <button
            onClick={() => StorageService.exportReturnsToCsv()}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition border ${
              isLight
                ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Download full returns inventory CSV"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              type="button"
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
              title="Sign out of station"
            >
              <LogOut className="w-3 h-3" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Brand & Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Custom TABBYMART Logo */}
        <div 
          onClick={() => setActiveTab('receipt')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          {/* Distinctive Logo SVG */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-0.5 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform duration-200">
            <div className={`w-full h-full rounded-[9px] flex items-center justify-center p-1.5 ${isLight ? 'bg-white' : 'bg-slate-950'}`}>
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M50 14L84 32V68L50 86L16 68V32L50 14Z" stroke="#F59E0B" strokeWidth="6" strokeLinejoin="round" fill={isLight ? '#FEF3C7' : '#0F172A'}/>
                <path d="M50 14V50M84 32L50 50M16 32L50 50" stroke="#F59E0B" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M64 44C64 36 56 32 46 36C38 39 36 48 42 54L54 64" stroke="#0284C7" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M38 64H54V48" stroke="#0284C7" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-extrabold tracking-tight font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>
                TABBY<span className="text-amber-500">MART</span>
              </span>
              <span className={`text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded border ${
                isLight ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-slate-800 text-amber-400 border-amber-500/30'
              }`}>
                WH-OPS
              </span>
            </div>
            <p className={`text-[11px] -mt-0.5 font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Returns &amp; Claims Management · Warehouse Edition
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav
          className={`flex items-center gap-1 p-1 rounded-xl border overflow-x-auto max-w-full ${
            isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-950/70 border-slate-800'
          }`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== null && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-slate-950 text-amber-300'
                        : isLight
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
