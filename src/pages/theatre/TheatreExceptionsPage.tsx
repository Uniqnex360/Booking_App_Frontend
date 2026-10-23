import React, { useState, useEffect, useMemo } from "react";
import {
  getTheatreExceptions,
  updateTheatreException,
  TheatreExceptionItem,
} from "@/api/theatre.api";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Search,
  Filter,
  X,
  RotateCcw,
  Check,
  Building2,
  FileText,
  Clock,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function TheatreExceptionsPage() {
  const [exceptions, setExceptions] = useState<TheatreExceptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Investigation / Resolution Modal State
  const [selectedException, setSelectedException] = useState<TheatreExceptionItem | null>(null);
  const [newStatus, setNewStatus] = useState<string>("RESOLVED");
  const [resolutionNote, setResolutionNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getTheatreExceptions({ limit: 100 });
      setExceptions(data || []);
    } catch (err) {
      console.error("Exceptions error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredExceptions = useMemo(() => {
    return exceptions.filter((exc) => {
      // 1. Status Filter
      if (statusFilter !== "ALL" && exc.status.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }

      // 2. Severity Filter
      if (severityFilter !== "ALL" && exc.severity.toUpperCase() !== severityFilter.toUpperCase()) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesType = exc.exception_type.toLowerCase().includes(q);
        const matchesDetails = (exc.discrepancy_details || "").toLowerCase().includes(q);
        const matchesRef = (exc.external_ref || "").toLowerCase().includes(q);
        const matchesVenue = (exc.venue_name || "").toLowerCase().includes(q);
        if (!matchesType && !matchesDetails && !matchesRef && !matchesVenue) return false;
      }

      return true;
    });
  }, [exceptions, statusFilter, severityFilter, searchQuery]);

  const handleOpenModal = (exc: TheatreExceptionItem) => {
    setSelectedException(exc);
    setNewStatus(exc.status === "RESOLVED" ? "RESOLVED" : "RESOLVED");
    setResolutionNote("");
    setSuccessMessage("");
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedException) return;

    setSubmitting(true);
    setSuccessMessage("");
    try {
      await updateTheatreException(selectedException.id, {
        status: newStatus,
        resolution_notes: resolutionNote.trim() || undefined,
      });

      setSuccessMessage("Exception audit case updated successfully!");
      // Reload table
      await loadData();
      setTimeout(() => {
        setSelectedException(null);
      }, 1200);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update exception.");
    } finally {
      setSubmitting(false);
    }
  };

  const getOwnership = (type: string) => {
    if (type.includes("INVOICE") || type.includes("COMMISSION")) {
      return { label: "VYBHZ Finance", color: "bg-purple-50 text-purple-700 border-purple-200" };
    }
    if (type.includes("PAYMENT") || type.includes("GATEWAY")) {
      return { label: "Payment Gateway", color: "bg-blue-50 text-blue-700 border-blue-200" };
    }
    return { label: "Theatre Box Office", color: "bg-amber-50 text-amber-700 border-amber-200" };
  };

  const openCasesCount = exceptions.filter((e) => e.status === "OPEN" || e.status === "INVESTIGATING").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reconciliation & Audit Hub</h1>
          <p className="text-xs text-slate-500 mt-1">
            Reconcile webhook discrepancies, cinema ticketing gateway mismatches, and disputed commission balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {openCasesCount > 0 ? (
            <Badge className="text-xs font-semibold px-3 py-1 bg-amber-500 text-white border-none">
              {openCasesCount} Open Exceptions
            </Badge>
          ) : (
            <Badge className="text-xs font-semibold px-3 py-1 bg-emerald-600 text-white border-none">
              All Reconciled
            </Badge>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by exception type, invoice #, booking reference or details..."
              className="pl-9 pr-9 h-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white text-xs font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 hover:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition"
            >
              <option value="ALL">All Statuses ({exceptions.length})</option>
              <option value="OPEN">OPEN</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="IGNORED">IGNORED</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 hover:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          {(statusFilter !== "ALL" || severityFilter !== "ALL" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("ALL");
                setSeverityFilter("ALL");
                setSearchQuery("");
              }}
              className="h-10 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 rounded-xl"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#7B1E3D]" />
        </div>
      ) : exceptions.length === 0 ? (
        <div className="py-20 bg-white rounded-2xl border border-slate-200 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Clean Audit Trail</h3>
          <p className="text-xs text-slate-400 mt-1">
            No booking or webhook reconciliation exceptions found across your multiplex venues.
          </p>
        </div>
      ) : filteredExceptions.length === 0 ? (
        <div className="py-16 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-700">No reconciliation cases match your filters.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStatusFilter("ALL");
              setSeverityFilter("ALL");
              setSearchQuery("");
            }}
            className="text-xs h-8 gap-1.5"
          >
            <RotateCcw className="w-3 h-3" /> Clear Filters
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Flagged Date</th>
                  <th className="py-3.5 px-4">Discrepancy Category</th>
                  <th className="py-3.5 px-4">Multiplex Facility</th>
                  <th className="py-3.5 px-4">Ownership</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExceptions.map((exc) => {
                  const ownership = getOwnership(exc.exception_type);
                  return (
                    <tr key={exc.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        <div className="font-medium text-slate-700">{new Date(exc.created_at).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(exc.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{exc.exception_type}</div>
                        <div className="text-[11px] text-slate-500 max-w-xs truncate mt-0.5" title={exc.discrepancy_details}>
                          {exc.discrepancy_details}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {exc.venue_name || "All Facilities"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${ownership.color}`}>
                          {ownership.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            exc.severity === "CRITICAL" || exc.severity === "HIGH"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {exc.severity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          className={`text-[10px] font-bold ${
                            exc.status === "RESOLVED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : exc.status === "INVESTIGATING"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {exc.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenModal(exc)}
                          className="h-8 text-xs rounded-xl font-semibold hover:bg-slate-100"
                        >
                          {exc.status === "RESOLVED" ? "View Case" : "Investigate / Resolve"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Investigation / Resolution Modal */}
      {selectedException && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-[#7B1E3D]" />
                  Reconciliation Case Audit
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reference: {selectedException.external_ref || selectedException.booking_id || selectedException.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedException(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Discrepancy Overview */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Category:</span>
                  <span className="font-bold text-slate-900">{selectedException.exception_type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Facility:</span>
                  <span className="text-slate-800">{selectedException.venue_name || "All Locations"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Severity:</span>
                  <span className="font-bold text-rose-600">{selectedException.severity}</span>
                </div>
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="font-bold text-slate-700 block mb-1">Discrepancy Details:</span>
                  <p className="text-slate-600 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200">
                    {selectedException.discrepancy_details}
                  </p>
                </div>
              </div>

              {/* Existing Resolution Notes */}
              {selectedException.resolution_notes && (
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs">
                  <span className="font-bold text-blue-900 block mb-1">Audit Trail & Past Notes:</span>
                  <p className="text-blue-800 whitespace-pre-wrap font-mono text-[11px]">
                    {selectedException.resolution_notes}
                  </p>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  {successMessage}
                </div>
              )}

              {/* Status Update */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Update Resolution Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-xs font-medium text-slate-800"
                >
                  <option value="INVESTIGATING">INVESTIGATING (Under Review with Finance)</option>
                  <option value="RESOLVED">RESOLVED (Reconciled & Accepted)</option>
                  <option value="IGNORED">IGNORED (Tolerable Discrepancy)</option>
                </select>
              </div>

              {/* Notes Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Add Audit Notes / Evidence</label>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Record reconciliation evidence, bank statement ref, or resolution comments..."
                  className="w-full rounded-xl border border-slate-200 p-3 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#7B1E3D]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedException(null)}
                  className="h-9 text-xs rounded-xl text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="h-9 text-xs rounded-xl bg-[#7B1E3D] hover:bg-[#601730] text-white"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                  Submit Case Update
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
