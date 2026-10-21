import React, { useState } from 'react';
import { StorageService, STATION_PRESETS } from '../services/storageService';
import { AuthUser, ThemeMode } from '../types';
import { 
  Lock, 
  Key, 
  ShieldCheck, 
  User, 
  Building2, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Sun, 
  Moon, 
  HelpCircle, 
  ChevronDown,
  Warehouse,
  Info
} from 'lucide-react';

interface AuthGatewayProps {
  onLoginSuccess: (user: AuthUser) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
}

export const AuthGateway: React.FC<AuthGatewayProps> = ({
  onLoginSuccess,
  theme,
  toggleTheme
}) => {
  const isLight = theme === 'light';

  // Mode: 'pin' | 'credentials'
  const [authMode, setAuthMode] = useState<'pin' | 'credentials'>('pin');

  // Form states
  const [pin, setPin] = useState<string>('');
  const [username, setUsername] = useState<string>('operator');
  const [password, setPassword] = useState<string>('tabby123');
  const [stationId, setStationId] = useState<string>(STATION_PRESETS[0].id);
  const [operatorName, setOperatorName] = useState<string>('Zeeshan K');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showCredentialsHint, setShowCredentialsHint] = useState<boolean>(false);

  // Quick fill helper
  const handleQuickPreset = (type: 'operator_pin' | 'admin_pin' | 'operator_creds' | 'admin_creds') => {
    setErrorMessage(null);
    if (type === 'operator_pin') {
      setAuthMode('pin');
      setPin('1234');
      setOperatorName('Zeeshan K');
      setStationId('Station 1 - Receiving & Unboxing');
    } else if (type === 'admin_pin') {
      setAuthMode('pin');
      setPin('8888');
      setOperatorName('Admin Supervisor');
      setStationId('Station 1 - Receiving & Unboxing');
    } else if (type === 'operator_creds') {
      setAuthMode('credentials');
      setUsername('operator');
      setPassword('tabby123');
      setOperatorName('Zeeshan K');
    } else if (type === 'admin_creds') {
      setAuthMode('credentials');
      setUsername('admin');
      setPassword('tabbyadmin2026');
      setOperatorName('System Administrator');
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const result = StorageService.authenticateWithPin(pin, stationId, operatorName);
      if (result.success && result.user) {
        setSuccessMessage(result.message || 'Authorization Successful!');
        setTimeout(() => {
          onLoginSuccess(result.user!);
        }, 500);
      } else {
        setErrorMessage(result.message || 'Invalid Station PIN. Please try again.');
        setIsSubmitting(false);
      }
    }, 250);
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const result = StorageService.authenticateWithCredentials(
        username,
        password,
        stationId,
        operatorName,
        rememberMe
      );

      if (result.success && result.user) {
        setSuccessMessage(result.message || 'Login Confirmed!');
        setTimeout(() => {
          onLoginSuccess(result.user!);
        }, 500);
      } else {
        setErrorMessage(result.message || 'Invalid Username or Password.');
        setIsSubmitting(false);
      }
    }, 250);
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-between font-sans selection:bg-amber-500 selection:text-slate-950 transition-colors duration-200 ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Bar with Brand & Theme Switcher */}
      <header
        className={`border-b py-3 px-4 sm:px-8 flex items-center justify-between ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-0.5 shadow-md shadow-amber-500/20">
            <div className={`w-full h-full rounded-[9px] flex items-center justify-center p-1 ${isLight ? 'bg-white' : 'bg-slate-950'}`}>
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
              <span className={`text-lg font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                TABBY<span className="text-amber-500">MART</span>
              </span>
              <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                Secure Access
              </span>
            </div>
            <p className="text-[11px] text-slate-500 -mt-0.5">
              Warehouse Returns &amp; Claims Management Portal
            </p>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          type="button"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            isLight
              ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs'
              : 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
          }`}
          title="Toggle Dark / Light Mode"
        >
          {isLight ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-sky-400" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div
            className={`rounded-2xl border shadow-xl overflow-hidden backdrop-blur-md transition-all ${
              isLight
                ? 'bg-white/95 border-slate-200/90 shadow-slate-300/40'
                : 'bg-slate-900/95 border-slate-800 shadow-black/50'
            }`}
          >
            {/* Header Banner */}
            <div
              className={`p-6 border-b text-center relative ${
                isLight ? 'bg-gradient-to-b from-slate-50 to-white border-slate-100' : 'bg-gradient-to-b from-slate-900 to-slate-900/80 border-slate-800'
              }`}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 mb-3 shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className={`text-xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Warehouse Operator Gateway
              </h1>
              <p className={`text-xs mt-1 font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Sign in to record returns, inspect parcels, and file marketplace claims
              </p>

              {/* Mode Toggle Tabs */}
              <div
                className={`mt-5 p-1 rounded-xl flex items-center gap-1 border text-xs font-bold ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/80 border-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('pin');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    authMode === 'pin'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Station PIN (Fast)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('credentials');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    authMode === 'credentials'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Username &amp; Password</span>
                </button>
              </div>
            </div>

            {/* Error or Success notification */}
            {errorMessage && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="font-bold">Access Denied: </strong>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-bold">{successMessage}</span>
              </div>
            )}

            {/* Form Section */}
            <div className="p-6">
              {authMode === 'pin' ? (
                /* Fast Station PIN Form */
                <form onSubmit={handlePinSubmit} className="space-y-4">
                  {/* Station Dropdown */}
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      Select Warehouse Station
                    </label>
                    <div className="relative">
                      <select
                        value={stationId}
                        onChange={(e) => setStationId(e.target.value)}
                        className={`w-full text-xs font-semibold rounded-xl border px-3 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                          isLight
                            ? 'bg-slate-50 border-slate-300 text-slate-900'
                            : 'bg-slate-800 border-slate-700 text-slate-100'
                        }`}
                      >
                        {STATION_PRESETS.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Operator Name */}
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      Operator / Shift Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={operatorName}
                        onChange={(e) => setOperatorName(e.target.value)}
                        placeholder="e.g. Zeeshan K or Station 1"
                        className={`w-full text-xs font-medium rounded-xl border pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                          isLight
                            ? 'bg-slate-50 border-slate-300 text-slate-900'
                            : 'bg-slate-800 border-slate-700 text-slate-100'
                        }`}
                        required
                      />
                    </div>
                  </div>

                  {/* 4-Digit PIN */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        Station Access PIN
                      </label>
                      <span className="text-[11px] text-amber-500 font-medium">
                        Default PIN: 1234
                      </span>
                    </div>
                    <div className="relative">
                      <Key className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                      <input
                        type="password"
                        maxLength={8}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="Enter 4-digit PIN (e.g. 1234)"
                        autoFocus
                        className={`w-full text-center text-lg tracking-widest font-mono font-bold rounded-xl border py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                          isLight
                            ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                            : 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500'
                        }`}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
                  >
                    <span>Authorize Station &amp; Open Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                /* Username & Password Form */
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      Warehouse Station
                    </label>
                    <div className="relative">
                      <select
                        value={stationId}
                        onChange={(e) => setStationId(e.target.value)}
                        className={`w-full text-xs font-semibold rounded-xl border px-3 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                          isLight
                            ? 'bg-slate-50 border-slate-300 text-slate-900'
                            : 'bg-slate-800 border-slate-700 text-slate-100'
                        }`}
                      >
                        {STATION_PRESETS.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      Username / Staff ID
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="operator or admin"
                        className={`w-full text-xs font-medium rounded-xl border pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                          isLight
                            ? 'bg-slate-50 border-slate-300 text-slate-900'
                            : 'bg-slate-800 border-slate-700 text-slate-100'
                        }`}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        Password
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Case sensitive
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full text-xs font-medium rounded-xl border pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                          isLight
                            ? 'bg-slate-50 border-slate-300 text-slate-900'
                            : 'bg-slate-800 border-slate-700 text-slate-100'
                        }`}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                      />
                      <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                        Keep signed in on this station
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
                  >
                    <span>Authenticate &amp; Launch</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* Quick Fill One-Click Presets for Easy Access */}
              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    1-Click Station Presets
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCredentialsHint(!showCredentialsHint)}
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>{showCredentialsHint ? 'Hide Default Credentials' : 'View Default Credentials'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('operator_pin')}
                    className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                      isLight
                        ? 'bg-slate-50 hover:bg-amber-50/60 border-slate-200 hover:border-amber-300 text-slate-800'
                        : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 hover:border-amber-500/40 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-500 text-[11px]">Floor Operator</span>
                      <span className="text-[10px] font-mono bg-amber-500/20 px-1 rounded text-amber-600 dark:text-amber-400">PIN 1234</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">Fast receipt &amp; claims</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickPreset('admin_pin')}
                    className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                      isLight
                        ? 'bg-slate-50 hover:bg-amber-50/60 border-slate-200 hover:border-amber-300 text-slate-800'
                        : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 hover:border-amber-500/40 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-500 text-[11px]">Admin Supervisor</span>
                      <span className="text-[10px] font-mono bg-sky-500/20 px-1 rounded text-sky-600 dark:text-sky-400">PIN 8888</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">Full access + GAS Sync</p>
                  </button>
                </div>

                {showCredentialsHint && (
                  <div
                    className={`mt-3 p-3 rounded-xl border text-[11px] leading-relaxed animate-fadeIn ${
                      isLight
                        ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                        : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 mb-1.5 text-amber-600 dark:text-amber-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Default System Accounts:</span>
                    </div>
                    <div className="space-y-1 font-mono text-[10px]">
                      <div>
                        • <strong>Operator:</strong> User: <code className="bg-amber-200/50 dark:bg-amber-900/50 px-1 rounded">operator</code> | Pass: <code className="bg-amber-200/50 dark:bg-amber-900/50 px-1 rounded">tabby123</code> | PIN: <code className="bg-amber-200/50 dark:bg-amber-900/50 px-1 rounded">1234</code>
                      </div>
                      <div>
                        • <strong>Administrator:</strong> User: <code className="bg-amber-200/50 dark:bg-amber-900/50 px-1 rounded">admin</code> | Pass: <code className="bg-amber-200/50 dark:bg-amber-900/50 px-1 rounded">tabbyadmin2026</code> | PIN: <code className="bg-amber-200/50 dark:bg-amber-900/50 px-1 rounded">8888</code>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Privacy & Cloud Architecture Note */}
            <div
              className={`p-4 border-t text-[11px] flex items-start gap-2.5 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950 border-slate-800/80 text-slate-400'
              }`}
            >
              <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Restricted Google Sheet Protection: </span>
                <span>
                  The master Google Sheet is secured as <strong>&ldquo;Only Me&rdquo;</strong> in Google Drive. All synchronization occurs via your embedded Google Apps Script cloud engine.
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`py-3 text-center text-xs border-t transition-colors ${
          isLight ? 'border-slate-200 bg-white text-slate-500' : 'border-slate-900 bg-slate-950 text-slate-500'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px]">
          <span>TABBYMART Returns &amp; Claims Management System · Production Portal</span>
          <span className="font-mono text-slate-400">Domain: tabbymart.com</span>
        </div>
      </footer>
    </div>
  );
};
