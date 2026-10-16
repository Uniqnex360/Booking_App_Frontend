import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Clock,
  ShieldAlert,
  FileCode,
  X,
  Filter,
  Loader2,
} from 'lucide-react';
import {
  ReconciliationException,
  getReconciliationExceptions,
  resolveReconciliationException,
} from '../../api/admin.api';
import { AdminSearchBar } from '@/components/admin/AdminSearchBar';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const ReconciliationExceptionsTab: React.FC = () => {
  const [exceptions, setExceptions] = useState<ReconciliationException[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Resolve modal state
  const [selectedEx, setSelectedEx] = useState<ReconciliationException | null>(null);
  const [resolveStatus, setResolveStatus] = useState<'RESOLVED' | 'INVESTIGATING' | 'WRITTEN_OFF'>('RESOLVED');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchExceptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getReconciliationExceptions({
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
        limit: 100,
      });
      setExceptions(res.exceptions || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch exceptions:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter]);

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  const handleOpenResolveModal = (ex: ReconciliationException) => {
    setSelectedEx(ex);
    setResolveStatus('RESOLVED');
    setResolutionNotes(ex.resolution_notes || '');
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEx) return;
    if (!resolutionNotes.trim()) {
      alert('Please enter resolution or audit notes.');
      return;
    }
    try {
      setResolving(true);
      await resolveReconciliationException(selectedEx.id, resolveStatus, resolutionNotes.trim());
      setSelectedEx(null);
      await fetchExceptions();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update exception');
    } finally {
      setResolving(false);
    }
  };

  const filteredExceptions = exceptions.filter((ex) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      (ex.booking_ref && ex.booking_ref.toLowerCase().includes(q)) ||
      (ex.external_ref && ex.external_ref.toLowerCase().includes(q)) ||
      (ex.venue_name && ex.venue_name.toLowerCase().includes(q)) ||
      ex.exception_type.toLowerCase().includes(q) ||
      (ex.discrepancy_details && ex.discrepancy_details.toLowerCase().includes(q))
    );
  });

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== '' ||
    severityFilter !== '';

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setSeverityFilter('');
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" /> CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            LOW
          </span>
        );
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-semibold">OPEN</Badge>;
      case 'INVESTIGATING':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-semibold">INVESTIGATING</Badge>;
      case 'RESOLVED':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">RESOLVED</Badge>;
      case 'WRITTEN_OFF':
        return <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200 font-semibold">WRITTEN OFF</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatJsonDetails = (rawJson: string) => {
    try {
      const parsed = JSON.parse(rawJson);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return rawJson;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Alert Banner */}
      <div className="bg-white border border-gray-200 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              Automated Reconciliation Exceptions Queue
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Tracks payment gateway vs booking engine discrepancies, provider sync failures, and uncollected commission variances.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchExceptions}
            disabled={loading}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Debounced Search */}
          <AdminSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search exceptions by booking ref, venue, exception type, or payload..."
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
              <option value="OPEN">OPEN Only</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="WRITTEN_OFF">WRITTEN OFF</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-10 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
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
              Showing <strong className="text-gray-900">{filteredExceptions.length}</strong> exception items
            </span>
          </div>
          {loading && (
            <span className="inline-flex items-center gap-1.5 text-rose-600 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Scanning exceptions...
            </span>
          )}
        </div>
      </div>

      {/* Exceptions Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50/80 text-gray-600 uppercase text-[11px] font-semibold border-b border-gray-200 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Severity</th>
                <th className="py-3.5 px-4">Exception Type</th>
                <th className="py-3.5 px-4">Reference / Venue</th>
                <th className="py-3.5 px-4">Discrepancy Summary</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Logged At</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading && exceptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-600" />
                    Scanning exceptions ledger...
                  </td>
                </tr>
              ) : filteredExceptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                    <p className="font-semibold text-gray-700">No exceptions found</p>
                    <p className="text-xs text-gray-400 mt-1">All booking transactions and payments are reconciled and balanced.</p>
                  </td>
                </tr>
              ) : (
                filteredExceptions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-rose-50/10 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getSeverityBadge(ex.severity)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-gray-900">
                      {ex.exception_type}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs font-semibold text-gray-900">
                        {ex.booking_ref || ex.external_ref || 'N/A'}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {ex.venue_name || (ex.venue_id ? `Venue: ${ex.venue_id.slice(0, 8)}...` : 'Platform-wide')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-xs text-gray-600 font-mono truncate bg-gray-50 p-1.5 rounded border border-gray-200">
                        {ex.discrepancy_details}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(ex.status)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap font-mono">
                      {new Date(ex.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenResolveModal(ex)}
                        className="h-7 px-2.5 text-xs text-gray-700 border-gray-200 hover:bg-gray-100"
                      >
                        {ex.status === 'RESOLVED' ? 'Audit Details' : 'Investigate'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution Modal */}
      {selectedEx && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Exception Investigation & Resolution
            </h3>
            <p className="text-xs text-gray-500 mb-4 font-mono">
              ID: {selectedEx.id} &bull; Type: {selectedEx.exception_type}
            </p>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div>
                  <span className="text-gray-500">Severity: </span>
                  {getSeverityBadge(selectedEx.severity)}
                </div>
                <div>
                  <span className="text-gray-500">Current Status: </span>
                  {getStatusBadge(selectedEx.status)}
                </div>
                <div>
                  <span className="text-gray-500">Booking Ref: </span>
                  <span className="font-mono text-gray-900 font-semibold">{selectedEx.booking_ref || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Venue: </span>
                  <span className="text-gray-900 font-semibold">{selectedEx.venue_name || 'N/A'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-gray-400" /> Discrepancy Payload
                </label>
                <pre className="bg-gray-50 p-3 rounded-xl text-xs font-mono text-gray-800 border border-gray-200 overflow-x-auto max-h-48 whitespace-pre-wrap">
                  {formatJsonDetails(selectedEx.discrepancy_details)}
                </pre>
              </div>

              <form onSubmit={handleResolveSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs uppercase font-semibold text-gray-700 mb-1.5">
                    Update Resolution Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={resolveStatus}
                    onChange={(e) => setResolveStatus(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-rose-500"
                  >
                    <option value="INVESTIGATING">Mark as INVESTIGATING (Under Review)</option>
                    <option value="RESOLVED">Mark as RESOLVED (Fixed / Reconciled)</option>
                    <option value="WRITTEN_OFF">Mark as WRITTEN_OFF (Accepted Difference)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase font-semibold text-gray-700 mb-1.5">
                    Resolution / Audit Notes <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Describe how the discrepancy was verified and settled..."
                    required
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedEx(null)}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    Close
                  </Button>
                  <Button
                    type="submit"
                    disabled={resolving}
                    className="bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    {resolving ? 'Saving...' : 'Save Resolution'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
