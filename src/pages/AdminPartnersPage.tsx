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
  PaginatedResponse,
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
} from 'lucide-react';
import { getAdminPartners, updatePartnerStatus } from '@/api/admin.api';

const partnerTypeMeta: Record<
  PartnerType,
  { label: string; icon: typeof Store }
> = {
  restaurant: { label: 'Restaurant', icon: Store },
  cinema: { label: 'Cinema', icon: Film },
  event_organiser: { label: 'Event Organizer', icon: CalendarDays },
};

const statusBadge: Record<PartnerStatus, string> = {
  PENDING_APPROVAL:
    'bg-amber-100 text-amber-700 border-amber-200',
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
  const [meta, setMeta] = useState<PaginatedResponse<Partner>['meta'] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Reject dialog state
  const [rejectPartner, setRejectPartner] = useState<Partner | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Approve state
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
      setPartners(res.partners||[]);
      setMeta(res.pagination);
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
    <div className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-wine-50">
            <Users className="h-6 w-6 text-wine-700" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-semibold text-wine-950">
              Partner Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Review and manage all partner applications
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-border/50 bg-card p-4 shadow-soft sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-wine-950">Filters</span>
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
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="cinema">Cinema</SelectItem>
                  <SelectItem value="event_organiser">
                    Event Organizer
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-border/50 bg-card shadow-soft">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader className="h-8 w-8" />
            </div>
          ) : partners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-wine-50">
                <Users className="h-6 w-6 text-wine-600" />
              </div>
              <p className="font-serif text-lg font-semibold text-wine-950">
                No partners found
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Business
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">
                      Type
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">
                      Contact
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">
                      City
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {partners.map((partner) => {
                    const TypeIcon =
                      partnerTypeMeta[partner.partner_type].icon;
                    return (
                      <tr
                        key={partner.id}
                        className="transition-colors hover:bg-secondary/20"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-wine-50">
                              <TypeIcon className="h-4 w-4 text-wine-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-wine-950">
                                {partner.business_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {partner.contact_name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-4 sm:table-cell">
                          <span className="text-sm text-foreground/70">
                            {partnerTypeMeta[partner.partner_type].label}
                          </span>
                        </td>
                        <td className="hidden px-4 py-4 lg:table-cell">
                          <span className="text-sm text-foreground/70">
                            {partner.contact_phone}
                          </span>
                        </td>
                        <td className="hidden px-4 py-4 lg:table-cell">
                          <span className="text-sm text-foreground/70">
                            {partner.city}
                          </span>
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
                            {partner.status === 'PENDING_APPROVAL' && (
                              <>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      className="rounded-full bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                      Approve
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="rounded-2xl">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="font-serif text-xl text-wine-950">
                                        Approve Partner
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to approve{' '}
                                        <span className="font-semibold text-wine-950">
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
                                        className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
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
            <p className="text-sm text-muted-foreground">
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
            <DialogTitle className="font-serif text-2xl font-semibold text-wine-950">
              Reject Partner
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting{' '}
              <span className="font-semibold text-wine-950">
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
              <p className="text-xs text-destructive">
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
              className="rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700"
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
    </div>
  );
}
