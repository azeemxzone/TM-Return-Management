import { SkuMasterItem, SkuVariant, ReturnRecord, ClaimRecord } from '../types';

export const INITIAL_SKU_MASTER: SkuMasterItem[] = [
  {
    skuCode: 'TBM-KTC-001',
    skuName: 'TABBYMART 4-Tier Rotating Kitchen Spice Rack Carousel 16 Jars',
    weightGrams: 850,
    mfgFreightCost: 420,
    variantsMapRaw: 'B09X4R1234\nFSN-SPICE-RACK-01\nMSH-KTC-991\n890432109801\nTBM-KTC-001-BLK',
    category: 'Kitchen & Dining',
    active: true,
    lastUpdatedAt: '10/10/2026, 09:30:00 AM',
    notes: 'Primary Amazon & Meesho high-runner. Check for glass jar integrity.'
  },
  {
    skuCode: 'TBM-BOT-002',
    skuName: 'TABBYMART Stainless Steel Insulated Vacuum Flask Water Bottle 1000ml',
    weightGrams: 420,
    mfgFreightCost: 280,
    variantsMapRaw: 'B08Y123456\nFSN-BTL-1L-BLK\nMSH-BOT-100\n890432109802\nTBM-BOT-MATTE-BLACK',
    category: 'Home & Kitchen',
    active: true,
    lastUpdatedAt: '12/10/2026, 02:15:00 PM',
    notes: 'Check inner vacuum seal and rubber ring inside cap.'
  },
  {
    skuCode: 'TBM-ORG-003',
    skuName: 'TABBYMART Foldable Wardrobe Clothes Storage Organizers (Pack of 3)',
    weightGrams: 950,
    mfgFreightCost: 510,
    variantsMapRaw: 'B07Z987654\nFSN-STOR-BOX-3P\nMSH-CLOSET-3\n890432109803\nTBM-ORG-GREY-3PK',
    category: 'Storage & Organization',
    active: true,
    lastUpdatedAt: '14/10/2026, 11:00:00 AM',
    notes: 'Common RTO item on Meesho due to size misperception.'
  },
  {
    skuCode: 'TBM-CLN-004',
    skuName: 'TABBYMART Ultra-Absorbent Lint-Free Microfiber Cleaning Cloths (Pack of 12)',
    weightGrams: 360,
    mfgFreightCost: 190,
    variantsMapRaw: 'B06W543210\nFSN-MCR-CLTH-12\nMSH-CLN-12PK\n890432109804\nTBM-CLN-MULTI-12',
    category: 'Home Essentials',
    active: true,
    lastUpdatedAt: '08/10/2026, 08:00:00 AM',
    notes: 'Low weight variance. Check packet count.'
  },
  {
    skuCode: 'TBM-LAP-005',
    skuName: 'TABBYMART Ergonomic Foldable Aluminum Laptop Riser Stand with Velvet Pouch',
    weightGrams: 310,
    mfgFreightCost: 340,
    variantsMapRaw: 'B05V998877\nFSN-LAP-STD-ALU\nMSH-LAP-01\n890432109805\nTBM-LAP-SLV-01',
    category: 'Office & Electronics',
    active: true,
    lastUpdatedAt: '15/10/2026, 04:20:00 PM',
    notes: 'High value. Check for silicone pad peel or bend.'
  },
  {
    skuCode: 'TBM-LED-006',
    skuName: 'TABBYMART Motion Sensor Wireless LED Under-Cabinet Night Light 40cm',
    weightGrams: 240,
    mfgFreightCost: 260,
    variantsMapRaw: 'B04U776655\nFSN-LED-SEN-40\nMSH-LED-LIGHT-4\n890432109806\nTBM-LED-WARM-40',
    category: 'Lighting',
    active: true,
    lastUpdatedAt: '11/10/2026, 12:00:00 PM',
    notes: 'Check USB charging cable and magnetic adhesive plates.'
  },
  {
    skuCode: 'TBM-BAG-007',
    skuName: 'TABBYMART Heavy Duty Multi-Pocket Canvas Tool & Utility Tote Bag',
    weightGrams: 580,
    mfgFreightCost: 380,
    variantsMapRaw: 'B03T665544\nFSN-TOOL-TOTE-HVY\nMSH-BAG-TOOL-7\n890432109807\nTBM-BAG-KHAKI',
    category: 'Tools & Hardware',
    active: true,
    lastUpdatedAt: '13/10/2026, 10:45:00 AM',
    notes: 'Verify shoulder strap is included.'
  }
];

export function parseVariantsFromMaster(masterList: SkuMasterItem[]): SkuVariant[] {
  const variants: SkuVariant[] = [];
  masterList.forEach((item) => {
    if (!item.variantsMapRaw) return;
    const lines = item.variantsMapRaw.split(/[\r\n,]+/);
    lines.forEach((line) => {
      const alias = line.trim();
      if (!alias) return;
      let channel = 'Omnichannel';
      if (alias.startsWith('B0') && alias.length === 10) channel = 'Amazon ASIN';
      else if (alias.startsWith('FSN-')) channel = 'Flipkart FSN';
      else if (alias.startsWith('MSH-')) channel = 'Meesho Catalog';
      else if (/^\d{12,13}$/.test(alias)) channel = 'EAN/Barcode';

      variants.push({
        variantCode: alias.toUpperCase(),
        masterSkuCode: item.skuCode,
        description: `${item.skuName} (${channel})`,
        active: item.active,
        sourceChannel: channel,
        createdAt: item.lastUpdatedAt
      });
    });
  });
  return variants;
}

export const INITIAL_SKU_VARIANTS: SkuVariant[] = parseVariantsFromMaster(INITIAL_SKU_MASTER);

export const INITIAL_RETURNS: ReturnRecord[] = [
  {
    returnEntryId: 'TBM-RET-20261016-8921',
    createdAt: '16/10/2026, 09:15:22 AM',
    createdBy: 'Ramesh K. (Station 1)',
    lastUpdatedAt: '16/10/2026, 09:15:22 AM',
    marketplace: 'Meesho',
    returnType: 'Courier Return (RTO)',
    receiptDate: '2026-10-16',
    originalOrderId: 'MSH-882319412',
    marketplaceReturnId: 'RET-MSH-99214',
    awbTrackingNumber: 'DELHIVERY-778902194',
    scannedVariant: 'MSH-KTC-991',
    masterSkuCode: 'TBM-KTC-001',
    productNameSnapshot: 'TABBYMART 4-Tier Rotating Kitchen Spice Rack Carousel 16 Jars',
    quantityReceived: 1,
    expectedUnitWeightGrams: 850,
    expectedTotalWeightGrams: 850,
    measuredPackageWeightGrams: 845,
    weightDiscrepancy: -5,
    mfgFreightCost: 420,
    totalInventoryValue: 420,
    packageCondition: 'Intact / Undamaged',
    itemCondition: 'Sellable',
    inspectionStatus: 'Restock Approved',
    dispositionDecision: 'Restock to Active Inventory',
    damageDetails: 'Customer was not available at delivery. Package intact and sealed.',
    warehouseNotes: 'Immediate restock approved for shelf B-04.',
    financialReviewStatus: 'Approved',
    claimEligible: false,
    duplicateCheckKey: 'MEESHO-MSH-882319412-TBM-KTC-001-COURIER RETURN (RTO)'
  },
  {
    returnEntryId: 'TBM-RET-20261016-6410',
    createdAt: '16/10/2026, 10:04:15 AM',
    createdBy: 'Suresh M. (Station 2)',
    lastUpdatedAt: '16/10/2026, 10:04:15 AM',
    marketplace: 'Amazon',
    returnType: 'Customer Return',
    receiptDate: '2026-10-16',
    originalOrderId: '408-9921045-8127351',
    marketplaceReturnId: 'RET-AMZ-44120',
    awbTrackingNumber: 'ATS-IN-39921049',
    scannedVariant: 'B08Y123456',
    masterSkuCode: 'TBM-BOT-002',
    productNameSnapshot: 'TABBYMART Stainless Steel Insulated Vacuum Flask Water Bottle 1000ml',
    quantityReceived: 1,
    expectedUnitWeightGrams: 420,
    expectedTotalWeightGrams: 420,
    measuredPackageWeightGrams: 280,
    weightDiscrepancy: -140,
    mfgFreightCost: 280,
    totalInventoryValue: 280,
    packageCondition: 'Torn / Opened Polybag',
    itemCondition: 'Not Sellable',
    inspectionStatus: 'Damaged / Write-off Review',
    dispositionDecision: 'Claim Filing Required (SPF/T-Safe)',
    damageDetails: 'Customer returned cheap plastic bottle instead of stainless steel flask! Outer Amazon box torn.',
    warehouseNotes: 'Unboxing video captured. Customer fraud.',
    photoEvidenceLinks: 'https://drive.google.com/drive/folders/tabbymart-claim-ev-amz-8127351',
    inspectionDate: '2026-10-16',
    financialReviewStatus: 'Pending Review',
    claimEligible: true,
    duplicateCheckKey: 'AMAZON-408-9921045-8127351-TBM-BOT-002-CUSTOMER RETURN'
  },
  {
    returnEntryId: 'TBM-RET-20261015-3312',
    createdAt: '15/10/2026, 03:20:00 PM',
    createdBy: 'Ramesh K. (Station 1)',
    lastUpdatedAt: '15/10/2026, 04:00:00 PM',
    marketplace: 'Flipkart',
    returnType: 'Courier Return (RTO)',
    receiptDate: '2026-10-15',
    originalOrderId: 'OD309921849102',
    marketplaceReturnId: 'FK-RET-81920',
    awbTrackingNumber: 'ECOM-6655443322',
    scannedVariant: 'FSN-LAP-STD-ALU',
    masterSkuCode: 'TBM-LAP-005',
    productNameSnapshot: 'TABBYMART Ergonomic Foldable Aluminum Laptop Riser Stand with Velvet Pouch',
    quantityReceived: 1,
    expectedUnitWeightGrams: 310,
    expectedTotalWeightGrams: 310,
    measuredPackageWeightGrams: 305,
    weightDiscrepancy: -5,
    mfgFreightCost: 340,
    totalInventoryValue: 340,
    packageCondition: 'Torn / Opened Polybag',
    itemCondition: 'Not Sellable',
    inspectionStatus: 'Damaged / Write-off Review',
    dispositionDecision: 'Claim Filing Required (SPF/T-Safe)',
    damageDetails: 'Outer carton crushed by courier stack weight. Aluminum arm joint is warped.',
    warehouseNotes: 'T-Safe claim required against courier transit damage.',
    photoEvidenceLinks: 'https://drive.google.com/drive/folders/fk-tsafe-309921849102',
    financialReviewStatus: 'Pending Review',
    claimEligible: true,
    duplicateCheckKey: 'FLIPKART-OD309921849102-TBM-LAP-005-COURIER RETURN (RTO)'
  },
  {
    returnEntryId: 'TBM-RET-20261015-1109',
    createdAt: '15/10/2026, 11:42:10 AM',
    createdBy: 'Pooja V. (Station 3)',
    lastUpdatedAt: '15/10/2026, 12:00:00 PM',
    marketplace: 'Meesho',
    returnType: 'Customer Return',
    receiptDate: '2026-10-15',
    originalOrderId: 'MSH-774412093',
    marketplaceReturnId: 'RET-MSH-77192',
    awbTrackingNumber: 'SHADOWFAX-994411',
    scannedVariant: 'MSH-CLOSET-3',
    masterSkuCode: 'TBM-ORG-003',
    productNameSnapshot: 'TABBYMART Foldable Wardrobe Clothes Storage Organizers (Pack of 3)',
    quantityReceived: 1,
    expectedUnitWeightGrams: 950,
    expectedTotalWeightGrams: 950,
    measuredPackageWeightGrams: 960,
    weightDiscrepancy: 10,
    mfgFreightCost: 510,
    totalInventoryValue: 510,
    packageCondition: 'Torn / Opened Polybag',
    itemCondition: 'Sellable',
    inspectionStatus: 'Restock Approved',
    dispositionDecision: 'Restock to Active Inventory',
    damageDetails: 'Customer opened clear bag and returned. All 3 organizers present and pristine. Repack required.',
    warehouseNotes: 'Fresh barcode label applied.',
    financialReviewStatus: 'Approved',
    claimEligible: false,
    duplicateCheckKey: 'MEESHO-MSH-774412093-TBM-ORG-003-CUSTOMER RETURN'
  }
];

export const INITIAL_CLAIMS: ClaimRecord[] = [
  {
    claimId: 'TBM-CLM-20261016-4401',
    claimType: 'Amazon SPF',
    marketplace: 'Amazon',
    relatedReturnEntryId: 'TBM-RET-20261016-6410',
    orderId: '408-9921045-8127351',
    marketplaceReturnId: 'RET-AMZ-44120',
    awbTrackingNumber: 'ATS-IN-39921049',
    claimReferenceId: 'SPF-AMZ-99210',
    claimReason: 'Wrong Item Returned (Customer Fraud)',
    claimAmountRequested: 699,
    claimAmountApproved: 0,
    currency: 'INR',
    submissionDate: '2026-10-16',
    submissionDeadline: '2026-10-23',
    claimStatus: 'Ready to Submit',
    evidenceChecklistCompleted: true,
    evidenceDriveLinks: 'https://drive.google.com/drive/folders/tabbymart-claim-ev-amz-8127351',
    submissionNotes: 'Unboxing video attached showing customer swapped steel bottle with plastic bottle.',
    lastFollowupDate: '2026-10-16',
    nextFollowupDate: '2026-10-18',
    createdBy: 'Claims Manager',
    lastUpdatedAt: '16/10/2026, 10:30:00 AM'
  },
  {
    claimId: 'TBM-CLM-20261015-8820',
    claimType: 'T-Safe Claim',
    marketplace: 'Flipkart',
    relatedReturnEntryId: 'TBM-RET-20261015-3312',
    orderId: 'OD309921849102',
    marketplaceReturnId: 'FK-RET-81920',
    awbTrackingNumber: 'ECOM-6655443322',
    claimReferenceId: 'TSAFE-FK-44102',
    claimReason: 'Courier Transit Damage (RTO Crushed)',
    claimAmountRequested: 899,
    claimAmountApproved: 899,
    currency: 'INR',
    submissionDate: '2026-10-15',
    submissionDeadline: '2026-10-29',
    claimStatus: 'Approved',
    evidenceChecklistCompleted: true,
    evidenceDriveLinks: 'https://drive.google.com/drive/folders/fk-tsafe-309921849102',
    submissionNotes: 'Courier delivery sheet signed as damaged package. Crushed box photos attached.',
    lastFollowupDate: '2026-10-16',
    resolutionDate: '2026-10-16',
    recoveryReference: 'FK-NEFT-TR-99412',
    createdBy: 'Claims Manager',
    lastUpdatedAt: '15/10/2026, 12:00:00 PM'
  }
];
