import React, { useState, useEffect } from "react";
import { getTheatreInvoices, getTheatreVenues, TheatreInvoiceItem, TheatreVenueItem } from "@/api/theatre.api";
import { FileText, Filter, Loader2, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TheatreInvoicesPage() {
  const [invoices, setInvoices] = useState<TheatreInvoiceItem[]>([]);
  const [venues, setVenues] = useState<TheatreVenueItem[]>([]);
  const [selectedVenue, setSelectedVenue] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [inv, v] = await Promise.all([
          getTheatreInvoices({
            venue_id: selectedVenue !== "ALL" ? selectedVenue : undefined,
            status: selectedStatus !== "ALL" ? selectedStatus : undefined,
            limit: 100,
          }),
          getTheatreVenues(),
        ]);
        setInvoices(inv || []);
        setVenues(v || []);
      } catch (err) {
        console.error("Invoices error", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedVenue, selectedStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Commission Invoices & Settlements</h1>
          <p className="text-xs text-slate-500 mt-1">
            Audited platform commission statements, GST breakdown, due dates, and settlement remittances.
          </p>
        </div>

        <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-slate-50 text-slate-800">
          {invoices.length} Invoices Found
        </Badge>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
          value={selectedVenue}
          onChange={(e) => setSelectedVenue(e.target.value)}
        >
          <option value="ALL">All Multiplex Venues</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>

        <select
          className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="ISSUED">ISSUED</option>
          <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
          <option value="PAID">PAID</option>
          <option value="OVERDUE">OVERDUE</option>
        </select>
      </div>

      {/* Invoices Table */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#7B1E3D]" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="py-20 bg-white rounded-2xl border border-slate-200 text-center text-sm text-slate-400">
          No commission invoices generated yet for this period.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Multiplex</th>
                  <th className="py-3.5 px-4">Period</th>
                  <th className="py-3.5 px-4">Admissions</th>
                  <th className="py-3.5 px-4">Gross Sales</th>
                  <th className="py-3.5 px-4">Platform Fee</th>
                  <th className="py-3.5 px-4">Total Due</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {inv.venue_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {new Date(inv.period_start).toLocaleDateString([], { month: "short", day: "numeric" })} -{" "}
                      {new Date(inv.period_end).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {inv.tickets_count} tickets
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      ₹{((inv.gross_booking_paise || 0) / 100).toFixed(0)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      ₹{((inv.commission_paise || 0) / 100).toFixed(0)}
                      <span className="text-[10px] text-slate-400 block">+ ₹{((inv.tax_paise || 0) / 100).toFixed(0)} GST</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹{((inv.total_paise || 0) / 100).toFixed(0)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          inv.status === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : inv.status === "ISSUED"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {inv.status}
                      </span>
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

