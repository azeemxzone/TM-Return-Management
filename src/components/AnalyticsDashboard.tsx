import React, { useState } from 'react';
import { ReturnRecord, ClaimRecord, Marketplace } from '../types';
import { 
  BarChart3, 
  TrendingUp, 
  Scale, 
  DollarSign, 
  ShieldCheck, 
  AlertTriangle, 
  Package, 
  Truck, 
  ArrowUpRight,
  Filter
} from 'lucide-react';

interface AnalyticsDashboardProps {
  returns: ReturnRecord[];
  claims: ClaimRecord[];
  theme?: import('../types').ThemeMode;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ returns, claims, theme = 'light' }) => {
  const isLight = theme === 'light';
  const [selectedMkt, setSelectedMkt] = useState<string>('ALL');
  const [dateRangeDays, setDateRangeDays] = useState<number>(30);

  // Filter returns based on selection
  const filteredReturns = returns.filter((r) => {
    if (selectedMkt !== 'ALL' && r.marketplace !== selectedMkt) return false;
    return true;
  });

  // KPI Calculations
  const totalReturnsCount = filteredReturns.length;
  const totalExpectedWeightKg = (
    filteredReturns.reduce((acc, r) => acc + (r.expectedTotalWeightGrams || 0), 0) / 1000
  ).toFixed(2);
  const totalInventoryAtRisk = filteredReturns.reduce((acc, r) => acc + (r.totalInventoryValue || 0), 0);

  // Marketplace Breakdown
  const meeshoCount = filteredReturns.filter((r) => r.marketplace === 'Meesho').length;
  const amazonCount = filteredReturns.filter((r) => r.marketplace === 'Amazon').length;
  const flipkartCount = filteredReturns.filter((r) => r.marketplace === 'Flipkart').length;

  // Type Breakdown
  const customerReturnsCount = filteredReturns.filter((r) => r.returnType === 'Customer Return').length;
  const rtoCount = filteredReturns.filter((r) => r.returnType === 'Courier Return (RTO)').length;

  // Condition Breakdown (Sellable vs Not Sellable)
  const damagedCount = filteredReturns.filter(
    (r) => r.itemCondition === 'Not Sellable'
  ).length;

  const restockApprovedCount = filteredReturns.filter((r) => r.inspectionStatus === 'Restock Approved').length;
  const pendingInspectionCount = filteredReturns.filter((r) => r.inspectionStatus === 'Received - Pending Inspection').length;

  // Top Returned SKUs
  const skuCounts: Record<string, { count: number; name: string; value: number }> = {};
  filteredReturns.forEach((r) => {
    if (!skuCounts[r.masterSkuCode]) {
      skuCounts[r.masterSkuCode] = { count: 0, name: r.productNameSnapshot, value: 0 };
    }
    skuCounts[r.masterSkuCode].count += r.quantityReceived;
    skuCounts[r.masterSkuCode].value += r.totalInventoryValue;
  });

  const sortedSkus = Object.entries(skuCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  // Claims Metrics
  const totalClaimsRequested = claims.reduce((acc, c) => acc + (c.claimAmountRequested || 0), 0);
  const totalClaimsApproved = claims.reduce((acc, c) => acc + (c.claimAmountApproved || 0), 0);
  const claimRecoveryRate = totalClaimsRequested > 0 ? ((totalClaimsApproved / totalClaimsRequested) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Filter Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span>Operations &amp; Returns Analytics</span>
          </h2>
          <p className="text-xs text-slate-400">Warehouse return velocity, inventory at risk, and claims recovery</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedMkt}
            onChange={(e) => setSelectedMkt(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-medium focus:outline-none"
          >
            <option value="ALL">All Marketplaces (Meesho, Amazon, Flipkart)</option>
            <option value="Meesho">Meesho Only</option>
            <option value="Amazon">Amazon Only</option>
            <option value="Flipkart">Flipkart Only</option>
          </select>

          <select
            value={dateRangeDays}
            onChange={(e) => setDateRangeDays(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-medium focus:outline-none"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Returns */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Returns
            </span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">
            {totalReturnsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {rtoCount} RTO · {customerReturnsCount} Customer
          </div>
        </div>

        {/* Expected Total Weight */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Expected Weight
            </span>
            <Scale className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-extrabold text-sky-400 font-mono mt-1">
            {totalExpectedWeightKg} <span className="text-sm font-sans">kg</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Aggregated from SKU Master
          </div>
        </div>

        {/* Inventory Value at Risk */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Mfg + Freight At Risk
            </span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
            ₹ {totalInventoryAtRisk.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Pure manufacturing cost
          </div>
        </div>

        {/* Claims Recovery Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              SPF / Claims Recovery
            </span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">
            {claimRecoveryRate}%
          </div>
          <div className="text-[11px] text-emerald-400 mt-0.5 font-medium">
            ₹ {totalClaimsApproved.toLocaleString('en-IN')} recovered
          </div>
        </div>
      </div>

      {/* Visual Analytics Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Marketplace Share & Return Type Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Marketplace Volume Distribution
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-pink-400 font-bold">Meesho (Default)</span>
                <span className="text-white font-mono">{meeshoCount} ({totalReturnsCount ? Math.round((meeshoCount/totalReturnsCount)*100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-pink-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalReturnsCount ? (meeshoCount / totalReturnsCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-amber-400 font-bold">Amazon</span>
                <span className="text-white font-mono">{amazonCount} ({totalReturnsCount ? Math.round((amazonCount/totalReturnsCount)*100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalReturnsCount ? (amazonCount / totalReturnsCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-blue-400 font-bold">Flipkart</span>
                <span className="text-white font-mono">{flipkartCount} ({totalReturnsCount ? Math.round((flipkartCount/totalReturnsCount)*100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalReturnsCount ? (flipkartCount / totalReturnsCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-around text-center text-xs">
            <div>
              <span className="text-slate-400 block">Customer Returns:</span>
              <span className="text-amber-300 font-bold font-mono">{customerReturnsCount}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Courier RTO:</span>
              <span className="text-white font-bold font-mono">{rtoCount}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Damaged / Write-Offs:</span>
              <span className="text-rose-400 font-bold font-mono">{damagedCount}</span>
            </div>
          </div>
        </div>

        {/* Top Returned SKUs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Top Returned Products (High Velocity)
          </h3>

          <div className="space-y-3">
            {sortedSkus.length > 0 ? (
              sortedSkus.map(([code, data]) => (
                <div key={code} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-amber-300 block">{code}</span>
                    <span className="text-slate-300 truncate block text-[11px]">{data.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-white font-mono font-bold">{data.count} units</span>
                    <span className="text-emerald-400 block font-mono text-[10px]">₹ {data.value}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-xs py-8 text-center">
                No returns recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
