import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/common/Loader';
import { getRestaurants } from '@/api/restaurant.api';
import type { Restaurant } from '@/types/api.types';
import { Search, Star, MapPin, Clock } from 'lucide-react';

const mockRestaurants: Restaurant[] = [
  {
    id: '1',
    name: 'Maison Noir',
    description: 'An intimate fine dining experience with a seasonal tasting menu.',
    image_url: 'https://images.pexels.com/photos/8856555/pexels-photo-8856555.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
    cuisine: 'French',
    location: 'Downtown, NYC',
    price_range: '$$$',
    rating: 5.0,
    reviews_count: 89,
    available_times: ['6:00 PM', '8:30 PM'],
    tags: ['Exclusive', 'Tasting Menu'],
  },
  {
    id: '2',
    name: 'The Vineyard Table',
    description: 'Farm-to-table dining with wine pairings in a rustic vineyard setting.',
    image_url: 'https://images.pexels.com/photos/32568165/pexels-photo-32568165.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
    cuisine: 'Mediterranean',
    location: 'Napa Valley, CA',
    price_range: '$$',
    rating: 4.8,
    reviews_count: 234,
    available_times: ['5:30 PM', '7:00 PM', '9:00 PM'],
    tags: ['Outdoor', 'Wine Pairing'],
  },
  {
    id: '3',
    name: 'Sakura Omakase',
    description: 'A 15-course omakase experience at the chef\'s counter.',
    image_url: 'https://images.pexels.com/photos/1422385/pexels-photo-1422385.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
    cuisine: 'Japanese',
    location: 'Midtown, NYC',
    price_range: '$$$$',
    rating: 4.9,
    reviews_count: 156,
    available_times: ['6:00 PM', '8:00 PM'],
    tags: ['Omakase', 'Chef\'s Counter'],
  },
  {
    id: '4',
    name: 'Rooftide Bar & Grill',
    description: 'Rooftop dining with panoramic city views and a charcoal grill menu.',
    image_url: 'https://images.pexels.com/photos/36729891/pexels-photo-36729891.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
    cuisine: 'American',
    location: 'Downtown, NYC',
    price_range: '$$',
    rating: 4.6,
    reviews_count: 312,
    available_times: ['5:00 PM', '6:30 PM', '8:00 PM', '9:30 PM'],
    tags: ['Rooftop', 'City Views'],
  },
  {
    id: '5',
    name: 'Cantina della Vita',
    description: 'Authentic Italian trattoria with handmade pasta and an extensive wine cellar.',
    image_url: 'https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
    cuisine: 'Italian',
    location: 'West Village, NYC',
    price_range: '$$$',
    rating: 4.7,
    reviews_count: 198,
    available_times: ['5:30 PM', '7:30 PM', '9:30 PM'],
    tags: ['Pasta', 'Wine Cellar'],
  },
  {
    id: '6',
    name: 'The Velvet Lounge',
    description: 'A speakeasy-style dining room with live jazz and craft cocktails.',
    image_url: 'https://images.pexels.com/photos/12181763/pexels-photo-12181763.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
    cuisine: 'Contemporary',
    location: 'Soho, NYC',
    price_range: '$$$',
    rating: 4.8,
    reviews_count: 145,
    available_times: ['6:00 PM', '8:30 PM'],
    tags: ['Speakeasy', 'Live Jazz'],
  },
];

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const data = await getRestaurants();
        setRestaurants(data);
      } catch {
        setRestaurants(mockRestaurants);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  const filtered = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.cuisine.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="bg-gradient-to-b from-wine-50 to-background pt-28 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-serif text-4xl font-semibold text-wine-950 sm:text-5xl">
            Restaurants
          </h1>
          <p className="mt-2 text-foreground/60">
            Reserve a table at the finest dining spots
          </p>

          <div className="relative mt-6 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search restaurants or cuisine..."
              className="h-11 rounded-xl pl-10"
            />
          </div>
        </div>
      </div>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader className="h-8 w-8" />
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  className="group overflow-hidden rounded-2xl border border-border/50 bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-soft-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={r.image_url}
                      alt={r.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute left-3 top-3 flex gap-2">
                      {r.tags.slice(0, 1).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-wine-700 px-2.5 py-1 text-xs font-semibold text-white shadow-wine"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-wine-500 text-wine-500" />
                        <span className="text-xs font-semibold">
                          {r.rating}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({r.reviews_count})
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-wine-700">
                        {r.price_range}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-wine-950">
                      {r.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.cuisine} • {r.location}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-foreground/60">
                      {r.description}
                    </p>

                    <div className="mt-4">
                      <p className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Available times
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {r.available_times.map((time) => (
                          <Link
                            key={time}
                            to={`/booking/restaurant/${r.id}`}
                            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 transition-all hover:border-wine-300 hover:bg-wine-50 hover:text-wine-700"
                          >
                            {time}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
