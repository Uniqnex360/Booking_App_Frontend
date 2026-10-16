import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  getAdminTheatres,
  getAdminChains,
  createAdminChain,
  TheatreListItem,
  TheatreChain,
} from "@/api/admin.api";
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
} from "lucide-react";

export function TheatresManagementTab() {
  const [theatres, setTheatres] = useState<TheatreListItem[]>([]);
  const [chains, setChains] = useState<TheatreChain[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

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
  }, [fetchData]);

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedCity !== "ALL" ||
    selectedChain !== "ALL" ||
    selectedPaymentModel !== "ALL" ||
    selectedCommissionModel !== "ALL";

  const handleResetFilters = () => {
    setSearch("");
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
            onClick={fetchData}
            disabled={loading}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setIsChainModalOpen(true)}
            className="h-9 gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Chain
          </Button>
        </div>
      </div>

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

            {/* City Filter */}
            <select
              className="h-10 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              <option value="ALL">All Cities</option>
              <option value="Kochi">Kochi</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Chennai">Chennai</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Delhi">Delhi-NCR</option>
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
              Showing <strong className="text-gray-900">{theatres.length}</strong> theatre venues
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
        {loading && theatres.length === 0 ? (
          <div className="py-20 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          </div>
        ) : theatres.length === 0 ? (
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
                {theatres.map((t) => (
                  <tr key={t.id} className="hover:bg-orange-50/20 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      <div>{t.name}</div>
                      <div className="text-[11px] text-gray-500 font-normal">{t.city}</div>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

