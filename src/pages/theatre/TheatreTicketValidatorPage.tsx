import React, { useState, useEffect, useRef } from "react";
import {
  validateTheatreTicket,
  listTheatreAdmissions,
  getTheatreVenues,
  TicketValidationResult,
  TicketAdmissionItem,
  TheatreVenueItem,
} from "@/api/theatre.api";
import {
  QrCode,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Film,
  Users,
  Clock,
  Camera,
  CameraOff,
  RotateCcw,
  Loader2,
  ShieldAlert,
  Ticket,
  WifiOff,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import {
  parseSignedTicketCode,
  savePendingAdmission,
  getPendingAdmissions,
  removePendingAdmission,
  PendingAdmission,
} from "@/utils/offlinePassStorage";

export default function TheatreTicketValidatorPage() {
  const [venues, setVenues] = useState<TheatreVenueItem[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("ALL");
  const [gateDevice, setGateDevice] = useState<string>("Gate 1");
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<TicketValidationResult | null>(null);
  const [recentAdmissions, setRecentAdmissions] = useState<TicketAdmissionItem[]>([]);
  const [loadingAdmissions, setLoadingAdmissions] = useState<boolean>(false);
  const [pendingQueue, setPendingQueue] = useState<PendingAdmission[]>([]);
  const [syncingOffline, setSyncingOffline] = useState<boolean>(false);

  // Camera scanner state
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load venues on mount
  useEffect(() => {
    async function load() {
      try {
        const v = await getTheatreVenues();
        setVenues(v || []);
        if (v && v.length > 0) {
          setSelectedVenueId(v[0].id);
        }
      } catch (err) {
        console.error("Failed to load venues", err);
      }
    }
    load();
  }, []);

  // Fetch recent admissions when selected venue changes
  const fetchAdmissions = async () => {
    setLoadingAdmissions(true);
    try {
      const data = await listTheatreAdmissions({
        venue_id: selectedVenueId !== "ALL" ? selectedVenueId : undefined,
        limit: 15,
      });
      setRecentAdmissions(data || []);
    } catch (err) {
      console.warn("Failed to load admissions", err);
    } finally {
      setLoadingAdmissions(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, [selectedVenueId]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
    setPendingQueue(getPendingAdmissions());

    const handleOnline = () => {
      syncOfflineQueue();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const syncOfflineQueue = async () => {
    const queue = getPendingAdmissions();
    if (queue.length === 0) return;
    setSyncingOffline(true);
    let synced = 0;
    for (const item of queue) {
      try {
        await validateTheatreTicket({
          code: item.code,
          venue_id: item.venue_id,
          gate_device: item.gate_device,
          admit_now: true,
        });
        removePendingAdmission(item.id);
        synced++;
      } catch (err) {
        console.warn("Failed to sync offline item", item.id, err);
      }
    }
    setPendingQueue(getPendingAdmissions());
    setSyncingOffline(false);
    if (synced > 0) {
      toast.success(`Synced ${synced} offline admission${synced > 1 ? "s" : ""} to cloud!`);
      fetchAdmissions();
    }
  };

  // Cleanup camera scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .then(() => {
            scannerRef.current?.clear();
          });
      }
    };
  }, []);

  // Toggle Camera QR Scanner
  const toggleCamera = async () => {
    if (cameraActive) {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (err) {
          console.warn("Scanner stop error", err);
        }
      }
      setCameraActive(false);
    } else {
      setCameraActive(true);
      setTimeout(async () => {
        try {
          const scanner = new Html5Qrcode("reader");
          scannerRef.current = scanner;
          await scanner.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              handleScanSuccess(decodedText);
            },
            () => {
              // ignore frame read errors
            }
          );
        } catch (err: any) {
          toast.error("Failed to start camera. Please ensure camera permissions are granted.");
          setCameraActive(false);
        }
      }, 200);
    }
  };

  const handleScanSuccess = async (scannedCode: string) => {
    if (loading) return;
    setCode(scannedCode);
    await executeValidation(scannedCode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Please enter or scan a ticket code");
      return;
    }
    await executeValidation(code.trim());
  };

  const executeValidation = async (ticketCode: string) => {
    setLoading(true);
    setResult(null);

    // Play subtle audio cue if supported
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}

    try {
      const res = await validateTheatreTicket({
        code: ticketCode,
        venue_id: selectedVenueId !== "ALL" ? selectedVenueId : undefined,
        gate_device: gateDevice,
        admit_now: true,
      });
      setResult(res);

      if (res.valid) {
        toast.success("ADMITTED: Ticket is valid!");
        fetchAdmissions();
      } else if (res.status === "ALREADY_USED") {
        toast.error("DUPLICATE SCAN: Ticket has already been admitted!");
      } else if (res.status === "TAMPERED_TICKET") {
        toast.error("FORGED TICKET: Cryptographic signature mismatch!");
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      // Offline fallback: If offline or network dropped, parse signed ticket
      const parsed = parseSignedTicketCode(ticketCode);
      if (parsed.isSigned && (!navigator.onLine || !err.response)) {
        savePendingAdmission({
          code: ticketCode,
          venue_id: selectedVenueId !== "ALL" ? selectedVenueId : undefined,
          gate_device: gateDevice,
          ref_code: parsed.refCode,
        });
        setPendingQueue(getPendingAdmissions());
        setResult({
          valid: true,
          status: "OFFLINE_VALID",
          message: `OFFLINE ADMISSION GRANTED: Signed ticket verified locally (${parsed.refCode} • Seats: ${parsed.seatCodes?.join(", ") || "General"}). Queued to sync.`,
          booking: {
            ref_code: parsed.refCode,
            seats: parsed.seatCodes?.join(", "),
            quantity: parsed.seatCodes?.length || 1,
            movie_title: "Screening Admission",
            venue_name: "Local Gate Check",
            screen_name: "Auditorium",
          } as any,
          cryptographically_verified: true,
        } as any);
        toast.warning("OFFLINE SCAN: Ticket verified locally and saved to sync queue");
        return;
      }

      const errMsg = err.response?.data?.message || err.message || "Failed to validate ticket";
      toast.error(errMsg);
      setResult({
        valid: false,
        status: "NOT_FOUND",
        message: errMsg,
      });
    } finally {
      setLoading(false);
      // Auto re-focus input for next barcode scan
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  };

  const handleReset = () => {
    setCode("");
    setResult(null);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {pendingQueue.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{pendingQueue.length} Offline Admission{pendingQueue.length > 1 ? "s" : ""}</strong> recorded locally during network dropout.
            </span>
          </div>
          <Button
            size="sm"
            onClick={syncOfflineQueue}
            disabled={syncingOffline}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-4 rounded-xl flex items-center gap-1.5 shadow-2xs shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingOffline ? "animate-spin" : ""}`} />
            {syncingOffline ? "Syncing to Cloud..." : "Sync to Cloud Now"}
          </Button>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Gate Ticket & QR Validator</h1>
            <Badge className="bg-[#7B1E3D] text-white text-[10px] font-bold uppercase tracking-wider">
              Gate Control
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative ticket admission scanner. Verifies booking validity, enforces venue access, and prevents duplicate admissions.
          </p>
        </div>

        {/* Venue & Gate Terminal Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedVenueId}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All My Venues</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-400">Terminal:</span>
            <input
              type="text"
              value={gateDevice}
              onChange={(e) => setGateDevice(e.target.value)}
              className="w-20 bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
              placeholder="Gate 1"
            />
          </div>
        </div>
      </div>

      {/* Main Validation Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input, Scanner & Result Status */}
        <div className="lg:col-span-7 space-y-5">
          {/* Scan / Search Input Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Scan or Enter Ticket Code
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleCamera}
                className="h-8 gap-1.5 text-xs text-slate-700"
              >
                {cameraActive ? (
                  <>
                    <CameraOff className="w-3.5 h-3.5 text-rose-600" /> Stop Camera
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5 text-emerald-600" /> Open Camera Scanner
                  </>
                )}
              </Button>
            </div>

            {/* Video Camera Container */}
            {cameraActive && (
              <div className="overflow-hidden rounded-xl border-2 border-dashed border-[#7B1E3D] bg-black p-2">
                <div id="reader" className="w-full"></div>
                <p className="text-center text-[11px] text-white/70 mt-2">
                  Position the customer's QR ticket within the camera frame
                </p>
              </div>
            )}

            {/* Barcode & Booking Ref Input Form */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <QrCode className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  ref={inputRef}
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Scan QR barcode or enter booking ref (e.g. VYB-A1B2C)..."
                  className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white text-xs font-semibold"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !code.trim()}
                className="h-11 px-5 rounded-xl bg-[#7B1E3D] hover:bg-[#631831] text-white text-xs font-bold gap-1.5 shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Validate
              </Button>

              {result && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="h-11 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100"
                  title="Clear result"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
            </form>
            <p className="text-[11px] text-slate-400">
              Tip: Standard USB & Bluetooth handheld barcode scanners will automatically submit when scanned.
            </p>
          </div>

          {/* Validation Result Display */}
          {result && (
            <div
              className={`rounded-2xl border p-6 shadow-sm transition-all animate-in fade-in zoom-in-95 duration-200 ${
                result.valid
                  ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                  : result.status === "ALREADY_USED"
                  ? "bg-rose-50 border-rose-300 text-rose-950"
                  : "bg-amber-50 border-amber-300 text-amber-950"
              }`}
            >
              {/* Header Badge */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  {result.valid ? (
                    <div className="p-2 rounded-xl bg-emerald-500 text-white shadow-xs">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  ) : result.status === "ALREADY_USED" ? (
                    <div className="p-2 rounded-xl bg-rose-600 text-white shadow-xs animate-bounce">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-extrabold tracking-tight">
                      {result.valid
                        ? "VALID TICKET - ADMITTED"
                        : result.status === "ALREADY_USED"
                        ? "DUPLICATE SCAN - ALREADY ADMITTED"
                        : "ADMISSION REJECTED"}
                    </h3>
                    <p className="text-xs font-medium opacity-90 mt-0.5">{result.message}</p>
                  </div>
                </div>

                <Badge
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 ${
                    result.valid
                      ? "bg-emerald-600 text-white"
                      : result.status === "ALREADY_USED"
                      ? "bg-rose-600 text-white"
                      : "bg-amber-600 text-white"
                  }`}
                >
                  {result.status}
                </Badge>
              </div>

              {/* Booking Details Card */}
              {result.booking && (
                <div className="bg-white/90 backdrop-blur-xs rounded-xl p-4 border border-black/5 space-y-3 text-xs text-slate-800">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Movie Title
                      </span>
                      <h4 className="font-bold text-base text-slate-900 leading-snug">
                        {result.booking.movie_title || "Screening Title"}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Booking Ref
                      </span>
                      <div className="font-mono font-bold text-sm text-[#7B1E3D]">
                        {result.booking.ref_code}
                      </div>
                      {(result as any).cryptographically_verified && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px] border border-emerald-300">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Offline Signed QR
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Screen</span>
                      <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                        <Film className="w-3.5 h-3.5 text-slate-400" />
                        {result.booking.screen_name}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Showtime</span>
                      <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {result.booking.showtime
                          ? new Date(result.booking.showtime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Scheduled"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Admit Count</span>
                      <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {result.booking.quantity || 1} Guests
                      </span>
                    </div>
                  </div>

                  {result.booking.seats && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Allocated Seats:</span>
                      <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 font-bold border border-orange-200">
                        {result.booking.seats}
                      </span>
                    </div>
                  )}

                  {result.booking.venue_name && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Venue:</span>
                      <span className="font-semibold text-slate-700">{result.booking.venue_name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action to scan next ticket */}
              <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
                <span className="text-[11px] font-medium opacity-80">
                  {result.valid
                    ? `Admitted at ${new Date().toLocaleTimeString()} by ${result.admitted_by || "Gate Staff"}`
                    : "Check customer app or re-scan code"}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  className="h-8 text-xs font-semibold bg-white text-slate-800"
                >
                  Scan Next Ticket
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Gate Admissions Log */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-[#7B1E3D]" />
                <h3 className="font-bold text-sm text-slate-900">Recent Gate Admissions</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchAdmissions}
                disabled={loadingAdmissions}
                className="h-8 px-2 text-xs text-slate-500"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${loadingAdmissions ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {loadingAdmissions && recentAdmissions.length === 0 ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#7B1E3D]" />
              </div>
            ) : recentAdmissions.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                No admissions recorded yet for this selection.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {recentAdmissions.map((adm) => (
                  <div
                    key={adm.id}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">
                          {adm.ref_code || "VYB-TKT"}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {adm.ticket_count} {adm.ticket_count === 1 ? "seat" : "seats"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <span>{adm.screen_name || "Screen"}</span>
                        {adm.seats && <span>• Seats: {adm.seats}</span>}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-slate-700">
                        {new Date(adm.admitted_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400">{adm.gate_device || "Gate 1"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

