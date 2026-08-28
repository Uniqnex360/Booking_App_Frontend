import { useEffect, useState } from 'react';
import { getPendingEvents, updateEventStatus } from '@/api/admin.api';
import { Event } from '@/types/api.types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Check, X, Eye, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyFormatter';

export default function ContentModeration() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const data = await getPendingEvents();
      setEvents(data.items);
    } catch (err) {
      toast.error("Failed to load pending events");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, status: 'PUBLISHED' | 'REJECTED') => {
    let reason = '';
    if (status === 'REJECTED') {
      reason = window.prompt("Please enter a reason for rejection:") || '';
      if (!reason) return; 
    }

    try {
      await updateEventStatus(id, status, reason);
      toast.success(`Event ${status === 'PUBLISHED' ? 'Approved' : 'Rejected'}`);
      setEvents(prev => prev.filter(e => e.id !== id)); 
    } catch (err) {
      toast.error("Action failed");
    }
  };

  if (loading) return <div className="p-10 text-center">Loading submissions...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-serif font-bold mb-8">Content Moderation</h1>
      
      {events.length === 0 ? (
        <div className="bg-muted/30 rounded-2xl p-20 text-center border-2 border-dashed">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No pending events to review.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {events.map((event) => (
            <div key={event.id} className="bg-card border rounded-2xl p-6 flex items-center gap-6 shadow-sm">
              <img 
                src={event.poster_image_url || '/placeholder.jpg'} 
                className="w-32 h-32 object-cover rounded-xl"
              />
              
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{event.title}</h3>
                <p className="text-sm text-muted-foreground">{event.venue_name} • {event.city}</p>
                <p className="text-sm mt-2 line-clamp-2">{event.description}</p>
                <div className="mt-2 flex gap-2">
                   <span className="text-xs bg-wine-50 text-wine-700 px-2 py-1 rounded-md font-medium">
                      Category: {event.category}
                   </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => handleAction(event.id, 'PUBLISHED')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="w-4 h-4 mr-2" /> Approve
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleAction(event.id, 'REJECTED')}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" /> Reject
                </Button>
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4 mr-2" /> View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}