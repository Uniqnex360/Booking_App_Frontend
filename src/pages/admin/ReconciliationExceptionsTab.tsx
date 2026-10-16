import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  FileCode,
  XCircle
} from 'lucide-react';
import {
  ReconciliationException,
  getReconciliationExceptions,
  resolveReconciliationException
} from '../../api/admin.api';

export const ReconciliationExceptionsTab: React.FC = () => {
  const [exceptions, setExceptions] = useState<ReconciliationException[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  
  // Resolve modal state
  const [selectedEx, setSelectedEx] = useState<ReconciliationException | null>(null);
  const [resolveStatus, setResolveStatus] = useState<'RESOLVED' | 'INVESTIGATING' | 'WRITTEN_OFF'>('RESOLVED');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchExceptions = async () => {
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
  };

  useEffect(() => {
    fetchExceptions();
  }, [statusFilter, severityFilter]);

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

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-red-950/90 text-red-300 border border-red-700 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" /> CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-orange-950/80 text-orange-300 border border-orange-800">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-800">
            LOW
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300">{severity}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-900/50 text-red-300 border border-red-700">OPEN</span>;
      case 'INVESTIGATING':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-900/50 text-amber-300 border border-amber-700">INVESTIGATING</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-900/50 text-emerald-300 border border-emerald-700">RESOLVED</span>;
      case 'WRITTEN_OFF':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-800 text-slate-400 border border-slate-700">WRITTEN OFF</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-800 text-slate-300">{status}</span>;
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
      <div className="bg-slate-900/80 border border-red-500/30 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Automated Reconciliation Exceptions Queue
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tracks payment gateway vs booking engine discrepancies, provider sync failures, and uncollected commission variances.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-300">
            Current Filter Total: <span className="font-bold text-white font-mono">{totalCount}</span>
          </span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/40 p-4 border border-slate-800/80 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN Only</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="WRITTEN_OFF">WRITTEN OFF</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchExceptions}
          disabled={loading}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Exceptions Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-xs font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-4 px-5">Severity</th>
                <th className="py-4 px-5">Exception Type</th>
                <th className="py-4 px-5">Reference / Venue</th>
                <th className="py-4 px-5">Discrepancy Summary</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-5">Logged At</th>
                <th className="py-4 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Scanning exceptions ledger...
                  </td>
                </tr>
              ) : exceptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                    No exceptions found matching current filter! Everything is balanced.
                  </td>
                </tr>
              ) : (
                exceptions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-4 px-5 whitespace-nowrap">
                      {getSeverityBadge(ex.severity)}
                    </td>
                    <td className="py-4 px-5 font-mono text-xs font-bold text-white">
                      {ex.exception_type}
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-mono text-xs text-white">
                        {ex.booking_ref || ex.external_ref || 'N/A'}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {ex.venue_name || (ex.venue_id ? `Venue: ${ex.venue_id.slice(0, 8)}...` : 'Platform-wide')}
                      </div>
                    </td>
                    <td className="py-4 px-5 max-w-xs">
                      <div className="text-xs text-slate-300 font-mono truncate bg-slate-950/50 p-1.5 rounded border border-slate-800">
                        {ex.discrepancy_details}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(ex.status)}
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-400 whitespace-nowrap font-mono">
                      {new Date(ex.created_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenResolveModal(ex)}
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition"
                      >
                        {ex.status === 'RESOLVED' ? 'Audit Details' : 'Investigate'}
                      </button>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              Exception Investigation & Resolution
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              ID: {selectedEx.id} &bull; Type: {selectedEx.exception_type}
            </p>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <div>
                  <span className="text-slate-400">Severity: </span>
                  {getSeverityBadge(selectedEx.severity)}
                </div>
                <div>
                  <span className="text-slate-400">Current Status: </span>
                  {getStatusBadge(selectedEx.status)}
                </div>
                <div>
                  <span className="text-slate-400">Booking Ref: </span>
                  <span className="font-mono text-white font-medium">{selectedEx.booking_ref || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Venue: </span>
                  <span className="text-white font-medium">{selectedEx.venue_name || 'N/A'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-slate-400" /> Discrepancy Payload
                </label>
                <pre className="bg-slate-950 p-3 rounded-xl text-xs font-mono text-slate-300 border border-slate-800 overflow-x-auto max-h-48 whitespace-pre-wrap">
                  {formatJsonDetails(selectedEx.discrepancy_details)}
                </pre>
              </div>

              <form onSubmit={handleResolveSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5">
                    Update Resolution Status <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={resolveStatus}
                    onChange={(e) => setResolveStatus(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="INVESTIGATING">Mark as INVESTIGATING (Under Review)</option>
                    <option value="RESOLVED">Mark as RESOLVED (Fixed / Reconciled)</option>
                    <option value="WRITTEN_OFF">Mark as WRITTEN_OFF (Accepted Difference)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase font-semibold text-slate-300 mb-1.5">
                    Resolution / Audit Notes <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Describe how the discrepancy was verified and settled..."
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedEx(null)}
                    className="px-4 py-2.5 text-sm text-slate-400 hover:text-white rounded-xl transition"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={resolving}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-red-600/20"
                  >
                    {resolving ? 'Saving...' : 'Save Resolution'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

