import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { INDIAN_STATES, getStateForCity, getCitiesForState } from "@/utils/indiaGeography";
import {
  getAdminTheatres,
  getAdminChains,
  createAdminChain,
  TheatreListItem,
  TheatreChain,
} from "@/api/admin.api";
import {
  listAdminTheatreEnquiries,
  updateAdminTheatreEnquiryStatus,
  createAdminTheatreAccount,
  listAdminTheatreAccounts,
  TheatreEnquiryItem,
  TheatreAccountItem,
} from "@/api/theatre.api";
import { TheatreConfigModal } from "./TheatreConfigModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminSearchBar } from "@/components/admin/AdminSearchBar";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Settings,
  Plus,
  RefreshCw,
  Loader2,
  SlidersHorizontal,
  X,
  Filter,
  Inbox,
  UserCheck,
  ShieldCheck,
  Mail,
  Phone,
  CheckCircle2,
} from "lucide-react";

export function TheatresManagementTab() {
  const [theatres, setTheatres] = useState<TheatreListItem[]>([]);
  const [chains, setChains] = useState<TheatreChain[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [selectedState, setSelectedState] = useState("ALL");
  const [selectedCity, setSelectedCity] = useState("ALL");
  const [selectedChain, setSelectedChain] = useState("ALL");
  const [selectedPaymentModel, setSelectedPaymentModel] = useState("ALL");
  const [selectedCommissionModel, setSelectedCommissionModel] = useState("ALL");

  // Chain dialog
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);
  const [chainName, setChainName] = useState("");
  const [chainCode, setChainCode] = useState("");
  const [chainEmail, setChainEmail] = useState("");
  const [creatingChain, setCreatingChain] = useState(false);

  // Config modal
  const [configModalVenue, setConfigModalVenue] = useState<{ id: string; name: string } | null>(null);

  // Sub-navigation & Enquiries / Accounts
  const [theatreSubTab, setTheatreSubTab] = useState<"locations" | "enquiries" | "accounts">("locations");
  const [enquiries, setEnquiries] = useState<TheatreEnquiryItem[]>([]);
  const [accounts, setAccounts] = useState<TheatreAccountItem[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);

  // Account provisioning modal
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    access_level: "CHAIN_ADMIN" as "CHAIN_ADMIN" | "VENUE_MANAGER",
    chain_id: "",
    venue_id: "",
    onboardingEnquiryId: "" as string | null,
  });

  const fetchEnquiriesAndAccounts = useCallback(async () => {
    setLoadingExtras(true);
    try {
      const [enqRes, accRes] = await Promise.all([
        listAdminTheatreEnquiries(),
        listAdminTheatreAccounts(),
      ]);
      setEnquiries(enqRes || []);
      setAccounts(accRes || []);
    } catch {
      console.warn("Extras fetch failed");
    } finally {
      setLoadingExtras(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        getAdminTheatres({
          search: debouncedSearch.trim() || undefined,
          city: selectedCity !== "ALL" ? selectedCity : undefined,
          chain_code: selectedChain !== "ALL" ? selectedChain : undefined,
          payment_model: selectedPaymentModel !== "ALL" ? selectedPaymentModel : undefined,
          commission_model: selectedCommissionModel !== "ALL" ? selectedCommissionModel : undefined,
          limit: 100,
        }),
        getAdminChains(),
      ]);
      setTheatres(tRes.theatres || []);
      setChains(cRes || []);
    } catch {
      toast.error("Failed to load theatres and chains");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCity, selectedChain, selectedPaymentModel, selectedCommissionModel]);

  useEffect(() => {
    fetchData();
    fetchEnquiriesAndAccounts();
  }, [fetchData, fetchEnquiriesAndAccounts]);

  const newEnquiriesCount = enquiries.filter((e) => e.status === "NEW").length;

  const handleUpdateEnquiryStatus = async (enquiryId: string, status: any) => {
    try {
      await updateAdminTheatreEnquiryStatus(enquiryId, status);
      toast.success(`Enquiry marked as ${status}`);
      fetchEnquiriesAndAccounts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update enquiry status");
    }
  };

  const handleOpenOnboardModal = (enquiry: TheatreEnquiryItem) => {
    // Attempt matching chain by name
    const matchedChain = chains.find((c) =>
      enquiry.theatre_name.toLowerCase().includes(c.name.toLowerCase()) ||
      enquiry.theatre_name.toLowerCase().includes(c.code.toLowerCase())
    );

    setAccountForm({
      name: enquiry.contact_name,
      email: enquiry.email,
      password: "TempPassword123!",
      phone: enquiry.phone,
      access_level: "CHAIN_ADMIN",
      chain_id: matchedChain ? matchedChain.id : chains[0]?.id || "",
      venue_id: "",
      onboardingEnquiryId: enquiry.id,
    });
    setIsAccountModalOpen(true);
  };

  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.name || !accountForm.email || !accountForm.password) {
      toast.error("Name, email and password are required");
      return;
    }
    setCreatingAccount(true);
    try {
      await createAdminTheatreAccount({
        name: accountForm.name.trim(),
        email: accountForm.email.trim(),
        password: accountForm.password,
        phone: accountForm.phone.trim() || undefined,
        access_level: accountForm.access_level,
        chain_id: accountForm.chain_id || undefined,
        venue_id: accountForm.venue_id || undefined,
      });

      // If provisioned from enquiry, mark enquiry ONBOARDED
      if (accountForm.onboardingEnquiryId) {
        await updateAdminTheatreEnquiryStatus(accountForm.onboardingEnquiryId, "ONBOARDED");
      }

      toast.success("Theatre Partner Account provisioned successfully!");
      setIsAccountModalOpen(false);
      setAccountForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        access_level: "CHAIN_ADMIN",
        chain_id: "",
        venue_id: "",
        onboardingEnquiryId: null,
      });
      fetchEnquiriesAndAccounts();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || "Failed to create theatre account");
    } finally {
      setCreatingAccount(false);
    }
  };

  const availableCities = useMemo(() => {
    return getCitiesForState(selectedState);
  }, [selectedState]);

  const displayedTheatres = useMemo(() => {
    if (selectedState === "ALL") return theatres;
    return theatres.filter((t) => getStateForCity(t.city) === selectedState);
  }, [theatres, selectedState]);

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedState !== "ALL" ||
    selectedCity !== "ALL" ||
    selectedChain !== "ALL" ||
    selectedPaymentModel !== "ALL" ||
    selectedCommissionModel !== "ALL";

  const handleResetFilters = () => {
    setSearch("");
    setSelectedState("ALL");
    setSelectedCity("ALL");
    setSelectedChain("ALL");
    setSelectedPaymentModel("ALL");
    setSelectedCommissionModel("ALL");
  };

  const handleCreateChain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chainName.trim() || !chainCode.trim()) {
      toast.error("Chain name and code are required");
      return;
    }
    setCreatingChain(true);
    try {
      await createAdminChain({
        name: chainName.trim(),
        code: chainCode.trim().toUpperCase(),
        contact_email: chainEmail.trim() || undefined,
      });
      toast.success("Theatre chain registered successfully");
      setIsChainModalOpen(false);
      setChainName("");
      setChainCode("");
      setChainEmail("");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create theatre chain");
    } finally {
      setCreatingChain(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-100 rounded-lg text-orange-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Theatres & Partner Chains</h2>
            <p className="text-xs text-gray-500">
              Manage per-theatre customer payment models, commission formulas, and invoicing cycles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchData();
              fetchEnquiriesAndAccounts();
            }}
            disabled={loading || loadingExtras}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loading || loadingExtras) ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsChainModalOpen(true)}
            className="h-9 gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Chain
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setAccountForm({
                name: "",
                email: "",
                password: "TempPassword123!",
                phone: "",
                access_level: "CHAIN_ADMIN",
                chain_id: chains[0]?.id || "",
                venue_id: "",
                onboardingEnquiryId: null,
              });
              setIsAccountModalOpen(true);
            }}
            className="h-9 gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white"
          >
            <UserCheck className="w-3.5 h-3.5" />
            + Provision Account
          </Button>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setTheatreSubTab("locations")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            theatreSubTab === "locations"
              ? "bg-orange-600 text-white shadow-xs"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Cinema Locations & Terms ({displayedTheatres.length})
        </button>

        <button
          onClick={() => setTheatreSubTab("enquiries")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            theatreSubTab === "enquiries"
              ? "bg-orange-600 text-white shadow-xs"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          Operator Enquiries
          {newEnquiriesCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-red-500 text-white text-[10px] rounded-full font-bold">
              {newEnquiriesCount} new
            </span>
          )}
        </button>

        <button
          onClick={() => setTheatreSubTab("accounts")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            theatreSubTab === "accounts"
              ? "bg-orange-600 text-white shadow-xs"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Partner Logins ({accounts.length})
        </button>
      </div>

      {theatreSubTab === "locations" && (
        <>
          {/* Filter toolbar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Debounced Search */}
              <AdminSearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search theatres by name, city, address..."
                isSearching={loading && search !== debouncedSearch}
                className="flex-1"
              />

              {/* Filter Dropdowns */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Chain Filter */}
                <select
                  className="h-10 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
                  value={selectedChain}
                  onChange={(e) => setSelectedChain(e.target.value)}
                >
                  <option value="ALL">All Chains</option>
                  {chains.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>

                {/* State Filter */}
                <select
                  className="h-10 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setSelectedCity("ALL");
                  }}
                >
                  <option value="ALL">All States</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {/* City Filter (Cascading) */}
                <select
                  className="h-10 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                >
                  <option value="ALL">All Cities {selectedState !== "ALL" ? `(${selectedState})` : ""}</option>
                  {availableCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {/* Payment Model Filter */}
                <select
                  className="h-10 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
                  value={selectedPaymentModel}
                  onChange={(e) => setSelectedPaymentModel(e.target.value)}
                >
                  <option value="ALL">All Payment Models</option>
                  <option value="THEATRE_DIRECT">Model A (Theatre Direct)</option>
                  <option value="PLATFORM_ESCROW">Model B (Vybhz Collects)</option>
                </select>

                {/* Commission Model Filter */}
                <select
                  className="h-10 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
                  value={selectedCommissionModel}
                  onChange={(e) => setSelectedCommissionModel(e.target.value)}
                >
                  <option value="ALL">All Commission Models</option>
                  <option value="INVOICE_POST_PAY">Post-Pay Invoicing</option>
                  <option value="INSTANT_SPLIT">Instant Escrow Split</option>
                  <option value="DAILY_SETTLEMENT">Daily Settlement</option>
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

            {/* Filter Summary Pill Bar */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <span>
                  Showing <strong className="text-gray-900">{displayedTheatres.length}</strong> of{" "}
                  <strong>{theatres.length}</strong> theatre venues
                </span>
              </div>
              {loading && (
                <span className="inline-flex items-center gap-1.5 text-orange-600 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Updating results...
                </span>
              )}
            </div>
          </div>

          {/* Theatres Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden relative">
            {loading && displayedTheatres.length === 0 ? (
              <div className="py-20 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
              </div>
            ) : displayedTheatres.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-500">
                No theatre venues found matching your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Theatre Location</th>
                      <th className="py-3 px-4">Chain</th>
                      <th className="py-3 px-4">Payment Model</th>
                      <th className="py-3 px-4">Commission</th>
                      <th className="py-3 px-4">Invoicing Cycle</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayedTheatres.map((t) => {
                      const theatreState = getStateForCity(t.city);
                      return (
                      <tr key={t.id} className="hover:bg-orange-50/20 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-gray-900">
                          <div>{t.name}</div>
                          <div className="text-[11px] text-gray-500 font-normal flex items-center gap-1.5 mt-0.5">
                            <span>{t.city}</span>
                            {theatreState !== "Other" && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-orange-600 font-medium">{theatreState}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {t.chain_name ? (
                            <Badge variant="outline" className="text-[10px] font-semibold bg-gray-50 text-gray-700">
                              {t.chain_name}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">Independent</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                            {t.customer_payment_model === "THEATRE_DIRECT"
                              ? "Model A (Theatre Direct)"
                              : "Model B (Vybhz Collects)"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-orange-600">
                          {t.commission_rate_display}
                        </td>
                        <td className="py-3.5 px-4 text-gray-700 font-medium">
                          {t.invoice_cycle}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            ACTIVE
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfigModalVenue({ id: t.id, name: t.name })}
                            className="h-8 gap-1.5 text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Configure
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Operator Enquiries Subtab */}
      {theatreSubTab === "enquiries" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Cinema Operator Enquiries Inbox</h3>
              <p className="text-xs text-gray-500">
                Incoming partnership leads from cinema owners. Click Onboard to provision credentials directly.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchEnquiriesAndAccounts}
              disabled={loadingExtras}
              className="h-8 text-xs gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingExtras ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {enquiries.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
              No partnership enquiries received yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Cinema / Theatre</th>
                    <th className="py-3 px-4">Contact Person</th>
                    <th className="py-3 px-4">City</th>
                    <th className="py-3 px-4">Screens</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {enquiries.map((enq) => (
                    <tr key={enq.id} className="hover:bg-orange-50/20 transition-colors">
                      <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                        {new Date(enq.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        {enq.theatre_name}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-900">{enq.contact_name}</div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {enq.email}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {enq.phone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 font-medium">
                        {enq.city}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 font-bold">
                        {enq.screen_count}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate" title={enq.message || ""}>
                        {enq.message || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          className={`text-[11px] font-bold rounded-md px-2 py-1 border transition cursor-pointer ${
                            enq.status === "NEW"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : enq.status === "CONTACTED"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : enq.status === "ONBOARDED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                          value={enq.status}
                          onChange={(e) => handleUpdateEnquiryStatus(enq.id, e.target.value)}
                        >
                          <option value="NEW">NEW</option>
                          <option value="CONTACTED">CONTACTED</option>
                          <option value="ONBOARDED">ONBOARDED</option>
                          <option value="ARCHIVED">ARCHIVED</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {enq.status !== "ONBOARDED" ? (
                          <Button
                            size="sm"
                            onClick={() => handleOpenOnboardModal(enq)}
                            className="h-8 gap-1 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Onboard Account
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Partner Logins Subtab */}
      {theatreSubTab === "accounts" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Provisioned Theatre Partner Logins</h3>
              <p className="text-xs text-gray-500">
                Active partner accounts granting cinema managers access to their dedicated `/theatre` portal.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setAccountForm({
                  name: "",
                  email: "",
                  password: "TempPassword123!",
                  phone: "",
                  access_level: "CHAIN_ADMIN",
                  chain_id: chains[0]?.id || "",
                  venue_id: "",
                  onboardingEnquiryId: null,
                });
                setIsAccountModalOpen(true);
              }}
              className="h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Provision New Account
            </Button>
          </div>

          {accounts.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
              No theatre partner accounts provisioned yet. Click &quot;Provision New Account&quot; to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Manager Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Brand / Chain</th>
                    <th className="py-3 px-4">Access Level</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Provisioned Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-orange-50/20 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        {acc.name}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 font-medium">
                        {acc.email}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">
                        {acc.phone || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-[10px] font-semibold bg-gray-50 text-gray-800">
                          {acc.chain_name || acc.venue_name || "Chain Assigned"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {acc.access_level}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          ACTIVE
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">
                        {new Date(acc.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Provision Account Modal */}
      <Dialog open={isAccountModalOpen} onOpenChange={setIsAccountModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Provision Theatre Partner Account</DialogTitle>
            <DialogDescription>
              Create login credentials for a theatre chain administrator or venue manager.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAccountSubmit} className="space-y-3.5 text-xs">
            <div>
              <Label className="text-xs font-semibold">Manager Full Name *</Label>
              <Input
                placeholder="e.g. Anand Sharma"
                className="mt-1"
                value={accountForm.name}
                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Login Email *</Label>
              <Input
                type="email"
                placeholder="anand@pvr.com"
                className="mt-1"
                value={accountForm.email}
                onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Password *</Label>
              <Input
                type="password"
                placeholder="Enter secure temporary password"
                className="mt-1"
                value={accountForm.password}
                onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Contact Phone</Label>
              <Input
                placeholder="+91 98765 43210"
                className="mt-1"
                value={accountForm.phone}
                onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Access Level</Label>
                <select
                  className="mt-1 w-full h-9 rounded-md border border-gray-200 px-2 text-xs bg-white text-gray-900"
                  value={accountForm.access_level}
                  onChange={(e) => setAccountForm({ ...accountForm, access_level: e.target.value as any })}
                >
                  <option value="CHAIN_ADMIN">Chain Administrator</option>
                  <option value="VENUE_MANAGER">Single Venue Manager</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  {accountForm.access_level === "CHAIN_ADMIN" ? "Assigned Chain *" : "Assigned Venue *"}
                </Label>
                {accountForm.access_level === "CHAIN_ADMIN" ? (
                  <select
                    className="mt-1 w-full h-9 rounded-md border border-gray-200 px-2 text-xs bg-white text-gray-900"
                    value={accountForm.chain_id}
                    onChange={(e) => setAccountForm({ ...accountForm, chain_id: e.target.value })}
                    required
                  >
                    <option value="">Select Chain</option>
                    {chains.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    className="mt-1 w-full h-9 rounded-md border border-gray-200 px-2 text-xs bg-white text-gray-900"
                    value={accountForm.venue_id}
                    onChange={(e) => setAccountForm({ ...accountForm, venue_id: e.target.value })}
                    required
                  >
                    <option value="">Select Venue</option>
                    {theatres.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.city})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsAccountModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={creatingAccount}>
                {creatingAccount ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Provision Partner Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


      {/* New Chain Dialog */}
      <Dialog open={isChainModalOpen} onOpenChange={setIsChainModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Theatre Chain</DialogTitle>
            <DialogDescription>
              Create a parent multiplex chain group for multiple locations.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateChain} className="space-y-4 text-xs">
            <div>
              <Label className="text-xs font-semibold">Chain Name</Label>
              <Input
                placeholder="e.g. PVR Inox"
                className="mt-1"
                value={chainName}
                onChange={(e) => setChainName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Chain Code (Identifier)</Label>
              <Input
                placeholder="e.g. PVR"
                className="mt-1 uppercase"
                value={chainCode}
                onChange={(e) => setChainCode(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Corporate Contact Email</Label>
              <Input
                type="email"
                placeholder="billing@partner.com"
                className="mt-1"
                value={chainEmail}
                onChange={(e) => setChainEmail(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsChainModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={creatingChain}>
                {creatingChain ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Save Chain
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Theatre Config Modal */}
      {configModalVenue && (
        <TheatreConfigModal
          venueId={configModalVenue.id}
          venueName={configModalVenue.name}
          isOpen={!!configModalVenue}
          onClose={() => setConfigModalVenue(null)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}

