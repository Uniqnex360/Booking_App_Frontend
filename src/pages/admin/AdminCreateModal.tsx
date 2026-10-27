import React, { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShieldCheck,
  UserPlus,
  Lock,
  Mail,
  User,
  Phone,
  Check,
  CheckSquare,
  Square,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  AdminSectionItem,
  createAdminUser,
} from "@/api/admin.api";

interface AdminCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  sections: AdminSectionItem[];
  presets: Record<string, string[]>;
}

export function AdminCreateModal({
  isOpen,
  onClose,
  onCreated,
  sections,
  presets,
}: AdminCreateModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [rolePreset, setRolePreset] = useState("FINANCE_ADMIN");
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Apply role preset default checkboxes when preset changes
  useEffect(() => {
    if (presets[rolePreset]) {
      setSelectedSections(presets[rolePreset]);
    } else if (rolePreset === "SUPER_ADMIN") {
      setSelectedSections(sections.map((s) => s.key));
    } else if (rolePreset === "CUSTOM_ADMIN") {
      // keep existing or clear
    }
  }, [rolePreset, presets, sections]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFullName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setRolePreset("FINANCE_ADMIN");
      setSelectedSections(presets["FINANCE_ADMIN"] || []);
    }
  }, [isOpen, presets]);

  const toggleSection = (key: string) => {
    setSelectedSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    setSelectedSections(sections.map((s) => s.key));
  };

  const handleClearAll = () => {
    setSelectedSections([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Please enter the administrator's full name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (selectedSections.length === 0) {
      toast.error("Please assign at least one portal section to this administrator");
      return;
    }

    try {
      setIsSubmitting(true);
      await createAdminUser({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
        role: rolePreset,
        assigned_sections: selectedSections,
      });

      toast.success(`Admin account for ${fullName} created successfully with ${selectedSections.length} section(s)`);
      onCreated();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to create administrator account";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl shadow-2xl border border-gray-100">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 bg-linear-to-r from-orange-50/70 via-amber-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-600/20 shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Create Administrator Account
                <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                  Section-wise RBAC
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">
                Super Admin decides which sections each administrative employee can access and operate.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Identity & Credentials */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-500" />
              1. Admin Identity & Credentials
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Full Name *</Label>
                <div className="relative mt-1">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Anand Sharma"
                    className="pl-9 text-xs sm:text-sm h-10 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Work Email Address *</Label>
                <div className="relative mt-1">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. anand.finance@vybhz.com"
                    className="pl-9 text-xs sm:text-sm h-10 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Temporary Password *</Label>
                <div className="relative mt-1">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="pl-9 text-xs sm:text-sm h-10 rounded-xl font-mono"
                    required
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Share this temporary password with the staff member.
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Phone Number (Optional)</Label>
                <div className="relative mt-1">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="pl-9 text-xs sm:text-sm h-10 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Role Presets */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                2. Role Presets (Quick Checkbox Auto-Fill)
              </h4>
              <span className="text-[11px] text-gray-400">
                Pick a template or customize individual checkboxes below
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                {
                  id: "FINANCE_ADMIN",
                  label: "Finance Admin",
                  desc: "Bookings & Invoices",
                  color: "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800",
                  activeColor: "ring-2 ring-emerald-600 bg-emerald-50 border-emerald-400 text-emerald-900 font-bold",
                },
                {
                  id: "OPERATIONS_ADMIN",
                  label: "Operations Admin",
                  desc: "Theatres, Movies & Gateways",
                  color: "border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-800",
                  activeColor: "ring-2 ring-blue-600 bg-blue-50 border-blue-400 text-blue-900 font-bold",
                },
                {
                  id: "SUPPORT_ADMIN",
                  label: "Support Admin",
                  desc: "Exceptions & Bookings",
                  color: "border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-purple-800",
                  activeColor: "ring-2 ring-purple-600 bg-purple-50 border-purple-400 text-purple-900 font-bold",
                },
                {
                  id: "CUSTOM_ADMIN",
                  label: "Custom Admin",
                  desc: "Tailored Checkboxes",
                  color: "border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-gray-800",
                  activeColor: "ring-2 ring-gray-600 bg-gray-100 border-gray-400 text-gray-900 font-bold",
                },
              ].map((preset) => {
                const isSelected = rolePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setRolePreset(preset.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected ? preset.activeColor : preset.color
                    }`}
                  >
                    <p className="text-xs font-semibold">{preset.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{preset.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section-Wise Checkbox Matrix */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  3. Section-Wise Access Matrix ({selectedSections.length} of {sections.length} Selected)
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Check each box to grant access to that specific dashboard section.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-7 text-xs px-2.5 rounded-lg border-gray-300 text-gray-700 hover:bg-gray-100 gap-1"
                >
                  <CheckSquare className="w-3 h-3 text-orange-600" />
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-7 text-xs px-2.5 rounded-lg border-gray-300 text-gray-700 hover:bg-gray-100 gap-1"
                >
                  <Square className="w-3 h-3 text-gray-400" />
                  Clear All
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {sections.map((sec) => {
                const isChecked = selectedSections.includes(sec.key);
                return (
                  <label
                    key={sec.key}
                    onClick={() => toggleSection(sec.key)}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? "bg-orange-50/60 border-orange-300 shadow-2xs"
                        : "bg-white border-gray-200 hover:bg-gray-50/80"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent div
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-bold ${isChecked ? "text-orange-950" : "text-gray-900"}`}>
                          {sec.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 h-4 bg-gray-100 text-gray-600 border-gray-200"
                        >
                          {sec.category}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 leading-snug">
                        {sec.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </form>

        <DialogFooter className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between sm:justify-between gap-3">
          <div className="text-xs text-gray-500">
            Assigned: <strong className="text-gray-900">{selectedSections.length} sections</strong>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 rounded-xl border-gray-300 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              size="sm"
              className="h-9 px-5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl gap-2 shadow-sm shadow-orange-600/30"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Admin...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Create Admin Account
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

