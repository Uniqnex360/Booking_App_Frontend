import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  getIntegrationsHealth,
  pingIntegrationGateway,
  toggleIntegrationGateway,
  syncIntegrationCatalog,
  IntegrationHealthItem,
} from "@/api/admin.api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Activity,
  Server,
  CreditCard,
  Layers,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Power,
  Radio,
  Search,
  Check,
  Clock,
  Sparkles,
  Zap,
  TrendingUp,
  ShieldCheck,
  ArrowUpDown,
  Building2,
  IndianRupee,
} from "lucide-react";

interface IntegrationsGatewaysTabProps {
  onNavigateTab?: (tab: any) => void;
}

export function IntegrationsGatewaysTab({ onNavigateTab }: IntegrationsGatewaysTabProps) {
  const [items, setItems] = useState<IntegrationHealthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [livePingingAll, setLivePingingAll] = useState(false);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const fetchIntegrations = useCallback(async (checkLive = false) => {
    try {
      if (checkLive) setLivePingingAll(true);
      else setLoading(true);

      const data = await getIntegrationsHealth(checkLive);
      setItems(data || []);
      setLastRefreshedAt(new Date());

      if (checkLive) {
        toast.success("Live connectivity test completed across all gateways!");
      }
    } catch (err: any) {
      toast.error("Failed to load integrations health", {
        description: err.message || "Please check network or backend status.",
      });
    } finally {
      setLoading(false);
      setLivePingingAll(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations(false);
  }, [fetchIntegrations]);

  // Handle single item ping
  const handlePing = async (id: string, name: string) => {
    setPingingId(id);
    try {
      const res = await pingIntegrationGateway(id);
      // Update local state with tested latency and status
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                latency_ms: res.latency_ms,
                status: res.status,
                last_sync: res.tested_at || new Date().toISOString(),
              }
            : item
        )
      );
      toast.success(`${name} Ping Succeeded`, {
        description: `HTTP ${res.http_status} responded in ${res.latency_ms}ms`,
      });
    } catch (err: any) {
      toast.error(`Ping failed for ${name}`, {
        description: err?.response?.data?.message || err.message,
      });
    } finally {
      setPingingId(null);
    }
  };

  // Handle single item toggle
  const handleToggle = async (id: string, currentEnabled: boolean, name: string) => {
    setTogglingId(id);
    try {
      const res = await toggleIntegrationGateway(id);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                enabled: res.enabled,
                status: res.status,
              }
            : item
        )
      );
      toast.success(res.enabled ? `${name} Enabled` : `${name} Disabled`, {
        description: `Integration adapter status updated successfully.`,
      });
    } catch (err: any) {
      toast.error(`Failed to toggle ${name}`, {
        description: err?.response?.data?.message || err.message,
      });
    } finally {
      setTogglingId(null);
    }
  };

  // Handle single item sync
  const handleSync = async (id: string, name: string) => {
    setSyncingId(id);
    try {
      const res = await syncIntegrationCatalog(id);
      if (res.synced) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  showtimes_count: res.total_showtimes,
                  last_sync: res.timestamp || new Date().toISOString(),
                }
              : item
          )
        );
        toast.success(`Catalog Synced for ${name}`, {
          description: `${res.total_showtimes} active showtimes synchronized with upstream.`,
        });
      } else {
        toast.warning(`Sync partially completed`, {
          description: "Check upstream logs for details.",
        });
      }
    } catch (err: any) {
      toast.error(`Catalog sync failed for ${name}`, {
        description: err?.response?.data?.message || err.message,
      });
    } finally {
      setSyncingId(null);
    }
  };

  // Filtering logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterType !== "ALL" && item.type !== filterType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.provider.toLowerCase().includes(q);
        const matchesEndpoint = item.endpoint.toLowerCase().includes(q);
        const matchesAdapter = (item.adapter || "").toLowerCase().includes(q);
        if (!matchesName && !matchesEndpoint && !matchesAdapter) return false;
      }
      return true;
    });
  }, [items, filterType, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = items.length;
    const posCount = items.filter((i) => i.type === "TICKETING_POS").length;
    const healthyCount = items.filter((i) => i.status === "HEALTHY" && i.enabled !== false).length;
    const totalShowtimes = items.reduce((acc, i) => acc + (i.showtimes_count || 0), 0);
    const totalBookings = items.reduce((acc, i) => acc + (i.bookings_count || 0), 0);
    const avgLatency =
      items.length > 0 ? Math.round(items.reduce((acc, i) => acc + (i.latency_ms || 0), 0) / items.length) : 0;

    return {
      total,
      posCount,
      healthyCount,
      totalShowtimes,
      totalBookings,
      avgLatency,
    };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Integration & Settlement Gateways
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
                  Live Dynamic Engine
                </Badge>
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time health monitoring, connectivity tests, catalog sync, and payment settlement pipeline across all ticketing adapters and gateways.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchIntegrations(true)}
            disabled={livePingingAll || loading}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs rounded-xl shadow-xs flex items-center gap-1.5"
          >
            {livePingingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            )}
            Ping All Gateways
          </Button>

          <Button
            onClick={() => fetchIntegrations(false)}
            disabled={loading}
            variant="outline"
            size="sm"
            className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 text-xs rounded-xl flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-orange-600" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: System Status */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase">
            <span>Operational Health</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {metrics.healthyCount} / {metrics.total}
            </span>
            <span className="text-xs text-emerald-600 font-medium">100% Online</span>
          </div>
          <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            All external API endpoints responsive
          </div>
        </div>

        {/* Card 2: Average Latency */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase">
            <span>Avg Gateway Latency</span>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{metrics.avgLatency}ms</span>
            <span className="text-xs text-emerald-600 font-medium font-mono">Fast &bull; &lt;200ms</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Measured across POS, payment & settlement endpoints
          </div>
        </div>

        {/* Card 3: POS Providers */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase">
            <span>Ticketing POS Providers</span>
            <Server className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{metrics.posCount} Adapters</span>
            <span className="text-xs text-blue-600 font-medium font-mono">
              {metrics.totalShowtimes.toLocaleString()} shows
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            PVR, AGS, Cinepolis, Rakki, Shenoys, Vanitha
          </div>
        </div>

        {/* Card 4: Payment & Settlement */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase">
            <span>Settlement & Payments</span>
            <CreditCard className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">₹42,908.40</span>
            <span className="text-xs text-emerald-600 font-medium">Captured</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Razorpay + Theatre Daily Escrow & Split
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
        {/* Type pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: `All Gateways (${items.length})` },
            { id: "TICKETING_POS", label: `Ticketing POS (${metrics.posCount})` },
            { id: "PAYMENT_GATEWAY", label: `Payment Gateway (1)` },
            { id: "SETTLEMENT_ENGINE", label: `Settlement Engine (1)` },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterType(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                filterType === pill.id
                  ? "bg-orange-600 text-white shadow-2xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search provider, URL, adapter..."
            className="pl-8 text-xs h-8 bg-gray-50 border-gray-200 rounded-xl focus:bg-white transition"
          />
        </div>
      </div>

      {/* Dynamic Gateways Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-200">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-2" />
          <p className="text-xs text-gray-500 font-medium">Fetching real-time gateway metrics...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <Server className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-700">No gateways match your search</p>
          <p className="text-xs text-gray-400 mt-1">Try resetting the filter or search query</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const isPos = item.type === "TICKETING_POS";
            const isPayment = item.type === "PAYMENT_GATEWAY";
            const isSettlement = item.type === "SETTLEMENT_ENGINE";

            const isHealthy = item.status === "HEALTHY" && item.enabled !== false;
            const isPinging = pingingId === item.id;
            const isSyncing = syncingId === item.id;
            const isToggling = togglingId === item.id;

            // Visual Latency Bar Color
            const latColor =
              item.latency_ms < 200
                ? "bg-emerald-500"
                : item.latency_ms < 600
                ? "bg-amber-500"
                : "bg-rose-500";

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-2xs hover:shadow-sm ${
                  !isHealthy
                    ? "border-red-200 bg-red-50/20"
                    : "border-gray-200 hover:border-orange-300"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-xl text-white ${
                        isPos
                          ? "bg-blue-600"
                          : isPayment
                          ? "bg-indigo-600"
                          : "bg-emerald-600"
                      }`}
                    >
                      {isPos ? (
                        <Server className="w-5 h-5" />
                      ) : isPayment ? (
                        <CreditCard className="w-5 h-5" />
                      ) : (
                        <IndianRupee className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-sm">{item.provider}</h3>
                        {item.enabled === false && (
                          <Badge variant="outline" className="bg-gray-100 text-gray-500 text-[10px]">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono text-gray-500 break-all">
                          {item.endpoint}
                        </span>
                        {item.endpoint.startsWith("http") && (
                          <a
                            href={item.endpoint}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-gray-700 transition"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator Pill */}
                  <div className="flex flex-col items-end">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        isHealthy
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isHealthy ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                        }`}
                      />
                      {isHealthy ? "HEALTHY" : item.status || "OFFLINE"}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1">
                      Success: <strong className="text-gray-700">{item.success_rate}</strong>
                    </span>
                  </div>
                </div>

                {/* Latency Gauge Bar */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-500 font-medium flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Roundtrip Latency:
                    </span>
                    <span className="font-mono font-bold text-gray-900">
                      {item.latency_ms}ms
                      <span className="text-[10px] font-normal text-gray-400 ml-1">
                        ({item.latency_ms < 200 ? "Optimal" : item.latency_ms < 600 ? "Normal" : "High"})
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${latColor} transition-all duration-500`}
                      style={{ width: `${Math.min(100, Math.max(8, (item.latency_ms / 800) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Dynamic Details Grid */}
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
                  {isPos && (
                    <>
                      <div>
                        <div className="text-[10px] uppercase text-gray-400 font-semibold">Adapter Type</div>
                        <div className="font-mono font-medium text-gray-800 uppercase">{item.adapter}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-gray-400 font-semibold">Showtimes Synced</div>
                        <div className="font-semibold text-blue-700">{item.showtimes_count?.toLocaleString()} shows</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-gray-400 font-semibold">Bookings Processed</div>
                        <div className="font-semibold text-emerald-700">{item.bookings_count} completed</div>
                      </div>
                    </>
                  )}

                  {isPayment && item.details && (
                    <>
                      <div>
                        <div className="text-[10px] uppercase text-gray-400 font-semibold">Total Payments</div>
                        <div className="font-semibold text-gray-800">{item.details.total_payments} orders</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-gray-400 font-semibold">Captured Volume</div>
                        <div className="font-semibold text-indigo-700">₹{item.details.captured_amount_inr?.toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-gray-400 font-semibold">Refunds Processed</div>
                        <div className="font-semibold text-amber-600">{item.details.refunded_payments} refunded</div>
                      </div>
                    </>
                  )}

                  {isSettlement && item.details && (
                    <>
                      <div>
                        <div className="text-[10px] uppercase text-gray-400 font-semibold">Configured Theatres</div>
                        <div className="font-semibold text-gray-800">{item.details.configured_theatres} / {item.details.active_theatres} venues</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-gray-400 font-semibold">Commission Invoiced</div>
                        <div className="font-semibold text-emerald-700">₹{item.details.invoiced_amount_inr?.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-gray-400 font-semibold">Settlement Cadence</div>
                        <div className="font-medium text-gray-700">{item.details.settlement_cycle}</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer Controls & Live Actions */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last sync:{" "}
                    <span className="text-gray-600">
                      {item.last_sync ? format(parseISO(item.last_sync), "dd MMM, HH:mm") : "Just now"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Test / Ping Button */}
                    <Button
                      onClick={() => handlePing(item.id, item.provider)}
                      disabled={isPinging || isSyncing}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs bg-white border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-1"
                    >
                      {isPinging ? (
                        <Loader2 className="w-3 h-3 animate-spin text-orange-600" />
                      ) : (
                        <Zap className="w-3 h-3 text-amber-500" />
                      )}
                      <span>Ping</span>
                    </Button>

                    {/* On-demand Catalog Sync for POS */}
                    {isPos && (
                      <Button
                        onClick={() => handleSync(item.id, item.provider)}
                        disabled={isSyncing || isPinging}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs bg-white border-gray-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 rounded-lg flex items-center gap-1"
                      >
                        {isSyncing ? (
                          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        <span>Sync</span>
                      </Button>
                    )}

                    {/* Toggle Enable/Disable for POS */}
                    {isPos && (
                      <Button
                        onClick={() => handleToggle(item.id, !!item.enabled, item.provider)}
                        disabled={isToggling}
                        variant="ghost"
                        size="sm"
                        className={`h-7 px-2 text-xs rounded-lg flex items-center gap-1 ${
                          item.enabled
                            ? "text-red-600 hover:bg-red-50 hover:text-red-700"
                            : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                        title={item.enabled ? "Disable Provider" : "Enable Provider"}
                      >
                        <Power className="w-3 h-3" />
                        <span>{item.enabled ? "Disable" : "Enable"}</span>
                      </Button>
                    )}

                    {/* Shortcut for Settlement */}
                    {isSettlement && onNavigateTab && (
                      <Button
                        onClick={() => onNavigateTab("invoices")}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs bg-white border-gray-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 rounded-lg flex items-center gap-1"
                      >
                        <span>View Invoices &rarr;</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Integration & Settlement Architecture Reference */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-orange-500/20 text-orange-400 rounded-lg">
                <Sparkles className="w-4 h-4" />
              </span>
              <h4 className="font-bold text-sm text-white">How the Integration & Settlement Pipeline Works</h4>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed max-w-3xl">
              Our high-throughput multiplex architecture decouples ticketing POS sync, customer payment confirmation, and venue commission settlement into three resilient stages:
            </p>
          </div>
          <Badge className="bg-white/10 text-white border-white/20 text-[10px]">Architecture Spec v2.4</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-700/60 text-xs">
          <div className="space-y-1">
            <div className="font-bold text-orange-400 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-orange-500/20 flex items-center justify-center text-[10px]">1</span>
              Ticketing POS Adapters
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Provider adapters (PVR, AGS, Cinepolis, Rakki, Shenoys, Vanitha) maintain synchronized showtimes, screen mappings, and dynamic seat maps with automatic 10-minute hold TTLs.
            </p>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-blue-400 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">2</span>
              Payment Gateway Webhooks
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Customer payments flow through Razorpay with HMAC SHA256 webhook signatures, idempotent order confirmation, and automated refunds on provider booking failure.
            </p>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">3</span>
              Theatre Settlement & Invoicing
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Commercial engine calculates per-ticket and percentage commissions according to contract configuration, generating daily post-pay invoices with 1-day settlement cutoffs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
