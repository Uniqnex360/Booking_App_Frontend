import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader } from "@/components/common/Loader";
import { getMyPartnerProfile, getPartnerRevenue, getMyStatement, updateMyBankAccount } from "@/api/partner.api";
import { getMyEvents, updateEvent, cancelOrDeleteEvent } from "@/api/event.api";
import { formatRupees } from "@/utils/currencyFormatter";
import type { Partner, PartnerType, PartnerStatementResponse } from "@/types/partner.types";
import type { EventItem } from "@/types/event.types";

import {
  Store,
  Phone,
  MapPin,
  Clock,
  Utensils,
  CheckCircle2,
  Calendar,
  Plus,
  Ticket,
  Tag,
  ImageOff,
  Trash2,
  Edit3,
  CalendarCheck,
  CalendarX,
  CalendarDays,
  Loader2,
  TrendingUp,
  DollarSign,
  BarChart3,
  Landmark,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  Copy,
  Check,
  Building2,
  RefreshCw,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { LoadingPage } from "./LoadingPage";
import { partnerTypeMeta } from "@/lib/partnerTypeMeta";

// ---------------------------------------------------------------------------
// Revenue Dashboard Sub-Component
// ---------------------------------------------------------------------------
function RevenueDashboard({ partnerId }: { partnerId: string }) {
  const [revenue, setRevenue] = useState<any>(null);
  const [revenueLoading, setRevenueLoading] = useState(true);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const data = await getPartnerRevenue();
        setRevenue(data);
      } catch {
        setRevenue(null);
      } finally {
        setRevenueLoading(false);
      }
    };
    fetchRevenue();
  }, []);

  if (revenueLoading) return <Loader />;
  if (!revenue)
    return <p className="text-slate-500">Failed to load revenue data.</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <DollarSign className="h-4 w-4 text-emerald-600" /> Total Revenue
          </div>
          <p className="text-2xl font-black text-slate-900">
            {formatRupees(revenue.total_revenue_paise)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <BarChart3 className="h-4 w-4 text-[#7B1E3D]" /> Total Bookings
          </div>
          <p className="text-2xl font-black text-slate-900">
            {revenue.total_bookings}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <TrendingUp className="h-4 w-4 text-indigo-600" /> Avg Booking
          </div>
          <p className="text-2xl font-black text-slate-900">
            {formatRupees(revenue.average_booking_paise)}
          </p>
        </div>
      </div>

      {revenue.by_event && revenue.by_event.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#7B1E3D]" /> Revenue by Event
          </h3>
          <div className="space-y-3">
            {revenue.by_event.map((ev: any) => (
              <div
                key={ev.event_id}
                className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0"
              >
                <div>
                  <p className="font-bold text-sm text-slate-900">
                    {ev.event_title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {ev.bookings} bookings
                  </p>
                </div>
                <span className="text-lg font-black text-emerald-700">
                  {formatRupees(ev.revenue_paise)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {revenue.by_event && revenue.by_event.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
          No revenue data yet. Start hosting events to see earnings!
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Partner Account Statement Component
// ---------------------------------------------------------------------------
function PartnerStatementDashboard() {
  const [statementData, setStatementData] = useState<PartnerStatementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>("ALL");

  const fetchStatement = async () => {
    setLoading(true);
    try {
      const data = await getMyStatement({ period });
      setStatementData(data);
    } catch {
      toast.error("Failed to load account statement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement();
  }, [period]);

  const handleExportCSV = () => {
    if (!statementData || !statementData.statement_ledger) return;
    const p = statementData.partner;
    const headers = [
      'Date',
      'Transaction Type',
      'Reference ID / UTR',
      'Description',
      'Item / Venue',
      'Gross Amount (INR)',
      'Commission Fee (INR)',
      'Tax / TDS (INR)',
      'Net Amount (INR)',
      'Status',
    ];

    const rows = statementData.statement_ledger.map((item) => [
      item.date ? format(parseISO(item.date), 'yyyy-MM-dd HH:mm:ss') : '',
      item.type,
      item.reference,
      `"${item.description.replace(/"/g, '""')}"`,
      `"${item.item_title.replace(/"/g, '""')}"`,
      (item.gross_paise / 100).toFixed(2),
      (item.commission_paise / 100).toFixed(2),
      (item.tax_paise / 100).toFixed(2),
      (item.net_paise / 100).toFixed(2),
      item.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `my_account_statement_${format(new Date(), 'yyyyMMdd')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Account statement exported to CSV');
  };

  if (loading && !statementData) return <Loader />;
  if (!statementData) return <p className="text-slate-500">Failed to load account statement.</p>;

  const fin = statementData.financial_summary;
  const ledger = statementData.statement_ledger || [];
  const remittances = statementData.remittances || [];
  const bank = statementData.partner.bank_account;

  return (
    <div className="space-y-6">
      {/* Financial Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Gross Sales
          </span>
          <p className="text-xl font-black text-slate-900 mt-1">
            {formatRupees(fin.total_gross_paise)}
          </p>
          <span className="text-[11px] text-slate-400">{fin.total_bookings_count} bookings</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Platform Fee
          </span>
          <p className="text-xl font-black text-rose-600 mt-1">
            -{formatRupees(fin.platform_commission_paise)}
          </p>
          <span className="text-[11px] text-slate-400">{statementData.partner.commission_rate}% commission</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            TDS / TCS (1%)
          </span>
          <p className="text-xl font-black text-slate-600 mt-1">
            -{formatRupees(fin.tds_tcs_paise)}
          </p>
          <span className="text-[11px] text-slate-400">Statutory withholdings</span>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/20 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
            Remitted to Bank
          </span>
          <p className="text-xl font-black text-emerald-700 mt-1">
            {formatRupees(fin.total_remitted_paise)}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">
            {fin.total_remittances_count} payouts received
          </span>
        </div>

        <div className="bg-white border border-amber-300 bg-amber-50/30 rounded-2xl p-4 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
            Pending Remittance
          </span>
          <p className="text-2xl font-black text-amber-700 mt-1">
            {formatRupees(fin.pending_remittance_paise)}
          </p>
          <span className="text-[11px] text-amber-800 font-medium">Next payout cycle</span>
        </div>
      </div>

      {/* Period Filter & CSV Export Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 mr-1">Period:</span>
          {[
            { id: 'ALL', label: 'All Time' },
            { id: 'THIS_MONTH', label: 'This Month' },
            { id: 'LAST_30_DAYS', label: 'Last 30 Days' },
            { id: 'LAST_90_DAYS', label: 'Last 90 Days' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                period === p.id
                  ? 'bg-[#7B1E3D] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleExportCSV}
          className="text-xs font-bold rounded-xl gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" />
          Export Statement (CSV)
        </Button>
      </div>

      {/* Unified Statement Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#7B1E3D]" />
            Account Statement Ledger
          </h3>
          <span className="text-xs text-slate-500">
            {ledger.length} transactions recorded
          </span>
        </div>

        {ledger.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Clock className="h-8 w-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No transactions recorded for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Reference / UTR</th>
                  <th className="px-5 py-3">Item / Event</th>
                  <th className="px-5 py-3 text-right">Gross (INR)</th>
                  <th className="px-5 py-3 text-right">Fee & Tax</th>
                  <th className="px-5 py-3 text-right">Net Share (INR)</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.map((item) => {
                  const isPayout = item.type === 'REMITTANCE_PAYOUT';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                        {item.date ? format(parseISO(item.date), 'dd MMM yyyy, hh:mm a') : '—'}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                            isPayout
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {isPayout ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                          {isPayout ? 'Bank Remittance' : 'Ticket Sale'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {item.reference}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900 truncate max-w-[220px]">
                          {item.item_title}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                          {item.description}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-700 whitespace-nowrap">
                        {isPayout ? '—' : formatRupees(item.gross_paise)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-rose-600 whitespace-nowrap">
                        {isPayout ? '—' : `-${formatRupees(item.commission_paise + item.tax_paise)}`}
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right font-black whitespace-nowrap ${
                          isPayout ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {isPayout
                          ? formatRupees(Math.abs(item.net_paise))
                          : formatRupees(item.net_paise)}
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <Badge
                          className={
                            item.status === 'REMITTED' || item.status === 'SETTLED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }
                        >
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Remittance Payouts to Bank */}
      {remittances.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Direct Bank Remittance Payouts History
            </h3>
            <span className="text-xs text-slate-500">
              Paid to {bank?.bank_name} ({bank?.masked_account_number})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Bank UTR Number</th>
                  <th className="px-5 py-3">Destination Account</th>
                  <th className="px-5 py-3 text-right">Amount (INR)</th>
                  <th className="px-5 py-3">Notes</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {remittances.map((rem) => (
                  <tr key={rem.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                      {rem.created_at ? format(parseISO(rem.created_at), 'dd MMM yyyy, hh:mm a') : '—'}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {rem.utr_number}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 whitespace-nowrap">
                      {rem.bank_name || bank?.bank_name} • {rem.bank_account_number || bank?.masked_account_number}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-emerald-700 whitespace-nowrap">
                      {formatRupees(rem.amount_paise)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {rem.notes || 'Weekly settlement payout'}
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        SUCCESS
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Partner Bank Account of Remittance Component
// ---------------------------------------------------------------------------
function PartnerBankDashboard({ partner, onUpdated }: { partner: Partner; onUpdated: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    bank_name: partner.bank_name || '',
    bank_account_holder_name: partner.bank_account_holder_name || partner.business_name || '',
    bank_account_number: partner.bank_account_number || '',
    bank_ifsc_code: partner.bank_ifsc_code || '',
    bank_account_type: partner.bank_account_type || 'CURRENT',
    bank_branch: partner.bank_branch || '',
    remittance_schedule: partner.remittance_schedule || 'WEEKLY',
  });
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bank_name.trim() || !form.bank_account_number.trim() || !form.bank_ifsc_code.trim()) {
      toast.error('Bank Name, Account Number and IFSC Code are required.');
      return;
    }

    setSaving(true);
    try {
      await updateMyBankAccount({
        bank_name: form.bank_name.trim(),
        bank_account_holder_name: form.bank_account_holder_name.trim() || partner.business_name,
        bank_account_number: form.bank_account_number.trim(),
        bank_ifsc_code: form.bank_ifsc_code.trim().toUpperCase(),
        bank_account_type: form.bank_account_type,
        bank_branch: form.bank_branch.trim() || undefined,
        remittance_schedule: form.remittance_schedule,
      });
      toast.success('Remittance bank account updated successfully!');
      setIsEditing(false);
      onUpdated();
    } catch {
      toast.error('Failed to update bank account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual Bank Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-7 sm:p-8 shadow-lg border border-slate-700">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Landmark className="h-4 w-4" />
              <span>Remittance Bank Account</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white mt-2">
              {partner.bank_name || 'No Bank Account Configured'}
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              {partner.bank_branch ? `Branch: ${partner.bank_branch}` : 'Designated account for automatic ticket and dining payout settlements'}
            </p>
          </div>

          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs py-1 px-2.5">
            {partner.bank_verification_status || 'VERIFIED'}
          </Badge>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 pt-6 border-t border-slate-700/80">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
              Beneficiary Name
            </span>
            <p className="text-sm font-bold text-white mt-1 truncate">
              {partner.bank_account_holder_name || partner.business_name}
            </p>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
              Account Number
            </span>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm font-mono font-black text-white">
                {partner.bank_account_number || '•••• •••• ••••'}
              </p>
              {partner.bank_account_number && (
                <button
                  onClick={() => handleCopy(partner.bank_account_number!, 'acc')}
                  className="text-slate-400 hover:text-white transition"
                  title="Copy account number"
                >
                  {copiedKey === 'acc' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
              IFSC Code
            </span>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm font-mono font-bold text-white">
                {partner.bank_ifsc_code || '—'}
              </p>
              {partner.bank_ifsc_code && (
                <button
                  onClick={() => handleCopy(partner.bank_ifsc_code!, 'ifsc')}
                  className="text-slate-400 hover:text-white transition"
                  title="Copy IFSC"
                >
                  {copiedKey === 'ifsc' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
              Type & Cycle
            </span>
            <p className="text-sm font-bold text-white mt-1">
              {partner.bank_account_type || 'CURRENT'} • {partner.remittance_schedule || 'WEEKLY'}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Bank Account Details */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-900 text-base">
              {isEditing ? 'Edit Remittance Bank Credentials' : 'Bank Account Settings'}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Ensure your banking credentials match your official PAN and GST business registration.
            </p>
          </div>
          <Button
            size="sm"
            variant={isEditing ? 'ghost' : 'outline'}
            onClick={() => setIsEditing(!isEditing)}
            className="rounded-xl text-xs font-bold gap-1.5"
          >
            {isEditing ? (
              <>
                <X className="h-3.5 w-3.5" /> Cancel
              </>
            ) : (
              <>
                <Edit3 className="h-3.5 w-3.5" /> Edit Bank Details
              </>
            )}
          </Button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="pt-4 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold text-slate-700">Bank Name *</Label>
                <Input
                  value={form.bank_name}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  placeholder="e.g. HDFC Bank, ICICI Bank, State Bank of India"
                  className="h-10 text-xs rounded-xl mt-1"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Beneficiary / Account Holder Name *</Label>
                <Input
                  value={form.bank_account_holder_name}
                  onChange={(e) => setForm({ ...form, bank_account_holder_name: e.target.value })}
                  placeholder="e.g. Acme Entertainment Pvt Ltd"
                  className="h-10 text-xs rounded-xl mt-1"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Account Number *</Label>
                <Input
                  value={form.bank_account_number}
                  onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
                  placeholder="e.g. 50100239481726"
                  className="h-10 text-xs font-mono rounded-xl mt-1"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">IFSC Code *</Label>
                <Input
                  value={form.bank_ifsc_code}
                  onChange={(e) => setForm({ ...form, bank_ifsc_code: e.target.value })}
                  placeholder="e.g. HDFC0001234"
                  className="h-10 text-xs font-mono uppercase rounded-xl mt-1"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Account Type</Label>
                <select
                  value={form.bank_account_type}
                  onChange={(e) => setForm({ ...form, bank_account_type: e.target.value })}
                  className="h-10 w-full border border-slate-200 rounded-xl px-3 text-xs bg-white mt-1 font-medium"
                >
                  <option value="CURRENT">Current Account</option>
                  <option value="SAVINGS">Savings Account</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Bank Branch</Label>
                <Input
                  value={form.bank_branch}
                  onChange={(e) => setForm({ ...form, bank_branch: e.target.value })}
                  placeholder="e.g. Indiranagar, Bengaluru"
                  className="h-10 text-xs rounded-xl mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white text-xs font-bold rounded-xl"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Save Bank Details
              </Button>
            </div>
          </form>
        ) : (
          <div className="pt-2 text-xs text-slate-500">
            Payout remittances are automatically scheduled every <strong>Monday</strong> to this verified account via NEFT / RTGS.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Partner Dashboard
// ---------------------------------------------------------------------------
export default function PartnerDashboard() {
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "ACTIVE" | "PENDING" | "PAST" | "REVENUE" | "STATEMENT" | "BANK"
  >("ACTIVE");
  const [verticalFilter, setVerticalFilter] = useState<"ALL" | "EVENTS" | "DINING">("ALL");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab]);

  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    venue_name: "",
    city: "",
    poster_image_url: "",
    language: "",
    tags: [] as string[],
    is_online: false,
    is_outdoor: false,
    is_fast_filling: false,
    is_must_attend: false,
    is_unmissable: false,
    is_kids_allowed: false,
    is_masterclass: false,
    is_new_year_party: false,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = await getMyPartnerProfile();
      setPartner(p);
      if (p && p.status === "APPROVED") {
        const evs = await getMyEvents();
        setEvents(evs);
      }
    } catch {
      toast.error("Failed to load partner dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEditModal = (event: EventItem) => {
    setEditingEvent(event);
    setEditForm({
      title: event.title,
      description: event.description || "",
      venue_name: event.venue_name,
      city: event.city,
      poster_image_url: event.poster_image_url || "",
      language: event.language || "",
      tags: event.tags || [],
      is_online: Boolean(event.is_online),
      is_outdoor: Boolean(event.is_outdoor),
      is_fast_filling: Boolean(event.is_fast_filling),
      is_must_attend: Boolean(event.is_must_attend),
      is_unmissable: Boolean(event.is_unmissable),
      is_kids_allowed: Boolean(event.is_kids_allowed),
      is_masterclass: Boolean(event.is_masterclass),
      is_new_year_party: Boolean(event.is_new_year_party),
    });
  };
  useEffect(() => {
    if (partner && partner.status !== "APPROVED") {
      toast.error("Your partner account is not approved yet.");
      navigate("/partner/dashboard");
    }
  }, [partner]);
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    setSavingEdit(true);
    try {
      await updateEvent(editingEvent.id, editForm);
      toast.success("Event updated successfully");
      setEditingEvent(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update event");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelEvent = async (id: string) => {
    try {
      await cancelOrDeleteEvent(id, "Cancelled by organizer");
      toast.success("Event cancelled successfully");
      fetchData();
    } catch {
      toast.error("Failed to cancel event");
    }
  };

  if (loading) {
    return <LoadingPage showFooter={false} />;
  }

  const now = new Date();
  const isItemMatch = (e: any) => {
    if (verticalFilter === "EVENTS") return e.category?.toLowerCase() !== "dining";
    if (verticalFilter === "DINING") return e.category?.toLowerCase() === "dining";
    return true;
  };

  const activeEvents = events.filter(
    (e) => isItemMatch(e) && e.status === "PUBLISHED" && new Date(e.ends_at) >= now,
  );
  const pendingEvents = events.filter(
    (e) => isItemMatch(e) && (e.status === "PENDING_APPROVAL" || e.status === "DRAFT"),
  );
  const pastEvents = events.filter(
    (e) => isItemMatch(e) && (e.status === "CANCELLED" || new Date(e.ends_at) < now),
  );
  const currentList =
    activeTab === "ACTIVE"
      ? activeEvents
      : activeTab === "PENDING"
        ? pendingEvents
        : activeTab === "PAST"
          ? pastEvents
          : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Header />
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 pb-16 pt-28 sm:pt-36 lg:pt-40">
        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-6 sm:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                {partner?.business_name || "Partner Dashboard"}
              </h1>
              <Badge
                className={
                  partner?.status === "APPROVED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold"
                    : partner?.status === "PENDING_APPROVAL"
                      ? "bg-[#7B1E3D]/5 text-[#7B1E3D] border border-[#7B1E3D]/30 font-bold"
                      : "bg-slate-100 text-slate-600 border border-slate-200 font-bold"
                }
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {partner?.status === "APPROVED"
                  ? "Approved"
                  : partner?.status === "PENDING_APPROVAL"
                    ? "Pending Approval"
                    : partner?.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#7B1E3D]" />{" "}
                {partner?.city}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-[#7B1E3D]" />{" "}
                {partner?.contact_phone}
              </span>
              <span className="flex items-center gap-1">
                <Store className="h-3.5 w-3.5 text-[#7B1E3D]" />{" "}
                {partner?.partner_type
                  ? (partnerTypeMeta[partner.partner_type]?.label ??
                    partner.partner_type)
                  : "Partner"}
              </span>
            </div>
          </div>
          {partner?.status !== "APPROVED" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2 text-sm text-amber-800 font-medium">
              <Clock className="h-4 w-4" />
              Application under review · We'll notify you once approved
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
              <Button
                variant="outline"
                onClick={() => navigate("/partner/coupons")}
                className="border-slate-300 hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-xs py-2 px-3 sm:px-4 cursor-pointer"
              >
                <Tag className="h-4 w-4 text-[#7B1E3D]" /> Manage Coupons
              </Button>
              <Button
                onClick={() => navigate("/partner/dining/new")}
                className="bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-xs py-2 px-3 sm:px-4 cursor-pointer"
              >
                <Utensils className="h-4 w-4" /> Host Dining
              </Button>
              <Button
                onClick={() => navigate("/partner/events/new")}
                className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-xs py-2 px-3 sm:px-4 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Host Event
              </Button>
            </div>
          )}
        </div>

        {partner?.status !== "APPROVED" ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm">
            <Clock className="mx-auto h-10 w-10 text-[#7B1E3D] mb-3" />
            <h3 className="font-bold text-lg text-slate-900">
              Your application is under review
            </h3>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
              We'll notify you once an admin approves your account. You'll then
              be able to start listing on Vyhbz.
            </p>
          </div>
        ) : (
          <>
            {/* Tabs Navigation & Vertical Filter */}
            <div className="mb-6 sm:mb-8 space-y-3">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto no-scrollbar scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    type="button"
                    onClick={() => setActiveTab("ACTIVE")}
                    className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      activeTab === "ACTIVE"
                        ? "bg-[#7B1E3D] text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <CalendarCheck className="h-4 w-4 shrink-0" />
                    <span>Active</span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                        activeTab === "ACTIVE"
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {activeEvents.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("PENDING")}
                    className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      activeTab === "PENDING"
                        ? "bg-[#7B1E3D] text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>Under Review</span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                        activeTab === "PENDING"
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {pendingEvents.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("PAST")}
                    className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      activeTab === "PAST"
                        ? "bg-[#7B1E3D] text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <CalendarX className="h-4 w-4 shrink-0" />
                    <span>Past</span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                        activeTab === "PAST"
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {pastEvents.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("REVENUE")}
                    className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      activeTab === "REVENUE"
                        ? "bg-[#7B1E3D] text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <TrendingUp className="h-4 w-4 shrink-0" />
                    <span>Revenue</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("STATEMENT")}
                    className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      activeTab === "STATEMENT"
                        ? "bg-[#7B1E3D] text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span>Account Statement</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("BANK")}
                    className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      activeTab === "BANK"
                        ? "bg-[#7B1E3D] text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <Landmark className="h-4 w-4 shrink-0" />
                    <span>Bank & Remittance</span>
                  </button>
                </div>

                {/* Vertical Filter Pills: Events vs Restaurants */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs self-start lg:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setVerticalFilter("ALL")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                      verticalFilter === "ALL"
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    All ({events.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerticalFilter("EVENTS")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1 ${
                      verticalFilter === "EVENTS"
                        ? "bg-[#7B1E3D] text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Live Events ({events.filter((e) => e.category?.toLowerCase() !== "dining").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerticalFilter("DINING")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1 ${
                      verticalFilter === "DINING"
                        ? "bg-amber-800 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    Restaurants ({events.filter((e) => e.category?.toLowerCase() === "dining").length})
                  </button>
                </div>
              </div>
            </div>

            {activeTab === "REVENUE" && partner && (
              <RevenueDashboard partnerId={partner.id} />
            )}

            {activeTab === "STATEMENT" && (
              <PartnerStatementDashboard />
            )}

            {activeTab === "BANK" && partner && (
              <PartnerBankDashboard partner={partner} onUpdated={fetchData} />
            )}

            {activeTab !== "REVENUE" && activeTab !== "STATEMENT" && activeTab !== "BANK" && currentList.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 shadow-sm">
                <p className="text-base font-bold text-slate-800 mb-1">
                  No {verticalFilter === "DINING" ? "dining / restaurant listings" : verticalFilter === "EVENTS" ? "live events" : "listings"} found
                </p>
                <p className="text-xs text-slate-400">
                  {verticalFilter === "DINING"
                    ? 'Click "Host Dining" to publish your dining menu or restaurant pass.'
                    : 'Click "Host Event" to publish your next event.'}
                </p>
              </div>
            )}

            {activeTab !== "REVENUE" && currentList.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentList.map((e) => {
                  const isPast = new Date(e.ends_at) < now;
                  const hoursUntilStart =
                    (new Date(e.starts_at).getTime() - now.getTime()) /
                    (1000 * 60 * 60);
                  const isEditLocked =
                    e.status === "PUBLISHED" && hoursUntilStart < 24;

                  return (
                    <div
                      key={e.id}
                      className="bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
                    >
                      <div>
                        <div className="aspect-[16/9] bg-slate-100 relative">
                          {e.poster_image_url ? (
                            <img
                              src={e.poster_image_url}
                              alt={e.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <ImageOff className="h-8 w-8" />
                            </div>
                          )}
                          <div className="absolute top-3 right-3">
                            <Badge
                              className={`border ${e.status === "PUBLISHED" && !isPast ? "bg-emerald-50 text-emerald-700 border-emerald-200" : e.status === "PENDING_APPROVAL" ? "bg-[#7B1E3D]/5 text-[#7B1E3D] border-[#7B1E3D]/30" : "bg-slate-100 text-slate-600 border-slate-200"}`}
                            >
                              {isPast ? "COMPLETED" : e.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-5">
                          <span className="text-[10px] font-bold text-[#7B1E3D] uppercase tracking-wider">
                            {e.category}
                          </span>
                          <h3 className="text-lg font-bold text-slate-900 mt-1 line-clamp-1">
                            {e.title}
                          </h3>
                          <p className="text-slate-500 text-xs mt-2 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />{" "}
                            {e.venue_name}, {e.city}
                          </p>
                          <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />{" "}
                            {format(
                              parseISO(e.starts_at),
                              "MMM d, yyyy · h:mm a",
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="p-5 pt-0 border-t border-slate-100 mt-4 flex items-center justify-between">
                        <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                          <Ticket className="h-3.5 w-3.5 text-[#7B1E3D]" />{" "}
                          {e.ticket_categories?.length || 1} Tier(s)
                        </div>
                        <div className="flex items-center gap-1">
                          {e.status !== "CANCELLED" && !isPast && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isEditLocked}
                                onClick={() => openEditModal(e)}
                                title={
                                  isEditLocked ? "Locked within 24h" : "Edit"
                                }
                                className={
                                  isEditLocked
                                    ? "text-slate-400 cursor-not-allowed"
                                    : "text-slate-700 hover:bg-slate-100 rounded-xl"
                                }
                              >
                                <Edit3 className="h-3.5 w-3.5 mr-1" />{" "}
                                {isEditLocked ? "Locked" : "Edit"}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-rose-600 hover:bg-rose-50 rounded-xl"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-white border-slate-200 text-slate-900 rounded-3xl shadow-xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-lg font-bold">
                                      Cancel Event?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-600 text-sm">
                                      Cancel{" "}
                                      <strong className="text-slate-900">
                                        {e.title}
                                      </strong>
                                      ? This will notify attendees and stop
                                      sales.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="gap-2 mt-4">
                                    <AlertDialogCancel className="bg-slate-100 text-slate-700 border-0 hover:bg-slate-200 rounded-xl text-xs font-semibold">
                                      Close
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleCancelEvent(e.id)}
                                      className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
                                    >
                                      Confirm
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <Dialog
          open={!!editingEvent}
          onOpenChange={(open) => !open && setEditingEvent(null)}
        >
          <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg rounded-3xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                Edit Event Details
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-semibold text-slate-600">
                  Event Title
                </Label>
                <Input
                  id="edit-title"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className="bg-slate-50 border-slate-200 mt-1 rounded-xl"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">
                  Description
                </Label>
                <Textarea
                  id="edit-desc"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className="bg-slate-50 border-slate-200 mt-1 min-h-[80px] rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-600">
                    Venue
                  </Label>
                  <Input
                    id="edit-venue"
                    value={editForm.venue_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, venue_name: e.target.value })
                    }
                    className="bg-slate-50 border-slate-200 mt-1 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600">
                    City
                  </Label>
                  <Input
                    id="edit-city"
                    value={editForm.city}
                    onChange={(e) =>
                      setEditForm({ ...editForm, city: e.target.value })
                    }
                    className="bg-slate-50 border-slate-200 mt-1 rounded-xl"
                    required
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">
                  Poster URL
                </Label>
                <Input
                  id="edit-image"
                  value={editForm.poster_image_url}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      poster_image_url: e.target.value,
                    })
                  }
                  className="bg-slate-50 border-slate-200 mt-1 rounded-xl"
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-600">
                  Language
                </Label>
                <select
                  value={editForm.language}
                  onChange={(e) =>
                    setEditForm({ ...editForm, language: e.target.value })
                  }
                  className="w-full h-10 px-3 mt-1 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7B1E3D]"
                >
                  <option value="">None / Not Specified</option>
                  <option value="english">English</option>
                  <option value="malayalam">Malayalam</option>
                  <option value="hindi">Hindi</option>
                  <option value="tamil">Tamil</option>
                  <option value="telugu">Telugu</option>
                  <option value="kannada">Kannada</option>
                  <option value="multi">Multilingual</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-600">Tags</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {[
                    { key: "outdoor", label: "Outdoor" },
                    { key: "fast_filling", label: "Fast Filling" },
                    { key: "must_attend", label: "Must Attend" },
                    { key: "unmissable", label: "Unmissable" },
                    { key: "kids_allowed", label: "Kids Allowed" },
                    { key: "masterclass", label: "Masterclass" },
                    { key: "new_year_party", label: "New Year Party" },
                  ].map((t) => {
                    const isSelected = editForm.tags.includes(t.key);
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => {
                          const nextTags = isSelected
                            ? editForm.tags.filter((x) => x !== t.key)
                            : [...editForm.tags, t.key];
                          setEditForm({ ...editForm, tags: nextTags });
                        }}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                          isSelected
                            ? "bg-[#7B1E3D] text-white border-[#7B1E3D] font-medium"
                            : "bg-white text-slate-700 border-slate-200 hover:border-[#7B1E3D]"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "}{t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-600">Attributes & Flags</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    { key: "is_online", label: "Online Event" },
                    { key: "is_outdoor", label: "Outdoor Event" },
                    { key: "is_fast_filling", label: "Fast Filling" },
                    { key: "is_must_attend", label: "Must Attend" },
                    { key: "is_unmissable", label: "Unmissable" },
                    { key: "kids_allowed", label: "Kids Allowed" },
                    { key: "masterclass", label: "Masterclass" },
                    { key: "new_year_party", label: "New Year Party" },
                  ].map((flag) => {
                    const checked = Boolean((editForm as any)[flag.key]);
                    return (
                      <label
                        key={flag.key}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                          checked
                            ? "bg-[#FDF2F4] border-[#7B1E3D] text-[#7B1E3D] font-medium"
                            : "bg-white border-slate-200 text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              [flag.key]: e.target.checked,
                            })
                          }
                          className="rounded border-slate-300 text-[#7B1E3D] focus:ring-[#7B1E3D]"
                        />
                        <span>{flag.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingEvent(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold rounded-xl"
                >
                  {savingEdit ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}
