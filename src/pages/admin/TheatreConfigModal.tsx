import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getTheatrePaymentConfig,
  updateTheatrePaymentConfig,
  getTheatreConfigHistory,
  TheatrePaymentConfig,
  TheatreConfigHistoryItem,
} from "@/api/admin.api";
import { Loader2, History, Settings, ShieldCheck, CheckCircle2 } from "lucide-react";

interface TheatreConfigModalProps {
  venueId: string | null;
  venueName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function TheatreConfigModal({
  venueId,
  venueName,
  isOpen,
  onClose,
  onSaved,
}: TheatreConfigModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<"config" | "history">("config");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<TheatrePaymentConfig | null>(null);
  const [history, setHistory] = useState<TheatreConfigHistoryItem[]>([]);
  const [changeReason, setChangeReason] = useState("");

  useEffect(() => {
    if (isOpen && venueId) {
      loadData(venueId);
    }
  }, [isOpen, venueId]);

  const loadData = async (id: string) => {
    setLoading(true);
    try {
      const [cfg, hist] = await Promise.all([
        getTheatrePaymentConfig(id),
        getTheatreConfigHistory(id),
      ]);
      setConfig(cfg);
      setHistory(hist || []);
      setChangeReason("");
    } catch {
      toast.error("Failed to load theatre configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueId || !config) return;

    if (!changeReason.trim()) {
      toast.error("Please enter a change reason for the audit log");
      return;
    }

    setSaving(true);
    try {
      await updateTheatrePaymentConfig(venueId, {
        customer_payment_model: config.customer_payment_model,
        payment_provider: config.payment_provider,
        commission_model: config.commission_model,
        rate_type: config.rate_type,
        rate_value: Number(config.rate_value),
        fixed_fee_paise: Number(config.fixed_fee_paise || 0),
        calculation_base: config.calculation_base,
        invoice_cycle: config.invoice_cycle,
        due_days: Number(config.due_days),
        currency: config.currency,
        reconciliation_source: config.reconciliation_source,
        refund_treatment: config.refund_treatment,
        contract_ref: config.contract_ref,
        change_reason: changeReason.trim(),
      });
      toast.success("Theatre configuration and audit log saved");
      if (onSaved) onSaved();
      onClose();
    } catch {
      toast.error("Failed to update theatre configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-orange-600" />
            <DialogTitle className="text-xl">
              Payment & Commission Controls
            </DialogTitle>
          </div>
          <DialogDescription className="font-medium text-gray-700">
            {venueName}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as any)}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> Terms Configuration
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" /> Audit History ({history.length})
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <>
              <TabsContent value="config">
                {config && (
                  <form onSubmit={handleSave} className="space-y-4 text-sm">
                    {/* Customer Payment Model */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-bold text-gray-700">Customer Payment Model</Label>
                        <select
                          className="w-full mt-1.5 h-9 rounded-md border border-gray-300 px-3 bg-white text-sm"
                          value={config.customer_payment_model}
                          onChange={(e) => setConfig({ ...config, customer_payment_model: e.target.value })}
                        >
                          <option value="THEATRE_DIRECT">Model A: Theatre Direct (Default)</option>
                          <option value="VYHBZ_COLLECTS_SETTLES">Model B: Vybhz Collects & Settles</option>
                          <option value="OTHER">Model C: Custom Partner Flow</option>
                        </select>
                      </div>

                      <div>
                        <Label className="text-xs font-bold text-gray-700">Payment Provider / System</Label>
                        <select
                          className="w-full mt-1.5 h-9 rounded-md border border-gray-300 px-3 bg-white text-sm"
                          value={config.payment_provider}
                          onChange={(e) => setConfig({ ...config, payment_provider: e.target.value })}
                        >
                          <option value="THEATRE_GATEWAY">Theatre Direct Gateway</option>
                          <option value="PVR_API">PVR Inox Provider API</option>
                          <option value="AGS_API">AGS Cinemas Direct API</option>
                          <option value="RAZORPAY">Vybhz Razorpay Gateway</option>
                        </select>
                      </div>
                    </div>

                    {/* Commission Rule */}
                    <div className="p-3.5 bg-orange-50/60 border border-orange-100 rounded-lg space-y-3">
                      <div className="text-xs font-bold text-orange-950 uppercase tracking-wide">
                        Commission Formula & Rate
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs text-gray-600">Rate Type</Label>
                          <select
                            className="w-full mt-1 h-8 rounded-md border border-gray-300 px-2 bg-white text-xs"
                            value={config.rate_type}
                            onChange={(e) => setConfig({ ...config, rate_type: e.target.value })}
                          >
                            <option value="PERCENTAGE">Percentage (%)</option>
                            <option value="FIXED_FEE">Fixed Fee (Paise)</option>
                            <option value="HYBRID">Hybrid (% + Fee)</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Commission Rate (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            className="mt-1 h-8 text-xs"
                            value={config.rate_value}
                            onChange={(e) => setConfig({ ...config, rate_value: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Calculation Base</Label>
                          <select
                            className="w-full mt-1 h-8 rounded-md border border-gray-300 px-2 bg-white text-xs"
                            value={config.calculation_base}
                            onChange={(e) => setConfig({ ...config, calculation_base: e.target.value })}
                          >
                            <option value="GROSS_TICKET">Gross Ticket Amount</option>
                            <option value="NET_OF_TAX">Net of Tax (excl GST)</option>
                            <option value="TICKET_PLUS_FEES">Ticket + Booking Fees</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Invoicing Cycle */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs font-bold text-gray-700">Invoice Cycle</Label>
                        <select
                          className="w-full mt-1.5 h-9 rounded-md border border-gray-300 px-3 bg-white text-sm"
                          value={config.invoice_cycle}
                          onChange={(e) => setConfig({ ...config, invoice_cycle: e.target.value })}
                        >
                          <option value="DAILY">Daily (Nightly cutoff)</option>
                          <option value="WEEKLY">Weekly (Monday cutoff)</option>
                          <option value="MONTHLY">Monthly (1st of Month)</option>
                          <option value="BI_WEEKLY">Bi-Weekly</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs font-bold text-gray-700">Payment Due (Days)</Label>
                        <Input
                          type="number"
                          className="mt-1.5 h-9"
                          value={config.due_days}
                          onChange={(e) => setConfig({ ...config, due_days: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold text-gray-700">Contract Reference</Label>
                        <Input
                          placeholder="e.g. AGR-2026-PVR"
                          className="mt-1.5 h-9"
                          value={config.contract_ref || ""}
                          onChange={(e) => setConfig({ ...config, contract_ref: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Reconciliation & Refunds */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-bold text-gray-700">Reconciliation Source</Label>
                        <select
                          className="w-full mt-1.5 h-9 rounded-md border border-gray-300 px-3 bg-white text-sm"
                          value={config.reconciliation_source}
                          onChange={(e) => setConfig({ ...config, reconciliation_source: e.target.value })}
                        >
                          <option value="API_WEBHOOK">Real-time Partner Webhook</option>
                          <option value="THEATRE_STATEMENT">Daily Theatre Statement</option>
                          <option value="GATEWAY_REPORT">Payment Gateway Settlement</option>
                          <option value="MANUAL_UPLOAD">Manual Statement Upload</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs font-bold text-gray-700">Refund Commission Policy</Label>
                        <select
                          className="w-full mt-1.5 h-9 rounded-md border border-gray-300 px-3 bg-white text-sm"
                          value={config.refund_treatment}
                          onChange={(e) => setConfig({ ...config, refund_treatment: e.target.value })}
                        >
                          <option value="DEDUCT_COMMISSION">Deduct Commission (Pro-rata)</option>
                          <option value="KEEP_COMMISSION">Retain Commission (Non-refundable)</option>
                        </select>
                      </div>
                    </div>

                    {/* Change Reason for Audit History */}
                    <div className="pt-2 border-t border-gray-200">
                      <Label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Change Reason (Mandatory for Audit Trail)
                      </Label>
                      <Input
                        placeholder="e.g. Commercial rate revision approved by Finance team"
                        className="mt-1.5"
                        value={changeReason}
                        onChange={(e) => setChangeReason(e.target.value)}
                      />
                    </div>

                    <DialogFooter className="pt-4">
                      <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                        Save Terms
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="history">
                {history.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-sm">
                    No previous configuration changes recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div key={item.id} className="p-3 border border-gray-200 rounded-lg text-xs space-y-1 bg-gray-50/50">
                        <div className="flex justify-between items-center text-gray-500">
                          <span className="font-semibold text-gray-700">
                            {item.changed_by_name || "Admin"}
                          </span>
                          <span>{format(parseISO(item.created_at), "dd MMM yyyy, hh:mm a")}</span>
                        </div>
                        <div className="text-gray-900 font-medium">
                          Reason: {item.change_reason || "Updated terms"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

