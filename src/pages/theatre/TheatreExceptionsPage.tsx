import React, { useState, useEffect } from "react";
import { getTheatreExceptions, TheatreExceptionItem } from "@/api/theatre.api";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TheatreExceptionsPage() {
  const [exceptions, setExceptions] = useState<TheatreExceptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getTheatreExceptions({ limit: 100 });
        setExceptions(data || []);
      } catch (err) {
        console.error("Exceptions error", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reconciliation & Audit Queue</h1>
          <p className="text-xs text-slate-500 mt-1">
            Auditing webhook responses, ticketing system sync logs, and box office payment discrepancies.
          </p>
        </div>

        <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-slate-50 text-slate-800">
          {exceptions.length} Audit Cases
        </Badge>
      </div>

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
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Discrepancy Type</th>
                  <th className="py-3.5 px-4">Multiplex</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Details</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exceptions.map((exc) => (
                  <tr key={exc.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(exc.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {exc.exception_type}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {exc.venue_name || "—"}
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
                    <td className="py-3.5 px-4 text-slate-600 max-w-sm truncate" title={exc.discrepancy_details}>
                      {exc.discrepancy_details}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        className={`text-[10px] font-bold ${
                          exc.status === "RESOLVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {exc.status}
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

