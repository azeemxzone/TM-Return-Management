export type Marketplace = 'Meesho' | 'Amazon' | 'Flipkart' | 'Other';

export type ReturnType = 'Customer Return' | 'Courier Return (RTO)';

// Streamlined for warehouse operators
export type PackageCondition =
  | 'Intact / Undamaged'
  | 'Torn / Opened Polybag';

export type ItemCondition =
  | 'Sellable'
  | 'Not Sellable';

export type Disposition =
  | 'Restock to Active Inventory'
  | 'Claim Filing Required (SPF/T-Safe)'
  | 'Scrapped / Written Off';

export type InspectionStatus =
  | 'Received - Pending Inspection'
  | 'Restock Approved'
  | 'Damaged / Write-off Review'
  | 'Closed';

export interface ReturnRecord {
  returnEntryId: string;
  createdAt: string;
  createdBy: string;
  lastUpdatedAt: string;
  marketplace: Marketplace;
  returnType: ReturnType;
  receiptDate: string;
  originalOrderId: string;
  marketplaceReturnId: string;
  awbTrackingNumber?: string;
  scannedVariant: string;
  masterSkuCode: string;
  productNameSnapshot: string;
  quantityReceived: number;
  expectedUnitWeightGrams: number;
  expectedTotalWeightGrams: number;
  measuredPackageWeightGrams?: number;
  weightDiscrepancy?: number;
  mfgFreightCost: number;
  totalInventoryValue: number;
  packageCondition: PackageCondition;
  itemCondition: ItemCondition;
  inspectionStatus: InspectionStatus;
  dispositionDecision: Disposition;
  damageDetails?: string;
  warehouseNotes?: string;
  photoEvidenceLinks?: string;
  inspectionDate?: string;
  financialReviewStatus: 'Pending Review' | 'Approved' | 'Adjusted' | 'Written Off';
  claimEligible: boolean;
  duplicateCheckKey: string;
}

export interface SkuMasterItem {
  skuCode: string;
  skuName: string;
  weightGrams: number;
  mfgFreightCost: number;
  variantsMapRaw: string;
  category: string;
  active: boolean;
  lastUpdatedAt: string;
  notes?: string;
}

export interface SkuVariant {
  variantCode: string;
  masterSkuCode: string;
  description: string;
  active: boolean;
  sourceChannel: string;
  createdAt: string;
}

export type ClaimType =
  | 'Amazon SPF'
  | 'T-Safe Claim'
  | 'Meesho Damage Claim'
  | 'Other Marketplace';

export type ClaimStatus =
  | 'Potential Claim'
  | 'Evidence Pending'
  | 'Ready to Submit'
  | 'Submitted'
  | 'Under Review'
  | 'Additional Evidence Required'
  | 'Rejected'
  | 'Appeal in Progress'
  | 'Approved'
  | 'Partially Recovered'
  | 'Recovered'
  | 'Closed — No Recovery';

export interface ClaimRecord {
  claimId: string;
  claimType: ClaimType;
  marketplace: Marketplace;
  relatedReturnEntryId?: string;
  orderId: string;
  marketplaceReturnId?: string;
  awbTrackingNumber?: string;
  claimReferenceId?: string;
  claimReason: string;
  claimAmountRequested: number;
  claimAmountApproved: number;
  currency: string;
  submissionDate: string;
  submissionDeadline?: string;
  claimStatus: ClaimStatus;
  evidenceChecklistCompleted: boolean;
  evidenceDriveLinks?: string;
  submissionNotes?: string;
  lastFollowupDate?: string;
  nextFollowupDate?: string;
  rejectionReason?: string;
  appealStatus?: string;
  resolutionDate?: string;
  recoveryReference?: string;
  createdBy: string;
  lastUpdatedAt: string;
}

export interface AuditLogItem {
  timestamp: string;
  user: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
}

export type ActiveTab = 'receipt' | 'returns_log' | 'claims_hub' | 'sku_master' | 'analytics' | 'gas_deployment';

export type ThemeMode = 'light' | 'dark';

export type UserRole = 'admin' | 'operator';

export interface AuthUser {
  username: string;
  name: string;
  role: UserRole;
  stationId: string;
  loginTime: string;
  rememberMe?: boolean;
}
