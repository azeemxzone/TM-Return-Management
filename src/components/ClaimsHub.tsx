import React, { useState } from 'react';
import { ClaimRecord, ClaimStatus, ClaimType, Marketplace, ReturnRecord, ThemeMode } from '../types';
import { StorageService } from '../services/storageService';
import { 
  ShieldAlert, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  ExternalLink, 
  FileText, 
  Calendar,
  X,
  Edit2
} from 'lucide-react';

interface ClaimsHubProps {
  claims: ClaimRecord[];
  returns: ReturnRecord[];
  onClaimSaved: (claim: ClaimRecord) => void;
  operatorName: string;
  prefillReturn?: ReturnRecord | null;
  onClearPrefill?: () => void;
  theme?: ThemeMode;
}

export const ClaimsHub: React.FC<ClaimsHubProps> = ({
  claims,
  returns,
  onClaimSaved,
  operatorName,
  prefillReturn,
  onClearPrefill,
  theme = 'light'
}) => {
  const isLight = theme === 'light';
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(Boolean(prefillReturn));
  const [editingClaim, setEditingClaim] = useState<ClaimRecord | null>(null);

  // Form State for New/Edit Claim
  const [claimType, setClaimType] = useState<ClaimType>(prefillReturn?.marketplace === 'Amazon' ? 'Amazon SPF' : prefillReturn?.marketplace === 'Flipkart' ? 'T-Safe Claim' : 'Meesho Damage Claim');
  const [mkt, setMkt] = useState<Marketplace>(prefillReturn?.marketplace || 'Amazon');
  const [orderId, setOrderId] = useState<string>(prefillReturn?.originalOrderId || '');
  const [returnId, setReturnId] = useState<string>(prefillReturn?.marketplaceReturnId || '');
  const [awb, setAwb] = useState<string>(prefillReturn?.awbTrackingNumber || '');
  const [relatedReturnId, setRelatedReturnId] = useState<string>(prefillReturn?.returnEntryId || '');
  const [claimRefId, setClaimRefId] = useState<string>('');
  const [claimReason, setClaimReason] = useState<string>(prefillReturn?.damageDetails || 'Customer returned damaged/swapped item');
  const [amountRequested, setAmountRequested] = useState<number>(prefillReturn ? (prefillReturn.totalInventoryValue * 1.4) : 500);
  const [amountApproved, setAmountApproved] = useState<number>(0);
  const [status, setStatus] = useState<ClaimStatus>('Ready to Submit');
  const [deadline, setDeadline] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [evidenceLinks, setEvidenceLinks] = useState<string>(prefillReturn?.photoEvidenceLinks || '');
  const [notes, setNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [recoveryRef, setRecoveryRef] = useState<string>('');
  const [evidenceChecklist, setEvidenceChecklist] = useState({
    videoUnboxing: true,
    scalePhoto: true,
    shippingLabel: true,
    itemDamagePhoto: true
  });

  const openNewClaimModal = (ret?: ReturnRecord) => {
    if (ret) {
      setClaimType(ret.marketplace === 'Amazon' ? 'Amazon SPF' : ret.marketplace === 'Flipkart' ? 'T-Safe Claim' : 'Meesho Damage Claim');
      setMkt(ret.marketplace);
      setOrderId(ret.originalOrderId);
      setReturnId(ret.marketplaceReturnId);
      setAwb(ret.awbTrackingNumber || '');
      setRelatedReturnId(ret.returnEntryId);
      setClaimReason(ret.damageDetails || `Item condition: ${ret.itemCondition}`);
      setAmountRequested(Math.round(ret.totalInventoryValue * 1.3));
      setEvidenceLinks(ret.photoEvidenceLinks || '');
    } else {
      setClaimType('Amazon SPF');
      setMkt('Amazon');
      setOrderId('');
      setReturnId('');
      setAwb('');
      setRelatedReturnId('');
      setClaimReason('');
      setAmountRequested(500);
      setEvidenceLinks('');
    }
    setEditingClaim(null);
    setAmountApproved(0);
    setStatus('Ready to Submit');
    setIsModalOpen(true);
  };

  const openEditClaimModal = (c: ClaimRecord) => {
    setEditingClaim(c);
    setClaimType(c.claimType);
    setMkt(c.marketplace);
    setOrderId(c.orderId);
    setReturnId(c.marketplaceReturnId || '');
    setAwb(c.awbTrackingNumber || '');
    setRelatedReturnId(c.relatedReturnEntryId || '');
    setClaimRefId(c.claimReferenceId || '');
    setClaimReason(c.claimReason);
    setAmountRequested(c.claimAmountRequested);
    setAmountApproved(c.claimAmountApproved);
    setStatus(c.claimStatus);
    setDeadline(c.submissionDeadline || '');
    setEvidenceLinks(c.evidenceDriveLinks || '');
    setNotes(c.submissionNotes || '');
    setRejectionReason(c.rejectionReason || '');
    setRecoveryRef(c.recoveryReference || '');
    setIsModalOpen(true);
  };

  const handleSaveClaim = (e: React.FormEvent) => {
    e.preventDefault();
    const now = StorageService.formatNormalTimestamp(new Date());

    const claimRecord: ClaimRecord = {
      claimId: editingClaim ? editingClaim.claimId : StorageService.generateClaimId(),
      claimType,
      marketplace: mkt,
      relatedReturnEntryId: relatedReturnId.trim() || undefined,
      orderId: orderId.trim(),
      marketplaceReturnId: returnId.trim() || undefined,
      awbTrackingNumber: awb.trim() || undefined,
      claimReferenceId: claimRefId.trim() || undefined,
      claimReason,
      claimAmountRequested: Number(amountRequested) || 0,
      claimAmountApproved: Number(amountApproved) || 0,
      currency: 'INR',
      submissionDate: editingClaim ? editingClaim.submissionDate : now.slice(0, 10),
      submissionDeadline: deadline || undefined,
      claimStatus: status,
      evidenceChecklistCompleted: Object.values(evidenceChecklist).every(Boolean),
      evidenceDriveLinks: evidenceLinks.trim() || undefined,
      submissionNotes: notes.trim() || undefined,
      rejectionReason: rejectionReason.trim() || undefined,
      recoveryReference: recoveryRef.trim() || undefined,
      resolutionDate: status === 'Approved' || status === 'Recovered' || status === 'Partially Recovered' ? now.slice(0, 10) : undefined,
      createdBy: editingClaim ? editingClaim.createdBy : operatorName || 'Claims Specialist',
      lastUpdatedAt: now
    };

    const currentClaims = StorageService.getClaims();
    if (editingClaim) {
      const idx = currentClaims.findIndex((c) => c.claimId === editingClaim.claimId);
      if (idx !== -1) currentClaims[idx] = claimRecord;
    } else {
      currentClaims.unshift(claimRecord);
    }

    StorageService.saveClaims(currentClaims);
    StorageService.logAudit(
      operatorName,
      editingClaim ? 'UPDATE_CLAIM' : 'CREATE_CLAIM',
      'Claims_Log',
      claimRecord.claimId,
      `Type: ${claimType}, Status: ${status}, Req: ₹${amountRequested}`
    );

    // Sync to GAS
    StorageService.syncClaimToGas(claimRecord);

    onClaimSaved(claimRecord);
    setIsModalOpen(false);
    if (onClearPrefill) onClearPrefill();
  };

  // Metrics
  const totalClaimsCount = claims.length;
  const openClaims = claims.filter((c) => c.claimStatus !== 'Recovered' && c.claimStatus !== 'Closed — No Recovery');
  const totalRequested = claims.reduce((acc, c) => acc + (c.claimAmountRequested || 0), 0);
  const totalApproved = claims.reduce((acc, c) => acc + (c.claimAmountApproved || 0), 0);
  const recoveryRate = totalRequested > 0 ? ((totalApproved / totalRequested) * 100).toFixed(1) : '0';

  const filteredClaims = claims.filter((c) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      c.claimId.toLowerCase().includes(q) ||
      c.orderId.toLowerCase().includes(q) ||
      (c.claimReferenceId && c.claimReferenceId.toLowerCase().includes(q)) ||
      (c.relatedReturnEntryId && c.relatedReturnEntryId.toLowerCase().includes(q)) ||
      c.claimReason.toLowerCase().includes(q);

    const matchType = filterType === 'ALL' || c.claimType === filterType;
    const matchStatus = filterStatus === 'ALL' || c.claimStatus === filterStatus;

    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Claim Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Claims Tracked
          </span>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">
            {totalClaimsCount}
          </div>
          <span className="text-[11px] text-amber-400 font-medium">
            {openClaims.length} Open / Actionable
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Amount Requested
          </span>
          <div className="text-2xl font-extrabold text-slate-200 font-mono mt-1">
            ₹ {totalRequested.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400">Total claimed against losses</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Amount Approved / Recovered
          </span>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
            ₹ {totalApproved.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-emerald-400/90 font-medium">Credited to seller account</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Claims Recovery Rate
          </span>
          <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">
            {recoveryRate}%
          </div>
          <span className="text-[11px] text-slate-400">Approved vs Requested</span>
        </div>
      </div>

      {/* Control Bar: Search, Filters, and New Claim Action */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Claim ID, Order ID, Ref ID..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Claim Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-medium focus:outline-none"
          >
            <option value="ALL">All Claim Types</option>
            <option value="Amazon SPF">Amazon SPF</option>
            <option value="T-Safe Claim">T-Safe Claim</option>
            <option value="Meesho Damage Claim">Meesho Damage Claim</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-medium focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Ready to Submit">Ready to Submit</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Recovered">Recovered</option>
            <option value="Rejected">Rejected</option>
          </select>

          <button
            onClick={() => openNewClaimModal()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition ml-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Claim</span>
          </button>
        </div>
      </div>

      {/* Claims List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Claim ID &amp; Type</th>
                <th className="py-3 px-4">Marketplace / Order ID</th>
                <th className="py-3 px-4">Claim Reason</th>
                <th className="py-3 px-4">Amount Requested</th>
                <th className="py-3 px-4">Approved / Recovered</th>
                <th className="py-3 px-4">Status &amp; Deadline</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredClaims.length > 0 ? (
                filteredClaims.map((claim) => (
                  <tr key={claim.claimId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-amber-300">
                        {claim.claimId}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {claim.claimType}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">
                        {claim.marketplace}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                        Order: {claim.orderId}
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-[220px]">
                      <div className="text-slate-200 line-clamp-2" title={claim.claimReason}>
                        {claim.claimReason}
                      </div>
                      {claim.claimReferenceId && (
                        <div className="font-mono text-[10px] text-amber-400 mt-0.5">
                          Ref: {claim.claimReferenceId}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-white">
                      ₹ {claim.claimAmountRequested.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      ₹ {claim.claimAmountApproved.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            claim.claimStatus === 'Approved' || claim.claimStatus === 'Recovered'
                              ? 'bg-emerald-400'
                              : claim.claimStatus === 'Rejected'
                              ? 'bg-rose-400'
                              : 'bg-amber-400'
                          }`}
                        />
                        <span>{claim.claimStatus}</span>
                      </div>
                      {claim.submissionDeadline && (
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>Deadline: {claim.submissionDeadline}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEditClaimModal(claim)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No claims match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Claim Creation & Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">
                  {editingClaim ? 'Edit / Update Marketplace Claim' : 'Create New Marketplace Claim'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  if (onClearPrefill) onClearPrefill();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClaim} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Claim Type</label>
                  <select
                    value={claimType}
                    onChange={(e) => setClaimType(e.target.value as ClaimType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Amazon SPF">Amazon SPF (Seller Protection Fund)</option>
                    <option value="T-Safe Claim">T-Safe Claim (Transit &amp; Safe Loss)</option>
                    <option value="Meesho Damage Claim">Meesho Damage Claim</option>
                    <option value="Other Marketplace">Other Marketplace Claim</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Marketplace</label>
                  <select
                    value={mkt}
                    onChange={(e) => setMkt(e.target.value as Marketplace)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Amazon">Amazon</option>
                    <option value="Flipkart">Flipkart</option>
                    <option value="Meesho">Meesho</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Original Order ID *</label>
                  <input
                    type="text"
                    required
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Marketplace Return ID</label>
                  <input
                    type="text"
                    value={returnId}
                    onChange={(e) => setReturnId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Related Return Entry ID</label>
                  <input
                    type="text"
                    value={relatedReturnId}
                    onChange={(e) => setRelatedReturnId(e.target.value)}
                    placeholder="e.g. TBM-RET-20261016-8921"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Courier AWB / Tracking</label>
                  <input
                    type="text"
                    value={awb}
                    onChange={(e) => setAwb(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Claim Amount Requested (₹) *</label>
                  <input
                    type="number"
                    required
                    value={amountRequested}
                    onChange={(e) => setAmountRequested(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Amount Approved / Recovered (₹)</label>
                  <input
                    type="number"
                    value={amountApproved}
                    onChange={(e) => setAmountApproved(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Claim Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ClaimStatus)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Potential Claim">Potential Claim</option>
                    <option value="Evidence Pending">Evidence Pending</option>
                    <option value="Ready to Submit">Ready to Submit</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Partially Recovered">Partially Recovered</option>
                    <option value="Recovered">Recovered</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Appeal in Progress">Appeal in Progress</option>
                    <option value="Closed — No Recovery">Closed — No Recovery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Filing / SLA Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Claim Reason &amp; Category</label>
                <input
                  type="text"
                  required
                  value={claimReason}
                  onChange={(e) => setClaimReason(e.target.value)}
                  placeholder="e.g. Customer returned damaged/swapped item, transit damage crushed, weight discrepancy..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Evidence Checklist */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-400 block uppercase">
                  Evidence Checklist:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={evidenceChecklist.videoUnboxing}
                      onChange={(e) => setEvidenceChecklist({ ...evidenceChecklist, videoUnboxing: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500"
                    />
                    <span>Unboxing Video Captured</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={evidenceChecklist.scalePhoto}
                      onChange={(e) => setEvidenceChecklist({ ...evidenceChecklist, scalePhoto: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500"
                    />
                    <span>Weight Scale Photo</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={evidenceChecklist.shippingLabel}
                      onChange={(e) => setEvidenceChecklist({ ...evidenceChecklist, shippingLabel: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500"
                    />
                    <span>Shipping Label Photo</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={evidenceChecklist.itemDamagePhoto}
                      onChange={(e) => setEvidenceChecklist({ ...evidenceChecklist, itemDamagePhoto: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500"
                    />
                    <span>Item Defect / Damage Photos</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Google Drive Evidence Links
                </label>
                <input
                  type="text"
                  value={evidenceLinks}
                  onChange={(e) => setEvidenceLinks(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Marketplace Claim Reference ID (after portal filing)
                  </label>
                  <input
                    type="text"
                    value={claimRefId}
                    onChange={(e) => setClaimRefId(e.target.value)}
                    placeholder="e.g. SPF-99210-AMZ"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Recovery Reference (UTR / Credit Note)
                  </label>
                  <input
                    type="text"
                    value={recoveryRef}
                    onChange={(e) => setRecoveryRef(e.target.value)}
                    placeholder="e.g. NEFT-UTR-88219"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Submission Notes &amp; Portal Follow-ups
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition"
                >
                  Save Claim Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
