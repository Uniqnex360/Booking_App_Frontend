import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { api, unwrap } from '@/api/client';
import {
  Calendar,
  Clock,
  Hourglass,
  Users,
  Languages,
  Tag,
  MapPin,
  Share2,
  ThumbsUp,
  ExternalLink,
} from 'lucide-react';
import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';
import { toast } from 'sonner';
import { LoadingPage } from './LoadingPage';

const categoryLabels: Record<string, string> = {
  concert: 'Music Shows',
  comedy: 'Comedy Shows',
  sports: 'Sports',
  workshop: 'Workshops',
  theatre: 'Performances',
  exhibition: 'Exhibitions',
  other: 'Events',
};

export default function BookingPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [interestedCount, setInterestedCount] = useState(16);
  const [isInterested, setIsInterested] = useState(false);

  useEffect(() => {
    const fetchEventDetails = async () => {
      setLoading(true);
      try {
        if (type?.toLowerCase() === 'event') {
          const res = await unwrap<any>(api.get(`/events/${id}`));
          setEventData(res);
        }
      } catch {
        toast.error('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [type, id]);

  const isEventEnded = Boolean(
    eventData?.ends_at && new Date(eventData.ends_at) < new Date()
  );

  const handleBookNow = () => {
    if (isEventEnded) {
      toast.error('This event has already ended and cannot be booked.');
      return;
    }
    if (!user) {
      toast.error('Please login to book tickets');
      navigate('/login', { state: { from: `/booking/event/${id}` } });
      return;
    }
    navigate(`/buytickets/${id}`);
  };

  const handleInterested = () => {
    setIsInterested(!isInterested);
    setInterestedCount((prev) => (isInterested ? prev - 1 : prev + 1));
  };

  // Calculate duration dynamically
  const getDuration = () => {
    if (!eventData?.starts_at || !eventData?.ends_at) return null;
    const start = parseISO(eventData.starts_at);
    const end = parseISO(eventData.ends_at);
    const hours = differenceInHours(end, start);
    const minutes = differenceInMinutes(end, start) % 60;
    
    if (hours > 0 && minutes > 0) return `${hours} Hours ${minutes} Mins`;
    if (hours > 0) return `${hours} Hours`;
    if (minutes > 0) return `${minutes} Mins`;
    return null;
  };

  if (loading) {
    return <LoadingPage showFooter={true} />;
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500">Event not found</p>
        </div>
        <Footer />
      </div>
    );
  }

  const eventDate = parseISO(eventData.starts_at);
  const minPrice = eventData.ticket_categories?.length
    ? Math.min(...eventData.ticket_categories.map((t: any) => t.price_paise))
    : 0;

  const duration = getDuration();
  const categoryLabel = categoryLabels[eventData.category] || 'Event';

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* pt-32 to clear fixed header */}
      <main className="mx-auto max-w-[1240px] px-4 pt-32 pb-16">
        {/* Event Title */}
        <div className="mb-6 flex items-start justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            {eventData.title.toUpperCase()}
          </h1>
          <button className="p-2 hover:bg-gray-100 rounded-full transition">
            <Share2 className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Banner */}
            <div className="relative overflow-hidden rounded-xl bg-gray-100">
              <div className="aspect-[16/9] overflow-hidden">
                {eventData.poster_image_url ? (
                  <img
                    src={eventData.poster_image_url}
                    alt={eventData.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                    <span className="text-gray-400">No Image</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-[#333338] text-white text-xs font-medium px-3 py-1.5 rounded">
                {categoryLabel}
              </Badge>
              <Badge className="bg-[#333338] text-white text-xs font-medium px-3 py-1.5 rounded">
                {eventData.city}
              </Badge>
            </div>

            {/* Interest Section */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">
                  <strong>{interestedCount}</strong> are interested
                </span>
              </div>
              <Button
                variant="outline"
                onClick={handleInterested}
                className={`rounded-full border-[#7B1E3D] text-sm px-4 py-2 ${
                  isInterested
                    ? 'bg-[#7B1E3D] text-white hover:bg-[#5C0F2A]'
                    : 'text-[#7B1E3D] hover:bg-[#7B1E3D]/10'
                }`}
              >
                I'm Interested
              </Button>
            </div>

            {/* About Section */}
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-gray-900">
                About The Event
              </h2>
              <div className="text-gray-700 leading-relaxed">
                {eventData.description ? (
                  <p className="whitespace-pre-line">{eventData.description}</p>
                ) : (
                  <p className="text-gray-500">No description available.</p>
                )}
              </div>
            </div>

            {/* Venue Details (Only if address exists) */}
            {eventData.venue_address && (
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-gray-900">
                  Venue Details
                </h2>
                <div className="flex items-start gap-2 text-gray-700">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">{eventData.venue_name}</p>
                    <p className="text-sm">{eventData.venue_address}</p>
                    <p className="text-sm">{eventData.city}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-[136px] rounded-xl border border-gray-200 p-5 shadow-sm">
              {/* Date & Time Info */}
              <div className="space-y-4 mb-6">
                {/* Date */}
                <div className="flex items-center gap-3 text-gray-700">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <span className="text-sm">
                    {format(eventDate, 'EEE d MMM yyyy')}
                  </span>
                </div>

                {/* Time */}
                <div className="flex items-center gap-3 text-gray-700">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <span className="text-sm">
                    {format(eventDate, 'h:mm a')}
                  </span>
                </div>

                {/* Duration (Dynamic) */}
                {duration && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Hourglass className="h-5 w-5 text-gray-500" />
                    <span className="text-sm">{duration}</span>
                  </div>
                )}

                {/* Age Restriction (Dynamic) */}
                <div className="flex items-center gap-3 text-gray-700">
                  <Users className="h-5 w-5 text-gray-500" />
                  <span className="text-sm">
                    {eventData.certificate || 'All age groups'}
                  </span>
                </div>

                {/* Language (Dynamic) */}
                {eventData.language && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Languages className="h-5 w-5 text-gray-500" />
                    <span className="text-sm">{eventData.language}</span>
                  </div>
                )}

                {/* Category/Genres (Dynamic) */}
                <div className="flex items-start gap-3 text-gray-700">
                  <Tag className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="leading-relaxed">
                      {categoryLabel}
                    </p>
                  </div>
                </div>

                {/* Venue Link */}
                <div className="flex items-start gap-3 text-gray-700">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div className="text-sm flex items-center gap-1">
                    <span>{eventData.venue_name}</span>
                    <ExternalLink className="h-3 w-3 text-blue-500" />
                  </div>
                </div>
              </div>

              {/* Price & Book Button */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      ₹{Math.round(minPrice / 100)}
                    </p>
                    {isEventEnded ? (
                      <p className="text-xs text-rose-700 font-semibold">
                        Event Concluded
                      </p>
                    ) : (
                      <p className="text-xs text-green-600 font-medium">
                        Available
                      </p>
                    )}
                  </div>
                  {isEventEnded ? (
                    <Button
                      disabled
                      className="bg-slate-200 text-slate-500 cursor-not-allowed font-semibold px-6 py-3 rounded-lg text-sm"
                    >
                      Event Ended
                    </Button>
                  ) : (
                    <Button
                      onClick={handleBookNow}
                      className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-semibold px-6 py-3 rounded-lg text-sm transition-colors"
                    >
                      Book Now
                    </Button>
                  )}
                </div>

                {/* Additional Info */}
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span>Instant confirmation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span>e-Ticket on email & SMS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}