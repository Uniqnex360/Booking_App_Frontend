import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/common/Loader';
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
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
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

  const handleBookNow = () => {
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

  const tags = [
    categoryLabels[eventData.category] || 'Event',
    'Live Performance',
    eventData.city,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-white">
      <Header />

  <main className="mx-auto max-w-[1240px] px-4 pt-28 lg:pt-[136px] pb-16">
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
              {tags.map((tag, i) => (
                <Badge
                  key={i}
                  className="bg-[#333338] text-white text-xs font-medium px-3 py-1.5 rounded"
                >
                  {tag}
                </Badge>
              ))}
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
                className={`rounded-full border-[#E91E63] text-sm px-4 py-2 ${
                  isInterested
                    ? 'bg-[#E91E63] text-white hover:bg-[#C2185B]'
                    : 'text-[#E91E63] hover:bg-[#E91E63]/10'
                }`}
              >
                {isInterested ? "I'm Interested" : "I'm Interested"}
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
                  <p>
                    {eventData.title} - A {categoryLabels[eventData.category] || 'special'} experience in {eventData.city}.
                    Join us for an unforgettable event at {eventData.venue_name}.
                  </p>
                )}
              </div>
            </div>

            {/* Additional Info */}
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
            <div className="sticky top-[120px] rounded-xl border border-gray-200 p-5 shadow-sm">
              {/* Date & Time Info */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 text-gray-700">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <span className="text-sm">
                    {format(eventDate, 'EEE d MMM yyyy')}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-gray-700">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <span className="text-sm">
                    {format(eventDate, 'h:mm a')}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-gray-700">
                  <Hourglass className="h-5 w-5 text-gray-500" />
                  <span className="text-sm">2 Hours</span>
                </div>

                <div className="flex items-center gap-3 text-gray-700">
                  <Users className="h-5 w-5 text-gray-500" />
                  <span className="text-sm">All age groups</span>
                </div>

                <div className="flex items-center gap-3 text-gray-700">
                  <Languages className="h-5 w-5 text-gray-500" />
                  <span className="text-sm">
                    {eventData.language || 'English'}
                  </span>
                </div>

                {eventData.category && (
                  <div className="flex items-start gap-3 text-gray-700">
                    <Tag className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="leading-relaxed">
                        {categoryLabels[eventData.category]}, Live Music, 
                        Contemporary, Folk, Regional
                      </p>
                    </div>
                  </div>
                )}

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
                    <p className="text-xs text-green-600 font-medium">
                      Available
                    </p>
                  </div>
                  <Button
                    onClick={handleBookNow}
                    className="bg-[#E91E63] hover:bg-[#C2185B] text-white font-semibold px-6 py-3 rounded-lg text-sm"
                  >
                    Book Now
                  </Button>
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