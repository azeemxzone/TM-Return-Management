import React, { useState } from 'react';
import { SkuMasterItem, SkuVariant, ThemeMode } from '../types';
import { StorageService, AliasConflict } from '../services/storageService';
import { 
  Database, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Layers, 
  RefreshCw, 
  Edit3, 
  X, 
  Sparkles,
  Download,
  ClipboardPaste,
  Check,
  CheckCircle2
} from 'lucide-react';

interface SkuMasterManagerProps {
  skuMaster: SkuMasterItem[];
  skuVariants: SkuVariant[];
  onUpdateSkuMaster: (updatedList: SkuMasterItem[]) => void;
  operatorName: string;
  theme?: ThemeMode;
}

export const SkuMasterManager: React.FC<SkuMasterManagerProps> = ({
  skuMaster,
  skuVariants,
  onUpdateSkuMaster,
  operatorName,
  theme = 'light'
}) => {
  const isLight = theme === 'light';
  const [activeSubTab, setActiveSubTab] = useState<'master' | 'variants'>('master');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<SkuMasterItem | null>(null);

  // Sync state
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick Paste Modal state
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>('');
  const [pasteMsg, setPasteMsg] = useState<string | null>(null);

  // Form State
  const [skuCode, setSkuCode] = useState<string>('');
  const [skuName, setSkuName] = useState<string>('');
  const [weightGrams, setWeightGrams] = useState<number>(500);
  const [cost, setCost] = useState<number>(300);
  const [category, setCategory] = useState<string>('Kitchen & Dining');
  const [variantsMapRaw, setVariantsMapRaw] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Conflict detection
  const conflicts: AliasConflict[] = StorageService.checkVariantConflicts(skuVariants);

  const openAddModal = () => {
    setEditingItem(null);
    setSkuCode('');
    setSkuName('');
    setWeightGrams(500);
    setCost(300);
    setCategory('General');
    setVariantsMapRaw('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: SkuMasterItem) => {
    setEditingItem(item);
    setSkuCode(item.skuCode);
    setSkuName(item.skuName);
    setWeightGrams(item.weightGrams);
    setCost(item.mfgFreightCost);
    setCategory(item.category);
    setVariantsMapRaw(item.variantsMapRaw);
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveSku = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = skuCode.trim().toUpperCase();
    if (!cleanCode) {
      alert('Master SKU Code is required.');
      return;
    }

    const now = StorageService.formatNormalTimestamp(new Date());
    const newItem: SkuMasterItem = {
      skuCode: cleanCode,
      skuName: skuName.trim(),
      weightGrams: Number(weightGrams) || 0,
      mfgFreightCost: Number(cost) || 0,
      variantsMapRaw: variantsMapRaw.trim(),
      category: category.trim(),
      active: true,
      lastUpdatedAt: now,
      notes: notes.trim()
    };

    const currentMaster = [...skuMaster];
    const existingIdx = currentMaster.findIndex((m) => m.skuCode === cleanCode);

    if (existingIdx !== -1) {
      currentMaster[existingIdx] = newItem;
    } else {
      currentMaster.unshift(newItem);
    }

    StorageService.saveSkuMaster(currentMaster);
    StorageService.logAudit(
      operatorName,
      existingIdx !== -1 ? 'UPDATE_SKU' : 'CREATE_SKU',
      'SKU_Master',
      cleanCode,
      `Weight: ${weightGrams}g, Cost: ₹${cost}`
    );

    onUpdateSkuMaster(currentMaster);
    setIsModalOpen(false);
  };

  const handleFetchFromGas = async () => {
    setIsFetching(true);
    setSyncFeedback(null);
    try {
      const res = await StorageService.fetchSkuCatalogFromGas();
      if (res.success && res.skus) {
        onUpdateSkuMaster(res.skus);
        setSyncFeedback({
          type: 'success',
          text: `✓ Successfully fetched ${res.count} SKUs from Google Sheet tab "${res.sheetNameFound || 'SKU_Master'}"!`
        });
      } else {
        setSyncFeedback({
          type: 'error',
          text: res.message || 'Could not fetch from Apps Script Web App. Try "Paste from Sheet" below.'
        });
      }
    } catch (e: any) {
      setSyncFeedback({
        type: 'error',
        text: e.message || 'Connection failed.'
      });
    } finally {
      setIsFetching(false);
      setTimeout(() => setSyncFeedback(null), 6000);
    }
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) {
      setPasteMsg('Please paste rows from your Google Sheet tab.');
      return;
    }
    const res = StorageService.importSkuMasterFromText(pasteText);
    if (res.success && res.skus) {
      onUpdateSkuMaster(res.skus);
      setPasteMsg(null);
      setIsPasteModalOpen(false);
      setPasteText('');
      setSyncFeedback({
        type: 'success',
        text: `✓ Imported ${res.count} SKUs from your Google Sheet table!`
      });
    } else {
      setPasteMsg(res.message);
    }
  };

  const handleNormalizeNow = () => {
    StorageService.saveSkuMaster(skuMaster);
    const updated = StorageService.getSkuVariants();
    alert(`SKU Variants normalized from Master Catalog. ${updated.length} aliases generated.`);
  };

  const filteredMaster = skuMaster.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      !q ||
      item.skuCode.toLowerCase().includes(q) ||
      item.skuName.toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.variantsMapRaw || '').toLowerCase().includes(q)
    );
  });

  const filteredVariants = skuVariants.filter((v) => {
    const q = searchTerm.toLowerCase();
    return (
      !q ||
      v.variantCode.toLowerCase().includes(q) ||
      v.masterSkuCode.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Conflict Alert Banner if any alias maps to multiple master SKUs */}
      {conflicts.length > 0 && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-200 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-rose-300">
            <AlertTriangle className="w-4 h-4" />
            <span>Alias Mapping Conflict Detected!</span>
          </div>
          <p>
            The following variant codes map to more than one Master SKU. Administrators must resolve these conflicts to prevent warehouse misrouting:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {conflicts.map((c, i) => (
              <span key={i} className="px-2 py-1 bg-rose-950 border border-rose-800 rounded font-mono">
                {c.variantCode} → [{c.firstMasterSku}] vs [{c.secondMasterSku}]
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sync Status Feedback */}
      {syncFeedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          {syncFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{syncFeedback.text}</span>
        </div>
      )}

      {/* Control Bar */}
      <div
        className={`rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 border shadow-sm ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        {/* Sub-tab navigation */}
        <div
          className={`flex items-center gap-1 p-1 rounded-xl border w-full md:w-auto ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}
        >
          <button
            onClick={() => setActiveSubTab('master')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'master'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Master Catalog ({skuMaster.length} SKUs)
          </button>
          <button
            onClick={() => setActiveSubTab('variants')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'variants'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Normalized Variants ({skuVariants.length} Aliases)
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <div className="relative flex-1 md:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search code, title, alias..."
              className={`w-full rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  : 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
              }`}
            />
          </div>

          {/* Fetch from Google Sheet Button */}
          <button
            type="button"
            onClick={handleFetchFromGas}
            disabled={isFetching}
            title="Fetch live SKU catalog from 'Warehouse Returns Master & P&L Ledger' Google Sheet"
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? 'Fetching...' : 'Fetch from Sheet'}</span>
          </button>

          {/* Paste from Google Sheet Button */}
          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            title="Paste copied cells from Google Sheet"
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
              isLight
                ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                : 'bg-blue-950/60 border-blue-800 text-blue-300 hover:bg-blue-900/60'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Paste from Sheet</span>
          </button>

          {/* Add New SKU Button */}
          <button
            onClick={openAddModal}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition whitespace-nowrap shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add SKU</span>
          </button>
        </div>
      </div>

      {/* Subtab 1: SKU Master Table */}
      {activeSubTab === 'master' && (
        <div
          className={`border rounded-2xl overflow-hidden shadow-xl transition-colors ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-950/80 border-slate-800 text-slate-400'
                }`}
              >
                <tr>
                  <th className="py-3 px-4">Master SKU Code</th>
                  <th className="py-3 px-4">Canonical Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Weight (g)</th>
                  <th className="py-3 px-4">Mfg + Freight Cost</th>
                  <th className="py-3 px-4">Mapped Variants / Aliases</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-slate-800/80'}`}>
                {filteredMaster.map((item) => (
                  <tr
                    key={item.skuCode}
                    className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        {item.skuCode}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-[280px]">
                      <div className={`font-bold text-xs line-clamp-1 ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                        {item.skuName}
                      </div>
                      {item.notes && (
                        <div className={`text-[10px] mt-0.5 line-clamp-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                          {item.notes}
                        </div>
                      )}
                    </td>
                    <td className={`py-3 px-4 font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-200'}`}>
                      {item.category}
                    </td>
                    <td className={`py-3 px-4 font-mono font-extrabold ${isLight ? 'text-slate-900' : 'text-amber-300'}`}>
                      {item.weightGrams} g
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₹ {item.mfgFreightCost}
                    </td>
                    <td className="py-3 px-4 max-w-[220px]">
                      <div
                        className={`font-mono text-xs font-medium truncate px-2 py-1 rounded border ${
                          isLight
                            ? 'text-slate-800 bg-slate-100 border-slate-200'
                            : 'text-zinc-100 bg-slate-800/90 border-slate-700'
                        }`}
                        title={item.variantsMapRaw}
                      >
                        {item.variantsMapRaw.replace(/[\r\n]+/g, ' · ') || 'No aliases'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEditModal(item)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                          isLight
                            ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                        }`}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 2: Normalized Variants Table */}
      {activeSubTab === 'variants' && (
        <div
          className={`border rounded-2xl overflow-hidden shadow-xl transition-colors ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-950/80 border-slate-800 text-slate-400'
                }`}
              >
                <tr>
                  <th className="py-3 px-4">Variant / Alias Code</th>
                  <th className="py-3 px-4">Mapped Master SKU</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Source Channel</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-slate-800/80'}`}>
                {filteredVariants.map((v, i) => (
                  <tr
                    key={i}
                    className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        {v.variantCode}
                      </span>
                    </td>
                    <td className={`py-3 px-4 font-mono font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                      {v.masterSkuCode}
                    </td>
                    <td className={`py-3 px-4 font-medium ${isLight ? 'text-slate-700' : 'text-zinc-200'}`}>
                      {v.description}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-medium ${
                        isLight
                          ? 'bg-slate-100 border-slate-200 text-slate-800'
                          : 'bg-slate-800 border-slate-700 text-zinc-200'
                      }`}>
                        {v.sourceChannel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick 1-Click Paste Modal from Google Sheet Tab */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-xl rounded-3xl p-6 shadow-2xl border transition-all ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-base">Quick Import SKUs from Google Sheet Tab</h3>
              </div>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
              Open your Google Sheet <strong className="text-amber-600 dark:text-amber-400">"Warehouse Returns Master &amp; P&amp;L Ledger"</strong>, click the second tab (<strong className="font-mono">Sheet2 (2)</strong> or <strong className="font-mono">SKU_Master</strong>), select all (<kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Ctrl+A</kbd>), copy (<kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Ctrl+C</kbd>), and paste here:
            </p>

            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste copied cells from Google Sheet here...
SKU Code	SKU Name	Weight (grams)	Mfg + Frieght	SKU Variants Map
TBM-KTC-001	TABBYMART 4-Tier Rotating Kitchen Spice Rack Carousel 16 Jars	850	420	MSH-KTC-991"
              className={`w-full rounded-2xl p-3.5 text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-100'
              }`}
            />

            {pasteMsg && (
              <div className="mt-2 text-xs font-semibold text-rose-500">
                {pasteMsg}
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasteImport}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow"
              >
                <Check className="w-4 h-4" />
                <span>Import &amp; Update Catalog</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit SKU Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div
            className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-base">
                {editingItem ? 'Edit Master SKU' : 'Add New Master SKU'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSku} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Master SKU Code *
                </label>
                <input
                  type="text"
                  required
                  value={skuCode}
                  onChange={(e) => setSkuCode(e.target.value)}
                  placeholder="e.g. TBM-KTC-009"
                  className={`w-full rounded-xl px-3.5 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Canonical Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={skuName}
                  onChange={(e) => setSkuName(e.target.value)}
                  placeholder="e.g. TABBYMART 4-Tier Rotating Kitchen Spice Rack Carousel 16 Jars"
                  className={`w-full rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                    Weight in Grams *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(Number(e.target.value))}
                    className={`w-full rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                    Mfg + Freight Cost (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className={`w-full rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Kitchen & Dining"
                  className={`w-full rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  SKU Variants Map (Newline or Comma separated codes/ASINs/FSNs)
                </label>
                <textarea
                  rows={3}
                  value={variantsMapRaw}
                  onChange={(e) => setVariantsMapRaw(e.target.value)}
                  placeholder="e.g.&#10;MSH-KTC-991&#10;B09X4R1234&#10;FSN-RACK-881"
                  className={`w-full rounded-xl p-2.5 text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition"
                >
                  Save SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
