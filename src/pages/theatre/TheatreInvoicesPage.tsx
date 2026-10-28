import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getTheatreInvoices,
  getTheatreInvoiceDetails,
  raiseTheatreInvoiceDispute,
  submitTheatreInvoiceRemittance,
  getTheatreVenues,
  getTheatreAccountDetails,
  updateTheatreBankAccount,
  updateTheatreKyc,
  uploadTheatreDocument,
  getTheatreAccountStatement,
  TheatreInvoiceItem,
  InvoiceDetailItem,
  TheatreVenueItem,
  TheatreAccountData,
  TheatreStatementData,
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
  Search,
  CreditCard,
  Building2,
  DollarSign,
  HelpCircle,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Edit,
  Download,
  ShieldCheck,
  Landmark,
  TrendingUp,
  FileCheck2,
  BadgeCheck,
  FileUp,
  Trash2,
  Eye,
  Upload,
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
import { format, parseISO } from "date-fns";
import { useDebounce } from "@/hooks/useDebounce";
import { SearchableTheatreSelect } from "@/components/common/SearchableTheatreSelect";

export default function TheatreInvoicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "my_account" ? "my_account" : "invoices";

  const [activeTab, setActiveTab] = useState<"invoices" | "my_account" | "statement">(initialTab);

  // Invoices & Venues state
  const [invoices, setInvoices] = useState<TheatreInvoiceItem[]>([]);
  const [venues, setVenues] = useState<TheatreVenueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters for invoices
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [selectedCity, setSelectedCity] = useState<string>("ALL");
  const [selectedVenue, setSelectedVenue] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>("");
  const debouncedInvoiceSearch = useDebounce(invoiceSearchQuery, 300);

  // Modals for invoices
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

  // -------------------------------------------------------------------------
  // My Account & Settlement Bank State (Request 25)
  // -------------------------------------------------------------------------
  const [accountData, setAccountData] = useState<TheatreAccountData | null>(null);
  const [loadingAccount, setLoadingAccount] = useState<boolean>(false);
  const [statementData, setStatementData] = useState<TheatreStatementData | null>(null);
  const [loadingStatement, setLoadingStatement] = useState<boolean>(false);
  const [statementDateFilter, setStatementDateFilter] = useState<string>("ALL");

  // Bank Account Update Modal
  const [isBankModalOpen, setIsBankModalOpen] = useState<boolean>(false);
  const [bankForm, setBankForm] = useState({
    bank_name: "",
    bank_account_number: "",
    bank_ifsc_code: "",
    bank_account_holder_name: "",
    bank_account_type: "CURRENT",
    bank_branch: "",
    remittance_schedule: "DAILY",
  });
  const [updatingBank, setUpdatingBank] = useState<boolean>(false);

  // KYC Update Modal
  const [isKycModalOpen, setIsKycModalOpen] = useState<boolean>(false);
  const [kycForm, setKycForm] = useState({
    gst_number: "",
    pan_number: "",
    gst_certificate_url: "",
    pan_card_url: "",
  });
  const [updatingKyc, setUpdatingKyc] = useState<boolean>(false);
  const [uploadingGst, setUploadingGst] = useState<boolean>(false);
  const [uploadingPan, setUploadingPan] = useState<boolean>(false);
  const [gstFileName, setGstFileName] = useState<string>("");
  const [panFileName, setPanFileName] = useState<string>("");

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Load Invoices and Venues
  const loadData = async () => {
    setLoading(true);
    try {
      const [inv, v] = await Promise.all([
        getTheatreInvoices({
          venue_id: selectedVenue !== "ALL" ? selectedVenue : undefined,
          status: selectedStatus !== "ALL" ? selectedStatus : undefined,
          search: debouncedInvoiceSearch || undefined,
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

  // Load Account Details (Request 25)
  const loadAccount = async () => {
    setLoadingAccount(true);
    try {
      const acc = await getTheatreAccountDetails();
      setAccountData(acc);
      if (acc.bank_account) {
        setBankForm({
          bank_name: acc.bank_account.bank_name || "",
          bank_account_number: acc.bank_account.bank_account_number || "",
          bank_ifsc_code: acc.bank_account.bank_ifsc_code || "",
          bank_account_holder_name: acc.bank_account.bank_account_holder_name || "",
          bank_account_type: acc.bank_account.bank_account_type || "CURRENT",
          bank_branch: acc.bank_account.bank_branch || "",
          remittance_schedule: acc.bank_account.remittance_schedule || "DAILY",
        });
      }
      if (acc.kyc) {
        setKycForm({
          gst_number: acc.kyc.gst_number || "",
          pan_number: acc.kyc.pan_number || "",
          gst_certificate_url: acc.kyc.gst_certificate_url || "",
          pan_card_url: acc.kyc.pan_card_url || "",
        });
        if (acc.kyc.gst_certificate_url) {
          setGstFileName(acc.kyc.gst_certificate_url.split("/").pop() || "GST_Certificate");
        }
        if (acc.kyc.pan_card_url) {
          setPanFileName(acc.kyc.pan_card_url.split("/").pop() || "PAN_Card");
        }
      }
    } catch (err) {
      console.warn("Failed to load theatre account", err);
    } finally {
      setLoadingAccount(false);
    }
  };

  // Load Statement & Ledger
  const loadStatement = async () => {
    setLoadingStatement(true);
    try {
      let dateFromParam: string | undefined = undefined;
      const now = new Date();
      if (statementDateFilter === "THIS_MONTH") {
        dateFromParam = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      } else if (statementDateFilter === "LAST_30_DAYS") {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        dateFromParam = d.toISOString();
      } else if (statementDateFilter === "LAST_90_DAYS") {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        dateFromParam = d.toISOString();
      }

      const stmt = await getTheatreAccountStatement({
        date_from: dateFromParam,
      });
      setStatementData(stmt);
    } catch (err) {
      console.warn("Failed to load statement", err);
    } finally {
      setLoadingStatement(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedVenue, selectedStatus, debouncedInvoiceSearch]);

  useEffect(() => {
    if (activeTab === "my_account") {
      loadAccount();
    } else if (activeTab === "statement") {
      loadStatement();
    }
  }, [activeTab, statementDateFilter]);

  // Handle Bank Account Save
  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.bank_account_number || !bankForm.bank_ifsc_code) {
      toast.error("Account Number and IFSC Code are required");
      return;
    }
    setUpdatingBank(true);
    try {
      await updateTheatreBankAccount(bankForm);
      toast.success("Bank account of remittance saved successfully!");
      setIsBankModalOpen(false);
      loadAccount();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update bank account");
    } finally {
      setUpdatingBank(false);
    }
  };

  // Handle Document Uploads
  const handleUploadGst = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("GST Certificate file size exceeds 10MB limit");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "png", "jpg", "jpeg", "webp"].includes(ext)) {
      toast.error("Invalid file format. Please upload a PDF, PNG, JPG, or WEBP document.");
      return;
    }
    setUploadingGst(true);
    try {
      const res = await uploadTheatreDocument(file, "gst_certificate");
      setKycForm((prev) => ({ ...prev, gst_certificate_url: res.url }));
      setGstFileName(file.name);
      toast.success("GST Registration Certificate uploaded successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || "Failed to upload GST certificate");
    } finally {
      setUploadingGst(false);
    }
  };

  const handleUploadPan = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("PAN Card document file size exceeds 10MB limit");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "png", "jpg", "jpeg", "webp"].includes(ext)) {
      toast.error("Invalid file format. Please upload a PDF, PNG, JPG, or WEBP document.");
      return;
    }
    setUploadingPan(true);
    try {
      const res = await uploadTheatreDocument(file, "pan_card");
      setKycForm((prev) => ({ ...prev, pan_card_url: res.url }));
      setPanFileName(file.name);
      toast.success("PAN Card document uploaded successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || "Failed to upload PAN card");
    } finally {
      setUploadingPan(false);
    }
  };

  // Handle KYC Save
  const handleSaveKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    const pan = (kycForm.pan_number || "").trim().toUpperCase();
    if (!pan) {
      toast.error("Permanent Account Number (PAN) is strictly required");
      return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      toast.error("Invalid PAN format! Must be 10 characters (e.g. ABCDE1234F)");
      return;
    }

    const gst = (kycForm.gst_number || "").trim().toUpperCase();
    if (gst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst)) {
      toast.error("Invalid GSTIN format! Expected 15 characters (e.g. 29AAAAA0000A1Z5)");
      return;
    }

    setUpdatingKyc(true);
    try {
      await updateTheatreKyc({
        pan_number: pan,
        gst_number: gst || undefined,
        gst_certificate_url: kycForm.gst_certificate_url || undefined,
        pan_card_url: kycForm.pan_card_url || undefined,
      });
      toast.success("KYC & Tax credentials updated successfully!");
      setIsKycModalOpen(false);
      loadAccount();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || "Failed to update KYC credentials");
    } finally {
      setUpdatingKyc(false);
    }
  };

  // Cascading Geography for Invoices
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
      if (selectedVenue !== "ALL" && inv.venue_id !== selectedVenue) {
        return false;
      }
      if (invoiceSearchQuery.trim()) {
        const q = invoiceSearchQuery.toLowerCase();
        const matchNum = inv.invoice_number.toLowerCase().includes(q);
        const matchVenue = (inv.venue_name || "").toLowerCase().includes(q);
        if (!matchNum && !matchVenue) return false;
      }
      return true;
    });
  }, [invoices, venues, selectedState, selectedCity, selectedVenue, invoiceSearchQuery]);

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
        amount_paise: paise,
        payment_method: remitForm.payment_method,
        payment_ref: remitForm.payment_ref.trim(),
        notes: remitForm.notes.trim() || undefined,
      });
      toast.success("Payment remittance reference recorded successfully!");
      setRemitModalInvoice(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit remittance reference");
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
      toast.error("Please enter a reason for the dispute");
      return;
    }

    setSubmittingDispute(true);
    try {
      const disputedPaise = disputeForm.disputed_amount_rupees
        ? Math.round(parseFloat(disputeForm.disputed_amount_rupees) * 100)
        : undefined;

      await raiseTheatreInvoiceDispute(disputeModalInvoice.id, {
        reason: disputeForm.reason.trim(),
        disputed_amount_paise: disputedPaise,
        notes: disputeForm.notes.trim() || undefined,
      });

      toast.success("Dispute submitted successfully. Central Finance has been notified.");
      setDisputeModalInvoice(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to raise invoice dispute");
    } finally {
      setSubmittingDispute(false);
    }
  };

  // Export Settlement Statement CSV
  const handleExportStatementCSV = () => {
    if (!statementData || statementData.ledger.length === 0) {
      toast.info("No statement ledger entries to export");
      return;
    }

    const headers = [
      "Date & Time",
      "Type",
      "Entry Type",
      "Reference Code",
      "Description",
      "Gross (₹)",
      "Commission Fee (₹)",
      "Net Settled (₹)",
      "Status",
      "Venue",
    ];

    const rows = statementData.ledger.map((l) => [
      `"${new Date(l.date).toLocaleString()}"`,
      `"${l.type}"`,
      `"${l.entry_type}"`,
      `"${l.reference}"`,
      `"${l.description.replace(/"/g, '""')}"`,
      ((l.gross_amount_paise || 0) / 100).toFixed(2),
      ((l.commission_paise || 0) / 100).toFixed(2),
      ((l.net_amount_paise || 0) / 100).toFixed(2),
      `"${l.status}"`,
      `"${l.venue_name || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `theatre_settlement_statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Settlement Statement CSV exported successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Invoices, Settlements & Remittance</h1>
            <Badge className="bg-[#7B1E3D] text-white text-[10px] font-bold uppercase tracking-wider">
              Finance & Payouts
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative platform commission statements, remittance bank credentials, GST/PAN verification, and settlement ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "invoices" ? (
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
          ) : activeTab === "my_account" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={loadAccount}
              disabled={loadingAccount}
              className="h-9 gap-1.5 text-xs text-slate-700"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loadingAccount ? "animate-spin" : ""}`} />
              Refresh Account
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportStatementCSV}
              className="h-9 gap-1.5 text-xs text-slate-700"
            >
              <Download className="w-3.5 h-3.5 text-[#7B1E3D]" />
              Export Statement CSV
            </Button>
          )}
        </div>
      </div>

      {/* SUB-NAVIGATION TABS (Request 25) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "invoices"
              ? "bg-[#7B1E3D] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Commission Invoices & Billing ({invoices.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("my_account")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "my_account"
              ? "bg-[#7B1E3D] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          My Account & Remittance Bank
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("statement")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "statement"
              ? "bg-[#7B1E3D] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Settlement Statement & Ledger
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: INVOICES & COMMISSION BILLING                                  */}
      {/* ===================================================================== */}
      {activeTab === "invoices" && (
        <div className="space-y-6">
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
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Invoice / Venue Search */}
              <div className="relative min-w-[200px] max-w-[260px] flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={invoiceSearchQuery}
                  onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                  placeholder="Search invoice # or venue..."
                  className="w-full h-10 rounded-xl border border-slate-200 pl-8 pr-7 bg-slate-50 hover:bg-white focus:bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7B1E3D]/20 transition"
                />
                {invoiceSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setInvoiceSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

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

              {/* Venue Filter with Search */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Venue:</span>
                <SearchableTheatreSelect
                  value={selectedVenue}
                  onChange={setSelectedVenue}
                  theatres={availableVenues}
                  allOptionLabel={`All Venues (${availableVenues.length})`}
                  allOptionValue="ALL"
                  buttonClassName="bg-slate-50 hover:bg-white focus:bg-white text-slate-800 border-slate-200"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 hover:bg-white focus:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ISSUED">ISSUED</option>
                  <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                  <option value="PAID">PAID</option>
                  <option value="OVERDUE">OVERDUE</option>
                  <option value="DISPUTED">DISPUTED</option>
                </select>
              </div>

              {(selectedState !== "ALL" || selectedCity !== "ALL" || selectedVenue !== "ALL" || selectedStatus !== "ALL" || invoiceSearchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedState("ALL");
                    setSelectedCity("ALL");
                    setSelectedVenue("ALL");
                    setSelectedStatus("ALL");
                    setInvoiceSearchQuery("");
                  }}
                  className="h-10 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 rounded-xl"
                >
                  <X className="w-3.5 h-3.5" />
                  Reset
                </Button>
              )}
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
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDetailModal(inv.id)}
                                className="h-7 px-2 text-[11px] gap-1 bg-white hover:bg-slate-50 cursor-pointer"
                              >
                                <FileText className="w-3 h-3 text-[#7B1E3D]" />
                                Statement
                              </Button>

                              {balancePaise > 0 && inv.status !== "PAID" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenRemitModal(inv)}
                                  className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  Remit
                                </Button>
                              )}

                              {inv.status !== "DISPUTED" && inv.status !== "PAID" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenDisputeModal(inv)}
                                  className="h-7 px-2 text-[11px] text-amber-600 hover:text-amber-700 hover:bg-amber-50 cursor-pointer"
                                >
                                  <AlertTriangle className="w-3 h-3" />
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
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: MY ACCOUNT & REMITTANCE BANK (Request 25)                      */}
      {/* ===================================================================== */}
      {activeTab === "my_account" && (
        <div className="space-y-6">
          {loadingAccount ? (
            <div className="py-24 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#7B1E3D]" />
            </div>
          ) : (
            <>
              {/* TOP GRID: PASSBOOK BANK CARD & BUSINESS KYC */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. DESIGNATED REMITTANCE BANK CARD (Passbook Style) */}
                <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                          <Landmark className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-300 uppercase tracking-widest font-bold">
                            Designated Remittance Bank
                          </div>
                          <div className="text-xl font-black text-white">
                            {accountData?.bank_account?.bank_name || "Official Bank Passbook"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-0.5">
                          <BadgeCheck className="w-3 h-3 mr-1" />
                          {accountData?.bank_account?.bank_verification_status || "VERIFIED"}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => setIsBankModalOpen(true)}
                          className="h-8 px-3 text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl cursor-pointer"
                        >
                          <Edit className="w-3 h-3 mr-1.5" />
                          Update
                        </Button>
                      </div>
                    </div>

                    {/* Account Number & IFSC */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                        <div className="text-[10px] uppercase font-bold text-slate-400">
                          Bank Account Number
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-mono text-lg font-black tracking-wider text-white">
                            {accountData?.bank_account?.bank_account_number || "Not Registered"}
                          </span>
                          {accountData?.bank_account?.bank_account_number && (
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(accountData.bank_account.bank_account_number, "Account Number")
                              }
                              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
                              title="Copy Account Number"
                            >
                              {copiedField === "Account Number" ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                        <div className="text-[10px] uppercase font-bold text-slate-400">
                          IFSC Routing Code
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-mono text-lg font-black tracking-wider text-emerald-300">
                            {accountData?.bank_account?.bank_ifsc_code || "Not Registered"}
                          </span>
                          {accountData?.bank_account?.bank_ifsc_code && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(accountData.bank_account.bank_ifsc_code, "IFSC Code")}
                              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
                              title="Copy IFSC Code"
                            >
                              {copiedField === "IFSC Code" ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Holder, Branch, Type, Cycle */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Beneficiary Holder</div>
                        <div className="font-bold text-white truncate mt-0.5">
                          {accountData?.bank_account?.bank_account_holder_name || accountData?.brand_name || "Registered Entity"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Account Type</div>
                        <div className="font-bold text-white mt-0.5">
                          {accountData?.bank_account?.bank_account_type || "CURRENT"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Bank Branch</div>
                        <div className="font-bold text-white truncate mt-0.5">
                          {accountData?.bank_account?.bank_branch || "Main Branch"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Remittance Cycle</div>
                        <div className="font-bold text-emerald-300 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {accountData?.bank_account?.remittance_schedule || "Daily (T+1)"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between mt-4">
                    <span>Direct automated NEFT / RTGS settlement transfers into this account.</span>
                    <span className="text-emerald-400 font-bold">PDI Authorized</span>
                  </div>
                </div>

                {/* 2. BUSINESS REGISTRATION & KYC */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-[#7B1E3D]" />
                        <h3 className="font-bold text-slate-900 text-sm">Business Identity & KYC</h3>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsKycModalOpen(true)}
                        className="h-7 text-xs text-[#7B1E3D] hover:bg-slate-50 cursor-pointer"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit KYC
                      </Button>
                    </div>

                    <div className="space-y-4 pt-4 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Registered Brand / Chain
                        </span>
                        <div className="font-black text-slate-900 text-sm mt-0.5">
                          {accountData?.brand_name || "Cinema Brand"}
                        </div>
                        <span className="text-[11px] text-slate-500">Code: {accountData?.brand_code || "N/A"}</span>
                      </div>

                      {/* GSTIN */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-500">GSTIN Number</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            accountData?.kyc?.gst_number
                              ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                              : "text-slate-500 bg-slate-100 border border-slate-200"
                          }`}>
                            {accountData?.kyc?.gst_number ? "Verified" : "Optional"}
                          </span>
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-sm mt-1">
                          {accountData?.kyc?.gst_number || "Not Registered"}
                        </div>
                        {accountData?.kyc?.gst_certificate_url ? (
                          <a
                            href={accountData.kyc.gst_certificate_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-[#7B1E3D] hover:underline flex items-center gap-1 mt-1.5 font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Certificate
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsKycModalOpen(true)}
                            className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100 flex items-center gap-1 mt-1.5 font-semibold w-fit cursor-pointer transition"
                          >
                            <FileUp className="w-3 h-3" />
                            Upload GST Certificate
                          </button>
                        )}
                      </div>

                      {/* PAN */}
                      <div className={`p-3 rounded-xl border ${
                        accountData?.kyc?.pan_number
                          ? "bg-slate-50 border-slate-200"
                          : "bg-rose-50/50 border-rose-200"
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-500">
                            Permanent Account Number (PAN)
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            accountData?.kyc?.pan_number
                              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                              : "text-rose-700 bg-rose-100 border-rose-300"
                          }`}>
                            {accountData?.kyc?.pan_number ? "Verified (Strict)" : "Required"}
                          </span>
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-sm mt-1">
                          {accountData?.kyc?.pan_number || (
                            <span className="text-rose-600 text-xs font-sans font-medium">
                              PAN strictly required for tax remittance
                            </span>
                          )}
                        </div>
                        {accountData?.kyc?.pan_card_url ? (
                          <a
                            href={accountData.kyc.pan_card_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-[#7B1E3D] hover:underline flex items-center gap-1 mt-1.5 font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View PAN Card
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsKycModalOpen(true)}
                            className="text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-200 flex items-center gap-1 mt-1.5 font-semibold w-fit cursor-pointer transition"
                          >
                            <FileUp className="w-3 h-3" />
                            Upload PAN Document
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 mt-4">
                    Authorized for tax invoice credit & statutory GST reporting.
                  </div>
                </div>
              </div>

              {/* FINANCIAL SETTLEMENT SUMMARY CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-600" /> Gross Sales
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    ₹{(((accountData?.financial_summary?.gross_sales_paise || 0) / 100)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Box office volume</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-orange-600" /> Commission
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    ₹{(((accountData?.financial_summary?.commission_invoiced_paise || 0) / 100)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Platform service fee</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Landmark className="w-3 h-3 text-blue-600" /> Cinema Share
                  </div>
                  <div className="text-xl font-black text-blue-900 mt-1">
                    ₹{(((accountData?.financial_summary?.net_share_paise || 0) / 100)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Net earned volume</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Remitted
                  </div>
                  <div className="text-xl font-black text-emerald-700 mt-1">
                    ₹{(((accountData?.financial_summary?.commission_paid_paise || 0) / 100)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Settled to bank</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#7B1E3D]" /> Pending Due
                  </div>
                  <div className="text-xl font-black text-[#7B1E3D] mt-1">
                    ₹{(((accountData?.financial_summary?.commission_outstanding_paise || 0) / 100)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Awaiting payout</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <FileCheck2 className="w-3 h-3 text-purple-600" /> Admissions
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {accountData?.financial_summary?.total_tickets || 0}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    in {accountData?.financial_summary?.total_bookings || 0} orders
                  </div>
                </div>
              </div>

              {/* RECENT SETTLEMENT REMITTANCES PAYOUTS TABLE */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#7B1E3D]" />
                      Settlement & Remittance Payouts History
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Direct bank transfers, UTR tracking references, and reconciled settlement payments.
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("statement")}
                    className="h-8 text-xs text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
                  >
                    View Complete Ledger
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>

                {!accountData?.settlement_remittances || accountData.settlement_remittances.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No bank payout remittance collections logged yet for this partner.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                          <th className="py-3 px-4">UTR Reference</th>
                          <th className="py-3 px-4">Payout Method</th>
                          <th className="py-3 px-4">Settlement Date</th>
                          <th className="py-3 px-4">Multiplex Venue</th>
                          <th className="py-3 px-4">Invoice #</th>
                          <th className="py-3 px-4">Net Remitted (₹)</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {accountData.settlement_remittances.map((remit) => (
                          <tr key={remit.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              {remit.payment_ref}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-700">
                              <Badge variant="outline" className="text-[10px] font-bold bg-white">
                                {remit.payment_method}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {new Date(remit.collected_at).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-800">
                              {remit.venue_name}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">
                              {remit.invoice_number}
                            </td>
                            <td className="py-3 px-4 font-black text-emerald-700 text-sm">
                              ₹{((remit.amount_paise || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                {remit.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 truncate max-w-xs">
                              {remit.notes || "Automatic Net Payout"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: SETTLEMENT STATEMENT & CHRONOLOGICAL LEDGER (Request 25)       */}
      {/* ===================================================================== */}
      {activeTab === "statement" && (
        <div className="space-y-6">
          {/* Controls Bar: Date Ranges & Export */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1">Time Horizon:</span>
              {[
                { label: "All Statements", value: "ALL" },
                { label: "This Month", value: "THIS_MONTH" },
                { label: "Last 30 Days", value: "LAST_30_DAYS" },
                { label: "Last 90 Days", value: "LAST_90_DAYS" },
              ].map((pill) => (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setStatementDateFilter(pill.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    statementDateFilter === pill.value
                      ? "bg-[#7B1E3D] text-white shadow-2xs"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              onClick={handleExportStatementCSV}
              className="bg-[#7B1E3D] hover:bg-[#601730] text-white text-xs gap-1.5 rounded-xl cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Statement CSV
            </Button>
          </div>

          {/* Statement Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Ticket Sales</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                ₹{(((statementData?.summary?.gross_sales_paise || 0) / 100)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Gross admissions ledger</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Platform Commission</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                ₹{(((statementData?.summary?.commission_paise || 0) / 100)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Fee deductions</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Remitted Payouts</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                ₹{(((statementData?.summary?.remitted_paise || 0) / 100)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Transferred to bank</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Pending Settlement</div>
              <div className="text-2xl font-black text-[#7B1E3D] mt-1">
                ₹{(((statementData?.summary?.pending_payout_paise || 0) / 100)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Net balance payable</div>
            </div>
          </div>

          {/* Chronological Ledger Table */}
          {loadingStatement ? (
            <div className="py-24 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#7B1E3D]" />
            </div>
          ) : !statementData || statementData.ledger.length === 0 ? (
            <div className="py-20 bg-white rounded-2xl border border-slate-200 text-center text-sm text-slate-400">
              No statement ledger entries found for this date range.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Multiplex Venue</th>
                      <th className="py-3 px-4">Gross (₹)</th>
                      <th className="py-3 px-4">Platform Fee (₹)</th>
                      <th className="py-3 px-4">Net Settled (₹)</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {statementData.ledger.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 text-slate-600">
                          {new Date(entry.date).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3.5 px-4 font-semibold">
                          <Badge
                            className={`text-[10px] font-bold ${
                              entry.entry_type === "CREDIT"
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                            }`}
                          >
                            {entry.entry_type === "CREDIT" ? "Ticket Credit" : "Bank Payout"}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {entry.reference}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium max-w-xs truncate">
                          {entry.description}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {entry.venue_name || "All Locations"}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          ₹{((entry.gross_amount_paise || 0) / 100).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {entry.commission_paise > 0
                            ? `₹${((entry.commission_paise || 0) / 100).toFixed(2)}`
                            : "—"}
                        </td>
                        <td
                          className={`py-3.5 px-4 font-black ${
                            entry.entry_type === "DEBIT" ? "text-emerald-700" : "text-blue-900"
                          }`}
                        >
                          {entry.entry_type === "DEBIT" ? "- " : "+ "}₹
                          {((entry.net_amount_paise || 0) / 100).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {entry.status}
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
      )}

      {/* ===================================================================== */}
      {/* MODAL: UPDATE BANK ACCOUNT OF REMITTANCE (Request 25)                 */}
      {/* ===================================================================== */}
      <Dialog open={isBankModalOpen} onOpenChange={setIsBankModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-emerald-600" />
              Update Remittance Bank Account
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registered bank account designated to receive automated box office settlements & remittance transfers.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBankAccount} className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Bank Name *</label>
                <Input
                  required
                  placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                  value={bankForm.bank_name}
                  onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Account Holder Name *</label>
                <Input
                  required
                  placeholder="Exact entity name as per bank records"
                  value={bankForm.bank_account_holder_name}
                  onChange={(e) => setBankForm({ ...bankForm, bank_account_holder_name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Account Number *</label>
                <Input
                  required
                  placeholder="e.g. 50200088992211"
                  value={bankForm.bank_account_number}
                  onChange={(e) => setBankForm({ ...bankForm, bank_account_number: e.target.value })}
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">IFSC Routing Code *</label>
                <Input
                  required
                  placeholder="e.g. HDFC0001234"
                  value={bankForm.bank_ifsc_code}
                  onChange={(e) => setBankForm({ ...bankForm, bank_ifsc_code: e.target.value.toUpperCase() })}
                  className="h-9 text-xs font-mono font-bold uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Account Type</label>
                <select
                  value={bankForm.bank_account_type}
                  onChange={(e) => setBankForm({ ...bankForm, bank_account_type: e.target.value })}
                  className="w-full h-9 rounded-md border border-slate-200 px-3 bg-white text-xs"
                >
                  <option value="CURRENT">CURRENT</option>
                  <option value="SAVINGS">SAVINGS</option>
                  <option value="OVERDRAFT">OVERDRAFT</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Branch Name</label>
                <Input
                  placeholder="e.g. Indiranagar Branch"
                  value={bankForm.bank_branch}
                  onChange={(e) => setBankForm({ ...bankForm, bank_branch: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Settlement Cycle</label>
                <select
                  value={bankForm.remittance_schedule}
                  onChange={(e) => setBankForm({ ...bankForm, remittance_schedule: e.target.value })}
                  className="w-full h-9 rounded-md border border-slate-200 px-3 bg-white text-xs"
                >
                  <option value="DAILY">Daily (T+1)</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="BI_WEEKLY">Bi-Weekly</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBankModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updatingBank}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {updatingBank && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Remittance Bank Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL: UPDATE THEATRE KYC & TAX CREDENTIALS (Request 25)              */}
      {/* ===================================================================== */}
      <Dialog open={isKycModalOpen} onOpenChange={setIsKycModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#7B1E3D]" />
              Update Tax & KYC Credentials
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tax identification details for statutory reporting and invoice credit.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveKyc} className="space-y-3 pt-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">GSTIN Number</label>
              <Input
                placeholder="e.g. 29AAAAA0000A1Z5"
                value={kycForm.gst_number}
                onChange={(e) => setKycForm({ ...kycForm, gst_number: e.target.value.toUpperCase() })}
                className="h-9 text-xs font-mono uppercase"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 flex items-center gap-1">
                  <span>Permanent Account Number (PAN)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                  Strictly Required
                </span>
              </div>
              <Input
                placeholder="e.g. ABCDE1234F"
                maxLength={10}
                value={kycForm.pan_number}
                onChange={(e) => setKycForm({ ...kycForm, pan_number: e.target.value.toUpperCase() })}
                className={`h-9 text-xs font-mono uppercase tracking-wider ${
                  kycForm.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(kycForm.pan_number)
                    ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                    : kycForm.pan_number
                    ? "border-emerald-400 bg-emerald-50/10"
                    : ""
                }`}
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Required for statutory tax compliance (10 alphanumeric chars: e.g. ABCDE1234F).
              </p>
            </div>

            {/* GST Registration Certificate Upload */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">GST Registration Certificate</label>
                {kycForm.gst_certificate_url && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Attached
                  </span>
                )}
              </div>

              {kycForm.gst_certificate_url ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 uppercase">
                      {kycForm.gst_certificate_url.toLowerCase().endsWith(".pdf") ? "PDF" : "IMG"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-[200px]">
                        {gstFileName || "GST_Certificate"}
                      </p>
                      <a
                        href={kycForm.gst_certificate_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 font-medium"
                      >
                        <ExternalLink className="w-2.5 h-2.5" /> View Uploaded Document
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <label
                      htmlFor="theatre_gst_file_replace"
                      className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer shadow-2xs"
                    >
                      Replace
                      <input
                        id="theatre_gst_file_replace"
                        type="file"
                        accept=".pdf,image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={uploadingGst}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadGst(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setKycForm((prev) => ({ ...prev, gst_certificate_url: "" }));
                        setGstFileName("");
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      title="Remove Certificate"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    id="theatre_gst_file"
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={uploadingGst}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadGst(file);
                      e.target.value = "";
                    }}
                  />
                  <label
                    htmlFor="theatre_gst_file"
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-3 text-center cursor-pointer hover:border-[#7B1E3D] hover:bg-[#7B1E3D]/5 transition"
                  >
                    {uploadingGst ? (
                      <div className="flex items-center gap-2 py-1">
                        <Loader2 className="w-4 h-4 animate-spin text-[#7B1E3D]" />
                        <span className="text-xs font-semibold text-slate-700">Uploading GST Certificate...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <FileUp className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-semibold text-slate-800">Upload GST Certificate</span>
                        <span className="text-[10px] text-slate-400">(PDF, JPG, PNG up to 10MB)</span>
                      </div>
                    )}
                  </label>
                </div>
              )}
            </div>

            {/* PAN Card Document Upload */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">PAN Card Document</label>
                {kycForm.pan_card_url && (
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Attached
                  </span>
                )}
              </div>

              {kycForm.pan_card_url ? (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 uppercase">
                      {kycForm.pan_card_url.toLowerCase().endsWith(".pdf") ? "PDF" : "IMG"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-[200px]">
                        {panFileName || "PAN_Card"}
                      </p>
                      <a
                        href={kycForm.pan_card_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-indigo-700 hover:underline flex items-center gap-0.5 font-medium"
                      >
                        <ExternalLink className="w-2.5 h-2.5" /> View Uploaded Document
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <label
                      htmlFor="theatre_pan_file_replace"
                      className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer shadow-2xs"
                    >
                      Replace
                      <input
                        id="theatre_pan_file_replace"
                        type="file"
                        accept=".pdf,image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={uploadingPan}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadPan(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setKycForm((prev) => ({ ...prev, pan_card_url: "" }));
                        setPanFileName("");
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      title="Remove PAN Card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    id="theatre_pan_file"
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={uploadingPan}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadPan(file);
                      e.target.value = "";
                    }}
                  />
                  <label
                    htmlFor="theatre_pan_file"
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-3 text-center cursor-pointer hover:border-[#7B1E3D] hover:bg-[#7B1E3D]/5 transition"
                  >
                    {uploadingPan ? (
                      <div className="flex items-center gap-2 py-1">
                        <Loader2 className="w-4 h-4 animate-spin text-[#7B1E3D]" />
                        <span className="text-xs font-semibold text-slate-700">Uploading PAN Card...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <FileUp className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-semibold text-slate-800">Upload PAN Card Document</span>
                        <span className="text-[10px] text-slate-400">(PDF, JPG, PNG up to 10MB)</span>
                      </div>
                    )}
                  </label>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsKycModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updatingKyc}
                className="bg-[#7B1E3D] hover:bg-[#601730] text-white gap-1.5"
              >
                {updatingKyc && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save KYC Credentials
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL: INVOICE STATEMENT DETAIL MODAL                                 */}
      {/* ===================================================================== */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
              <span>Commission Invoice Statement: {activeInvoiceDetail?.invoice_number}</span>
              {activeInvoiceDetail && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeInvoiceDetail.status === "PAID"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : activeInvoiceDetail.status === "DISPUTED"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {activeInvoiceDetail.status}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Billing Period: {activeInvoiceDetail?.period_start ? format(parseISO(activeInvoiceDetail.period_start), "dd MMM yyyy") : ""} -{" "}
              {activeInvoiceDetail?.period_end ? format(parseISO(activeInvoiceDetail.period_end), "dd MMM yyyy") : ""}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#7B1E3D] mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading invoice statement line items...</p>
            </div>
          ) : activeInvoiceDetail ? (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Venue Facility</span>
                  <span className="font-bold text-slate-900">{activeInvoiceDetail.venue_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Admissions</span>
                  <span className="font-bold text-slate-900">{activeInvoiceDetail.ticket_count} tickets</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Gross Sales</span>
                  <span className="font-bold text-slate-900">
                    ₹{((activeInvoiceDetail.gross_sales_paise || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Balance Outstanding</span>
                  <span className="font-black text-rose-600">
                    ₹{((activeInvoiceDetail.balance_paise || 0) / 100).toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Statement Line Items */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeInvoiceDetail.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-3 text-slate-800">{item.description}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {item.item_type}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{((item.amount_paise || 0) / 100).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[10px]">
                        Platform Commission Fee
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        ₹{((activeInvoiceDetail.commission_paise || 0) / 100).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[10px]">
                        Applicable GST (18%)
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        ₹{((activeInvoiceDetail.tax_paise || 0) / 100).toFixed(2)}
                      </td>
                    </tr>
                    <tr className="text-sm bg-slate-100">
                      <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-xs font-black">
                        Net Invoiced Total
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-[#7B1E3D]">
                        ₹{((activeInvoiceDetail.total_paise || 0) / 100).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Collections Applied */}
              {activeInvoiceDetail.collections && activeInvoiceDetail.collections.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Remittance Payments Applied
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Method</th>
                          <th className="py-2 px-3">Bank Reference / UTR</th>
                          <th className="py-2 px-3 text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeInvoiceDetail.collections.map((c) => (
                          <tr key={c.id}>
                            <td className="py-2 px-3 text-slate-600">
                              {new Date(c.collected_at).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-800">{c.payment_method}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">{c.payment_ref}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-700">
                              ₹{((c.amount_paise || 0) / 100).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDetailModalOpen(false)}
            >
              Close Statement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL: RECORD REMITTANCE PAYMENT                                      */}
      {/* ===================================================================== */}
      <Dialog
        open={!!remitModalInvoice}
        onOpenChange={(open) => !open && setRemitModalInvoice(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Submit Payment Remittance
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Log bank transfer reference for Invoice {remitModalInvoice?.invoice_number}
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
                  placeholder="e.g. UTR1234567890 or NEFT REF"
                  value={remitForm.payment_ref}
                  onChange={(e) => setRemitForm({ ...remitForm, payment_ref: e.target.value })}
                  className="h-9 text-xs font-mono"
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

      {/* ===================================================================== */}
      {/* MODAL: RAISE DISPUTE                                                 */}
      {/* ===================================================================== */}
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
