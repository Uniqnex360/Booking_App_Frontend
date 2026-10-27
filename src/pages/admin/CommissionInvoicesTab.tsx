import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Search,
  Building2,
  ChevronDown,
  Check,
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
import { SearchableTheatreSelect } from '@/components/common/SearchableTheatreSelect';

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
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [pendingSearchQuery, setPendingSearchQuery] = useState('');
  const [pendingStatusFilter, setPendingStatusFilter] = useState<'ALL' | 'OVERDUE' | 'ISSUED' | 'APPROVED' | 'DRAFT'>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<CommissionInvoice | null>(null);

  // Generate form state
  const [genVenueId, setGenVenueId] = useState('');
  const [modalTheatreSearch, setModalTheatreSearch] = useState('');
  const [isTheatreSelectorOpen, setIsTheatreSelectorOpen] = useState(false);
  const theatreDropdownRef = useRef<HTMLDivElement>(null);
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
        search: debouncedSearch || undefined,
        limit: 100,
      });
      setInvoices(res.invoices || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [venueFilter, statusFilter, debouncedSearch]);

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

  // Close theatre dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        theatreDropdownRef.current &&
        !theatreDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTheatreSelectorOpen(false);
      }
    };
    if (isTheatreSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTheatreSelectorOpen]);

  const filteredTheatresForModal = theatres.filter((t) => {
    if (!modalTheatreSearch.trim()) return true;
    const q = modalTheatreSearch.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.city && t.city.toLowerCase().includes(q)) ||
      (t.chain_name && t.chain_name.toLowerCase().includes(q)) ||
      (t.address && t.address.toLowerCase().includes(q))
    );
  });

  const selectedModalTheatre = theatres.find((t) => t.id === genVenueId);

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

  // Overdue and pending helpers
  const isOverdue = (inv: CommissionInvoice) => {
    if (inv.status === 'OVERDUE') return true;
    if (inv.status === 'PAID' || inv.status === 'VOIDED') return false;
    const dueDate = new Date(inv.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && inv.balance_paise > 0;
  };

  const getDaysOverdueOrRemaining = (dueDateStr: string) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return {
        label: `Overdue by ${Math.abs(diffDays)}d`,
        isOverdue: true,
        isDueToday: false,
      };
    } else if (diffDays === 0) {
      return {
        label: 'Due today',
        isOverdue: false,
        isDueToday: true,
      };
    } else {
      return {
        label: `Due in ${diffDays}d`,
        isOverdue: false,
        isDueToday: false,
      };
    }
  };

  const pendingInvoices = invoices.filter(
    (inv) =>
      inv.status !== 'PAID' &&
      inv.status !== 'VOIDED' &&
      (inv.balance_paise > 0 || inv.status === 'DRAFT')
  );

  const pendingOverdueCount = pendingInvoices.filter((inv) => isOverdue(inv)).length;
  const pendingTotalBalancePaise = pendingInvoices.reduce(
    (acc, inv) => acc + (inv.balance_paise || 0),
    0
  );

  const filteredPendingInvoices = pendingInvoices.filter((inv) => {
    if (pendingStatusFilter === 'OVERDUE' && !isOverdue(inv)) return false;
    if (pendingStatusFilter === 'ISSUED' && inv.status !== 'ISSUED') return false;
    if (pendingStatusFilter === 'APPROVED' && inv.status !== 'APPROVED') return false;
    if (pendingStatusFilter === 'DRAFT' && inv.status !== 'DRAFT') return false;

    if (!pendingSearchQuery.trim()) return true;
    const q = pendingSearchQuery.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.venue_name && inv.venue_name.toLowerCase().includes(q))
    );
  });

  const handleOpenCollectionFromPending = (inv: CommissionInvoice) => {
    setIsPendingModalOpen(false);
    openCollectionModal(inv);
  };

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
            variant="outline"
            size="sm"
            onClick={() => {
              setPendingSearchQuery('');
              setPendingStatusFilter('ALL');
              setIsPendingModalOpen(true);
            }}
            className="h-9 gap-1.5 text-xs border-amber-300 bg-amber-50 hover:bg-amber-100/80 text-amber-900 font-semibold shadow-2xs"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Invoices
            {pendingInvoices.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold leading-none">
                {pendingInvoices.length}
              </span>
            )}
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setModalTheatreSearch('');
              setIsTheatreSelectorOpen(false);
              setIsGenerateModalOpen(true);
            }}
            className="h-9 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
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

        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setPendingSearchQuery('');
            setPendingStatusFilter('ALL');
            setIsPendingModalOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setPendingSearchQuery('');
              setPendingStatusFilter('ALL');
              setIsPendingModalOpen(true);
            }
          }}
          className="bg-white border border-gray-200 hover:border-amber-400 hover:bg-amber-50/20 p-5 rounded-2xl flex items-center justify-between shadow-2xs hover:shadow-md active:scale-[0.99] transition cursor-pointer group"
          title="Click to view pending commission invoices"
        >
          <div>
            <p className="text-xs uppercase font-medium text-gray-500">Outstanding Receivables</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">₹{(totalOutstandingPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <p className="text-xs text-amber-600/70 mt-1">
              {pendingInvoices.length} invoices awaiting payment
            </p>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
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

            {/* Venue Filter with Search */}
            <SearchableTheatreSelect
              value={venueFilter}
              onChange={setVenueFilter}
              theatres={theatres}
              allOptionLabel="All Theatres / Venues"
              allOptionValue=""
            />

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
              {/* Theatre Venue Searchable Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs uppercase font-semibold text-gray-700">
                    Theatre Venue <span className="text-rose-500">*</span>
                  </label>
                  {selectedModalTheatre && (
                    <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      Rate: {selectedModalTheatre.commission_rate_display} &bull; {selectedModalTheatre.invoice_cycle}
                    </span>
                  )}
                </div>

                <div className="relative" ref={theatreDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTheatreSelectorOpen((prev) => !prev);
                    }}
                    className="w-full bg-gray-50 hover:bg-white border border-gray-300 hover:border-indigo-400 rounded-xl px-3.5 py-2.5 text-left text-sm text-gray-900 flex items-center justify-between transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                  >
                    {selectedModalTheatre ? (
                      <div className="flex items-center gap-2 truncate pr-2">
                        <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-semibold text-gray-900 truncate">
                          {selectedModalTheatre.name}
                        </span>
                        <span className="text-[11px] text-gray-600 bg-gray-200/80 px-2 py-0.5 rounded shrink-0">
                          {selectedModalTheatre.city}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Select a theatre venue...</span>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
                        isTheatreSelectorOpen ? 'rotate-180 text-indigo-600' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown with live search */}
                  {isTheatreSelectorOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 p-2.5 space-y-2 animate-in fade-in-50">
                      <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="text"
                          autoFocus
                          value={modalTheatreSearch}
                          onChange={(e) => setModalTheatreSearch(e.target.value)}
                          placeholder="Search theatre name, city, chain..."
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-xs text-gray-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                        />
                        {modalTheatreSearch && (
                          <button
                            type="button"
                            onClick={() => setModalTheatreSearch('')}
                            className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="text-[10px] text-gray-400 px-1 flex justify-between font-medium">
                        <span>Available Theatres</span>
                        <span>
                          {filteredTheatresForModal.length} of {theatres.length}
                        </span>
                      </div>

                      <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {filteredTheatresForModal.length === 0 ? (
                          <div className="py-6 text-center text-xs text-gray-400">
                            No theatres found matching &ldquo;{modalTheatreSearch}&rdquo;
                          </div>
                        ) : (
                          filteredTheatresForModal.map((t) => {
                            const isSelected = t.id === genVenueId;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  setGenVenueId(t.id);
                                  setIsTheatreSelectorOpen(false);
                                  setModalTheatreSearch('');
                                }}
                                className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between group ${
                                  isSelected
                                    ? 'bg-indigo-50/90 border border-indigo-200 text-indigo-900'
                                    : 'hover:bg-gray-50 border border-transparent'
                                }`}
                              >
                                <div className="truncate pr-2">
                                  <div className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                    <span className="truncate">{t.name}</span>
                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-normal">
                                      {t.city}
                                    </span>
                                    {t.chain_name && (
                                      <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-medium">
                                        {t.chain_name}
                                      </span>
                                    )}
                                  </div>
                                  {t.address && (
                                    <div className="text-[11px] text-gray-400 truncate mt-0.5">
                                      {t.address}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                    {t.commission_rate_display}
                                  </span>
                                  {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Commercial Terms Summary Card */}
                {selectedModalTheatre && (
                  <div className="mt-2 p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-950 flex items-center justify-between">
                    <div>
                      <span className="text-gray-500">Commercial Terms: </span>
                      <strong className="text-indigo-700 font-semibold">
                        {selectedModalTheatre.commission_rate_display} commission
                      </strong>
                      <span className="text-gray-400 mx-1.5">&bull;</span>
                      <span className="text-gray-600">Cycle: </span>
                      <strong className="text-gray-800">{selectedModalTheatre.invoice_cycle}</strong>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                )}
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

      {/* Pending Commission Invoices Modal Popup */}
      {isPendingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-5xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col animate-in fade-in-50">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 rounded-2xl text-amber-700">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xl font-bold text-gray-900">
                      Pending Commission Invoices
                    </h3>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-xs">
                      {pendingInvoices.length} Pending
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Review and act on uncollected receivables, overdue partner settlements, and pending invoice approvals.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPendingModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4 shrink-0">
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl shadow-2xs">
                <p className="text-[11px] font-semibold uppercase text-amber-800">
                  Total Outstanding Receivables
                </p>
                <h4 className="text-xl font-bold text-amber-900 mt-0.5">
                  ₹{(pendingTotalBalancePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h4>
                <p className="text-[11px] text-amber-700/80 mt-0.5">
                  Awaiting partner wire settlement
                </p>
              </div>

              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl shadow-2xs">
                <p className="text-[11px] font-semibold uppercase text-rose-800">
                  Overdue Invoices
                </p>
                <h4 className="text-xl font-bold text-rose-900 mt-0.5">
                  {pendingOverdueCount}
                </h4>
                <p className="text-[11px] text-rose-700/80 mt-0.5">
                  Past standard commercial credit period
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl shadow-2xs">
                <p className="text-[11px] font-semibold uppercase text-blue-800">
                  Issued &amp; Dispatched
                </p>
                <h4 className="text-xl font-bold text-blue-900 mt-0.5">
                  {pendingInvoices.filter((i) => i.status === 'ISSUED').length}
                </h4>
                <p className="text-[11px] text-blue-700/80 mt-0.5">
                  Sent to theatre accounting teams
                </p>
              </div>
            </div>

            {/* Search and Status Filter Pills */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 shrink-0">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={pendingSearchQuery}
                  onChange={(e) => setPendingSearchQuery(e.target.value)}
                  placeholder="Filter pending by invoice # or theatre venue..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-xs text-gray-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
                {pendingSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPendingSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setPendingStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                    pendingStatusFilter === 'ALL'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  All ({pendingInvoices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPendingStatusFilter('OVERDUE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                    pendingStatusFilter === 'OVERDUE'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60'
                  }`}
                >
                  Overdue ({pendingOverdueCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPendingStatusFilter('ISSUED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                    pendingStatusFilter === 'ISSUED'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60'
                  }`}
                >
                  Issued ({pendingInvoices.filter((i) => i.status === 'ISSUED').length})
                </button>
                <button
                  type="button"
                  onClick={() => setPendingStatusFilter('APPROVED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                    pendingStatusFilter === 'APPROVED'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60'
                  }`}
                >
                  Approved ({pendingInvoices.filter((i) => i.status === 'APPROVED').length})
                </button>
                <button
                  type="button"
                  onClick={() => setPendingStatusFilter('DRAFT')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                    pendingStatusFilter === 'DRAFT'
                      ? 'bg-gray-800 text-white shadow-2xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Draft ({pendingInvoices.filter((i) => i.status === 'DRAFT').length})
                </button>
              </div>
            </div>

            {/* Scrollable Invoices Table */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-2xl">
              {filteredPendingInvoices.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <div className="p-3 bg-emerald-50 rounded-full text-emerald-600 mb-2">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800">
                    {pendingSearchQuery
                      ? 'No matching pending invoices'
                      : 'All settlements up to date'}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm">
                    {pendingSearchQuery
                      ? `No pending invoices matched "${pendingSearchQuery}". Try clearing search.`
                      : 'There are currently no unpaid or outstanding commission invoices in this category.'}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] font-semibold sticky top-0 z-10 border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Invoice # &amp; Venue</th>
                      <th className="py-3 px-4">Billing Cycle</th>
                      <th className="py-3 px-4">Due Date &amp; Urgency</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Total Billed</th>
                      <th className="py-3 px-4 text-right">Remaining Due</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {filteredPendingInvoices.map((inv) => {
                      const urgency = getDaysOverdueOrRemaining(inv.due_date);
                      const isInvOverdue = isOverdue(inv);

                      return (
                        <tr
                          key={inv.id}
                          className={`hover:bg-amber-50/40 transition ${
                            isInvOverdue ? 'bg-rose-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-gray-900">
                              {inv.invoice_number}
                            </div>
                            <div className="text-gray-500 flex items-center gap-1.5 mt-0.5">
                              <Building2 className="w-3.5 h-3.5 text-gray-400" />
                              <span className="truncate max-w-[180px] font-medium text-gray-800">
                                {inv.venue_name || 'Partner Venue'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-gray-900">
                              {inv.period_start} &rarr; {inv.period_end}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              {inv.booking_count} bookings ({inv.ticket_count} tickets)
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-mono text-gray-900">{inv.due_date}</div>
                            {urgency && (
                              <div
                                className={`text-[10px] font-semibold mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                                  urgency.isOverdue
                                    ? 'bg-rose-100 text-rose-700 font-bold'
                                    : urgency.isDueToday
                                    ? 'bg-amber-100 text-amber-800 font-bold'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {urgency.label}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">{getStatusBadge(inv.status)}</td>

                          <td className="py-3 px-4 text-right font-mono text-gray-700">
                            ₹{(inv.total_paise / 100).toFixed(2)}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <span
                              className={`font-mono font-bold ${
                                isInvOverdue ? 'text-rose-600' : 'text-amber-600'
                              }`}
                            >
                              ₹{(inv.balance_paise / 100).toFixed(2)}
                            </span>
                            {inv.paid_paise > 0 && (
                              <div className="text-[10px] text-emerald-600 font-mono">
                                (Paid: ₹{(inv.paid_paise / 100).toFixed(2)})
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {inv.balance_paise > 0 && (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenCollectionFromPending(inv)}
                                  className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-2xs"
                                >
                                  <IndianRupee className="w-3 h-3" />
                                  Collect
                                </Button>
                              )}

                              {inv.status === 'DRAFT' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    await handleStatusUpdate(inv.id, 'APPROVED');
                                  }}
                                  className="h-7 px-2 text-[11px] text-blue-600 hover:bg-blue-50 border-blue-200"
                                >
                                  Approve
                                </Button>
                              )}

                              {inv.status === 'APPROVED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    await handleStatusUpdate(inv.id, 'ISSUED');
                                  }}
                                  className="h-7 px-2 text-[11px] text-amber-600 hover:bg-amber-50 border-amber-200"
                                >
                                  Issue
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-200 shrink-0 text-xs text-gray-500">
              <div>
                Showing <strong className="text-gray-900">{filteredPendingInvoices.length}</strong> of{' '}
                <strong className="text-gray-900">{pendingInvoices.length}</strong> pending invoices
                &bull; Total Filtered Due:{' '}
                <strong className="text-amber-700 font-mono">
                  ₹{(filteredPendingInvoices.reduce((a, b) => a + (b.balance_paise || 0), 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPendingModalOpen(false)}
                className="h-8 px-4 text-xs text-gray-700 hover:bg-gray-100"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
