import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Heart, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getEventVenues, VenueItem } from '@/api/event.api';

export default function VenuesPage() {
  const [searchParams] = useSearchParams();
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const activeCity = searchParams.get('city') || 'Kochi';

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getEventVenues(activeCity);
        setVenues(data);
      } catch (error) {
        toast.error('Failed to load venues');
      } finally {
        setLoading(false);
      }
    })();
  }, [activeCity]);

  const filteredVenues = venues.filter((v) =>
    v.venue_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.venue_address?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5]" style={{ fontFamily: "'Roboto', sans-serif !important" }}>
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
      
      <style>{`
        * { font-family: 'Roboto', sans-serif !important; }
      `}</style>

      <Header />

      <main className="pt-[104px] pb-20">
        <div className="mx-auto max-w-[1240px] px-4 mt-8">
          
          {/* Top Bar with Title and Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h1 className="text-[24px] font-bold text-[#333333] tracking-tight">
              Venues For Events In {activeCity}
            </h1>

            <div className="flex items-center gap-4">
              {/* Category Select Mockup */}
              <div className="relative group">
                <button className="flex items-center justify-between w-[140px] bg-white border border-[#EEEEEE] rounded-[4px] px-3 py-2 text-[14px] text-[#333333]">
                  <span>Events</span>
                  <ChevronDown className="h-4 w-4 text-[#999999]" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999999]" />
                <input
                  type="text"
                  placeholder="Search by venues or area"
                  className="w-full bg-white border border-[#EEEEEE] rounded-[4px] pl-10 pr-4 py-2 text-[14px] text-[#333333] focus:outline-none placeholder:text-[#BBBBBB]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Venue Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-32 bg-white rounded-[8px] border border-[#EEEEEE] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVenues.map((venue, idx) => (
                <div 
                  key={idx} 
                  className="bg-white p-5 rounded-[8px] border border-[#EEEEEE] shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex gap-4 transition-shadow hover:shadow-md cursor-pointer"
                >
                  <div className="pt-1">
                    <Heart className="h-[18px] w-[18px] text-[#999999] stroke-[1.5px]" />
                  </div>
                  
                  <div className="flex flex-col">
                    <h3 className="text-[16px] font-bold text-[#333333] mb-1 leading-tight tracking-tight">
                      {venue.venue_name}: {venue.city}
                    </h3>
                    <p className="text-[13px] text-[#666666] leading-[1.6] line-clamp-2">
                      {venue.venue_address || 'Address details not available'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredVenues.length === 0 && (
            <div className="text-center py-20">
              <p className="text-[#999999]">No venues found matching your search.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}