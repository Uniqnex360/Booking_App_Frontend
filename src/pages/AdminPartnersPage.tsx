import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader } from '@/components/common/Loader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import type {
  Partner,
  PartnerStatus,
  PartnerType,
} from '@/types/partner.types';

import {
  Store,
  Film,
  CalendarDays,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  Search,
  FileCheck,
  FileText,
  ExternalLink,
  Download,
  Eye,
  AlertCircle,
  Copy,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { getAdminPartners, updatePartnerStatus } from '@/api/admin.api';
import { PaginatedResponse } from '@/types';
import { getPartnerTypeMeta, partnerTypeMeta } from '@/lib/partnerTypeMeta';


const statusBadge: Record<PartnerStatus, string> = {
  PENDING_APPROVAL:
    'bg-[#7B1E3D]/10 text-[#7B1E3D] border-[#7B1E3D]/30',
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
  SUSPENDED: 'bg-red-100 text-red-700 border-red-200',
};

const statusLabel: Record<PartnerStatus, string> = {
  PENDING_APPROVAL: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
};

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Reject dialog state
  const [rejectPartner, setRejectPartner] = useState<Partner | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // KYC Document Verification Modal state
  const [selectedPartnerForDocs, setSelectedPartnerForDocs] = useState<Partner | null>(null);
  const [activeDocTab, setActiveDocTab] = useState<'gst' | 'pan'>('gst');

  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminPartners({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        partner_type: typeFilter !== 'all' ? typeFilter : undefined,
        page,
        limit: 10,
      });
      // Map backend keys "partners" and "pagination" correctly
      const raw: any = res;
      setPartners(raw.partners || raw.data || []);
      setMeta(raw.pagination || raw.meta || null);
    } catch {
      toast.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, page]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await updatePartnerStatus(id, 'APPROVED');
      toast.success('Partner approved successfully');
      fetchPartners();
    } catch {
      toast.error('Failed to approve partner');
    } finally {
      setApprovingId(null);
    }
  };

  const openRejectDialog = (partner: Partner) => {
    setRejectPartner(partner);
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectPartner) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setRejecting(true);
    try {
      await updatePartnerStatus(
        rejectPartner.id,
        'REJECTED',
        rejectReason.trim()
      );
      toast.success('Partner rejected');
      setRejectPartner(null);
      fetchPartners();
    } catch {
      toast.error('Failed to reject partner');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header hideLocation />

     <div className="mx-auto max-w-6xl px-4 pt-32 pb-8 sm:px-6 lg:px-8">

                {/* Admin Navigation Tabs */}
        <div className="flex border-b border-slate-200/60 gap-4 mb-6 pt-2">
          <button
            onClick={() => {}}
            className="pb-3 text-sm font-semibold border-b-2 border-wine-700 text-slate-900 flex items-center gap-2"
          >
            <Users className="h-4 w-4 text-[#7B1E3D]" />
            Partner Verification
          </button>
          <a
            href="/admin/moderation"
            className="pb-3 text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-2"
          >
            <Film className="h-4 w-4" />
            Event Moderation
          </a>
        </div>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7B1E3D]/5">
            <Users className="h-6 w-6 text-[#7B1E3D]" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-semibold text-slate-900">
              Partner Management
            </h1>
            <p className="text-sm text-slate-500">
              Review and manage all partner applications
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-900">Filters</span>
          </div>
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs font-medium">
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">
                Partner Type
              </Label>
              <Select
                value={typeFilter}
                onValueChange={(v) => {
                  setTypeFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="experience_partner">
                    Experience & Dining Partner
                  </SelectItem>
                  <SelectItem value="restaurant">Restaurant (Legacy)</SelectItem>
                  <SelectItem value="event_organiser">
                    Event Organizer (Legacy)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader className="h-8 w-8" />
            </div>
          ) : partners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7B1E3D]/5">
                <Users className="h-6 w-6 text-[#7B1E3D]" />
              </div>
              <p className="font-serif text-lg font-semibold text-slate-900">
                No partners found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try adjusting your filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Business
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">
                      Type
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 lg:table-cell">
                      Contact
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 lg:table-cell">
                      City
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">
                      KYC Documents
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {partners.map((partner) => {
                    const TypeIcon = getPartnerTypeMeta(partner.partner_type).icon;

                    return (
                      <tr
                        key={partner.id}
                        className="transition-colors hover:bg-slate-50/20"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#7B1E3D]/5">
                              <TypeIcon className="h-4 w-4 text-[#7B1E3D]" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {partner.business_name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {partner.contact_name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-4 sm:table-cell">
                          <span className="text-sm text-slate-600">
                            {partnerTypeMeta[partner.partner_type]?.label ?? partner.partner_type}

                          </span>
                        </td>
                        <td className="hidden px-4 py-4 lg:table-cell">
                          <span className="text-sm text-slate-600">
                            {partner.contact_phone}
                          </span>
                        </td>
                        <td className="hidden px-4 py-4 lg:table-cell">
                          <span className="text-sm text-slate-600">
                            {partner.city}
                          </span>
                        </td>
                        <td className="hidden px-4 py-4 md:table-cell">
                          <div className="flex flex-col gap-1 items-start">
                            {(partner.gst_certificate_url || partner.pan_card_url) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedPartnerForDocs(partner);
                                  setActiveDocTab(partner.gst_certificate_url ? 'gst' : 'pan');
                                }}
                                className="h-7 rounded-lg border-emerald-300 bg-emerald-50/50 px-2 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5"
                              >
                                <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                                Review Docs ({[partner.gst_certificate_url, partner.pan_card_url].filter(Boolean).length}/2)
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedPartnerForDocs(partner);
                                  setActiveDocTab('gst');
                                }}
                                className="h-7 rounded-lg px-2 text-[11px] text-slate-400 hover:text-slate-700"
                              >
                                <FileText className="h-3.5 w-3.5 mr-1" />
                                No docs
                              </Button>
                            )}
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                              {partner.gst_number ? <span>GST: {partner.gst_number}</span> : null}
                              {partner.gst_number && partner.pan_number ? <span>•</span> : null}
                              {partner.pan_number ? <span>PAN: {partner.pan_number}</span> : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            className={`border ${statusBadge[partner.status]}`}
                          >
                            {statusLabel[partner.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPartnerForDocs(partner);
                                setActiveDocTab(partner.gst_certificate_url ? 'gst' : 'pan');
                              }}
                              className="h-8 rounded-full px-2.5 text-xs text-slate-600 hover:bg-slate-100"
                              title="Verify GST and PAN Documents"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1 text-slate-500" />
                              Docs
                            </Button>
                            {partner.status === 'PENDING_APPROVAL' && (
                              <>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      className="rounded-full bg-emerald-600 text-xs font-semibold text-slate-900 hover:bg-emerald-700"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                      Approve
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="rounded-2xl">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="font-serif text-xl text-slate-900">
                                        Approve Partner
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to approve{' '}
                                        <span className="font-semibold text-slate-900">
                                          {partner.business_name}
                                        </span>
                                        ? They will be able to list their
                                        business immediately.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="rounded-xl">
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          handleApprove(partner.id)
                                        }
                                        className="rounded-xl bg-emerald-600 text-slate-900 hover:bg-emerald-700"
                                      >
                                        {approvingId === partner.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          'Yes, approve'
                                        )}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openRejectDialog(partner)}
                                  className="rounded-full border-red-300 text-xs font-semibold text-red-600 hover:bg-red-50"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && meta && meta.total_pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {meta.page} of {meta.total_pages} • {meta.total} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-xl"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog
        open={!!rejectPartner}
        onOpenChange={(open) => !open && setRejectPartner(null)}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-semibold text-slate-900">
              Reject Partner
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting{' '}
              <span className="font-semibold text-slate-900">
                {rejectPartner?.business_name}
              </span>
              . This will be visible to the applicant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason" className="text-sm font-medium">
              Rejection Reason *
            </Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete business documentation..."
              className="min-h-[100px] rounded-xl"
            />
            {!rejectReason.trim() && rejectReason.length > 0 && (
              <p className="text-xs text-rose-600">
                Rejection reason is required
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectPartner(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejecting || !rejectReason.trim()}
              className="rounded-xl bg-red-600 text-sm font-semibold text-slate-900 hover:bg-red-700"
            >
              {rejecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Reject Partner'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KYC Document Verification Modal */}
      <Dialog
        open={!!selectedPartnerForDocs}
        onOpenChange={(open) => !open && setSelectedPartnerForDocs(null)}
      >
        <DialogContent className="max-w-3xl rounded-2xl p-6">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="font-serif text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-[#7B1E3D]" />
                  KYC & Tax Compliance Verification
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  Verify business documentation and government identity proofs for{' '}
                  <span className="font-semibold text-slate-900">
                    {selectedPartnerForDocs?.business_name}
                  </span>
                </DialogDescription>
              </div>
              {selectedPartnerForDocs && (
                <Badge
                  className={`border text-xs ${statusBadge[selectedPartnerForDocs.status]}`}
                >
                  {statusLabel[selectedPartnerForDocs.status]}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {selectedPartnerForDocs && (
            <div className="space-y-5 pt-2">
              {/* Partner Overview Strip */}
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Business</span>
                  <span className="font-semibold text-slate-800">{selectedPartnerForDocs.business_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Contact Person</span>
                  <span className="font-semibold text-slate-800">{selectedPartnerForDocs.contact_name} ({selectedPartnerForDocs.contact_phone})</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">City</span>
                  <span className="font-semibold text-slate-800">{selectedPartnerForDocs.city}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Category</span>
                  <span className="font-semibold text-slate-800">
                    {partnerTypeMeta[selectedPartnerForDocs.partner_type]?.label || selectedPartnerForDocs.partner_type}
                  </span>
                </div>
              </div>

              {/* Document Tabs */}
              <div className="flex gap-2 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveDocTab('gst')}
                  className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                    activeDocTab === 'gst'
                      ? 'border-[#7B1E3D] text-[#7B1E3D]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  GST Certificate
                  {selectedPartnerForDocs.gst_certificate_url ? (
                    <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800 font-bold">✓ Attached</span>
                  ) : (
                    <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">Missing</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDocTab('pan')}
                  className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                    activeDocTab === 'pan'
                      ? 'border-[#7B1E3D] text-[#7B1E3D]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  PAN Card Document
                  {selectedPartnerForDocs.pan_card_url ? (
                    <span className="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-800 font-bold">✓ Attached</span>
                  ) : (
                    <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">Missing</span>
                  )}
                </button>
              </div>

              {/* GST Certificate Tab View */}
              {activeDocTab === 'gst' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Declared GSTIN Number</span>
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {selectedPartnerForDocs.gst_number || 'Not provided'}
                      </span>
                    </div>
                    {selectedPartnerForDocs.gst_number && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedPartnerForDocs.gst_number!);
                          toast.success('GST number copied to clipboard');
                        }}
                        className="h-8 text-xs text-slate-600 hover:text-slate-900"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy GSTIN
                      </Button>
                    )}
                  </div>

                  {selectedPartnerForDocs.gst_certificate_url ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="text-xs font-semibold text-slate-800">
                            GST Certificate Document File
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs rounded-lg"
                          >
                            <a
                              href={selectedPartnerForDocs.gst_certificate_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              Open in New Window
                            </a>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs rounded-lg"
                          >
                            <a
                              href={selectedPartnerForDocs.gst_certificate_url}
                              download
                            >
                              <Download className="h-3.5 w-3.5 mr-1" />
                              Download
                            </a>
                          </Button>
                        </div>
                      </div>

                      <div className="flex max-h-[55vh] items-center justify-center overflow-auto rounded-lg bg-white p-2 border border-slate-200">
                        {selectedPartnerForDocs.gst_certificate_url.toLowerCase().includes('.pdf') ? (
                          <iframe
                            src={selectedPartnerForDocs.gst_certificate_url}
                            title="GST Certificate"
                            className="h-[400px] w-full rounded border-0"
                          />
                        ) : (
                          <img
                            src={selectedPartnerForDocs.gst_certificate_url}
                            alt="GST Certificate"
                            className="max-h-[400px] w-auto rounded object-contain"
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
                      <AlertCircle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
                      <p className="text-sm font-semibold text-amber-900">
                        No GST Certificate Uploaded
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        The partner did not attach a digital GST registration certificate during submission.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* PAN Card Tab View */}
              {activeDocTab === 'pan' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Declared PAN Number</span>
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {selectedPartnerForDocs.pan_number || 'Not provided'}
                      </span>
                    </div>
                    {selectedPartnerForDocs.pan_number && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedPartnerForDocs.pan_number!);
                          toast.success('PAN number copied to clipboard');
                        }}
                        className="h-8 text-xs text-slate-600 hover:text-slate-900"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy PAN
                      </Button>
                    )}
                  </div>

                  {selectedPartnerForDocs.pan_card_url ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                          <span className="text-xs font-semibold text-slate-800">
                            PAN Card Document File
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs rounded-lg"
                          >
                            <a
                              href={selectedPartnerForDocs.pan_card_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              Open in New Window
                            </a>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs rounded-lg"
                          >
                            <a
                              href={selectedPartnerForDocs.pan_card_url}
                              download
                            >
                              <Download className="h-3.5 w-3.5 mr-1" />
                              Download
                            </a>
                          </Button>
                        </div>
                      </div>

                      <div className="flex max-h-[55vh] items-center justify-center overflow-auto rounded-lg bg-white p-2 border border-slate-200">
                        {selectedPartnerForDocs.pan_card_url.toLowerCase().includes('.pdf') ? (
                          <iframe
                            src={selectedPartnerForDocs.pan_card_url}
                            title="PAN Card"
                            className="h-[400px] w-full rounded border-0"
                          />
                        ) : (
                          <img
                            src={selectedPartnerForDocs.pan_card_url}
                            alt="PAN Card"
                            className="max-h-[400px] w-auto rounded object-contain"
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
                      <AlertCircle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
                      <p className="text-sm font-semibold text-amber-900">
                        No PAN Card Document Uploaded
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        The partner did not attach a digital PAN card during submission.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons in Modal */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-6">
                <div>
                  {selectedPartnerForDocs.status === 'PENDING_APPROVAL' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const id = selectedPartnerForDocs.id;
                          setSelectedPartnerForDocs(null);
                          handleApprove(id);
                        }}
                        className="rounded-xl bg-emerald-600 text-xs font-semibold text-slate-900 hover:bg-emerald-700"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Approve Partner
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const p = selectedPartnerForDocs;
                          setSelectedPartnerForDocs(null);
                          openRejectDialog(p);
                        }}
                        className="rounded-xl border-red-300 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Reject Application
                      </Button>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedPartnerForDocs(null)}
                  className="rounded-xl text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
