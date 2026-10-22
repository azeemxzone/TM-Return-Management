import React, { useState, useEffect } from 'react';
import { StorageService, STATION_PRESETS } from '../services/storageService';
import { AuthUser, ThemeMode } from '../types';
import { 
  Lock, 
  Key, 
  ShieldCheck, 
  User, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Sun, 
  Moon, 
  HelpCircle, 
  ChevronDown,
  Info,
  Eye,
  EyeOff,
  Settings2,
  X
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

  // Form states - Single 6-digit PIN authentication (No multiple modes/tabs)
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [stationId, setStationId] = useState<string>(STATION_PRESETS[0].id);
  const [operatorName, setOperatorName] = useState<string>('Zeeshan K');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showCredentialsHint, setShowCredentialsHint] = useState<boolean>(false);

  // Admin PIN Management Modal State
  const [showChangePinModal, setShowChangePinModal] = useState<boolean>(false);
  const [adminAuthPin, setAdminAuthPin] = useState<string>('');
  const [newOperatorPin, setNewOperatorPin] = useState<string>('');
  const [newAdminPin, setNewAdminPin] = useState<string>('');
  const [changePinError, setChangePinError] = useState<string | null>(null);
  const [changePinSuccess, setChangePinSuccess] = useState<string | null>(null);

  // Sync with universal config from backend on mount
  useEffect(() => {
    StorageService.initUniversalConfig().catch(() => {});
  }, []);

  const handleQuickPreset = (role: 'operator' | 'admin') => {
    setErrorMessage(null);
    const creds = StorageService.getCredentials();
    if (role === 'operator') {
      setPin(creds.operatorPin || '123456');
      setOperatorName('Zeeshan K');
      setStationId(STATION_PRESETS[0].id);
    } else {
      setPin(creds.adminPin || '888888');
      setOperatorName('Admin Supervisor');
      setStationId(STATION_PRESETS[0].id);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const cleanPin = pin.trim();
    if (!cleanPin) {
      setErrorMessage('Please enter your 6-digit Station PIN.');
      setIsSubmitting(false);
      return;
    }

    setTimeout(() => {
      const result = StorageService.authenticateWithPin(cleanPin, stationId, operatorName);
      if (result.success && result.user) {
        setSuccessMessage(result.message || '6-Digit PIN Authorized Successfully!');
        setTimeout(() => {
          onLoginSuccess(result.user!);
        }, 400);
      } else {
        setErrorMessage(result.message || 'Invalid 6-Digit PIN. Please try again.');
        setIsSubmitting(false);
      }
    }, 200);
  };

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePinError(null);
    setChangePinSuccess(null);

    const res = StorageService.updatePins(adminAuthPin, newOperatorPin, newAdminPin);
    if (res.success) {
      setChangePinSuccess(res.message);
      setTimeout(() => {
        setShowChangePinModal(false);
        setAdminAuthPin('');
        setNewOperatorPin('');
        setNewAdminPin('');
        setChangePinSuccess(null);
      }, 1500);
    } else {
      setChangePinError(res.message);
    }
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
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                6-Digit PIN Access
              </span>
            </div>
            <p className="text-[11px] text-slate-500 -mt-0.5">
              Warehouse Returns &amp; Claims Management Portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin Change PINs quick button */}
          <button
            type="button"
            onClick={() => {
              setChangePinError(null);
              setChangePinSuccess(null);
              setShowChangePinModal(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Admin PIN Management"
          >
            <Settings2 className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Admin: Change PINs</span>
          </button>

          <button
            onClick={toggleTheme}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs'
                : 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
            }`}
            title="Toggle Dark / Light Mode"
          >
            {isLight ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md">
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
                Station PIN Authorization
              </h1>
              <p className={`text-xs mt-1 font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Enter your 6-digit access PIN to authorize this station
              </p>
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

            {/* Single 6-Digit PIN Form */}
            <div className="p-6">
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
                    Operator / Staff Name
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

                {/* 6-Digit PIN Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      6-Digit Access PIN
                    </label>
                    <span className="text-[11px] text-amber-500 font-medium">
                      Operator: 123456 | Admin: 888888
                    </span>
                  </div>
                  <div className="relative">
                    <Key className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setPin(val);
                      }}
                      placeholder="••••••"
                      autoFocus
                      className={`w-full text-center text-2xl tracking-[0.5em] font-mono font-bold rounded-xl border py-2.5 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                          : 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showPin ? 'Hide PIN' : 'Show PIN'}
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                      Keep signed in on this station
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setChangePinError(null);
                      setChangePinSuccess(null);
                      setShowChangePinModal(true);
                    }}
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
                  >
                    Change PINs
                  </button>
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

              {/* 1-Click Fast Presets */}
              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    1-Click 6-Digit Station Presets
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCredentialsHint(!showCredentialsHint)}
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>{showCredentialsHint ? 'Hide Default PINs' : 'View Default PINs'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('operator')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      isLight
                        ? 'bg-slate-50 hover:bg-amber-50/60 border-slate-200 hover:border-amber-300 text-slate-800'
                        : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 hover:border-amber-500/40 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-500 text-xs">Floor Operator</span>
                      <span className="text-[11px] font-mono font-bold bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-400">
                        123456
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Receipt, QC, Claims</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickPreset('admin')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      isLight
                        ? 'bg-slate-50 hover:bg-amber-50/60 border-slate-200 hover:border-amber-300 text-slate-800'
                        : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 hover:border-amber-500/40 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-500 text-xs">Admin Supervisor</span>
                      <span className="text-[11px] font-mono font-bold bg-sky-500/20 px-1.5 py-0.5 rounded text-sky-600 dark:text-sky-400">
                        888888
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Full access + GAS Sync</p>
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
                      <span>System 6-Digit Access Keys:</span>
                    </div>
                    <div className="space-y-1 font-mono text-[11px]">
                      <div>
                        • <strong>Operator PIN:</strong> <code className="bg-amber-200/50 dark:bg-amber-900/50 px-1.5 py-0.5 rounded font-bold">123456</code> (Floor access)
                      </div>
                      <div>
                        • <strong>Admin PIN:</strong> <code className="bg-amber-200/50 dark:bg-amber-900/50 px-1.5 py-0.5 rounded font-bold">888888</code> (Full control &amp; PIN management)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Privacy & Cloud Architecture Note for "Database access as myself only" */}
            <div
              className={`p-4 border-t text-[11px] flex items-start gap-2.5 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950 border-slate-800/80 text-slate-400'
              }`}
            >
              <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Private Google Sheet (&ldquo;Only Me&rdquo;): </span>
                <span>
                  Your Google Sheet remains private in Google Drive. All station updates sync seamlessly through your embedded Google Apps Script backend proxy.
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Admin Change PINs Modal */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
          >
            <button
              onClick={() => setShowChangePinModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">Change 6-Digit Access PINs</h3>
                <p className="text-xs text-slate-500">Admin Authorization Required</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              As Administrator, you can customize the 6-digit PIN for Floor Operators and the separate 6-digit Admin PIN. Changes are instantly saved universally.
            </p>

            {changePinError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{changePinError}</span>
              </div>
            )}

            {changePinSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{changePinSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePinSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1">
                  Current Admin PIN <span className="text-amber-500">*</span>
                </label>
                <input
                  type="password"
                  maxLength={10}
                  value={adminAuthPin}
                  onChange={(e) => setAdminAuthPin(e.target.value)}
                  placeholder="Enter current Admin PIN (default: 888888)"
                  className={`w-full font-mono text-sm px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                  required
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-bold mb-1">
                  New 6-Digit Floor Operator PIN <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={newOperatorPin}
                  onChange={(e) => setNewOperatorPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 123456"
                  className={`w-full font-mono text-center tracking-widest text-base font-bold px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">Must be exactly 6 digits</p>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  New 6-Digit Admin Supervisor PIN <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={newAdminPin}
                  onChange={(e) => setNewAdminPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 888888"
                  className={`w-full font-mono text-center tracking-widest text-base font-bold px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">Must be exactly 6 digits</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowChangePinModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                    isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  Save New 6-Digit PINs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        className={`py-3 text-center text-xs border-t transition-colors ${
          isLight ? 'border-slate-200 bg-white text-slate-500' : 'border-slate-900 bg-slate-950 text-slate-500'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px]">
          <span>TABBYMART Returns &amp; Claims Management System · Universal Production Portal</span>
          <span className="font-mono text-slate-400">Station Security: 6-Digit PIN Protocol</span>
        </div>
      </footer>
    </div>
  );
};
