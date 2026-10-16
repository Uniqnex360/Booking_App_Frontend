import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  IndianRupee,
  Filter,
  X,
  Loader2,
} from 'lucide-react';
import {
  CommissionInvoice,
  getCommissionInvoices,
  generateCommissionInvoice,
  updateInvoiceStatus,
  recordInvoiceCollection,
  getAdminTheatres,
  TheatreListItem,
} from '../../api/admin.api';
import { AdminSearchBar } from '@/components/admin/AdminSearchBar';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const CommissionInvoicesTab: React.FC = () => {
  const [invoices, setInvoices] = useState<CommissionInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [venueFilter, setVenueFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Theatres list for dropdown in generator modal & filter
  const [theatres, setTheatres] = useState<TheatreListItem[]>([]);

  // Modals state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<CommissionInvoice | null>(null);

  // Generate form state
  const [genVenueId, setGenVenueId] = useState('');
  const [genPeriodStart, setGenPeriodStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [genPeriodEnd, setGenPeriodEnd] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [genDueDays, setGenDueDays] = useState(1);
  const [genNotes, setGenNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  // Collection form state
  const [colAmountRupees, setColAmountRupees] = useState('');
  const [colMethod, setColMethod] = useState('BANK_TRANSFER');
  const [colRef, setColRef] = useState('');
  const [colNotes, setColNotes] = useState('');
  const [recordingCol, setRecordingCol] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCommissionInvoices({
        venue_id: venueFilter || undefined,
        status: statusFilter || undefined,
        limit: 100,
      });
      setInvoices(res.invoices || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [venueFilter, statusFilter]);

  const fetchTheatres = async () => {
    try {
      const res = await getAdminTheatres({ limit: 100 });
      setTheatres(res.theatres || []);
      if (res.theatres?.length > 0 && !genVenueId) {
        setGenVenueId(res.theatres[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch theatres for invoicing:', err);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    fetchTheatres();
  }, []);

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genVenueId) {
      alert('Please select a theatre venue');
      return;
    }
    try {
      setGenerating(true);
      await generateCommissionInvoice({
        venue_id: genVenueId,
        period_start: genPeriodStart,
        period_end: genPeriodEnd,
        due_days: genDueDays,
        notes: genNotes || undefined,
      });
      setIsGenerateModalOpen(false);
      setGenNotes('');
      await fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusUpdate = async (
    invoiceId: string,
    newStatus: 'APPROVED' | 'ISSUED' | 'DISPUTED' | 'VOIDED'
  ) => {
    if (!confirm(`Are you sure you want to transition this invoice to ${newStatus}?`)) return;
    try {
      await updateInvoiceStatus(invoiceId, newStatus);
      await fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update invoice status');
    }
  };

  const openCollectionModal = (invoice: CommissionInvoice) => {
    setSelectedInvoice(invoice);
    setColAmountRupees((invoice.balance_paise / 100).toFixed(2));
    setColRef('');
    setColNotes('');
    setIsCollectionModalOpen(true);
  };

  const handleRecordCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    const amountNum = parseFloat(colAmountRupees);
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!colRef) {
      alert('Please enter a transaction / UTR reference');
      return;
    }
    try {
      setRecordingCol(true);
      await recordInvoiceCollection(selectedInvoice.id, {
        amount_paise: Math.round(amountNum * 100),
        payment_method: colMethod,
        payment_ref: colRef,
        notes: colNotes || undefined,
      });
      setIsCollectionModalOpen(false);
      setSelectedInvoice(null);
      await fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to record payment collection');
    } finally {
      setRecordingCol(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.venue_name && inv.venue_name.toLowerCase().includes(q))
    );
  });

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== '' ||
    venueFilter !== '';

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setVenueFilter('');
  };

  // Calculate summary metrics
  const totalInvoicedPaise = invoices.reduce((acc, i) => acc + (i.total_paise || 0), 0);
  const totalCollectedPaise = invoices.reduce((acc, i) => acc + (i.paid_paise || 0), 0);
  const totalOutstandingPaise = invoices.reduce((acc, i) => acc + (i.balance_paise || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">DRAFT</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">APPROVED</Badge>;
      case 'ISSUED':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">ISSUED</Badge>;
      case 'PAID':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">PAID</Badge>;
      case 'OVERDUE':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 animate-pulse">OVERDUE</Badge>;
      case 'DISPUTED':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">DISPUTED</Badge>;
      case 'VOIDED':
        return <Badge variant="outline" className="bg-gray-100 text-gray-400 border-gray-200">VOIDED</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 rounded-lg text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Commission Invoices & Billing</h2>
            <p className="text-xs text-gray-500">
              Manage cycle-based commission billing, partner tax invoices, and inward wire collections.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvoices}
            disabled={loading}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setIsGenerateModalOpen(true)}
            className="h-9 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            Generate Invoice
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 p-5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs uppercase font-medium text-gray-500">Total Invoices</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</h3>
            <p className="text-xs text-gray-400 mt-1">Generated cycle bills</p>
          </div>
          <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs uppercase font-medium text-gray-500">Total Billed</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">₹{(totalInvoicedPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <p className="text-xs text-gray-400 mt-1">Commission + 18% GST</p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs uppercase font-medium text-gray-500">Collections Recorded</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">₹{(totalCollectedPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <p className="text-xs text-emerald-600/70 mt-1">Direct wire & transfers</p>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs uppercase font-medium text-gray-500">Outstanding Receivables</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">₹{(totalOutstandingPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <p className="text-xs text-amber-600/70 mt-1">Awaiting partner payment</p>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Debounced Search */}
          <AdminSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search invoice number or venue..."
            isSearching={loading && searchQuery !== debouncedSearch}
            className="flex-1"
          />

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="APPROVED">APPROVED</option>
              <option value="ISSUED">ISSUED</option>
              <option value="PAID">PAID</option>
              <option value="OVERDUE">OVERDUE</option>
              <option value="DISPUTED">DISPUTED</option>
            </select>

            {/* Venue Filter */}
            <select
              value={venueFilter}
              onChange={(e) => setVenueFilter(e.target.value)}
              className="h-10 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs max-w-[200px] truncate"
            >
              <option value="">All Theatres / Venues</option>
              {theatres.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.city})
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-10 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 rounded-xl"
              >
                <X className="w-3.5 h-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span>
              Showing <strong className="text-gray-900">{filteredInvoices.length}</strong> invoices
            </span>
          </div>
          {loading && (
            <span className="inline-flex items-center gap-1.5 text-indigo-600 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Updating invoices...
            </span>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50/80 text-gray-600 uppercase text-[11px] font-semibold border-b border-gray-200 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Theatre Venue</th>
                <th className="py-3.5 px-4">Billing Period</th>
                <th className="py-3.5 px-4 text-center">Txns</th>
                <th className="py-3.5 px-4 text-right">Gross Sales</th>
                <th className="py-3.5 px-4 text-right">Commission</th>
                <th className="py-3.5 px-4 text-right">GST (18%)</th>
                <th className="py-3.5 px-4 text-right">Total Due</th>
                <th className="py-3.5 px-4 text-right">Balance</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading && invoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading invoices ledger...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-gray-400">
                    No commission invoices found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-gray-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{inv.venue_name || 'All-Chain'}</div>
                      <div className="text-[11px] text-gray-400 font-mono truncate max-w-[150px]">{inv.venue_id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600">
                      <div>{inv.period_start} <span className="text-gray-400">to</span></div>
                      <div>{inv.period_end}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-700 font-mono font-semibold">
                        {inv.booking_count} / {inv.ticket_count} tix
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-gray-600">
                      ₹{(inv.gross_sales_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-gray-900 font-semibold">
                      ₹{(inv.commission_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-gray-500 text-xs">
                      <div>₹{(inv.tax_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div className="text-[10px] text-gray-400">
                        CGST: ₹{((inv.cgst_paise ?? Math.floor(inv.tax_paise / 2)) / 100).toFixed(2)} | SGST: ₹{((inv.sgst_paise ?? (inv.tax_paise - Math.floor(inv.tax_paise / 2))) / 100).toFixed(2)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-indigo-600 font-bold">
                      ₹{(inv.total_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      {inv.balance_paise === 0 ? (
                        <span className="text-emerald-600">₹0.00</span>
                      ) : (
                        <span className="text-amber-600">
                          ₹{(inv.balance_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      {inv.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(inv.id, 'APPROVED')}
                          className="h-7 px-2.5 text-xs text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100"
                        >
                          Approve
                        </Button>
                      )}
                      {inv.status === 'APPROVED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(inv.id, 'ISSUED')}
                          className="h-7 px-2.5 text-xs text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100"
                        >
                          Issue / Send
                        </Button>
                      )}
                      {(inv.status === 'ISSUED' || inv.status === 'OVERDUE') && inv.balance_paise > 0 && (
                        <Button
                          size="sm"
                          onClick={() => openCollectionModal(inv)}
                          className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Collect Payment
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Invoice Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Generate Commission Invoice
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Aggregates all completed, un-invoiced bookings for the selected period under the theatre's configured commercial terms.
            </p>

            <form onSubmit={handleGenerateInvoice} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-gray-700 mb-1.5">
                  Theatre Venue <span className="text-rose-500">*</span>
                </label>
                <select
                  value={genVenueId}
                  onChange={(e) => setGenVenueId(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
                >
                  {theatres.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.city}) — {t.commission_rate_display}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-semibold text-gray-700 mb-1.5">
                    Period Start <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={genPeriodStart}
                    onChange={(e) => setGenPeriodStart(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-semibold text-gray-700 mb-1.5">
                    Period End <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={genPeriodEnd}
                    onChange={(e) => setGenPeriodEnd(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-gray-700 mb-1.5">
                  Payment Due Terms (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={genDueDays}
                  onChange={(e) => setGenDueDays(parseInt(e.target.value) || 1)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-gray-700 mb-1.5">
                  Invoice Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={genNotes}
                  onChange={(e) => setGenNotes(e.target.value)}
                  placeholder="e.g. Standard weekly commission settlement"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={generating}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {generating ? 'Compiling Ledger...' : 'Generate Invoice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Collection Modal */}
      {isCollectionModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-emerald-600" />
              Record Inward Collection
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              Invoice <span className="font-mono text-gray-900 font-semibold">{selectedInvoice.invoice_number}</span> &bull; {selectedInvoice.venue_name}
            </p>

            <form onSubmit={handleRecordCollection} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-500">Total Billed</div>
                  <div className="font-mono font-semibold text-gray-900">
                    ₹{(selectedInvoice.total_paise / 100).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Already Paid</div>
                  <div className="font-mono font-semibold text-emerald-600">
                    ₹{(selectedInvoice.paid_paise / 100).toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Remaining Due</div>
                  <div className="font-mono font-bold text-amber-600">
                    ₹{(selectedInvoice.balance_paise / 100).toFixed(2)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-gray-700 mb-1.5">
                  Amount Received (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={colAmountRupees}
                  onChange={(e) => setColAmountRupees(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-gray-700 mb-1.5">
                  Payment Method <span className="text-rose-500">*</span>
                </label>
                <select
                  value={colMethod}
                  onChange={(e) => setColMethod(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="BANK_TRANSFER">Bank Wire / NEFT / RTGS</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="DIRECT_DEBIT">Direct Debit / e-NACH</option>
                  <option value="SETTLEMENT_OFFSET">Settlement Offset</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-gray-700 mb-1.5">
                  Transaction / UTR Reference <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR192847589201"
                  value={colRef}
                  onChange={(e) => setColRef(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-gray-700 mb-1.5">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Payment receipt memo..."
                  value={colNotes}
                  onChange={(e) => setColNotes(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCollectionModalOpen(false)}
                  className="text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={recordingCol}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {recordingCol ? 'Allocating...' : 'Confirm Collection'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
