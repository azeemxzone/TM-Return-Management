import React, { useState } from 'react';
import { ReturnRecord, Marketplace, ReturnType, InspectionStatus, PackageCondition, ItemCondition, Disposition, ThemeMode } from '../types';
import { StorageService } from '../services/storageService';
import { 
  Search, 
  ExternalLink, 
  ShieldAlert, 
  Calendar,
  Edit3, 
  X,
  FileCheck2,
  CheckCircle2,
  Trash2,
  Clock,
  Loader2
} from 'lucide-react';

interface ReturnsLogTableProps {
  returns: ReturnRecord[];
  onUpdateReturn: (updated: ReturnRecord) => void;
  onDeleteReturn?: (returnEntryId: string) => void;
  onCreateClaimFromReturn: (record: ReturnRecord) => void;
  operatorName: string;
  theme?: ThemeMode;
}

export const ReturnsLogTable: React.FC<ReturnsLogTableProps> = ({
  returns,
  onUpdateReturn,
  onDeleteReturn,
  onCreateClaimFromReturn,
  operatorName,
  theme = 'light'
}) => {
  const isLight = theme === 'light';
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterMarketplace, setFilterMarketplace] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCondition, setFilterCondition] = useState<string>('ALL');

  // Selected return for inspection update modal
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(null);
  const [modalPkgCondition, setModalPkgCondition] = useState<PackageCondition>('Intact / Undamaged');
  const [modalItemCondition, setModalItemCondition] = useState<ItemCondition>('Sellable');
  const [modalDisposition, setModalDisposition] = useState<Disposition>('Restock to Active Inventory');
  const [modalFinStatus, setModalFinStatus] = useState<'Pending Review' | 'Approved' | 'Adjusted' | 'Written Off'>('Pending Review');
  const [modalNotes, setModalNotes] = useState<string>('');

  // Dedicated In-App Delete Confirmation Modal State
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<ReturnRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isSavingInspection, setIsSavingInspection] = useState<boolean>(false);
  const [tableToast, setTableToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const openInspectionModal = (r: ReturnRecord) => {
    setSelectedReturn(r);
    setModalPkgCondition(r.packageCondition);
    setModalItemCondition(r.itemCondition);
    setModalDisposition(r.dispositionDecision);
    setModalFinStatus(r.financialReviewStatus);
    setModalNotes(r.warehouseNotes || '');
  };

  const handleDeleteReturn = (rec: ReturnRecord) => {
    setDeleteConfirmTarget(rec);
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirmTarget) return;
    setIsDeleting(true);
    const targetEntryId = deleteConfirmTarget.returnEntryId;
    const targetOrderId = deleteConfirmTarget.originalOrderId;
    try {
      const delResult = await StorageService.deleteReturnAsync(targetEntryId, operatorName, targetOrderId);
      if (onDeleteReturn) {
        onDeleteReturn(targetEntryId);
      }
      if (selectedReturn?.returnEntryId === targetEntryId) {
        setSelectedReturn(null);
      }
      setDeleteConfirmTarget(null);

      setTableToast({
        type: delResult.success ? 'success' : 'error',
        text: delResult.message || (delResult.success 
          ? `✓ Permanently deleted record "${targetEntryId}" for Order "${targetOrderId}" from Google Sheets.`
          : `Notice: Local record deleted, Google Sheets sync status: ${delResult.message}`)
      });
      setTimeout(() => setTableToast(null), 6000);
    } catch (err: any) {
      setTableToast({
        type: 'error',
        text: `Deletion notice: ${err?.message || 'Error communicating with Google Sheets.'}`
      });
      setTimeout(() => setTableToast(null), 6000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveModal = async () => {
    if (!selectedReturn) return;
    setIsSavingInspection(true);
    const now = StorageService.formatNormalTimestamp(new Date());
    const updated: ReturnRecord = {
      ...selectedReturn,
      packageCondition: modalPkgCondition,
      itemCondition: modalItemCondition,
      dispositionDecision: modalDisposition,
      inspectionStatus: modalItemCondition === 'Sellable' ? 'Restock Approved' : 'Damaged / Write-off Review',
      financialReviewStatus: modalFinStatus,
      warehouseNotes: modalNotes,
      lastUpdatedAt: now,
      inspectionDate: StorageService.formatNormalTimestamp(new Date()).slice(0, 10),
      claimEligible: modalItemCondition === 'Not Sellable' || modalDisposition === 'Claim Filing Required (SPF/T-Safe)'
    };

    // 1. Update in LocalStorage
    StorageService.updateReturnRecord(updated, operatorName);

    // 2. Update React parent state
    onUpdateReturn(updated);

    // 3. Sync update to Google Sheets
    try {
      const syncResult = await StorageService.syncReturnToGas(updated, true);
      setSelectedReturn(null);

      setTableToast({
        type: syncResult.success ? 'success' : 'error',
        text: syncResult.message || (syncResult.success 
          ? `✓ Updated inspection for "${updated.returnEntryId}" in Google Sheet.` 
          : 'Inspection saved locally; Google Sheets update pending.')
      });
      setTimeout(() => setTableToast(null), 6000);
    } catch (syncErr: any) {
      setSelectedReturn(null);
      setTableToast({
        type: 'error',
        text: `Inspection saved locally. Google Sheets notice: ${syncErr?.message || 'Check network connection'}`
      });
      setTimeout(() => setTableToast(null), 6000);
    } finally {
      setIsSavingInspection(false);
    }
  };

  const filtered = returns.filter((r) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      r.returnEntryId.toLowerCase().includes(q) ||
      r.originalOrderId.toLowerCase().includes(q) ||
      r.marketplaceReturnId.toLowerCase().includes(q) ||
      (r.awbTrackingNumber && r.awbTrackingNumber.toLowerCase().includes(q)) ||
      r.masterSkuCode.toLowerCase().includes(q) ||
      r.productNameSnapshot.toLowerCase().includes(q);

    const matchMkt = filterMarketplace === 'ALL' || r.marketplace === filterMarketplace;
    const matchType = filterType === 'ALL' || r.returnType === filterType;
    const matchCondition = filterCondition === 'ALL' || r.itemCondition === filterCondition;

    return matchSearch && matchMkt && matchType && matchCondition;
  });

  return (
    <div className="space-y-4">
      {/* Real-time Google Sheets Operation Feedback Toast */}
      {tableToast && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-md animate-in fade-in duration-150 border ${
            tableToast.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
              : tableToast.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-800 dark:text-rose-200'
              : 'bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {tableToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span>{tableToast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setTableToast(null)}
            className="p-1 hover:bg-black/10 rounded-lg text-slate-500 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div
        className={`rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 border transition-colors ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
        }`}
      >
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Order ID, Return ID, AWB, SKU..."
            className={`w-full rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
            }`}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Marketplace Filter */}
          <select
            value={filterMarketplace}
            onChange={(e) => setFilterMarketplace(e.target.value)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none border ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <option value="ALL">All Marketplaces</option>
            <option value="Meesho">Meesho</option>
            <option value="Amazon">Amazon</option>
            <option value="Flipkart">Flipkart</option>
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none border ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <option value="ALL">All Return Types</option>
            <option value="Customer Return">Customer Return</option>
            <option value="Courier Return (RTO)">Courier Return (RTO)</option>
          </select>

          {/* Item Condition Filter */}
          <select
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none border ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <option value="ALL">All Item Conditions</option>
            <option value="Sellable">Sellable</option>
            <option value="Not Sellable">Not Sellable</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div
        className={`rounded-2xl overflow-hidden border transition-colors ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-950/80 text-slate-400 border-slate-800'
              }`}
            >
              <tr>
                <th className="py-3 px-4">Return ID / Date</th>
                <th className="py-3 px-4">Marketplace / Type</th>
                <th className="py-3 px-4">Order ID &amp; Return ID</th>
                <th className="py-3 px-4">Master SKU &amp; Product</th>
                <th className="py-3 px-4">Qty &amp; Weight</th>
                <th className="py-3 px-4">Inv. Value</th>
                <th className="py-3 px-4">Condition &amp; Disposition</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-slate-800/80'}`}>
              {filtered.length > 0 ? (
                filtered.map((item) => {
                  const isSellable = item.itemCondition === 'Sellable';
                  return (
                    <tr
                      key={item.returnEntryId}
                      className={`transition-colors ${isLight ? 'hover:bg-amber-50/40' : 'hover:bg-slate-800/40'}`}
                    >
                      {/* Return ID & Date + Timestamp */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-amber-600 dark:text-amber-300">
                          {item.returnEntryId}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{item.receiptDate}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-amber-500" />
                          <span>{StorageService.formatDisplayTimestamp(item.lastUpdatedAt || item.createdAt)}</span>
                        </div>
                      </td>

                      {/* Marketplace & Return Type */}
                      <td className="py-3 px-4">
                        <div className="font-bold flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.marketplace === 'Meesho'
                                ? 'bg-pink-500'
                                : item.marketplace === 'Amazon'
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            }`}
                          />
                          <span>{item.marketplace}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {item.returnType}
                        </div>
                      </td>

                      {/* Order & Return IDs */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold">
                          {item.originalOrderId}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                          Ret: {item.marketplaceReturnId}
                          {item.awbTrackingNumber ? ` · AWB: ${item.awbTrackingNumber}` : ''}
                        </div>
                      </td>

                      {/* Master SKU & Title */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="font-mono font-bold text-amber-600 dark:text-amber-400">
                          {item.masterSkuCode}
                        </div>
                        <div className="truncate text-[11px] text-slate-600 dark:text-slate-300" title={item.productNameSnapshot}>
                          {item.productNameSnapshot}
                        </div>
                      </td>

                      {/* Qty & Weights */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold">
                          Qty: {item.quantityReceived}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                          {item.expectedTotalWeightGrams}g
                          {item.measuredPackageWeightGrams !== undefined && (
                            <span className="ml-1 text-slate-400">
                              (Act: {item.measuredPackageWeightGrams}g)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Inventory Value */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ₹ {item.totalInventoryValue}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ₹{item.mfgFreightCost}/u
                        </div>
                      </td>

                      {/* Simplified Condition & Disposition */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isSellable
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {item.itemCondition}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 truncate max-w-[150px]" title={item.dispositionDecision}>
                          {item.dispositionDecision}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.claimEligible && (
                            <button
                              onClick={() => onCreateClaimFromReturn(item)}
                              title="File SPF / T-Safe Claim"
                              className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Claim</span>
                            </button>
                          )}
                          <button
                            onClick={() => openInspectionModal(item)}
                            title="Inspect & Update Disposition"
                            className={`p-1.5 rounded-lg transition border ${
                              isLight
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteReturn(item)}
                            title="Delete this return record if wrongly entered"
                            className="p-1.5 rounded-lg transition border bg-rose-500/10 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No return records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simplified Inspection Update Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border transition-colors ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-100'
            }`}
          >
            <div
              className={`p-4 border-b flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-bold text-sm">Update Return Physical Inspection</h3>
                  <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-bold">
                    {selectedReturn.returnEntryId}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedReturn(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Context Summary with Timestamps */}
              <div className={`p-3 rounded-xl border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block">Product:</span>
                    <span className="font-bold truncate block">{selectedReturn.productNameSnapshot}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Order ID:</span>
                    <span className="font-mono font-bold block">{selectedReturn.originalOrderId}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span>Created: <strong className="text-slate-700 dark:text-slate-300">{StorageService.formatDisplayTimestamp(selectedReturn.createdAt)}</strong></span>
                  <span>Updated: <strong className="text-emerald-600 dark:text-emerald-400">{StorageService.formatDisplayTimestamp(selectedReturn.lastUpdatedAt)}</strong></span>
                </div>
              </div>

              {/* Package Condition: 2 options only */}
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Package Condition (2 options):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Intact / Undamaged', 'Torn / Opened Polybag'] as PackageCondition[]).map((pkg) => (
                    <button
                      key={pkg}
                      type="button"
                      onClick={() => setModalPkgCondition(pkg)}
                      className={`p-2.5 rounded-xl border font-bold text-xs transition ${
                        modalPkgCondition === pkg
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : isLight
                          ? 'bg-slate-100 border-slate-200 text-slate-700'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {pkg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Condition: 2 options only */}
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Item Condition (2 options):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Sellable', 'Not Sellable'] as ItemCondition[]).map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => {
                        setModalItemCondition(cond);
                        if (cond === 'Sellable') {
                          setModalDisposition('Restock to Active Inventory');
                        } else {
                          setModalDisposition('Claim Filing Required (SPF/T-Safe)');
                        }
                      }}
                      className={`p-2.5 rounded-xl border font-bold text-xs transition ${
                        modalItemCondition === cond
                          ? cond === 'Sellable'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-rose-600 text-white border-rose-600'
                          : isLight
                          ? 'bg-slate-100 border-slate-200 text-slate-700'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {cond}
                    </button>
                  ))}
                </div>
              </div>

              {/* Disposition: 3 options only */}
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Disposition Decision (3 options):
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {([
                    'Restock to Active Inventory',
                    'Claim Filing Required (SPF/T-Safe)',
                    'Scrapped / Written Off'
                  ] as Disposition[]).map((disp) => (
                    <button
                      key={disp}
                      type="button"
                      onClick={() => setModalDisposition(disp)}
                      className={`p-2.5 rounded-xl border font-bold text-xs text-left transition ${
                        modalDisposition === disp
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : isLight
                          ? 'bg-slate-100 border-slate-200 text-slate-700'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {disp}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Warehouse Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className={`w-full rounded-xl p-2.5 border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>
            </div>

            <div
              className={`p-4 border-t flex items-center justify-between gap-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <button
                type="button"
                onClick={() => handleDeleteReturn(selectedReturn)}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
                title="Delete this return record from ledger"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Record</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReturn(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingInspection}
                  onClick={handleSaveModal}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingInspection ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Sheet...</span>
                    </>
                  ) : (
                    <span>Save Decisions</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border text-center transition-all ${
              isLight
                ? 'bg-white border-rose-300 text-slate-800 shadow-rose-500/10'
                : 'bg-slate-900 border-rose-900/60 text-white shadow-black/60'
            }`}
          >
            <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-rose-600 dark:text-rose-400">
              Delete Return Record?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Are you sure you want to permanently delete this return from <strong className="text-slate-800 dark:text-slate-100">&ldquo;Warehouse Returns Master &amp; P&amp;L Ledger&rdquo;</strong>?
            </p>

            <div
              className={`my-4 p-4 rounded-2xl text-left text-xs space-y-2 border ${
                isLight ? 'bg-rose-50/70 border-rose-200/80 text-slate-800' : 'bg-rose-950/30 border-rose-900/50 text-rose-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Return ID:</span>
                <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400">
                  {deleteConfirmTarget.returnEntryId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Order ID:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {deleteConfirmTarget.originalOrderId}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-rose-200 dark:border-rose-900/50">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Product:</span>
                <span className="text-[11px] font-semibold truncate max-w-[210px] text-right">
                  {deleteConfirmTarget.productNameSnapshot || deleteConfirmTarget.masterSkuCode}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-bold uppercase">Marketplace / Date:</span>
                <span>{deleteConfirmTarget.marketplace} • {deleteConfirmTarget.receiptDate}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-900 dark:text-amber-300 mb-5 text-left flex items-start gap-2">
              <span className="shrink-0 mt-0.5">ℹ️</span>
              <span>
                The row will be removed from your Google Sheet and empty lines will be cleanly pruned.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
