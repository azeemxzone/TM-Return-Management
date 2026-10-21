import React, { useState, useEffect, useRef } from 'react';
import { 
  Marketplace, 
  ReturnType, 
  PackageCondition, 
  ItemCondition, 
  Disposition, 
  InspectionStatus, 
  ReturnRecord, 
  SkuMasterItem, 
  SkuVariant,
  ThemeMode
} from '../types';
import { StorageService, DuplicateCheckResult } from '../services/storageService';
import { 
  Scan, 
  AlertTriangle, 
  CheckCircle2, 
  Scale, 
  Sparkles, 
  ShoppingBag, 
  Camera,
  Check,
  X,
  ChevronDown,
  RefreshCw,
  Copy,
  ClipboardPaste,
  ArrowRight,
  ShieldCheck,
  Search,
  FileCheck,
  Package,
  Trash2,
  Edit3,
  RotateCcw,
  Key,
  Loader2
} from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface ReturnsFormProps {
  returns?: ReturnRecord[];
  skuMaster: SkuMasterItem[];
  skuVariants: SkuVariant[];
  onReturnSaved: (savedRecord: ReturnRecord) => void;
  onUpdateReturn?: (updatedRecord: ReturnRecord) => void;
  onDeleteReturn?: (returnEntryId: string) => void;
  onUpdateSkuMaster?: (updatedMaster: SkuMasterItem[]) => void;
  onViewReturnsLog?: () => void;
  onViewAuthorization?: () => void;
  operatorName: string;
  theme?: ThemeMode;
}

export const ReturnsForm: React.FC<ReturnsFormProps> = ({
  returns,
  skuMaster,
  skuVariants,
  onReturnSaved,
  onUpdateReturn,
  onDeleteReturn,
  onUpdateSkuMaster,
  onViewReturnsLog,
  onViewAuthorization,
  operatorName,
  theme = 'light'
}) => {
  const isLight = theme === 'light';

  // 1. Core Form State
  const [marketplace, setMarketplace] = useState<Marketplace>('Meesho'); // Defaults to Meesho per business requirement
  const [returnType, setReturnType] = useState<ReturnType>('Customer Return');
  const [receiptDate, setReceiptDate] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  });
  const [orderId, setOrderId] = useState<string>('');
  const [returnId, setReturnId] = useState<string>('');
  const [awb, setAwb] = useState<string>('');

  // Modification Mode State (Request 3: fetch existing record to modify or delete)
  const [editingReturnId, setEditingReturnId] = useState<string | null>(null);
  const [existingRecordForOrder, setExistingRecordForOrder] = useState<ReturnRecord | null>(null);
  const [statusToast, setStatusToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 2. SKU Search & Selection State
  const [skuSearchQuery, setSkuSearchQuery] = useState<string>('');
  const [selectedMasterSku, setSelectedMasterSku] = useState<SkuMasterItem | null>(null);
  const [resolvedVariantCode, setResolvedVariantCode] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isFetchingSkus, setIsFetchingSkus] = useState<boolean>(false);
  const [skuFetchMsg, setSkuFetchMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick Paste Modal for Google Sheet tab
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [pasteRawText, setPasteRawText] = useState<string>('');
  const [pasteImportMsg, setPasteImportMsg] = useState<string | null>(null);

  // 3. Quantity & Weight
  const [quantity, setQuantity] = useState<number>(1);
  const [measuredWeight, setMeasuredWeight] = useState<string>('');

  // 4. Physical Inspection (Streamlined strictly per user requirements)
  const [packageCondition, setPackageCondition] = useState<PackageCondition>('Intact / Undamaged');
  const [itemCondition, setItemCondition] = useState<ItemCondition>('Sellable');
  const [disposition, setDisposition] = useState<Disposition>('Restock to Active Inventory');
  const [damageNotes, setDamageNotes] = useState<string>('');

  // 5. System & UI Feedback
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateCheckResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // PROMINENT SAVE INTIMATION STATE
  const [savedModalData, setSavedModalData] = useState<{
    returnEntryId: string;
    originalOrderId: string;
    marketplace: string;
    productName: string;
    quantity: number;
    itemCondition: string;
    disposition: string;
    copiedId?: boolean;
  } | null>(null);
  const [saveCountdown, setSaveCountdown] = useState<number>(5);
  const [successBanner, setSuccessBanner] = useState<{
    returnEntryId: string;
    orderId: string;
    disposition: string;
  } | null>(null);

  // Auto-dismiss countdown for save intimation modal
  useEffect(() => {
    let timer: any = null;
    if (savedModalData) {
      if (saveCountdown > 0) {
        timer = setTimeout(() => {
          setSaveCountdown((prev) => prev - 1);
        }, 1000);
      } else {
        setSavedModalData(null);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [savedModalData, saveCountdown]);

  // Audio chime for warehouse operator save confirmation
  const playSaveChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      // Two-tone pleasant ascending chime (D5 -> A5)
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.12); // A5

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  };

  // Haptic feedback for mobile/handheld barcode scanner devices
  const triggerHaptic = () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch {}
  };

  // Fetch SKUs from live Google Sheet backend
  const handleFetchSkusFromSheet = async () => {
    setIsFetchingSkus(true);
    setSkuFetchMsg(null);
    try {
      const res = await StorageService.fetchSkuCatalogFromGas();
      if (res.success && res.skus && res.skus.length > 0) {
        setSkuFetchMsg({
          type: 'success',
          text: `✓ Successfully loaded ${res.count} SKUs from Google Sheet tab "${res.sheetNameFound || 'SKU_Master'}"!`
        });
        if (onUpdateSkuMaster) {
          onUpdateSkuMaster(res.skus);
        }
        if (!selectedMasterSku && res.skus.length > 0) {
          selectSkuItem(res.skus[0]);
        }
      } else {
        setSkuFetchMsg({
          type: 'error',
          text: res.message || 'Could not fetch SKUs. Use "Paste from Sheet" or check Web App URL in Database Hub.'
        });
      }
    } catch (e: any) {
      setSkuFetchMsg({
        type: 'error',
        text: e.message || 'Failed to connect. Check Web App URL.'
      });
    } finally {
      setIsFetchingSkus(false);
      setTimeout(() => setSkuFetchMsg(null), 6000);
    }
  };

  // Quick Paste import handler
  const handleImportPastedSkus = () => {
    if (!pasteRawText.trim()) {
      setPasteImportMsg('Please paste rows from your Google Sheet tab.');
      return;
    }
    const res = StorageService.importSkuMasterFromText(pasteRawText);
    if (res.success && res.skus) {
      if (onUpdateSkuMaster) {
        onUpdateSkuMaster(res.skus);
      }
      setPasteImportMsg(null);
      setIsPasteModalOpen(false);
      setPasteRawText('');
      setSkuFetchMsg({
        type: 'success',
        text: `✓ Imported ${res.count} SKUs from your Google Sheet table!`
      });
      if (res.skus.length > 0) {
        selectSkuItem(res.skus[0]);
      }
    } else {
      setPasteImportMsg(res.message);
    }
  };

  // Dedicated Delete Confirmation Modal State (replaces window.confirm)
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    returnEntryId: string;
    orderId: string;
    marketplace?: string;
    productName?: string;
    receiptDate?: string;
  } | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState<boolean>(false);

  // 6. Barcode Scanner Modal State
  const [scannerTargetField, setScannerTargetField] = useState<'sku' | 'order' | 'returnId' | 'awb' | null>(null);

  // Check for existing records or duplicates whenever Order ID changes (Request 3)
  useEffect(() => {
    const cleanOrder = orderId.trim();
    if (cleanOrder) {
      const allReturns = returns || StorageService.getReturns();
      const cleanUpper = cleanOrder.toUpperCase();
      const cleanAlpha = cleanUpper.replace(/[^A-Z0-9]/g, '');

      const existing = allReturns.find((r) => {
        const rUpper = r.originalOrderId.trim().toUpperCase();
        if (rUpper === cleanUpper) return true;
        if (cleanAlpha.length >= 4 && rUpper.replace(/[^A-Z0-9]/g, '') === cleanAlpha) return true;
        return false;
      });

      if (existing) {
        if (!editingReturnId || editingReturnId !== existing.returnEntryId) {
          setExistingRecordForOrder(existing);
          setDuplicateWarning({ isDuplicate: true, existingReturn: existing });
        } else {
          setExistingRecordForOrder(null);
          setDuplicateWarning(null);
        }
      } else {
        setExistingRecordForOrder(null);
        setDuplicateWarning(null);
      }
    } else {
      setExistingRecordForOrder(null);
      setDuplicateWarning(null);
    }
  }, [orderId, editingReturnId, returns]);

  // Load existing return record to modify (Request 3)
  const handleLoadExistingToModify = (rec: ReturnRecord) => {
    setEditingReturnId(rec.returnEntryId);
    setMarketplace(rec.marketplace);
    setReturnType(rec.returnType);
    setReceiptDate(rec.receiptDate);
    setOrderId(rec.originalOrderId);
    setReturnId(rec.marketplaceReturnId);
    setAwb(rec.awbTrackingNumber || '');
    setQuantity(rec.quantityReceived || 1);
    setMeasuredWeight(rec.measuredPackageWeightGrams !== undefined ? String(rec.measuredPackageWeightGrams) : '');
    setPackageCondition(rec.packageCondition);
    setItemCondition(rec.itemCondition);
    setDisposition(rec.dispositionDecision);
    setDamageNotes(rec.damageDetails || '');

    // Resolve matching SKU from master catalog
    const foundSku = skuMaster.find(
      (m) => m.skuCode.toUpperCase() === rec.masterSkuCode.toUpperCase()
    );
    if (foundSku) {
      selectSkuItem(foundSku, rec.scannedVariant);
    } else {
      const tempSku: SkuMasterItem = {
        skuCode: rec.masterSkuCode,
        skuName: rec.productNameSnapshot || rec.masterSkuCode,
        weightGrams: rec.expectedUnitWeightGrams,
        mfgFreightCost: rec.mfgFreightCost,
        variantsMapRaw: rec.scannedVariant,
        category: 'General',
        active: true,
        lastUpdatedAt: StorageService.formatNormalTimestamp()
      };
      selectSkuItem(tempSku, rec.scannedVariant);
    }

    setExistingRecordForOrder(null);
    setDuplicateWarning(null);
    setStatusToast({
      type: 'success',
      text: `Loaded return record "${rec.returnEntryId}" for Order "${rec.originalOrderId}". Modify any details below.`
    });
    setTimeout(() => setStatusToast(null), 6000);
  };

  // Open Delete Confirmation Modal (Prompting operator clearly without browser dialog blockage)
  const requestDeleteRecord = (
    targetReturnId: string,
    targetOrderId: string,
    extra?: { marketplace?: string; productName?: string; receiptDate?: string }
  ) => {
    setDeleteConfirmTarget({
      returnEntryId: targetReturnId,
      orderId: targetOrderId,
      marketplace: extra?.marketplace,
      productName: extra?.productName,
      receiptDate: extra?.receiptDate
    });
  };

  // Execute deletion when operator confirms in the popup modal
  const handleExecuteDelete = async () => {
    if (!deleteConfirmTarget) return;
    const { returnEntryId, orderId: targetOrdId } = deleteConfirmTarget;

    setIsDeletingRecord(true);
    try {
      // 1. Delete from local storage and await synchronization with Google Apps Script Web App
      const delResult = await StorageService.deleteReturnAsync(returnEntryId, operatorName, targetOrdId);

      // 2. Notify parent state so all queue tables and counters update immediately
      if (onDeleteReturn) {
        onDeleteReturn(returnEntryId);
      }

      // 3. Clear active form states
      handleFullReset();
      setEditingReturnId(null);
      setExistingRecordForOrder(null);
      setDuplicateWarning(null);

      // 4. Close the popup modal
      setDeleteConfirmTarget(null);

      // 5. Positive feedback toast with real Google Sheets status
      setStatusToast({
        type: delResult.success ? 'success' : 'error',
        text: delResult.message || (delResult.success
          ? `✓ Record "${returnEntryId}" for Order "${targetOrdId}" permanently deleted from Google Sheets.`
          : `Notice: Local record deleted, Google Sheets sync status: ${delResult.message}`)
      });
      setTimeout(() => setStatusToast(null), 6000);
    } catch (err: any) {
      setStatusToast({
        type: 'error',
        text: `Deletion notice: ${err?.message || 'Error communicating with Google Sheets.'}`
      });
      setTimeout(() => setStatusToast(null), 6000);
    } finally {
      setIsDeletingRecord(false);
    }
  };

  // Discard modification mode and reset form
  const handleDiscardModification = () => {
    handleFullReset();
    setEditingReturnId(null);
    setExistingRecordForOrder(null);
    setDuplicateWarning(null);
  };

  // Handle SKU input / search query
  const handleSkuSearch = (query: string) => {
    setSkuSearchQuery(query);
    const trimmed = query.trim().toUpperCase();

    if (!trimmed) {
      setIsDropdownOpen(false);
      return;
    }

    // Direct match against normalized variants map
    const matchedVariant = skuVariants.find((v) => v.variantCode.toUpperCase() === trimmed);
    if (matchedVariant) {
      const master = skuMaster.find((m) => m.skuCode === matchedVariant.masterSkuCode);
      if (master) {
        setSelectedMasterSku(master);
        setResolvedVariantCode(matchedVariant.variantCode);
        setIsDropdownOpen(false);
        return;
      }
    }

    // Direct match against master SKU code
    const directMaster = skuMaster.find((m) => m.skuCode.toUpperCase() === trimmed);
    if (directMaster) {
      setSelectedMasterSku(directMaster);
      setResolvedVariantCode(directMaster.skuCode);
      setIsDropdownOpen(false);
      return;
    }

    setIsDropdownOpen(true);
  };

  const selectSkuItem = (master: SkuMasterItem, aliasCode?: string) => {
    setSelectedMasterSku(master);
    setResolvedVariantCode(aliasCode || master.skuCode);
    setSkuSearchQuery(`${master.skuCode} — ${master.skuName}`);
    setIsDropdownOpen(false);
  };

  const handleClearSku = () => {
    setSelectedMasterSku(null);
    setResolvedVariantCode('');
    setSkuSearchQuery('');
    setIsDropdownOpen(false);
  };

  // Filtered dropdown results
  const filteredSkuOptions = skuMaster.filter((item) => {
    const q = skuSearchQuery.trim().toLowerCase();
    if (!q) return true;
    const matchCode = item.skuCode.toLowerCase().includes(q);
    const matchName = item.skuName.toLowerCase().includes(q);
    const matchCat = (item.category || '').toLowerCase().includes(q);
    const matchRawVariants = (item.variantsMapRaw || '').toLowerCase().includes(q);
    return matchCode || matchName || matchCat || matchRawVariants;
  });

  // Calculate weights
  const expectedUnitWeight = selectedMasterSku ? selectedMasterSku.weightGrams : 0;
  const expectedTotalWeight = expectedUnitWeight * (quantity || 1);
  const parsedMeasuredWeight = parseFloat(measuredWeight) || 0;
  const weightDiscrepancy = parsedMeasuredWeight > 0 ? parsedMeasuredWeight - expectedTotalWeight : 0;
  const hasWeightDiscrepancy =
    parsedMeasuredWeight > 0 &&
    expectedTotalWeight > 0 &&
    Math.abs(weightDiscrepancy) > expectedTotalWeight * 0.15; // 15% threshold

  // Inventory value snapshot
  const unitCost = selectedMasterSku ? selectedMasterSku.mfgFreightCost : 0;
  const totalInventoryCost = unitCost * (quantity || 1);

  // Quick 1-tap Condition selector handlers
  const handleItemConditionSelect = (cond: ItemCondition) => {
    setItemCondition(cond);
    if (cond === 'Sellable') {
      setDisposition('Restock to Active Inventory');
      setPackageCondition('Intact / Undamaged');
    } else {
      setDisposition('Claim Filing Required (SPF/T-Safe)');
      setPackageCondition('Torn / Opened Polybag');
    }
  };

  // Form submission handler (Handles both New and Modified returns)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If an existing record was found for this Order ID and user is NOT yet in modify mode, guide them
    if (existingRecordForOrder && !editingReturnId) {
      setStatusToast({
        type: 'error',
        text: `Order ID "${orderId.trim()}" is already logged under Return ID "${existingRecordForOrder.returnEntryId}". Please click "Fetch & Modify Record" or "Delete Record".`
      });
      return;
    }

    if (!selectedMasterSku) {
      setStatusToast({
        type: 'error',
        text: 'Please search, select, or scan a valid SKU code.'
      });
      setIsDropdownOpen(true);
      return;
    }

    if (!orderId.trim()) {
      setStatusToast({
        type: 'error',
        text: 'Order ID is required. Please scan or type it.'
      });
      return;
    }

    if (!returnId.trim()) {
      setStatusToast({
        type: 'error',
        text: 'Marketplace Return ID is required. Please scan or type it.'
      });
      return;
    }

    setIsSubmitting(true);

    const normalTimestamp = StorageService.formatNormalTimestamp(new Date());

    const isClaimEligible =
      itemCondition === 'Not Sellable' ||
      disposition === 'Claim Filing Required (SPF/T-Safe)' ||
      hasWeightDiscrepancy;

    let initialInspectionStatus: InspectionStatus = 'Received - Pending Inspection';
    if (disposition === 'Restock to Active Inventory' && itemCondition === 'Sellable') {
      initialInspectionStatus = 'Restock Approved';
    } else if (isClaimEligible) {
      initialInspectionStatus = 'Damaged / Write-off Review';
    }

    // Determine whether this submission is modifying an existing return entry
    const allReturns = StorageService.getReturns();
    const cleanOrderId = orderId.trim().toUpperCase();
    const matchedExisting = editingReturnId
      ? allReturns.find((r) => r.returnEntryId === editingReturnId)
      : (existingRecordForOrder || allReturns.find((r) => r.originalOrderId.trim().toUpperCase() === cleanOrderId));

    // CASE 1: MODIFYING & REPLACING AN EXISTING RETURN RECORD (No new line item added!)
    if (editingReturnId || matchedExisting) {
      const targetReturnId = editingReturnId || matchedExisting!.returnEntryId;
      const updatedRecord: ReturnRecord = {
        ...(matchedExisting || {}),
        returnEntryId: targetReturnId,
        createdAt: matchedExisting?.createdAt || normalTimestamp,
        createdBy: matchedExisting?.createdBy || operatorName || 'Warehouse Operator',
        lastUpdatedAt: normalTimestamp,
        marketplace,
        returnType,
        receiptDate,
        originalOrderId: orderId.trim(),
        marketplaceReturnId: returnId.trim(),
        awbTrackingNumber: awb.trim() || undefined,
        scannedVariant: resolvedVariantCode || skuSearchQuery,
        masterSkuCode: selectedMasterSku.skuCode,
        productNameSnapshot: selectedMasterSku.skuName,
        quantityReceived: quantity || 1,
        expectedUnitWeightGrams: expectedUnitWeight,
        expectedTotalWeightGrams: expectedTotalWeight,
        measuredPackageWeightGrams: parsedMeasuredWeight > 0 ? parsedMeasuredWeight : undefined,
        weightDiscrepancy: parsedMeasuredWeight > 0 ? weightDiscrepancy : undefined,
        mfgFreightCost: unitCost,
        totalInventoryValue: totalInventoryCost,
        packageCondition,
        itemCondition,
        inspectionStatus: initialInspectionStatus,
        dispositionDecision: disposition,
        damageDetails: damageNotes.trim() || undefined,
        warehouseNotes: `Updated return. Condition: ${itemCondition}, Disposition: ${disposition}`,
        financialReviewStatus: itemCondition === 'Sellable' ? 'Approved' : 'Pending Review',
        claimEligible: isClaimEligible,
        duplicateCheckKey: `${marketplace}-${orderId.trim()}-${selectedMasterSku.skuCode}-${returnType}`.toUpperCase()
      };

      // 1. Update in LocalStorage: replaces existing line item, never unshifts a new one
      StorageService.updateReturnRecord(updatedRecord, operatorName);

      // 2. Update in React parent state: replaces existing item in returns array
      if (onUpdateReturn) {
        onUpdateReturn(updatedRecord);
      }

      // 3. Sync to Google Sheets database as in-place row update (replaces existing line item)
      await StorageService.syncReturnToGas(updatedRecord, true);

      playSaveChime();
      triggerHaptic();

      setSavedModalData({
        returnEntryId: targetReturnId,
        originalOrderId: orderId.trim(),
        marketplace,
        productName: selectedMasterSku.skuName,
        quantity: quantity || 1,
        itemCondition,
        disposition
      });
      setSaveCountdown(5);

      setSuccessBanner({
        returnEntryId: targetReturnId,
        orderId: orderId.trim(),
        disposition
      });

      handleFullReset();
      setEditingReturnId(null);
      setExistingRecordForOrder(null);
      setDuplicateWarning(null);
      setIsSubmitting(false);
      return;
    }

    // CASE 2: SAVING A BRAND NEW RETURN ENTRY
    const generatedReturnId = StorageService.generateReturnId();

    const newRecord: ReturnRecord = {
      returnEntryId: generatedReturnId,
      createdAt: normalTimestamp,
      createdBy: operatorName || 'Warehouse Operator',
      lastUpdatedAt: normalTimestamp,
      marketplace,
      returnType,
      receiptDate,
      originalOrderId: orderId.trim(),
      marketplaceReturnId: returnId.trim(),
      awbTrackingNumber: awb.trim() || undefined,
      scannedVariant: resolvedVariantCode || skuSearchQuery,
      masterSkuCode: selectedMasterSku.skuCode,
      productNameSnapshot: selectedMasterSku.skuName,
      quantityReceived: quantity || 1,
      expectedUnitWeightGrams: expectedUnitWeight,
      expectedTotalWeightGrams: expectedTotalWeight,
      measuredPackageWeightGrams: parsedMeasuredWeight > 0 ? parsedMeasuredWeight : undefined,
      weightDiscrepancy: parsedMeasuredWeight > 0 ? weightDiscrepancy : undefined,
      mfgFreightCost: unitCost,
      totalInventoryValue: totalInventoryCost,
      packageCondition,
      itemCondition,
      inspectionStatus: initialInspectionStatus,
      dispositionDecision: disposition,
      damageDetails: damageNotes.trim() || undefined,
      warehouseNotes: `Received at station. Condition: ${itemCondition}, Disposition: ${disposition}`,
      financialReviewStatus: itemCondition === 'Sellable' ? 'Approved' : 'Pending Review',
      claimEligible: isClaimEligible,
      duplicateCheckKey: `${marketplace}-${orderId.trim()}-${selectedMasterSku.skuCode}-${returnType}`.toUpperCase()
    };

    // Save to LocalStorage
    const currentReturns = StorageService.getReturns();
    currentReturns.unshift(newRecord);
    StorageService.saveReturns(currentReturns);
    StorageService.logAudit(
      operatorName,
      'CREATE_RETURN',
      'Return_Log',
      generatedReturnId,
      `Marketplace: ${marketplace}, Order: ${orderId}, Item Condition: ${itemCondition}`
    );

    // Sync to Google Sheet "Warehouse Returns Master & P&L Ledger" via Apps Script Web App
    StorageService.syncReturnToGas(newRecord);

    onReturnSaved(newRecord);
    playSaveChime();
    triggerHaptic();

    // TRIGGER PROMINENT SAVE INTIMATION MODAL & BANNER
    setSavedModalData({
      returnEntryId: generatedReturnId,
      originalOrderId: orderId.trim(),
      marketplace,
      productName: selectedMasterSku.skuName,
      quantity: quantity || 1,
      itemCondition,
      disposition
    });
    setSaveCountdown(5);

    setSuccessBanner({
      returnEntryId: generatedReturnId,
      orderId: orderId.trim(),
      disposition
    });

    // Reset scan fields for the next return entry
    setOrderId('');
    setReturnId('');
    setAwb('');
    setMeasuredWeight('');
    setDamageNotes('');
    setDuplicateWarning(null);
    setExistingRecordForOrder(null);
    setIsSubmitting(false);
  };

  const handleNextReturn = () => {
    setSavedModalData(null);
    // Focus back on Order ID field
    const el = document.getElementById('orderIdInput');
    if (el) el.focus();
  };

  const handleFullReset = () => {
    setOrderId('');
    setReturnId('');
    setAwb('');
    setSkuSearchQuery('');
    setSelectedMasterSku(null);
    setResolvedVariantCode('');
    setQuantity(1);
    setMeasuredWeight('');
    setDamageNotes('');
    setPackageCondition('Intact / Undamaged');
    setItemCondition('Sellable');
    setDisposition('Restock to Active Inventory');
    setDuplicateWarning(null);
    setSuccessBanner(null);
  };

  const handleScannerDetected = (code: string) => {
    if (scannerTargetField === 'sku') {
      handleSkuSearch(code);
    } else if (scannerTargetField === 'order') {
      setOrderId(code);
    } else if (scannerTargetField === 'returnId') {
      setReturnId(code);
    } else if (scannerTargetField === 'awb') {
      setAwb(code);
    }
    setScannerTargetField(null);
  };

  return (
    <div className="space-y-5 relative">
      {/* ============================================================ */}
      {/* 0. DEDICATED IN-APP DELETE CONFIRMATION MODAL */}
      {/* ============================================================ */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border text-center transition-all ${
              isLight
                ? 'bg-white border-rose-300 text-slate-800 shadow-rose-500/10'
                : 'bg-slate-900 border-rose-900/60 text-white shadow-black/60'
            }`}
          >
            {/* Warning Trash Icon */}
            <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-rose-600 dark:text-rose-400">
              Delete Return Record?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Are you sure you want to delete this record from <strong className="text-slate-800 dark:text-slate-100">&ldquo;Warehouse Returns Master &amp; P&amp;L Ledger&rdquo;</strong>?
            </p>

            {/* Target Record Details Summary */}
            <div
              className={`my-4 p-4 rounded-2xl text-left text-xs space-y-2 border ${
                isLight ? 'bg-rose-50/70 border-rose-200/80 text-slate-800' : 'bg-rose-950/30 border-rose-900/50 text-rose-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Return Entry ID:</span>
                <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400">
                  {deleteConfirmTarget.returnEntryId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Order ID:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {deleteConfirmTarget.orderId}
                </span>
              </div>
              {deleteConfirmTarget.productName && (
                <div className="flex items-center justify-between pt-1 border-t border-rose-200 dark:border-rose-900/50">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Product:</span>
                  <span className="text-[11px] font-semibold truncate max-w-[210px] text-right">
                    {deleteConfirmTarget.productName}
                  </span>
                </div>
              )}
              {deleteConfirmTarget.receiptDate && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-bold uppercase">Receipt Date:</span>
                  <span>{deleteConfirmTarget.receiptDate}</span>
                </div>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-900 dark:text-amber-300 mb-5 text-left flex items-start gap-2">
              <span className="shrink-0 mt-0.5">ℹ️</span>
              <span>
                The line item will be deleted from the database and blank rows will be removed automatically so no gaps remain.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={handleExecuteDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingRecord ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting from Database...</span>
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

      {/* ============================================================ */}
      {/* 1. PROMINENT SAVE INTIMATION MODAL (IMMEDIATE OPERATOR CONFIRMATION) */}
      {/* ============================================================ */}
      {savedModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border text-center transition-all scale-100 ${
              isLight
                ? 'bg-white border-emerald-500/40 text-slate-800'
                : 'bg-slate-900 border-emerald-500/50 text-white'
            }`}
          >
            {/* Animated Celebration Icon */}
            <div className="relative mx-auto w-16 h-16 mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/25 animate-ping opacity-75" />
              <div className="relative w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
            </div>

            {/* Title & Intimation */}
            <h3 className="text-xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
              RETURN RECORDED &amp; SAVED!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Synchronized to <strong className="text-slate-700 dark:text-slate-200">"Warehouse Returns Master &amp; P&amp;L Ledger"</strong>
            </p>

            {/* Generated Return Entry ID */}
            <div className="mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2">
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">
                  Generated Return Entry ID:
                </span>
                <span className="font-mono font-extrabold text-base text-emerald-800 dark:text-emerald-200">
                  {savedModalData.returnEntryId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(savedModalData.returnEntryId);
                  setSavedModalData({ ...savedModalData, copiedId: true });
                  setTimeout(() => setSavedModalData((prev) => (prev ? { ...prev, copiedId: false } : null)), 2000);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
              >
                {savedModalData.copiedId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{savedModalData.copiedId ? 'Copied' : 'Copy ID'}</span>
              </button>
            </div>

            {/* Return Details Summary */}
            <div
              className={`mt-4 p-4 rounded-2xl text-left text-xs space-y-2 border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Marketplace &amp; Order:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  <span className="font-bold text-amber-600 dark:text-amber-400">{savedModalData.marketplace}</span> • Order {savedModalData.originalOrderId}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 shrink-0">Product:</span>
                <span className="font-medium text-right text-slate-700 dark:text-slate-300 line-clamp-1">
                  {savedModalData.productName}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Physical Condition:</span>
                <span
                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                    savedModalData.itemCondition === 'Sellable'
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {savedModalData.itemCondition}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Disposition:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {savedModalData.disposition}
                </span>
              </div>
            </div>

            {/* Countdown progress bar */}
            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Ready for next package</span>
              <span>Auto-advancing in {saveCountdown}s...</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-emerald-500 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${(saveCountdown / 5) * 100}%` }}
              />
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleNextReturn}
                className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/20 text-sm flex items-center justify-center gap-2 transition"
              >
                <Check className="w-4 h-4" />
                <span>Record Next Return (Ready)</span>
              </button>
              {onViewReturnsLog && (
                <button
                  type="button"
                  onClick={() => {
                    setSavedModalData(null);
                    onViewReturnsLog();
                  }}
                  className={`w-full sm:w-auto py-3 px-4 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    isLight
                      ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>View Returns Ledger</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. PERSISTENT TOP INTIMATION BANNER FOR LAST SAVED RETURN */}
      {/* ============================================================ */}
      {successBanner && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <span>Last Return Successfully Logged to Database</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/20 font-bold">
                  {successBanner.returnEntryId}
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Order ID: <strong className="font-mono">{successBanner.orderId}</strong> • Action: <strong>{successBanner.disposition}</strong>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Status feedback toast */}
      {statusToast && (
        <div
          className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold border animate-in fade-in duration-200 ${
            statusToast.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{statusToast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusToast(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* CASE A: ACTIVE MODIFICATION MODE (Request 3: modifying existing record) */}
      {editingReturnId && (
        <div className="p-4 bg-amber-500/15 border-2 border-amber-500/60 rounded-2xl text-amber-950 dark:text-amber-100 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold flex items-center gap-2 flex-wrap">
                <span className="text-amber-900 dark:text-amber-200">✏️ MODIFICATION MODE:</span>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-amber-500/25 font-bold border border-amber-500/40">
                  {editingReturnId}
                </span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  (Order: <strong className="font-mono">{orderId}</strong>)
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                You are currently modifying this existing return entry. You can edit any details below and click &ldquo;Update Return Record&rdquo;, or delete it if wrongly entered.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => requestDeleteRecord(editingReturnId, orderId)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="Delete this record if wrongly entered"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Record</span>
            </button>
            <button
              type="button"
              onClick={handleDiscardModification}
              className="px-3.5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Discard / New</span>
            </button>
          </div>
        </div>
      )}

      {/* CASE B: EXISTING RECORD FOUND PROMPT (Request 3: fetch existing record to modify or delete) */}
      {!editingReturnId && existingRecordForOrder && (
        <div className="p-4 bg-amber-500/15 border-2 border-amber-500/60 rounded-2xl text-amber-950 dark:text-amber-100 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-0.5">
              <div className="font-extrabold flex items-center gap-2 flex-wrap text-amber-900 dark:text-amber-200">
                <span>⚠️ Existing Return Record Found for Order ID:</span>
                <span className="font-mono font-bold underline">{existingRecordForOrder.originalOrderId}</span>
                <span className="text-[11px] font-mono bg-amber-500/25 px-2 py-0.5 rounded font-bold border border-amber-500/40">
                  {existingRecordForOrder.returnEntryId}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Already received on <strong>{existingRecordForOrder.receiptDate}</strong> for{' '}
                <strong>{existingRecordForOrder.marketplace}</strong> (Product:{' '}
                <span className="font-semibold">{existingRecordForOrder.productNameSnapshot || existingRecordForOrder.masterSkuCode}</span>).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => handleLoadExistingToModify(existingRecordForOrder)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Fetch &amp; Modify Record</span>
            </button>
            <button
              type="button"
              onClick={() =>
                requestDeleteRecord(existingRecordForOrder.returnEntryId, existingRecordForOrder.originalOrderId, {
                  marketplace: existingRecordForOrder.marketplace,
                  productName: existingRecordForOrder.productNameSnapshot || existingRecordForOrder.masterSkuCode,
                  receiptDate: existingRecordForOrder.receiptDate
                })
              }
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Record</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Entry Card */}
      <div
        className={`rounded-3xl p-5 sm:p-7 shadow-xl border transition-colors ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-900/90 border-slate-800 text-slate-100'
        }`}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: MARKETPLACE & TYPE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                <span>1. Marketplace &amp; Return Type</span>
              </span>
              <span className="text-[11px] text-pink-600 dark:text-pink-400 font-semibold">
                Meesho selected by default (high volume)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Marketplace Selector Buttons */}
              <div
                className={`sm:col-span-2 flex items-center gap-1.5 p-1 rounded-2xl border ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}
              >
                {(['Meesho', 'Amazon', 'Flipkart', 'Other'] as Marketplace[]).map((mkt) => {
                  const isSelected = marketplace === mkt;
                  return (
                    <button
                      key={mkt}
                      type="button"
                      onClick={() => setMarketplace(mkt)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? mkt === 'Meesho'
                            ? 'bg-pink-600 text-white shadow-md'
                            : mkt === 'Amazon'
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : mkt === 'Flipkart'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-slate-700 text-white shadow-md'
                          : isLight
                          ? 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                      }`}
                    >
                      <span>{mkt}</span>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>

              {/* Return Type Toggle */}
              <div
                className={`flex items-center gap-1 p-1 rounded-2xl border ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}
              >
                {(['Customer Return', 'Courier Return (RTO)'] as ReturnType[]).map((type) => {
                  const isSelected = returnType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setReturnType(type)}
                      className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                        isSelected
                          ? isLight
                            ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                            : 'bg-slate-800 text-white shadow-xs'
                          : isLight
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{type === 'Customer Return' ? 'Customer' : 'RTO'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 2: IDENTIFICATION (ORDER ID, RETURN ID, AWB) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Scan className="w-3.5 h-3.5 text-amber-500" />
                <span>2. Scan Barcodes (Mobile Camera or Handheld Gun)</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Current Date: <strong className="text-slate-700 dark:text-slate-200">{receiptDate}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Order ID */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                  Order ID <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    id="orderIdInput"
                    type="text"
                    required
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="e.g. 402-1928312-991283"
                    className={`w-full rounded-xl pl-3.5 pr-24 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                        : 'bg-slate-950 border-slate-700 text-white placeholder-slate-600'
                    }`}
                  />
                  {/* Dedicated Camera Scan Button */}
                  <button
                    type="button"
                    onClick={() => setScannerTargetField('order')}
                    title="Scan Order ID Barcode using Mobile Camera or Gun"
                    className="absolute right-1.5 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan</span>
                  </button>
                </div>

                {/* Inline helpers for Existing Record or Active Editing (Request 3) */}
                {existingRecordForOrder && !editingReturnId && (
                  <div className="mt-2 p-2 bg-amber-500/15 border border-amber-500/40 rounded-xl text-xs flex items-center justify-between gap-1.5 animate-in fade-in">
                    <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-200 truncate">
                      Found in records: <strong className="font-mono">{existingRecordForOrder.returnEntryId}</strong>
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoadExistingToModify(existingRecordForOrder)}
                        className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] transition cursor-pointer"
                        title="Load this record to edit"
                      >
                        Modify
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          requestDeleteRecord(existingRecordForOrder.returnEntryId, existingRecordForOrder.originalOrderId, {
                            marketplace: existingRecordForOrder.marketplace,
                            productName: existingRecordForOrder.productNameSnapshot || existingRecordForOrder.masterSkuCode,
                            receiptDate: existingRecordForOrder.receiptDate
                          })
                        }
                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-[10px] transition cursor-pointer"
                        title="Delete this record from database"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {editingReturnId && (
                  <div className="mt-2 p-1.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-xs flex items-center justify-between gap-1 animate-in fade-in">
                    <span className="text-emerald-800 dark:text-emerald-300 font-semibold text-[11px] flex items-center gap-1">
                      <Edit3 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>Editing: {editingReturnId}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => requestDeleteRecord(editingReturnId, orderId)}
                      className="text-rose-600 dark:text-rose-400 hover:underline font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                      title="Delete this record from database"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Marketplace Return ID */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                  Marketplace Return ID <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={returnId}
                    onChange={(e) => setReturnId(e.target.value)}
                    placeholder="e.g. RET-MSH-99214"
                    className={`w-full rounded-xl pl-3.5 pr-24 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                        : 'bg-slate-950 border-slate-700 text-white placeholder-slate-600'
                    }`}
                  />
                  {/* Dedicated Camera Scan Button */}
                  <button
                    type="button"
                    onClick={() => setScannerTargetField('returnId')}
                    title="Scan Return ID Barcode using Mobile Camera or Gun"
                    className="absolute right-1.5 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan</span>
                  </button>
                </div>
              </div>

              {/* AWB / Tracking (Optional) */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                  AWB / Tracking Number (Optional)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={awb}
                    onChange={(e) => setAwb(e.target.value)}
                    placeholder="Courier AWB (optional)"
                    className={`w-full rounded-xl pl-3.5 pr-20 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                        : 'bg-slate-950 border-slate-700 text-white placeholder-slate-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setScannerTargetField('awb')}
                    title="Scan AWB Barcode"
                    className="absolute right-1.5 px-2 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-xs flex items-center gap-1 transition"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Scan</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION 3: PRODUCT SKU AUTO-LOOKUP WITH DROPDOWN OPTION */}
          {/* ============================================================ */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
            }`}
          >
            {/* Header with live sync & action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>3. Product SKU Auto-Lookup &amp; Dropdown ({skuMaster.length} SKUs in Catalog)</span>
              </span>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Live Sheet Fetch Button */}
                <button
                  type="button"
                  onClick={handleFetchSkusFromSheet}
                  disabled={isFetchingSkus}
                  title="Fetch SKUs directly from second tab of 'Warehouse Returns Master & P&L Ledger'"
                  className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingSkus ? 'animate-spin' : ''}`} />
                  <span>{isFetchingSkus ? 'Fetching...' : 'Fetch from Sheet'}</span>
                </button>

                {/* 1-Click Paste from Google Sheet Button */}
                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(true)}
                  title="Quickly copy-paste rows from your Google Sheet tab"
                  className="px-2.5 py-1 bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Paste from Sheet</span>
                </button>

                {/* Barcode Camera Scan Button */}
                <button
                  type="button"
                  onClick={() => setScannerTargetField('sku')}
                  className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan Barcode</span>
                </button>
              </div>
            </div>

            {/* SKU Fetch Toast Message */}
            {skuFetchMsg && (
              <div
                className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                  skuFetchMsg.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}
              >
                {skuFetchMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{skuFetchMsg.text}</span>
              </div>
            )}

            {/* Combobox Search & Dropdown Selection Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
              {/* Dropdown & Search Input */}
              <div className="relative">
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200 flex items-center justify-between">
                  <span>Product Search (SKU Code + SKU Name):</span>
                  <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">{filteredSkuOptions.length} available</span>
                </label>

                <div className="relative flex items-center">
                  <div className="absolute left-3 text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={skuSearchQuery}
                    onChange={(e) => handleSkuSearch(e.target.value)}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Search by SKU Name or Code (e.g. Spice Rack, Bottle, TBM-KTC)..."
                    className={`w-full rounded-xl pl-9 pr-20 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 border transition ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                        : 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                    }`}
                  />

                  {/* Dropdown toggle button & clear button */}
                  <div className="absolute right-1.5 flex items-center gap-1">
                    {selectedMasterSku && (
                      <button
                        type="button"
                        onClick={handleClearSku}
                        title="Clear selection"
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      title="Open full SKU catalog dropdown"
                      className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition shadow-xs"
                    >
                      <span>Select</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* THE DROPDOWN LIST */}
                {isDropdownOpen && (
                  <div
                    className={`absolute left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-2xl shadow-2xl z-40 divide-y border ${
                      isLight
                        ? 'bg-white border-slate-300 divide-slate-100'
                        : 'bg-slate-900 border-slate-700 divide-slate-800'
                    }`}
                  >
                    <div
                      className={`p-2.5 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between border-b ${
                        isLight ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-slate-950 text-slate-300 border-slate-800'
                      }`}
                    >
                      <span>Select Product (SKU Code + SKU Name) ({filteredSkuOptions.length})</span>
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(false)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {filteredSkuOptions.length > 0 ? (
                      filteredSkuOptions.map((item) => {
                        const isCurrent = selectedMasterSku?.skuCode === item.skuCode;
                        return (
                          <div
                            key={item.skuCode}
                            onClick={() => selectSkuItem(item)}
                            className={`p-3 cursor-pointer text-xs space-y-1.5 transition ${
                              isCurrent
                                ? isLight
                                  ? 'bg-amber-100/70 border-l-4 border-amber-500'
                                  : 'bg-amber-500/20 border-l-4 border-amber-400'
                                : isLight
                                ? 'hover:bg-amber-50/70'
                                : 'hover:bg-slate-800'
                            }`}
                          >
                            {/* SKU Code & SKU Name SIDE BY SIDE */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-xs px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 shrink-0">
                                  {item.skuCode}
                                </span>
                                <span className={`font-semibold text-xs truncate ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                                  {item.skuName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                                  {item.weightGrams} g
                                </span>
                                <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                  ₹ {item.mfgFreightCost}
                                </span>
                              </div>
                            </div>
                            {item.variantsMapRaw && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 line-clamp-1">
                                <span className="font-medium">Marketplace Aliases:</span>
                                <span className="font-mono">{item.variantsMapRaw.replace(/\r?\n/g, ', ')}</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-xs text-center space-y-2">
                        <div className="text-rose-500 font-semibold">
                          No SKU matching "{skuSearchQuery}".
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                          Check your spelling or click "Fetch from Sheet" / "Paste from Sheet" to load all SKUs from your Google Sheet.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Resolved Master SKU Display & Quick Change (SKU Code + SKU Name side-by-side) */}
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">
                  Selected Product (SKU Code + SKU Name):
                </label>
                <div className="relative flex items-center">
                  <div
                    className={`w-full rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium border flex items-center justify-between gap-2 transition min-h-[42px] ${
                      selectedMasterSku
                        ? isLight
                          ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                          : 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                        : isLight
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {selectedMasterSku ? (
                      <div className="flex items-center gap-2 min-w-0 pr-16">
                        <span className="font-mono font-extrabold text-amber-700 dark:text-amber-400 text-xs px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 shrink-0">
                          {selectedMasterSku.skuCode}
                        </span>
                        <span className={`font-semibold text-xs truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                          {selectedMasterSku.skuName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">Waiting for SKU selection...</span>
                    )}
                  </div>
                  {selectedMasterSku && (
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(true)}
                      className="absolute right-2 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      Change
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Auto-populated details snapshot (HIGH CONTRAST DARK MODE) */}
            <div
              className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border ${
                isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Canonical Product Name:
                </span>
                <span className={`text-xs font-bold block mt-0.5 line-clamp-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  {selectedMasterSku ? selectedMasterSku.skuName : '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Expected Unit Weight:
                </span>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 block mt-0.5">
                  {selectedMasterSku ? `${selectedMasterSku.weightGrams} g` : '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Mfg + Freight Cost:
                </span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                  {selectedMasterSku ? `₹ ${selectedMasterSku.mfgFreightCost}` : '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Expected Total Weight:
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 block mt-0.5">
                  {selectedMasterSku ? `${expectedTotalWeight} g` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 4: QUANTITY & WEIGHT DISCREPANCY */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                Quantity Received (Default: 1)
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className={`w-full rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900'
                    : 'bg-slate-950 border-slate-700 text-white'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Measured Weight (g) (Optional)</span>
                <Scale className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <input
                type="number"
                step="any"
                value={measuredWeight}
                onChange={(e) => setMeasuredWeight(e.target.value)}
                placeholder="Scale reading in grams..."
                className={`w-full rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    : 'bg-slate-950 border-slate-700 text-white placeholder-slate-600'
                }`}
              />
            </div>

            <div className="flex flex-col justify-end">
              {hasWeightDiscrepancy ? (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>
                    Discrepancy: {weightDiscrepancy > 0 ? `+${weightDiscrepancy}` : weightDiscrepancy} g (&gt;15%). Flagged for SPF claim review.
                  </span>
                </div>
              ) : (
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <Scale className="w-4 h-4 shrink-0 text-slate-400" />
                  <span>Threshold: 15% difference from master SKU weight</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5: WAREHOUSE PHYSICAL INSPECTION (MINIMAL 1-TAP OPTIONS ONLY) */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>4. Warehouse Physical Inspection (Fast 1-Tap Decisions)</span>
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Minimal Input Mode
              </span>
            </div>

            {/* A. Package Condition: ONLY 2 OPTIONS */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                Package Condition (Choose 1):
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['Intact / Undamaged', 'Torn / Opened Polybag'] as PackageCondition[]).map((pkg) => {
                  const isSelected = packageCondition === pkg;
                  return (
                    <button
                      key={pkg}
                      type="button"
                      onClick={() => setPackageCondition(pkg)}
                      className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between gap-2 ${
                        isSelected
                          ? isLight
                            ? pkg === 'Intact / Undamaged'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                              : 'bg-rose-50 border-rose-500 text-rose-900 shadow-xs'
                            : pkg === 'Intact / Undamaged'
                            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow'
                            : 'bg-rose-950/60 border-rose-500 text-rose-300 shadow'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{pkg}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0 text-current" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* B. Item Condition: ONLY 2 OPTIONS (Sellable vs Not Sellable) */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                Item Condition (Choose 1):
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['Sellable', 'Not Sellable'] as ItemCondition[]).map((cond) => {
                  const isSelected = itemCondition === cond;
                  return (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => handleItemConditionSelect(cond)}
                      className={`p-3.5 rounded-xl border text-xs font-extrabold transition flex items-center justify-between gap-2 ${
                        isSelected
                          ? cond === 'Sellable'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-[1.01]'
                            : 'bg-rose-600 text-white border-rose-600 shadow-md scale-[1.01]'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {cond === 'Sellable' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        <span className="text-sm">{cond}</span>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] uppercase tracking-wider bg-white/25 px-1.5 py-0.5 rounded">
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* C. Disposition Decision: ONLY 3 OPTIONS */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                Disposition Decision (Choose 1):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  'Restock to Active Inventory',
                  'Claim Filing Required (SPF/T-Safe)',
                  'Scrapped / Written Off'
                ] as Disposition[]).map((disp) => {
                  const isSelected = disposition === disp;
                  return (
                    <button
                      key={disp}
                      type="button"
                      onClick={() => setDisposition(disp)}
                      className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between gap-2 text-left ${
                        isSelected
                          ? isLight
                            ? 'bg-amber-100 border-amber-500 text-amber-950 shadow-xs'
                            : 'bg-amber-500/20 border-amber-400 text-amber-300 shadow'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{disp}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Damage Note */}
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                Damage Notes / Remarks (Optional)
              </label>
              <input
                type="text"
                value={damageNotes}
                onChange={(e) => setDamageNotes(e.target.value)}
                placeholder="Optional remark: e.g. Customer fraud, missing accessory, courier crushed carton..."
                className={`w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    : 'bg-slate-950 border-slate-700 text-white placeholder-slate-600'
                }`}
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleFullReset}
              className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
            >
              Clear Form
            </button>

            {editingReturnId ? (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleDiscardModification}
                  className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedMasterSku}
                  className="px-8 py-3.5 font-extrabold rounded-xl shadow-lg text-sm transition-all flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-500/20 active:scale-95"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Updating Record...' : `Update Return Record (${editingReturnId})`}</span>
                </button>
              </div>
            ) : existingRecordForOrder ? (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    requestDeleteRecord(existingRecordForOrder.returnEntryId, existingRecordForOrder.originalOrderId, {
                      marketplace: existingRecordForOrder.marketplace,
                      productName: existingRecordForOrder.productNameSnapshot || existingRecordForOrder.masterSkuCode,
                      receiptDate: existingRecordForOrder.receiptDate
                    })
                  }
                  className="px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Record</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadExistingToModify(existingRecordForOrder)}
                  className="px-6 py-3.5 font-extrabold rounded-xl shadow-lg text-sm transition-all flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 active:scale-95"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Fetch &amp; Modify Record</span>
                </button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || !selectedMasterSku}
                className="px-8 py-3.5 font-extrabold rounded-xl shadow-lg text-sm transition-all flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 shadow-amber-500/20 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving to Database...' : 'Save Return Record'}</span>
              </button>
            )}
          </div>

          {/* Quick Database & Authorization Info Bar */}
          {onViewAuthorization && (
            <div className={`mt-5 pt-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs ${
              isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>
                  Connected to: <strong className="text-slate-800 dark:text-slate-200">&ldquo;Warehouse Returns Master &amp; P&amp;L Ledger&rdquo;</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={onViewAuthorization}
                className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer transition"
              >
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span>🔑 View Database Authorization Mechanism &amp; Links →</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* ============================================================ */}
      {/* 3. QUICK 1-CLICK PASTE MODAL FROM GOOGLE SHEET TAB */}
      {/* ============================================================ */}
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
                <h3 className="font-extrabold text-base">Quick Import SKUs from Google Sheet</h3>
              </div>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
              Open your Google Sheet <strong className="text-amber-600 dark:text-amber-400">"Warehouse Returns Master &amp; P&amp;L Ledger"</strong>, go to the second tab (<strong className="font-mono">Sheet2 (2)</strong> or <strong className="font-mono">SKU_Master</strong>), select the rows (<kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Ctrl+A</kbd>), copy (<kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Ctrl+C</kbd>), and paste below:
            </p>

            <textarea
              rows={8}
              value={pasteRawText}
              onChange={(e) => setPasteRawText(e.target.value)}
              placeholder="Paste copied cells from Google Sheet here...
SKU Code	SKU Name	Weight (grams)	Mfg + Frieght	SKU Variants Map
TBM-KTC-001	TABBYMART 4-Tier Rotating Kitchen Spice Rack Carousel 16 Jars	850	420	MSH-KTC-991
TBM-KTC-002	TABBYMART Stainless Steel Dish Drying Rack Over Sink	1200	650	AMZ-DSH-001..."
              className={`w-full rounded-2xl p-3.5 text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-100'
              }`}
            />

            {pasteImportMsg && (
              <div className="mt-2 text-xs font-semibold text-rose-500">
                {pasteImportMsg}
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
                onClick={handleImportPastedSkus}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow"
              >
                <Check className="w-4 h-4" />
                <span>Import &amp; Update Catalog</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner & Mobile Camera Modal */}
      <BarcodeScannerModal
        isOpen={scannerTargetField !== null}
        onClose={() => setScannerTargetField(null)}
        onDetected={handleScannerDetected}
        theme={theme}
        targetType={scannerTargetField || 'order'}
        title={
          scannerTargetField === 'order'
            ? 'Scan Order ID (Mobile Camera or USB Scanner)'
            : scannerTargetField === 'returnId'
            ? 'Scan Marketplace Return ID'
            : scannerTargetField === 'sku'
            ? 'Scan Product SKU / Barcode'
            : 'Scan Courier AWB'
        }
      />
    </div>
  );
};
