import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Building2,
  Landmark,
  FileText,
  CreditCard,
  Download,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  DollarSign,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Send,
  Loader2,
  RefreshCw,
  Edit3,
  X,
  Phone,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import {
  getPartnerStatement,
  updatePartnerBankAccount,
  recordPartnerRemittance,
} from '@/api/admin.api';
import type {
  Partner,
  PartnerStatementResponse,
  PartnerBankAccount,
} from '@/types/partner.types';
import { getPartnerTypeMeta } from '@/lib/partnerTypeMeta';
import { formatRupees } from '@/utils/currencyFormatter';
import { format, parseISO } from 'date-fns';

interface AdminPartnerDetailModalProps {
  partnerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onPartnerUpdated?: () => void;
}

export function AdminPartnerDetailModal({
  partnerId,
  isOpen,
  onClose,
  onPartnerUpdated,
}: AdminPartnerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'statement' | 'bank' | 'profile'>('statement');
  const [statementData, setStatementData] = useState<PartnerStatementResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<string>('ALL');

  // Remittance Modal State
  const [isRecordRemittanceOpen, setIsRecordRemittanceOpen] = useState(false);
  const [remittanceAmount, setRemittanceAmount] = useState<string>('');
  const [remittanceUtr, setRemittanceUtr] = useState<string>('');
  const [remittanceNotes, setRemittanceNotes] = useState<string>('');
  const [submittingRemittance, setSubmittingRemittance] = useState(false);

  // Bank Edit State
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    bank_name: '',
    bank_account_holder_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_account_type: 'CURRENT',
    bank_branch: '',
    remittance_schedule: 'WEEKLY',
  });
  const [savingBank, setSavingBank] = useState(false);

  // Copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchStatement = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const data = await getPartnerStatement(partnerId, { period });
      setStatementData(data);
      if (data?.partner?.bank_account) {
        const b = data.partner.bank_account;
        setBankForm({
          bank_name: b.bank_name !== 'Not Configured' ? b.bank_name : '',
          bank_account_holder_name: b.account_holder_name || '',
          bank_account_number: b.account_number || '',
          bank_ifsc_code: b.ifsc_code !== 'Not Provided' ? b.ifsc_code : '',
          bank_account_type: b.account_type || 'CURRENT',
          bank_branch: b.branch || '',
          remittance_schedule: b.remittance_schedule || 'WEEKLY',
        });
      }
    } catch (err: any) {
      console.error('Failed to load partner statement:', err);
      toast.error('Failed to load partner account statement');
    } finally {
      setLoading(false);
    }
  }, [partnerId, period]);

  useEffect(() => {
    if (isOpen && partnerId) {
      fetchStatement();
    }
  }, [isOpen, partnerId, fetchStatement]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRecordRemittanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerId) return;
    const amountNum = parseFloat(remittanceAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid remittance amount');
      return;
    }
    if (!remittanceUtr.trim()) {
      toast.error('Please enter the Bank UTR / Transaction Reference number');
      return;
    }

    setSubmittingRemittance(true);
    try {
      const bank = statementData?.partner?.bank_account;
      await recordPartnerRemittance(partnerId, {
        amount_paise: Math.round(amountNum * 100),
        utr_number: remittanceUtr.trim(),
        bank_name: bank?.bank_name,
        bank_account_number: bank?.account_number,
        notes: remittanceNotes.trim() || undefined,
      });
      toast.success('Payment remittance recorded successfully!');
      setIsRecordRemittanceOpen(false);
      setRemittanceAmount('');
      setRemittanceUtr('');
      setRemittanceNotes('');
      fetchStatement();
      onPartnerUpdated?.();
    } catch (err: any) {
      console.error('Failed to record remittance:', err);
      toast.error(err?.response?.data?.detail || 'Failed to record remittance');
    } finally {
      setSubmittingRemittance(false);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerId) return;
    if (!bankForm.bank_name.trim() || !bankForm.bank_account_number.trim() || !bankForm.bank_ifsc_code.trim()) {
      toast.error('Bank Name, Account Number and IFSC Code are required.');
      return;
    }

    setSavingBank(true);
    try {
      await updatePartnerBankAccount(partnerId, {
        bank_name: bankForm.bank_name.trim(),
        bank_account_holder_name: bankForm.bank_account_holder_name.trim() || statementData?.partner?.business_name || '',
        bank_account_number: bankForm.bank_account_number.trim(),
        bank_ifsc_code: bankForm.bank_ifsc_code.trim().toUpperCase(),
        bank_account_type: bankForm.bank_account_type,
        bank_branch: bankForm.bank_branch.trim() || undefined,
        remittance_schedule: bankForm.remittance_schedule,
      });
      toast.success('Remittance bank account updated successfully!');
      setIsEditingBank(false);
      fetchStatement();
      onPartnerUpdated?.();
    } catch (err: any) {
      console.error('Failed to update bank account:', err);
      toast.error('Failed to update remittance bank account');
    } finally {
      setSavingBank(false);
    }
  };

  const handleExportCSV = () => {
    if (!statementData || !statementData.statement_ledger) return;
    const partner = statementData.partner;
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
      `statement_${partner.business_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Statement exported to CSV');
  };

  if (!isOpen) return null;

  const partner = statementData?.partner;
  const bank = partner?.bank_account;
  const fin = statementData?.financial_summary;
  const ledger = statementData?.statement_ledger || [];
  const remittances = statementData?.remittances || [];
  const typeMeta = partner ? getPartnerTypeMeta(partner.partner_type) : null;
  const TypeIcon = typeMeta?.icon || Building2;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl bg-slate-50 border-slate-200">
        {loading && !statementData ? (
          <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            <p className="text-sm">Loading partner details & account statement...</p>
          </div>
        ) : !partner ? (
          <div className="p-16 text-center text-slate-500">
            <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold">Partner record not found</p>
          </div>
        ) : (
          <div>
            {/* Top Modal Header */}
            <div className="bg-white p-6 border-b border-slate-200 rounded-t-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 border border-orange-200">
                    <TypeIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-900 truncate">
                        {partner.business_name}
                      </h2>
                      <Badge
                        className={
                          partner.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : partner.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }
                      >
                        {partner.status}
                      </Badge>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold border ${typeMeta?.badgeClass}`}>
                        <TypeIcon className="h-3 w-3" />
                        {typeMeta?.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>Contact: <strong className="text-slate-800">{partner.contact_name}</strong></span>
                      <span>•</span>
                      <span>Phone: <strong className="text-slate-800">{partner.contact_phone}</strong></span>
                      <span>•</span>
                      <span>City: <strong className="text-slate-800">{partner.city}</strong></span>
                      <span>•</span>
                      <span className="text-orange-700 font-semibold bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                        Commission: {partner.commission_rate}%
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={fetchStatement}
                    disabled={loading}
                    className="h-9 px-2.5 text-xs text-slate-600 hover:text-slate-900 bg-white"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 mt-6 border-b border-slate-200 -mb-6 text-sm">
                <button
                  onClick={() => setActiveTab('statement')}
                  className={`pb-3 px-1 font-semibold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'statement'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Account Statement & Ledger
                </button>
                <button
                  onClick={() => setActiveTab('bank')}
                  className={`pb-3 px-1 font-semibold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'bank'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Landmark className="h-4 w-4" />
                  Bank Account of Remittance
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`pb-3 px-1 font-semibold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'profile'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  KYC & Commercial Profile
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* TAB 1: STATEMENT & LEDGER */}
              {activeTab === 'statement' && (
                <div className="space-y-6">
                  {/* Financial Summary Cards */}
                  {fin && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Gross Sales (GMV)
                        </span>
                        <p className="text-lg font-bold text-slate-900 mt-1">
                          {formatRupees(fin.total_gross_paise)}
                        </p>
                        <span className="text-[11px] text-slate-400">
                          {fin.total_bookings_count} bookings processed
                        </span>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Commission ({partner.commission_rate}%)
                        </span>
                        <p className="text-lg font-bold text-rose-600 mt-1">
                          -{formatRupees(fin.platform_commission_paise)}
                        </p>
                        <span className="text-[11px] text-slate-400">Platform share</span>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          TDS / Tax (1%)
                        </span>
                        <p className="text-lg font-bold text-slate-600 mt-1">
                          -{formatRupees(fin.tds_tcs_paise)}
                        </p>
                        <span className="text-[11px] text-slate-400">Statutory withholdings</span>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
                        <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                          Total Remitted
                        </span>
                        <p className="text-lg font-bold text-emerald-700 mt-1">
                          {formatRupees(fin.total_remitted_paise)}
                        </p>
                        <span className="text-[11px] text-emerald-600 font-medium">
                          {fin.total_remittances_count} payouts executed
                        </span>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-amber-300 bg-amber-50/30 shadow-2xs col-span-2 sm:col-span-1">
                        <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider block">
                          Pending Remittance
                        </span>
                        <p className="text-xl font-black text-amber-700 mt-1">
                          {formatRupees(fin.pending_remittance_paise)}
                        </p>
                        <span className="text-[11px] text-amber-800 font-medium">
                          Payable balance
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Period Filter & Actions Toolbar */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-500 mr-1">Period:</span>
                      {[
                        { id: 'ALL', label: 'All Time' },
                        { id: 'THIS_MONTH', label: 'This Month' },
                        { id: 'LAST_30_DAYS', label: 'Last 30 Days' },
                        { id: 'LAST_90_DAYS', label: 'Last 90 Days' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setPeriod(p.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            period === p.id
                              ? 'bg-orange-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => setIsRecordRemittanceOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 gap-1 shadow-2xs cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Record Remittance Payout
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleExportCSV}
                        className="text-xs font-semibold h-9 gap-1 text-slate-700 bg-white cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export Statement
                      </Button>
                    </div>
                  </div>

                  {/* Statement Ledger Table */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4 text-orange-600" />
                        Statement of Account (Chronological Ledger)
                      </h4>
                      <span className="text-xs text-slate-500">
                        {ledger.length} transactions recorded
                      </span>
                    </div>

                    {ledger.length === 0 ? (
                      <div className="p-12 text-center text-slate-400">
                        <Clock className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-semibold text-slate-600">No transactions found for this period</p>
                        <p className="text-xs text-slate-400 mt-0.5">Booking sales and remittance payouts will appear here.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Type</th>
                              <th className="px-4 py-3">Reference / UTR</th>
                              <th className="px-4 py-3">Description / Item</th>
                              <th className="px-4 py-3 text-right">Gross (INR)</th>
                              <th className="px-4 py-3 text-right">Deductions</th>
                              <th className="px-4 py-3 text-right">Net Share (INR)</th>
                              <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {ledger.map((item) => {
                              const isPayout = item.type === 'REMITTANCE_PAYOUT';
                              return (
                                <tr key={item.id} className="hover:bg-slate-50/80 transition">
                                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                    {item.date ? format(parseISO(item.date), 'dd MMM yyyy, hh:mm a') : '—'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                        isPayout
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                                      }`}
                                    >
                                      {isPayout ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                                      {isPayout ? 'Payout Remittance' : 'Ticket Sale'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-mono font-medium text-slate-800 whitespace-nowrap">
                                    {item.reference}
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="font-semibold text-slate-900 truncate max-w-[200px]">
                                      {item.item_title}
                                    </p>
                                    <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                                      {item.description}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium text-slate-700 whitespace-nowrap">
                                    {isPayout ? '—' : formatRupees(item.gross_paise)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-rose-600 whitespace-nowrap">
                                    {isPayout
                                      ? '—'
                                      : `-${formatRupees(item.commission_paise + item.tax_paise)}`}
                                  </td>
                                  <td
                                    className={`px-4 py-3 text-right font-bold whitespace-nowrap ${
                                      isPayout ? 'text-emerald-700' : 'text-slate-900'
                                    }`}
                                  >
                                    {isPayout
                                      ? formatRupees(Math.abs(item.net_paise))
                                      : formatRupees(item.net_paise)}
                                  </td>
                                  <td className="px-4 py-3 text-center whitespace-nowrap">
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

                  {/* Remittance Payouts History Card */}
                  {remittances.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          Remittance Payouts Record to Partner Bank Account
                        </h4>
                        <span className="text-xs text-slate-500">
                          {remittances.length} remittance payouts
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-3">Remitted At</th>
                              <th className="px-4 py-3">Bank UTR Number</th>
                              <th className="px-4 py-3">Destination Bank</th>
                              <th className="px-4 py-3">Account Number</th>
                              <th className="px-4 py-3 text-right">Amount (INR)</th>
                              <th className="px-4 py-3">Notes</th>
                              <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {remittances.map((rem) => (
                              <tr key={rem.id} className="hover:bg-slate-50/80 transition">
                                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                  {rem.created_at ? format(parseISO(rem.created_at), 'dd MMM yyyy, hh:mm a') : '—'}
                                </td>
                                <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                                  {rem.utr_number}
                                </td>
                                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                  {rem.bank_name || 'HDFC Bank'}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                                  {rem.bank_account_number || bank?.masked_account_number || '••••••••'}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                                  {formatRupees(rem.amount_paise)}
                                </td>
                                <td className="px-4 py-3 text-slate-500 truncate max-w-[200px]">
                                  {rem.notes || 'Weekly settlement payout'}
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
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
              )}

              {/* TAB 2: BANK ACCOUNT OF REMITTANCE */}
              {activeTab === 'bank' && (
                <div className="space-y-6">
                  {/* Bank Details Passbook Card */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 shadow-md border border-slate-700">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400">
                          <Landmark className="h-4 w-4" />
                          <span>Official Remittance Bank Account</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mt-1">
                          {bank?.bank_name || 'Bank Not Configured'}
                        </h3>
                        <p className="text-xs text-slate-300 mt-0.5">
                          {bank?.branch ? `Branch: ${bank.branch}` : 'Designated payout account for ticket & table settlements'}
                        </p>
                      </div>

                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                        {bank?.verification_status || 'VERIFIED'}
                      </Badge>
                    </div>

                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700/80">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">
                          Beneficiary Name
                        </span>
                        <p className="text-sm font-semibold text-white mt-0.5 truncate">
                          {bank?.account_holder_name || partner.business_name}
                        </p>
                      </div>

                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">
                          Account Number
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-sm font-mono font-bold text-white">
                            {bank?.account_number || bank?.masked_account_number || '•••• •••• ••••'}
                          </p>
                          {bank?.account_number && (
                            <button
                              onClick={() => handleCopy(bank.account_number!, 'acc')}
                              className="text-slate-400 hover:text-white transition"
                              title="Copy account number"
                            >
                              {copiedKey === 'acc' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">
                          IFSC Code
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-sm font-mono font-bold text-white">
                            {bank?.ifsc_code || '—'}
                          </p>
                          {bank?.ifsc_code && (
                            <button
                              onClick={() => handleCopy(bank.ifsc_code!, 'ifsc')}
                              className="text-slate-400 hover:text-white transition"
                              title="Copy IFSC"
                            >
                              {copiedKey === 'ifsc' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">
                          Account Type & Schedule
                        </span>
                        <p className="text-sm font-semibold text-white mt-0.5">
                          {bank?.account_type || 'CURRENT'} • {bank?.remittance_schedule || 'WEEKLY'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Edit Form Toggle / Container */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          {isEditingBank ? 'Update Remittance Bank Credentials' : 'Bank Configuration & Payout Controls'}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Remittance payouts are processed via NEFT / RTGS to these validated banking details.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={isEditingBank ? 'ghost' : 'outline'}
                        onClick={() => setIsEditingBank(!isEditingBank)}
                        className="h-8 text-xs font-semibold gap-1"
                      >
                        {isEditingBank ? (
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

                    {isEditingBank && (
                      <form onSubmit={handleSaveBank} className="pt-4 border-t border-slate-100 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs font-semibold text-slate-700">Bank Name *</Label>
                            <Input
                              value={bankForm.bank_name}
                              onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                              placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                              className="h-9 text-xs rounded-xl mt-1"
                              required
                            />
                          </div>

                          <div>
                            <Label className="text-xs font-semibold text-slate-700">Account Holder / Beneficiary Name *</Label>
                            <Input
                              value={bankForm.bank_account_holder_name}
                              onChange={(e) => setBankForm({ ...bankForm, bank_account_holder_name: e.target.value })}
                              placeholder="e.g. Partner Business Entity LLP"
                              className="h-9 text-xs rounded-xl mt-1"
                              required
                            />
                          </div>

                          <div>
                            <Label className="text-xs font-semibold text-slate-700">Account Number *</Label>
                            <Input
                              value={bankForm.bank_account_number}
                              onChange={(e) => setBankForm({ ...bankForm, bank_account_number: e.target.value })}
                              placeholder="e.g. 50100239481726"
                              className="h-9 text-xs font-mono rounded-xl mt-1"
                              required
                            />
                          </div>

                          <div>
                            <Label className="text-xs font-semibold text-slate-700">IFSC Code *</Label>
                            <Input
                              value={bankForm.bank_ifsc_code}
                              onChange={(e) => setBankForm({ ...bankForm, bank_ifsc_code: e.target.value })}
                              placeholder="e.g. HDFC0001234"
                              className="h-9 text-xs font-mono uppercase rounded-xl mt-1"
                              required
                            />
                          </div>

                          <div>
                            <Label className="text-xs font-semibold text-slate-700">Account Type</Label>
                            <select
                              value={bankForm.bank_account_type}
                              onChange={(e) => setBankForm({ ...bankForm, bank_account_type: e.target.value })}
                              className="h-9 w-full border border-slate-200 rounded-xl px-3 text-xs bg-white mt-1"
                            >
                              <option value="CURRENT">Current Account</option>
                              <option value="SAVINGS">Savings Account</option>
                              <option value="ESCROW">Escrow Account</option>
                            </select>
                          </div>

                          <div>
                            <Label className="text-xs font-semibold text-slate-700">Bank Branch</Label>
                            <Input
                              value={bankForm.bank_branch}
                              onChange={(e) => setBankForm({ ...bankForm, bank_branch: e.target.value })}
                              placeholder="e.g. MG Road, Bengaluru"
                              className="h-9 text-xs rounded-xl mt-1"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingBank(false)}
                            className="text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={savingBank}
                            className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold"
                          >
                            {savingBank ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Save Remittance Bank
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: PROFILE & KYC */}
              {activeTab === 'profile' && (
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Business Registration & Tax Verification
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          GST Registration
                        </span>
                        <p className="text-base font-mono font-bold text-slate-900">
                          {partner.gst_number || 'Not Provided'}
                        </p>
                        {partner.gst_certificate_url ? (
                          <a
                            href={partner.gst_certificate_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-semibold mt-1"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> View GST Certificate Doc
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">No GST document uploaded</span>
                        )}
                      </div>

                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          PAN Card Verification
                        </span>
                        <p className="text-base font-mono font-bold text-slate-900">
                          {partner.pan_number || 'Not Provided'}
                        </p>
                        {partner.pan_card_url ? (
                          <a
                            href={partner.pan_card_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-semibold mt-1"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> View PAN Card Doc
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">No PAN card uploaded</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-xs">
                    <h4 className="font-bold text-slate-900 text-sm">Commercial Profile Details</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                      <div>
                        <span className="text-slate-400 block">Registered At</span>
                        <p className="font-semibold text-slate-800 mt-0.5">
                          {partner.created_at ? format(parseISO(partner.created_at), 'dd MMM yyyy') : '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Approval Date</span>
                        <p className="font-semibold text-slate-800 mt-0.5">
                          {partner.approved_at ? format(parseISO(partner.approved_at), 'dd MMM yyyy') : 'Pending'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Commission Rate</span>
                        <p className="font-semibold text-slate-800 mt-0.5">{partner.commission_rate}%</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Operating City</span>
                        <p className="font-semibold text-slate-800 mt-0.5">{partner.city}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DIALOG: RECORD REMITTANCE PAYOUT */}
        <Dialog open={isRecordRemittanceOpen} onOpenChange={setIsRecordRemittanceOpen}>
          <DialogContent className="max-w-md bg-white border-slate-200 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="h-4 w-4 text-emerald-600" />
                Record Remittance Payout
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Record a completed bank transfer (NEFT/RTGS/IMPS) payout to {partner?.business_name}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleRecordRemittanceSubmit} className="space-y-4 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="text-slate-500">Remittance Destination Bank:</span>
                <p className="font-semibold text-slate-900">
                  {bank?.bank_name} • {bank?.account_number ? `A/C ${bank.account_number}` : 'No Account'}
                </p>
                <p className="text-[11px] text-amber-700">
                  Current Pending Balance: <strong>{formatRupees(fin?.pending_remittance_paise || 0)}</strong>
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Amount (INR) *</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={remittanceAmount}
                    onChange={(e) => setRemittanceAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    className="pl-7 h-9 text-xs font-semibold rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Bank UTR / Transaction Reference *</Label>
                <Input
                  value={remittanceUtr}
                  onChange={(e) => setRemittanceUtr(e.target.value)}
                  placeholder="e.g. UTR20261027998124"
                  className="h-9 text-xs font-mono rounded-xl mt-1"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Payout Notes / Batch ID</Label>
                <Textarea
                  value={remittanceNotes}
                  onChange={(e) => setRemittanceNotes(e.target.value)}
                  placeholder="e.g. Weekly settlement batch #204, October week 4"
                  rows={2}
                  className="text-xs rounded-xl mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRecordRemittanceOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingRemittance}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  {submittingRemittance ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Confirm & Record Remittance
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

