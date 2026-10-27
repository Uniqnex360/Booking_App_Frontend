import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Utensils,
  Search,
  RefreshCw,
  Filter,
  Check,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  Clock,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  DollarSign,
  Coffee,
  Plus,
  Compass,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminSearchBar } from '@/components/admin/AdminSearchBar';
import { AdminEventDetailModal } from './AdminEventDetailModal';
import { getAdminDining, updateAdminEventStatus, getAdminPartners } from '@/api/admin.api';
import type { EventItem } from '@/types/event.types';
import type { Partner } from '@/types/partner.types';
import { INDIAN_STATES, STATE_CITIES, ALL_SUPPORTED_CITIES } from '@/utils/indiaGeography';
import { useDebounce } from '@/hooks/useDebounce';

const CUISINE_OPTIONS = [
  { value: 'ALL', label: 'All Cuisines & Themes' },
  { value: 'FINE_DINING', label: 'Fine Dining' },
  { value: 'SUNDAY_BRUNCH', label: 'Sunday Brunch' },
  { value: 'BUFFET', label: 'Buffet & Degustation' },
  { value: 'ROOFTOP', label: 'Rooftop Dining' },
  { value: 'NORTH_INDIAN', label: 'North Indian / Mughlai' },
  { value: 'SOUTH_INDIAN', label: 'South Indian & Coastal' },
  { value: 'ITALIAN', label: 'Italian & Pizza' },
  { value: 'CONTINENTAL', label: 'Continental & European' },
  { value: 'PAN_ASIAN', label: 'Pan-Asian & Chinese' },
  { value: 'JAPANESE', label: 'Japanese & Sushi' },
  { value: 'CAFE', label: 'Cafe & Bakery' },
  { value: 'OUTDOOR_SEATING', label: 'Outdoor / Poolside' },
];

export default function DiningModerationTab() {
  const [diningList, setDiningList] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [cuisineFilter, setCuisineFilter] = useState('ALL');
  const [partnerFilter, setPartnerFilter] = useState('ALL');
  const [approvedDiningPartners, setApprovedDiningPartners] = useState<Partner[]>([]);

  useEffect(() => {
    getAdminPartners({ status: 'APPROVED', partner_type: 'dining', limit: 100 })
      .then((res: any) => {
        setApprovedDiningPartners(res.partners || res.data || []);
      })
      .catch((err) => console.error('Failed to load dining partners:', err));
  }, []);

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  // Details Modal & Action States
  const [selectedForDetails, setSelectedForDetails] = useState<EventItem | null>(null);
  const [rejectingItem, setRejectingItem] = useState<EventItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Cascading cities based on state
  const availableCities = useMemo(() => {
    if (stateFilter !== 'ALL' && STATE_CITIES[stateFilter]) {
      return STATE_CITIES[stateFilter];
    }
    return ALL_SUPPORTED_CITIES;
  }, [stateFilter]);

  const fetchDining = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminDining({
        search: debouncedSearch.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        city: cityFilter !== 'ALL' ? cityFilter : undefined,
        state: stateFilter !== 'ALL' ? stateFilter : undefined,
        cuisine: cuisineFilter !== 'ALL' ? cuisineFilter : undefined,
        partner_id: partnerFilter !== 'ALL' ? partnerFilter : undefined,
        page,
        limit: 12,
      });
      const items = res.items || res.dining || [];
      setDiningList(items);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load dining listings:', err);
      toast.error('Failed to load dining listings');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, cityFilter, stateFilter, cuisineFilter, partnerFilter, page]);

  useEffect(() => {
    fetchDining();
  }, [fetchDining]);

  // Status moderation actions
  const handleApprove = async (item: EventItem) => {
    setActionLoadingId(item.id);
    try {
      await updateAdminEventStatus(item.id, 'PUBLISHED');
      toast.success(`"${item.title}" approved and published to live dining!`);
      if (selectedForDetails?.id === item.id) {
        setSelectedForDetails(null);
      }
      await fetchDining();
    } catch (err) {
      console.error('Failed to approve dining experience:', err);
      toast.error('Failed to approve experience');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleDelist = async (item: EventItem) => {
    const isLive = item.status === 'PUBLISHED';
    const nextStatus = isLive ? 'CANCELLED' : 'PUBLISHED';
    setActionLoadingId(item.id);
    try {
      await updateAdminEventStatus(item.id, nextStatus as any);
      toast.success(`"${item.title}" ${isLive ? 'delisted / hidden' : 'relisted as live'}`);
      if (selectedForDetails?.id === item.id) {
        setSelectedForDetails(null);
      }
      await fetchDining();
    } catch (err) {
      console.error('Failed to change status:', err);
      toast.error('Failed to update status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    setActionLoadingId(rejectingItem.id);
    try {
      await updateAdminEventStatus(
        rejectingItem.id,
        'REJECTED',
        rejectionReason.trim() || 'Details did not satisfy platform dining standards.'
      );
      toast.success(`"${rejectingItem.title}" marked as REJECTED`);
      setRejectingItem(null);
      setRejectionReason('');
      if (selectedForDetails?.id === rejectingItem.id) {
        setSelectedForDetails(null);
      }
      await fetchDining();
    } catch (err) {
      console.error('Failed to reject experience:', err);
      toast.error('Failed to reject experience');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Stats calculation
  const totalCount = pagination?.total_items ?? diningList.length;
  const publishedCount = diningList.filter((d) => d.status === 'PUBLISHED').length;
  const pendingCount = diningList.filter((d) => d.status === 'PENDING_APPROVAL').length;
  const otherCount = diningList.filter(
    (d) => d.status !== 'PUBLISHED' && d.status !== 'PENDING_APPROVAL'
  ).length;

  return (
    <div className="py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100">
            <Utensils className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                Dining & Restaurants Moderation
              </h2>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-semibold">
                Separate Vertical
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Review and moderate table bookings, chef tasting menus, brunches, and fine dining packages.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDining}
            disabled={loading}
            className="rounded-xl h-10 text-xs font-semibold text-gray-700 gap-2 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            asChild
            size="sm"
            className="rounded-xl h-10 text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white gap-2 shadow-sm shadow-amber-700/20"
          >
            <Link to="/partner/dining/new">
              <Plus className="h-4 w-4" />
              <span>Host Dining</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-medium text-gray-500">Total Dining Listings</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">{totalCount}</span>
            <span className="text-xs text-gray-400 font-mono">Restaurants</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs bg-emerald-50/20">
          <span className="text-xs font-medium text-emerald-800">Live in Discovery</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-700">{publishedCount}</span>
            <span className="text-xs text-emerald-600 font-medium">Visible to Users</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs bg-amber-50/30">
          <span className="text-xs font-medium text-amber-900">Pending Moderation</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-700">{pendingCount}</span>
            <span className="text-xs text-amber-600 font-medium">Needs Review</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs bg-gray-50/50">
          <span className="text-xs font-medium text-gray-600">Draft / Delisted</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-700">{otherCount}</span>
            <span className="text-xs text-gray-500">Hidden from portal</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <AdminSearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            onClear={() => {
              setSearch('');
              setPage(1);
            }}
            placeholder="Search restaurants, cuisines, dining experiences, cities..."
            isSearching={loading && search !== debouncedSearch}
            className="flex-1"
          />

          <div className="flex flex-wrap items-center gap-2">
            {/* Cuisine Filter */}
            <select
              value={cuisineFilter}
              onChange={(e) => {
                setCuisineFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
            >
              {CUISINE_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            {/* Location State Filter */}
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setCityFilter('ALL');
                setPage(1);
              }}
              className="h-10 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
            >
              <option value="ALL">All States (India)</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Location City Filter */}
            <select
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
            >
              <option value="ALL">
                {stateFilter === 'ALL' ? 'All Cities' : `All Cities in ${stateFilter}`}
              </option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Partner-Wise Restaurant Filter */}
            <select
              value={partnerFilter}
              onChange={(e) => {
                setPartnerFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs max-w-[210px] truncate"
            >
              <option value="ALL">All Dining Partners</option>
              {approvedDiningPartners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.business_name} ({p.city})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-gray-500 font-semibold mr-1">Status:</span>
            {[
              { id: 'ALL', label: 'All Listings' },
              { id: 'PENDING_APPROVAL', label: 'Pending Approval' },
              { id: 'PUBLISHED', label: 'Live / Published' },
              { id: 'CANCELLED', label: 'Delisted / Cancelled' },
              { id: 'DRAFT', label: 'Draft' },
              { id: 'REJECTED', label: 'Rejected' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setStatusFilter(st.id);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {(search ||
            statusFilter !== 'ALL' ||
            stateFilter !== 'ALL' ||
            cityFilter !== 'ALL' ||
            cuisineFilter !== 'ALL' ||
            partnerFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setStateFilter('ALL');
                setCityFilter('ALL');
                setCuisineFilter('ALL');
                setPartnerFilter('ALL');
                setPage(1);
              }}
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Dining Cards Grid */}
      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-gray-200">
            <RefreshCw className="h-8 w-8 text-amber-700 animate-spin mb-3" />
            <p className="text-sm font-semibold text-gray-700">Loading dining experiences...</p>
          </div>
        ) : diningList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-gray-200 text-center">
            <Utensils className="h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-base font-bold text-gray-800">No dining listings found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              No restaurant experiences match your current filters. Try resetting filters or host a new dining pass.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {diningList.map((item) => {
              const isPending = item.status === 'PENDING_APPROVAL';
              const isLive = item.status === 'PUBLISHED';
              const isActing = actionLoadingId === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-2xs hover:shadow-md transition flex flex-col overflow-hidden"
                >
                  {/* Poster / Header Image */}
                  <div className="relative h-44 w-full bg-gray-100 overflow-hidden">
                    {item.poster_image_url ? (
                      <img
                        src={item.poster_image_url}
                        alt={item.title}
                        className="w-full h-full object-cover transition hover:scale-105 duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50/50 text-amber-800">
                        <Utensils className="h-10 w-10 text-amber-600/50 mb-1" />
                        <span className="text-xs font-semibold">Dining Experience</span>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs uppercase tracking-wider ${
                          isLive
                            ? 'bg-emerald-500 text-white'
                            : isPending
                            ? 'bg-amber-500 text-white animate-pulse'
                            : 'bg-gray-800/80 text-white backdrop-blur-xs'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {/* Price Range Pill */}
                    {item.price_range && (
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
                        {Array(item.price_range).fill('₹').join('')}
                      </div>
                    )}

                    {/* City Pill */}
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-lg text-[11px] font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-amber-400" />
                      <span>{item.city}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-serif font-bold text-base text-gray-900 leading-snug line-clamp-1">
                          {item.title}
                        </h3>
                      </div>

                      <p className="text-xs font-medium text-gray-600 mt-0.5 line-clamp-1">
                        {item.venue_name}
                      </p>

                      {item.venue_address && (
                        <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                          {item.venue_address}
                        </p>
                      )}

                      {/* Cuisine Pills */}
                      {item.cuisine && item.cuisine.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {item.cuisine.slice(0, 3).map((c, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/60 rounded-md text-[10px] font-semibold"
                            >
                              {c.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {item.cuisine.length > 3 && (
                            <span className="text-[10px] text-gray-400 self-center">
                              +{item.cuisine.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* What's Included Preview */}
                      {item.what_included && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2 italic bg-gray-50 p-2 rounded-xl border border-gray-100">
                          "{item.what_included}"
                        </p>
                      )}
                    </div>

                    {/* Bottom Pricing & Actions */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-medium">Starts At</span>
                        <span className="text-sm font-mono font-bold text-gray-900">
                          {item.min_price_paise
                            ? `₹${(item.min_price_paise / 100).toFixed(0)}`
                            : 'Menu / RSVP'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedForDetails(item)}
                          className="h-8 text-xs font-semibold px-2.5 rounded-xl border-gray-200 text-gray-700 hover:bg-gray-100"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Details
                        </Button>

                        {isPending && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(item)}
                              disabled={isActing}
                              className="h-8 text-xs font-bold px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectingItem(item)}
                              disabled={isActing}
                              className="h-8 text-xs font-bold px-2 rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}

                        {isLive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleDelist(item)}
                            disabled={isActing}
                            className="h-8 text-xs font-semibold px-2.5 rounded-xl border-amber-300 text-amber-800 hover:bg-amber-50"
                          >
                            <EyeOff className="h-3.5 w-3.5 mr-1" />
                            Delist
                          </Button>
                        )}

                        {!isLive && !isPending && (
                          <Button
                            size="sm"
                            onClick={() => handleApprove(item)}
                            disabled={isActing}
                            className="h-8 text-xs font-bold px-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Publish
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-gray-100 text-xs text-gray-500">
            <span>
              Showing page {page} of {pagination.total_pages} ({pagination.total_items} experiences)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 px-3 rounded-xl border-gray-200"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 px-3 rounded-xl border-gray-200"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Admin Event / Dining Detail Modal */}
      {selectedForDetails && (
        <AdminEventDetailModal
          event={selectedForDetails}
          open={!!selectedForDetails}
          onOpenChange={(open) => {
            if (!open) setSelectedForDetails(null);
          }}
          onApprove={handleApprove}
          onReject={(ev) => setRejectingItem(ev)}
          onToggleDelist={handleToggleDelist}
          isActionLoading={actionLoadingId === selectedForDetails.id}
        />
      )}

      {/* Reject Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2 bg-rose-50 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-gray-900">
                Reject Dining Experience
              </h3>
            </div>

            <p className="text-xs text-gray-600">
              Provide a reason for rejecting{' '}
              <span className="font-bold text-gray-900">"{rejectingItem.title}"</span>. The restaurant partner will receive this notification.
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Menu pricing unclear, venue photos do not meet high-res standards, invalid GST/FSSAI..."
              className="w-full mt-3 p-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />

            <div className="flex items-center justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRejectingItem(null);
                  setRejectionReason('');
                }}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmReject}
                disabled={actionLoadingId === rejectingItem.id}
                className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                {actionLoadingId === rejectingItem.id ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

