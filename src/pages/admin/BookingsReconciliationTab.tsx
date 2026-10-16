import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  searchDetailedBookings,
  AdminDetailedBooking,
} from "@/api/admin.api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  RefreshCw,
  Loader2,
  Ticket,
  Calendar,
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export function BookingsReconciliationTab() {
  const [bookings, setBookings] = useState<AdminDetailedBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedBooking, setSelectedBooking] = useState<AdminDetailedBooking | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await searchDetailedBookings({
        query: query.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        limit: 50,
      });
      setBookings(res.bookings || []);
    } catch {
      toast.error("Failed to load booking transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBookings();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-lg text-blue-600">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Bookings & Sales Monitoring</h2>
            <p className="text-xs text-gray-500">
              Audit ticket sales, financial disaggregation, and separated payment/invoicing statuses.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchBookings}
          disabled={loading}
          className="h-9 gap-1.5 text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <Input
            placeholder="Search by Booking Ref (e.g. AGS-7591A7D4), email, phone, or partner ID..."
            className="pl-9 h-9 text-xs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-md border border-gray-300 px-3 bg-white text-xs font-medium"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="HELD">HELD</option>
        </select>
        <Button type="submit" className="h-9 px-4 text-xs bg-blue-600 hover:bg-blue-700 text-white">
          Search
        </Button>
      </form>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            No booking records found matching your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Show & Theatre</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Gross Total</th>
                  <th className="py-3 px-4">Commission</th>
                  <th className="py-3 px-4">Booking Status</th>
                  <th className="py-3 px-4">Invoice Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      <div>{b.ref_code}</div>
                      <div className="text-[10px] text-gray-400 font-normal">
                        {format(parseISO(b.created_at), "dd MMM yyyy, hh:mm a")}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{b.movie_or_event_title}</div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-gray-400" />
                        {b.venue_name}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div>{b.customer_email || "Guest"}</div>
                      <div className="text-[11px] text-gray-400">{b.customer_phone || "-"}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      ₹{(b.total_paise / 100).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">
                      ₹{(b.commission_earned_paise / 100).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        {b.booking_status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className={`text-[10px] font-bold ${
                        b.commission_invoice_status === "INVOICED"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-gray-50 text-gray-600"
                      }`}>
                        {b.commission_invoice_status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedBooking(b)}
                        className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drilldown Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Transaction Audit: {selectedBooking.ref_code}
                </h3>
                <p className="text-xs text-gray-500">ID: {selectedBooking.id}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedBooking(null)}>✕</Button>
            </div>

            {/* Separated Statuses */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg text-xs">
              <div><span className="text-gray-500">Booking Status:</span> <b className="text-emerald-700">{selectedBooking.booking_status}</b></div>
              <div><span className="text-gray-500">Payment Status:</span> <b className="text-blue-700">{selectedBooking.payment_status}</b></div>
              <div><span className="text-gray-500">Invoice Status:</span> <b className="text-purple-700">{selectedBooking.commission_invoice_status}</b></div>
              <div><span className="text-gray-500">Collection Status:</span> <b className="text-orange-700">{selectedBooking.commission_collection_status}</b></div>
            </div>

            {/* Financial Disaggregation */}
            <div className="space-y-2 text-xs border border-gray-200 rounded-lg p-3">
              <div className="font-bold text-gray-800 uppercase tracking-wide text-[11px]">Financial Disaggregation</div>
              <div className="flex justify-between text-gray-600">
                <span>Ticket Base Sales:</span>
                <span>₹{(selectedBooking.ticket_paise / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Convenience Fees:</span>
                <span>₹{(selectedBooking.convenience_fee_paise / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>FnB Items:</span>
                <span>₹{(selectedBooking.fnb_paise / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-200">
                <span>Gross Customer Paid:</span>
                <span>₹{(selectedBooking.total_paise / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-700 pt-1.5 border-t border-dashed border-gray-200">
                <span>Vybhz Commission Accrued:</span>
                <span>₹{(selectedBooking.commission_earned_paise / 100).toFixed(2)}</span>
              </div>
              {selectedBooking.commission_earned_paise > 0 && (
                <div className="flex justify-between text-gray-500 pl-2 text-[11px]">
                  <span>GST on Commission (18%):</span>
                  <span>
                    ₹{((selectedBooking.commission_tax_paise ?? Math.round(selectedBooking.commission_earned_paise * 0.18)) / 100).toFixed(2)}
                    <span className="text-[10px] text-gray-400 ml-1">
                      (CGST 9%: ₹{((selectedBooking.commission_cgst_paise ?? Math.floor((selectedBooking.commission_tax_paise ?? Math.round(selectedBooking.commission_earned_paise * 0.18)) / 2)) / 100).toFixed(2)}, SGST 9%: ₹{((selectedBooking.commission_sgst_paise ?? ((selectedBooking.commission_tax_paise ?? Math.round(selectedBooking.commission_earned_paise * 0.18)) - Math.floor((selectedBooking.commission_tax_paise ?? Math.round(selectedBooking.commission_earned_paise * 0.18)) / 2))) / 100).toFixed(2)})
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Show Details */}
            <div className="space-y-1.5 text-xs text-gray-600">
              <div><b>Theatre:</b> {selectedBooking.venue_name}</div>
              <div><b>Showtime:</b> {format(parseISO(selectedBooking.showtime_at), "dd MMMM yyyy, hh:mm a")}</div>
              <div><b>Seats:</b> {selectedBooking.seats.join(", ") || `${selectedBooking.quantity} Seat(s)`}</div>
              {selectedBooking.provider_booking_id && (
                <div><b>Partner External ID:</b> <code className="bg-gray-100 px-1 py-0.5 rounded">{selectedBooking.provider_booking_id}</code></div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="sm" onClick={() => setSelectedBooking(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

