import React, { useState, useEffect, useMemo } from "react";
import {
  getTheatreInvoices,
  getTheatreInvoiceDetails,
  raiseTheatreInvoiceDispute,
  submitTheatreInvoiceRemittance,
  getTheatreVenues,
  TheatreInvoiceItem,
  InvoiceDetailItem,
  TheatreVenueItem,
} from "@/api/theatre.api";
import {
  FileText,
  Filter,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Printer,
  X,
  CreditCard,
  Building2,
  DollarSign,
  HelpCircle,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { INDIAN_STATES, getStateForCity, getCitiesForState } from "@/utils/indiaGeography";
import { toast } from "sonner";

export default function TheatreInvoicesPage() {
  const [invoices, setInvoices] = useState<TheatreInvoiceItem[]>([]);
  const [venues, setVenues] = useState<TheatreVenueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [selectedCity, setSelectedCity] = useState<string>("ALL");
  const [selectedVenue, setSelectedVenue] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Modals
  const [activeInvoiceDetail, setActiveInvoiceDetail] = useState<InvoiceDetailItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Remittance Modal
  const [remitModalInvoice, setRemitModalInvoice] = useState<TheatreInvoiceItem | null>(null);
  const [remitForm, setRemitForm] = useState({
    payment_ref: "",
    payment_method: "NEFT",
    amount_rupees: "",
    notes: "",
  });
  const [submittingRemit, setSubmittingRemit] = useState<boolean>(false);

  // Dispute Modal
  const [disputeModalInvoice, setDisputeModalInvoice] = useState<TheatreInvoiceItem | null>(null);
  const [disputeForm, setDisputeForm] = useState({
    reason: "",
    disputed_amount_rupees: "",
    notes: "",
  });
  const [submittingDispute, setSubmittingDispute] = useState<boolean>(false);

  // Load Invoices and Venues
  const loadData = async () => {
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
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedVenue, selectedStatus]);

  // Cascading Geography
  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedCity("ALL");
    setSelectedVenue("ALL");
  };

  const availableCities = useMemo(() => {
    if (selectedState === "ALL") {
      const cities = Array.from(new Set(venues.map((v) => v.city).filter(Boolean)));
      return cities.sort();
    }
    const stateCities = getCitiesForState(selectedState);
    const venueCities = Array.from(
      new Set(
        venues
          .filter((v) => getStateForCity(v.city) === selectedState)
          .map((v) => v.city)
          .filter(Boolean)
      )
    );
    return Array.from(new Set([...venueCities, ...stateCities])).sort();
  }, [venues, selectedState]);

  const availableVenues = useMemo(() => {
    return venues.filter((v) => {
      if (selectedState !== "ALL" && getStateForCity(v.city) !== selectedState) return false;
      if (selectedCity !== "ALL" && v.city.toLowerCase() !== selectedCity.toLowerCase()) return false;
      return true;
    });
  }, [venues, selectedState, selectedCity]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchedVenue = venues.find((v) => v.id === inv.venue_id);
      if (selectedState !== "ALL" && matchedVenue) {
        if (getStateForCity(matchedVenue.city) !== selectedState) return false;
      }
      if (selectedCity !== "ALL" && matchedVenue) {
        if (matchedVenue.city.toLowerCase() !== selectedCity.toLowerCase()) return false;
      }
      return true;
    });
  }, [invoices, venues, selectedState, selectedCity]);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalInvoiced = filteredInvoices.reduce((acc, i) => acc + (i.total_paise || 0), 0);
    const totalPaid = filteredInvoices.reduce((acc, i) => acc + (i.paid_paise || 0), 0);
    const totalBalance = filteredInvoices.reduce((acc, i) => acc + (i.balance_paise || 0), 0);
    const disputedCount = filteredInvoices.filter((i) => i.status === "DISPUTED").length;
    return { totalInvoiced, totalPaid, totalBalance, disputedCount };
  }, [filteredInvoices]);

  // Handle View Statement Details
  const handleOpenDetailModal = async (invoiceId: string) => {
    setLoadingDetail(true);
    setIsDetailModalOpen(true);
    try {
      const detail = await getTheatreInvoiceDetails(invoiceId);
      setActiveInvoiceDetail(detail);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load invoice statement");
      setIsDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle Remittance Submit
  const handleOpenRemitModal = (inv: TheatreInvoiceItem) => {
    setRemitModalInvoice(inv);
    setRemitForm({
      payment_ref: "",
      payment_method: "NEFT",
      amount_rupees: ((inv.balance_paise || 0) / 100).toFixed(0),
      notes: "",
    });
  };

  const handleRemitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remitModalInvoice) return;
    if (!remitForm.payment_ref.trim()) {
      toast.error("Please enter a bank transaction reference or UTR");
      return;
    }
    const paise = Math.round(parseFloat(remitForm.amount_rupees) * 100);
    if (isNaN(paise) || paise <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    setSubmittingRemit(true);
    try {
      await submitTheatreInvoiceRemittance(remitModalInvoice.id, {
        payment_ref: remitForm.payment_ref.trim(),
        payment_method: remitForm.payment_method,
        amount_paise: paise,
        notes: remitForm.notes.trim() || undefined,
      });
      toast.success("Payment remittance recorded successfully!");
      setRemitModalInvoice(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to record remittance");
    } finally {
      setSubmittingRemit(false);
    }
  };

  // Handle Dispute Submit
  const handleOpenDisputeModal = (inv: TheatreInvoiceItem) => {
    setDisputeModalInvoice(inv);
    setDisputeForm({
      reason: "",
      disputed_amount_rupees: "",
      notes: "",
    });
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeModalInvoice) return;
    if (!disputeForm.reason.trim()) {
      toast.error("Please provide a dispute reason");
      return;
    }
    const paise = disputeForm.disputed_amount_rupees
      ? Math.round(parseFloat(disputeForm.disputed_amount_rupees) * 100)
      : undefined;

    setSubmittingDispute(true);
    try {
      await raiseTheatreInvoiceDispute(disputeModalInvoice.id, {
        reason: disputeForm.reason.trim(),
        disputed_amount_paise: paise,
        notes: disputeForm.notes.trim() || undefined,
      });
      toast.success("Dispute raised. Central Admin finance has been notified.");
      setDisputeModalInvoice(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to raise dispute");
    } finally {
      setSubmittingDispute(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Commission Invoices & Settlements</h1>
            <Badge className="bg-[#7B1E3D] text-white text-[10px] font-bold uppercase tracking-wider">
              Finance & Billing
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative platform commission statements, GST breakdown, due dates, bank remittance, and dispute management.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="h-9 gap-1.5 text-xs text-slate-700"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Statements
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Commission Invoiced
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{(summary.totalInvoiced / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {filteredInvoices.length} Periodic Invoices
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Remitted / Paid
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            ₹{(summary.totalPaid / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[11px] text-emerald-600/80 mt-1 block">Verified by Central Finance</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Outstanding Balance Due
          </span>
          <div className="text-2xl font-black text-[#7B1E3D] mt-1">
            ₹{(summary.totalBalance / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Awaiting settlement transfer</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Disputed Invoices
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1">{summary.disputedCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Under finance investigation</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* State Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">State:</span>
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 hover:bg-white focus:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition"
            >
              <option value="ALL">All States</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">City:</span>
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setSelectedVenue("ALL");
              }}
              className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 hover:bg-white focus:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition"
            >
              <option value="ALL">All Cities {selectedState !== "ALL" ? `in ${selectedState}` : ""}</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Venue Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Venue:</span>
            <select
              className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 hover:bg-white focus:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition"
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
            >
              <option value="ALL">All Multiplexes ({availableVenues.length})</option>
              {availableVenues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.city})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Status:</span>
            <select
              className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 hover:bg-white focus:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ISSUED">ISSUED</option>
              <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
              <option value="PAID">PAID</option>
              <option value="DISPUTED">DISPUTED</option>
              <option value="OVERDUE">OVERDUE</option>
            </select>
          </div>
        </div>

        <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-slate-50 text-slate-800">
          Showing {filteredInvoices.length} of {invoices.length} Invoices
        </Badge>
      </div>

      {/* Invoices Table */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#7B1E3D]" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="py-20 bg-white rounded-2xl border border-slate-200 text-center text-sm text-slate-400">
          No commission invoices match your filters.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Multiplex Facility</th>
                  <th className="py-3.5 px-4">Period</th>
                  <th className="py-3.5 px-4">Admissions</th>
                  <th className="py-3.5 px-4">Gross Box Office</th>
                  <th className="py-3.5 px-4">Platform Fee</th>
                  <th className="py-3.5 px-4">Invoice Total</th>
                  <th className="py-3.5 px-4">Paid / Balance</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const matchedVenue = venues.find((v) => v.id === inv.venue_id);
                  const venueState = matchedVenue ? getStateForCity(matchedVenue.city) : "Other";
                  const balancePaise = inv.balance_paise ?? Math.max(0, (inv.total_paise || 0) - (inv.paid_paise || 0));

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        <div>{inv.venue_name}</div>
                        {matchedVenue && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>{matchedVenue.city}</span>
                            {venueState !== "Other" && (
                              <>
                                <span>•</span>
                                <span className="text-[#7B1E3D] font-medium">{venueState}</span>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(inv.period_start).toLocaleDateString([], { month: "short", day: "numeric" })} -{" "}
                        {new Date(inv.period_end).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {inv.tickets_count} tickets
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        ₹{((inv.gross_booking_paise || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        ₹{((inv.commission_paise || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        <span className="text-[10px] text-slate-400 block">
                          + ₹{((inv.tax_paise || 0) / 100).toFixed(0)} GST
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        ₹{((inv.total_paise || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-emerald-700 font-semibold">
                          ₹{((inv.paid_paise || 0) / 100).toFixed(0)} paid
                        </div>
                        {balancePaise > 0 ? (
                          <div className="text-rose-600 font-bold">
                            ₹{(balancePaise / 100).toFixed(0)} due
                          </div>
                        ) : (
                          <div className="text-emerald-600 text-[11px]">Settled</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            inv.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : inv.status === "DISPUTED"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : inv.status === "PARTIALLY_PAID"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : inv.status === "OVERDUE"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetailModal(inv.id)}
                            className="h-7 px-2.5 text-[11px] gap-1 text-slate-700"
                            title="View Statement & Print PDF"
                          >
                            <FileText className="w-3 h-3 text-[#7B1E3D]" />
                            Statement
                          </Button>

                          {balancePaise > 0 && inv.status !== "DISPUTED" && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenRemitModal(inv)}
                              className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                              title="Submit Bank Remittance / UTR"
                            >
                              <CreditCard className="w-3 h-3" />
                              Pay
                            </Button>
                          )}

                          {inv.status !== "PAID" && inv.status !== "DISPUTED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDisputeModal(inv)}
                              className="h-7 px-2 text-[11px] text-amber-700 hover:bg-amber-50"
                              title="Raise a dispute regarding this invoice"
                            >
                              Dispute
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Detailed Statement & Print Dialog */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-full print:m-0 print:border-none print:shadow-none">
          {loadingDetail || !activeInvoiceDetail ? (
            <div className="py-20 flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#7B1E3D]" />
            </div>
          ) : (
            <div className="space-y-6 text-slate-900" id="printable-statement">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="Vybhz" className="h-8 w-auto object-contain" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#7B1E3D]">
                      Commission Statement
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">VYBHZ Entertainment Private Limited</p>
                  <p className="text-[11px] text-slate-400">GSTIN: 29AAACV1234F1Z8 • Karnataka, India</p>
                </div>

                <div className="text-right space-y-1">
                  <h3 className="font-mono font-bold text-lg text-slate-900">
                    {activeInvoiceDetail.invoice_number}
                  </h3>
                  <Badge
                    className={`text-[10px] uppercase font-bold ${
                      activeInvoiceDetail.status === "PAID"
                        ? "bg-emerald-600 text-white"
                        : "bg-[#7B1E3D] text-white"
                    }`}
                  >
                    {activeInvoiceDetail.status}
                  </Badge>
                  <p className="text-[11px] text-slate-500">
                    Due Date: {new Date(activeInvoiceDetail.due_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Billed To / Facility Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Cinema Partner:</span>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">
                    {activeInvoiceDetail.venue_name}
                  </div>
                  <div className="text-slate-500">{activeInvoiceDetail.venue_city}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Billing Period:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {new Date(activeInvoiceDetail.period_start).toLocaleDateString()} to{" "}
                    {new Date(activeInvoiceDetail.period_end).toLocaleDateString()}
                  </div>
                  <div className="text-slate-500">{activeInvoiceDetail.ticket_count} tickets admitted</div>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeInvoiceDetail.items && activeInvoiceDetail.items.length > 0 ? (
                      activeInvoiceDetail.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2 px-3 text-slate-800">{item.description}</td>
                          <td className="py-2 px-3 text-slate-500 font-mono text-[10px]">{item.item_type}</td>
                          <td className="py-2 px-3 text-right font-medium">
                            ₹{(item.amount_paise / 100).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-2 px-3 text-slate-800">
                          Platform Service Commission ({activeInvoiceDetail.ticket_count} tickets)
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-mono text-[10px]">COMMISSION</td>
                        <td className="py-2 px-3 text-right font-medium">
                          ₹{(activeInvoiceDetail.commission_paise / 100).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-slate-50/50">
                      <td colSpan={2} className="py-2 px-3 font-semibold text-slate-700">
                        Applicable Goods & Services Tax (GST @ 18%)
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-700">
                        ₹{(activeInvoiceDetail.tax_paise / 100).toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-slate-100 font-bold text-slate-900 border-t border-slate-200">
                      <td colSpan={2} className="py-2.5 px-3">
                        Total Invoice Payable
                      </td>
                      <td className="py-2.5 px-3 text-right text-sm text-[#7B1E3D]">
                        ₹{(activeInvoiceDetail.total_paise / 100).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="py-2 px-3 text-emerald-700 font-semibold">
                        Allocated / Received Payments
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-700 font-semibold">
                        - ₹{(activeInvoiceDetail.paid_paise / 100).toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-black text-slate-900 border-t border-slate-200">
                      <td colSpan={2} className="py-2.5 px-3">
                        Closing Balance Due
                      </td>
                      <td className="py-2.5 px-3 text-right text-sm">
                        ₹{(activeInvoiceDetail.balance_paise / 100).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bank Remittance Instructions */}
              <div className="bg-orange-50/60 border border-orange-200 rounded-xl p-4 text-xs space-y-2">
                <div className="font-bold text-orange-950 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-orange-700" />
                  Bank Remittance Payment Details
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Beneficiary</span>
                    <strong className="text-slate-900">
                      {activeInvoiceDetail.remittance_instructions?.beneficiary_name}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Bank Name</span>
                    <strong className="text-slate-900">
                      {activeInvoiceDetail.remittance_instructions?.bank_name}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Account Number</span>
                    <strong className="font-mono text-slate-900">
                      {activeInvoiceDetail.remittance_instructions?.account_number}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">IFSC Code</span>
                    <strong className="font-mono text-slate-900">
                      {activeInvoiceDetail.remittance_instructions?.ifsc_code}
                    </strong>
                  </div>
                </div>
                <p className="text-[11px] text-orange-800 pt-1 border-t border-orange-200/60">
                  Please specify your invoice number{" "}
                  <strong>{activeInvoiceDetail.invoice_number}</strong> in the transfer remarks/reference.
                </p>
              </div>

              {/* Collections History */}
              {activeInvoiceDetail.collections && activeInvoiceDetail.collections.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Recorded Payment Remittances
                  </span>
                  <div className="space-y-1.5">
                    {activeInvoiceDetail.collections.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200"
                      >
                        <div>
                          <span className="font-mono font-bold text-slate-900">{c.payment_ref}</span>
                          <span className="text-slate-400 ml-2">({c.payment_method})</span>
                          {c.notes && <div className="text-[10px] text-slate-500">{c.notes}</div>}
                        </div>
                        <div className="text-right font-bold text-emerald-700">
                          ₹{(c.amount_paise / 100).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 print:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-xs"
                >
                  Close
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => window.print()}
                    className="gap-1.5 text-xs bg-[#7B1E3D] hover:bg-[#631831] text-white"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print / Save PDF
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remittance Recording Dialog */}
      <Dialog open={!!remitModalInvoice} onOpenChange={(open) => !open && setRemitModalInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Submit Bank Remittance Reference
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record bank transfer details for invoice {remitModalInvoice?.invoice_number}.
            </DialogDescription>
          </DialogHeader>

          {remitModalInvoice && (
            <form onSubmit={handleRemitSubmit} className="space-y-3 pt-2 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Bank Reference / UTR Number *
                </label>
                <Input
                  required
                  placeholder="e.g. HDFC000123998811 or UTR123456"
                  value={remitForm.payment_ref}
                  onChange={(e) => setRemitForm({ ...remitForm, payment_ref: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={remitForm.payment_method}
                    onChange={(e) => setRemitForm({ ...remitForm, payment_method: e.target.value })}
                    className="w-full h-9 rounded-md border border-slate-200 px-3 bg-white text-xs"
                  >
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="UPI">UPI</option>
                    <option value="DIRECT_DEBIT">Direct Debit</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Amount Paid (₹) *</label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    value={remitForm.amount_rupees}
                    onChange={(e) => setRemitForm({ ...remitForm, amount_rupees: e.target.value })}
                    className="h-9 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Remittance Notes / Bank Name
                </label>
                <Input
                  placeholder="e.g. Transferred from SBI Corporate Account"
                  value={remitForm.notes}
                  onChange={(e) => setRemitForm({ ...remitForm, notes: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRemitModalInvoice(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingRemit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  {submittingRemit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Remittance
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog
        open={!!disputeModalInvoice}
        onOpenChange={(open) => !open && setDisputeModalInvoice(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Raise Invoice Dispute
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Formal dispute for invoice {disputeModalInvoice?.invoice_number}. Notifies Central Admin
              Finance.
            </DialogDescription>
          </DialogHeader>

          {disputeModalInvoice && (
            <form onSubmit={handleDisputeSubmit} className="space-y-3 pt-2 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Dispute Reason *</label>
                <Input
                  required
                  placeholder="e.g. Cancelled show refunds not deducted, or rate calculation mismatch"
                  value={disputeForm.reason}
                  onChange={(e) => setDisputeForm({ ...disputeForm, reason: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Disputed Amount (₹) (Optional)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Leave blank if disputing full amount"
                  value={disputeForm.disputed_amount_rupees}
                  onChange={(e) =>
                    setDisputeForm({ ...disputeForm, disputed_amount_rupees: e.target.value })
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Evidence Notes & Booking References
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide affected booking IDs or notes for the finance audit team..."
                  value={disputeForm.notes}
                  onChange={(e) => setDisputeForm({ ...disputeForm, notes: e.target.value })}
                  className="w-full rounded-md border border-slate-200 p-2 text-xs focus:outline-none"
                />
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDisputeModalInvoice(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingDispute}
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                >
                  {submittingDispute && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Dispute
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
