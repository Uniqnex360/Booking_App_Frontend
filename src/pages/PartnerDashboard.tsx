import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loader } from '@/components/common/Loader';
import { api, unwrap } from '@/api/client';
import { formatRupees } from '@/utils/currencyFormatter';
import {
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  Building2,
  Phone,
  MapPin,
  TrendingUp,
  Ticket,
  DollarSign,
  BarChart3,
  CalendarDays,
} from 'lucide-react';

interface PartnerInfo {
  id: string;
  organization_name: string;
  organization_type: string;
  status: string;
  city: string;
  phone: string;
}

interface EventItem {
  id: string;
  title: string;
  category: string;
  venue_name: string;
  city: string;
  start_date: string;
  cover_image_url?: string | null;
  status: string;
  ticket_categories?: any[];
}

interface RevenueData {
  total_revenue_paise: number;
  total_bookings: number;
  average_booking_paise: number;
  by_event: Array<{
    event_id: string;
    event_title: string;
    revenue_paise: number;
    bookings: number;
  }>;
  period: { from: string | null; to: string | null };
}

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);

  const [loading, setLoading] = useState(true);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING' | 'PAST' | 'REVENUE'>('ACTIVE');

  useEffect(() => {
    const fetchPartnerData = async () => {
      setLoading(true);
      try {
        const partnerData = await unwrap<PartnerInfo>(api.get('/partner/me'));
        setPartner(partnerData);

        const eventsData = await unwrap<EventItem[]>(api.get('/events/me')).catch(() => []);
        setEvents(eventsData || []);
      } catch (err) {
        console.error('Failed to load partner dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPartnerData();
  }, []);

  // Fetch Revenue when user clicks Revenue Tab
  useEffect(() => {
    if (activeTab === 'REVENUE' && !revenue) {
      const fetchRevenue = async () => {
        setRevenueLoading(true);
        try {
          const revData = await unwrap<RevenueData>(api.get('/partner/revenue'));
          setRevenue(revData);
        } catch (err) {
          console.error('Failed to fetch revenue report', err);
        } finally {
          setRevenueLoading(false);
        }
      };
      fetchRevenue();
    }
  }, [activeTab, revenue]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] text-slate-900 flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center pt-20">
          <Loader />
        </div>
        <Footer />
      </div>
    );
  }

  const activeEvents = events.filter((e) => e.status === 'APPROVED' || e.status === 'ACTIVE');
  const pendingEvents = events.filter((e) => e.status === 'PENDING' || e.status === 'UNDER_REVIEW');
  const pastEvents = events.filter((e) => e.status === 'COMPLETED' || e.status === 'PAST' || e.status === 'EXPIRED');

  const getListForTab = () => {
    switch (activeTab) {
      case 'ACTIVE':
        return activeEvents;
      case 'PENDING':
        return pendingEvents;
      case 'PAST':
        return pastEvents;
      default:
        return [];
    }
  };

  const currentList = getListForTab();

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-slate-900 flex flex-col">
      <Header />

      <main className="flex-grow max-w-[1280px] w-full mx-auto px-4 pt-24 pb-12">
        {/* Partner Header Card */}
        {partner && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                  {partner.organization_name}
                </h1>
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approved Partner
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[#7B1E3D]" /> {partner.city}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> {partner.phone}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" /> {partner.organization_type}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/partner/events/new')}
              className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold px-5 py-3 rounded-xl shadow transition flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="h-5 w-5" /> Host New Event
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto gap-2 border-b border-slate-200 mb-8 scrollbar-hide">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'ACTIVE'
                ? 'border-[#7B1E3D] text-[#7B1E3D]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Active Events ({activeEvents.length})
          </button>

          <button
            onClick={() => setActiveTab('PENDING')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'PENDING'
                ? 'border-[#7B1E3D] text-[#7B1E3D]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Under Review ({pendingEvents.length})
          </button>

          <button
            onClick={() => setActiveTab('PAST')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'PAST'
                ? 'border-[#7B1E3D] text-[#7B1E3D]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Completed / Past ({pastEvents.length})
          </button>

          <button
            onClick={() => setActiveTab('REVENUE')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'REVENUE'
                ? 'border-[#7B1E3D] text-[#7B1E3D]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="h-4 w-4" /> Revenue & Reports
          </button>
        </div>

        {/* REVENUE TAB CONTENT */}
        {activeTab === 'REVENUE' && (
          <div>
            {revenueLoading ? (
              <div className="py-20 flex justify-center">
                <Loader />
              </div>
            ) : !revenue ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
                No revenue report generated yet.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
                      <DollarSign className="h-5 w-5 text-[#7B1E3D]" />
                    </div>
                    <p className="text-3xl font-black text-[#7B1E3D]">
                      {formatRupees(revenue.total_revenue_paise)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Confirmed ticket sales</p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Total Bookings</span>
                      <Ticket className="h-5 w-5 text-slate-700" />
                    </div>
                    <p className="text-3xl font-black text-slate-900">
                      {revenue.total_bookings}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Confirmed orders</p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Avg. Booking Value</span>
                      <BarChart3 className="h-5 w-5 text-slate-700" />
                    </div>
                    <p className="text-3xl font-black text-slate-900">
                      {formatRupees(revenue.average_booking_paise)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Revenue per order</p>
                  </div>
                </div>

                {/* Revenue Breakdown Table */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-[#7B1E3D]" /> Event Breakdown
                  </h2>

                  {revenue.by_event.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6 text-center">
                      No event bookings recorded yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {revenue.by_event.map((item) => (
                        <div key={item.event_id} className="py-4 flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm md:text-base">
                              {item.event_title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {item.bookings} confirmed booking(s)
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[#7B1E3D] text-base md:text-lg">
                              {formatRupees(item.revenue_paise)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* EVENT CARDS TAB CONTENT */}
        {activeTab !== 'REVENUE' && (
          <div>
            {currentList.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
                <CalendarDays className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-lg font-bold text-slate-700">No events in this category</p>
                <p className="text-sm text-slate-500 mt-1">
                  Click "Host New Event" to publish a new event.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentList.map((e) => (
                  <div
                    key={e.id}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition"
                  >
                    <div className="aspect-[16/10] bg-slate-100 relative">
                      {e.cover_image_url ? (
                        <img
                          src={e.cover_image_url}
                          alt={e.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                          No Cover Image
                        </div>
                      )}
                      <span className="absolute top-3 right-3 bg-black/70 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
                        {e.status}
                      </span>
                    </div>

                    <div className="p-5">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#7B1E3D]">
                        {e.category}
                      </span>
                      <h3 className="font-bold text-base text-slate-900 mt-1 line-clamp-1">
                        {e.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" /> {e.venue_name}, {e.city}
                      </p>
                      {e.start_date && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(e.start_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}