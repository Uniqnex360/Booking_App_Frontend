import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  IndianRupee,
  DollarSign,
  ArrowRight,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import {
  CommissionInvoice,
  getCommissionInvoices,
  generateCommissionInvoice,
  updateInvoiceStatus,
  recordInvoiceCollection,
  getAdminTheatres,
  TheatreListItem
} from '../../api/admin.api';

export const CommissionInvoicesTab: React.FC = () => {
  const [invoices, setInvoices] = useState<CommissionInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Theatres list for dropdown in generator modal
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
  const [genDueDays, setGenDueDays] = useState(15);
  const [genNotes, setGenNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  // Collection form state
  const [colAmountRupees, setColAmountRupees] = useState('');
  const [colMethod, setColMethod] = useState('BANK_TRANSFER');
  const [colRef, setColRef] = useState('');
  const [colNotes, setColNotes] = useState('');
  const [recordingCol, setRecordingCol] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await getCommissionInvoices({
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
  };

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
  }, [statusFilter]);

  useEffect(() => {
    fetchTheatres();
  }, []);

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genVenueId) {
      alert('Please select a theatre venue.');
      return;
    }
    try {
      setGenerating(true);
      await generateCommissionInvoice({
        venue_id: genVenueId,
        period_start: genPeriodStart,
        period_end: genPeriodEnd,
        due_days: Number(genDueDays),
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

  const handleStatusUpdate = async (invoiceId: string, newStatus: 'APPROVED' | 'ISSUED' | 'DISPUTED' | 'VOIDED') => {
    if (!confirm(`Are you sure you want to transition this invoice to ${newStatus}?`)) return;
    try {
      await updateInvoiceStatus(invoiceId, newStatus);
      await fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update invoice status');
    }
  };

  const openCollectionModal = (inv: CommissionInvoice) => {
    setSelectedInvoice(inv);
    setColAmountRupees((inv.balance_paise / 100).toFixed(2));
    setColRef('');
    setColNotes('');
    setIsCollectionModalOpen(true);
  };

  const handleRecordCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    const amountNum = parseFloat(colAmountRupees);
    if (isNaN(amountNum) || amountNum <= 0) {
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
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.venue_name && inv.venue_name.toLowerCase().includes(q))
    );
  });

  // Calculate summary metrics
  const totalInvoicedPaise = invoices.reduce((acc, i) => acc + (i.total_paise || 0), 0);
  const totalCollectedPaise = invoices.reduce((acc, i) => acc + (i.paid_paise || 0), 0);
  const totalOutstandingPaise = invoices.reduce((acc, i) => acc + (i.balance_paise || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700">DRAFT</span>;
      case 'APPROVED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-950/80 text-blue-300 border border-blue-800">APPROVED</span>;
      case 'ISSUED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-950/80 text-amber-300 border border-amber-800">ISSUED</span>;
      case 'PAID':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">PAID</span>;
      case 'OVERDUE':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-950/80 text-red-300 border border-red-800 animate-pulse">OVERDUE</span>;
      case 'DISPUTED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-950/80 text-purple-300 border border-purple-800">DISPUTED</span>;
      case 'VOIDED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-900 text-slate-500 border border-slate-800">VOIDED</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-medium text-slate-400">Total Invoices</p>
            <h3 className="text-2xl font-bold text-white mt-1">{totalCount}</h3>
            <p className="text-xs text-slate-500 mt-1">Generated cycle bills</p>
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-medium text-slate-400">Total Billed</p>
            <h3 className="text-2xl font-bold text-white mt-1">₹{(totalInvoicedPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <p className="text-xs text-slate-500 mt-1">Commission + 18% GST</p>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-medium text-slate-400">Collections Recorded</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">₹{(totalCollectedPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <p className="text-xs text-emerald-500/70 mt-1">Direct wire & transfers</p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-medium text-slate-400">Outstanding Receivables</p>
            <h3 className="text-2xl font-bold text-amber-400 mt-1">₹{(totalOutstandingPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <p className="text-xs text-amber-500/70 mt-1">Awaiting partner payment</p>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-slate-900/40 p-4 border border-slate-800/80 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice # or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="APPROVED">APPROVED</option>
              <option value="ISSUED">ISSUED</option>
              <option value="PAID">PAID</option>
              <option value="OVERDUE">OVERDUE</option>
              <option value="DISPUTED">DISPUTED</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-red-600/20"
          >
            <Plus className="w-4 h-4" />
            Generate Invoice
          </button>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-xs font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-4 px-5">Invoice #</th>
                <th className="py-4 px-5">Theatre Venue</th>
                <th className="py-4 px-5">Billing Period</th>
                <th className="py-4 px-4 text-center">Txns</th>
                <th className="py-4 px-5 text-right">Gross Sales</th>
                <th className="py-4 px-5 text-right">Commission</th>
                <th className="py-4 px-5 text-right">GST (18%)</th>
                <th className="py-4 px-5 text-right">Total Due</th>
                <th className="py-4 px-5 text-right">Balance</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading invoices ledger...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    No commission invoices found. Click "Generate Invoice" to create one.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-4 px-5 font-mono font-medium text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                      {inv.invoice_number}
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-medium text-white">{inv.venue_name || 'All-Chain'}</div>
                      <div className="text-xs text-slate-400 font-mono truncate max-w-[150px]">{inv.venue_id}</div>
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-300">
                      <div>{inv.period_start} <span className="text-slate-500">to</span></div>
                      <div>{inv.period_end}</div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-300 font-mono">
                        {inv.booking_count} / {inv.ticket_count} tix
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-slate-300">
                      ₹{(inv.gross_sales_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-white font-medium">
                      ₹{(inv.commission_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-slate-400">
                      ₹{(inv.tax_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-white font-bold">
                      ₹{(inv.total_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-right font-mono font-bold">
                      {inv.balance_paise === 0 ? (
                        <span className="text-emerald-400">₹0.00</span>
                      ) : (
                        <span className="text-amber-400">
                          ₹{(inv.balance_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="py-4 px-5 text-right space-x-2 whitespace-nowrap">
                      {inv.status === 'DRAFT' && (
                        <button
                          onClick={() => handleStatusUpdate(inv.id, 'APPROVED')}
                          className="px-2.5 py-1 text-xs bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg transition border border-blue-500/30"
                        >
                          Approve
                        </button>
                      )}
                      {inv.status === 'APPROVED' && (
                        <button
                          onClick={() => handleStatusUpdate(inv.id, 'ISSUED')}
                          className="px-2.5 py-1 text-xs bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg transition border border-amber-500/30"
                        >
                          Issue / Send
                        </button>
                      )}
                      {(inv.status === 'ISSUED' || inv.status === 'OVERDUE') && inv.balance_paise > 0 && (
                        <button
                          onClick={() => openCollectionModal(inv)}
                          className="px-2.5 py-1 text-xs bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg transition border border-emerald-500/30"
                        >
                          Collect Payment
                        </button>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-500" />
              Generate Commission Invoice
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Aggregates all completed, un-invoiced bookings for the selected period under the theatre's configured commercial terms.
            </p>

            <form onSubmit={handleGenerateInvoice} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5">
                  Theatre Venue <span className="text-red-400">*</span>
                </label>
                <select
                  value={genVenueId}
                  onChange={(e) => setGenVenueId(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
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
                  <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5">
                    Period Start <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={genPeriodStart}
                    onChange={(e) => setGenPeriodStart(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5">
                    Period End <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={genPeriodEnd}
                    onChange={(e) => setGenPeriodEnd(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5">
                  Payment Due Terms (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={genDueDays}
                  onChange={(e) => setGenDueDays(parseInt(e.target.value) || 15)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5">
                  Invoice Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={genNotes}
                  onChange={(e) => setGenNotes(e.target.value)}
                  placeholder="e.g. Standard weekly commission settlement"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2.5 text-sm text-slate-400 hover:text-white rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-red-600/20"
                >
                  {generating ? 'Compiling Ledger...' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Collection Modal */}
      {isCollectionModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-emerald-400" />
              Record Inward Collection
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Invoice <span className="font-mono text-white font-semibold">{selectedInvoice.invoice_number}</span> &bull; {selectedInvoice.venue_name}
            </p>

            <form onSubmit={handleRecordCollection} className="space-y-4">
              <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 flex justify-between items-center">
                <div>
                  <div className="text-xs text-slate-400">Total Billed</div>
                  <div className="font-mono font-semibold text-white">
                    ₹{(selectedInvoice.total_paise / 100).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Already Paid</div>
                  <div className="font-mono font-semibold text-emerald-400">
                    ₹{(selectedInvoice.paid_paise / 100).toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Remaining Due</div>
                  <div className="font-mono font-bold text-amber-400">
                    ₹{(selectedInvoice.balance_paise / 100).toFixed(2)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5">
                  Amount Received (₹) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={colAmountRupees}
                  onChange={(e) => setColAmountRupees(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5">
                  Payment Method <span className="text-red-400">*</span>
                </label>
                <select
                  value={colMethod}
                  onChange={(e) => setColMethod(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                >
                  <option value="BANK_TRANSFER">Bank Wire / NEFT / RTGS</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="DIRECT_DEBIT">Direct Debit / e-NACH</option>
                  <option value="SETTLEMENT_OFFSET">Settlement Offset</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5">
                  Transaction / UTR Reference <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR192847589201"
                  value={colRef}
                  onChange={(e) => setColRef(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Payment receipt memo..."
                  value={colNotes}
                  onChange={(e) => setColNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCollectionModalOpen(false)}
                  className="px-4 py-2.5 text-sm text-slate-400 hover:text-white rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingCol}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-emerald-600/20"
                >
                  {recordingCol ? 'Allocating...' : 'Confirm Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

