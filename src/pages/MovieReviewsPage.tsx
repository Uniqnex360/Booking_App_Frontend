import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Star, ThumbsUp, ThumbsDown, Share2, ChevronRight, Loader2 } from 'lucide-react';
import type { Movie, MovieReview } from '@/types/movie.types';
import RatingModal from './RatingModal';
import { getMovieById, getMovieReviews } from '@/api/movie.api';
import { useAuth } from '@/hooks/useAuth';
import { LoadingPage } from './LoadingPage';

const MovieReviewsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [movie, setMovie] = useState<Movie | null>(null);
  const [reviews, setReviews] = useState<MovieReview[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'user' | 'critic'>('user');

  const fetchPageData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [movieData, reviewsData] = await Promise.all([
       getMovieById<Movie>(id),
        getMovieReviews(id)
      ]);
      setMovie(movieData);
      setReviews(reviewsData);
    } catch (error) {
      console.error("Error fetching review data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, [id]);

  const topHashtags = useMemo(() => {
    const counts: Record<string, number> = {};
    reviews.forEach(review => {
      review.hashtags?.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [reviews]);

  const handleRateClick = () => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setIsModalOpen(true);
  };

  if (loading) {
  return <LoadingPage showFooter={false} />;
}

  if (!movie) {
    return <div className="min-h-screen pt-[104px] text-center p-8">Movie not found.</div>;
  }

  const totalReviews = reviews.length;

  return (
    <div className="min-h-screen bg-gray-50 pt-[104px]">
      <div className="max-w-4xl mx-auto px-4 py-8 bg-white shadow-sm min-h-screen">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2 mb-2">
            RATINGS
          </h1>
          <div className="flex items-center justify-center gap-2 text-lg font-semibold mb-1">
            <Star className="text-[#F5C518]" fill="#F5C518" size={20} />
            <span>{movie.rating ? `${movie.rating}/10` : 'No rating yet'}</span>
            <span className="text-gray-500 font-normal text-sm">
              {movie.rating_count || totalReviews} Votes ⓘ
            </span>
          </div>
          <h2 className="text-xl text-gray-800 mb-6">{movie.title}</h2>
          
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={handleRateClick}
              className="px-8 py-2.5 rounded-lg border border-[#7B1E3D] text-[#7B1E3D] font-semibold hover:bg-red-50 transition-colors"
            >
              Rate Now
            </button>
            <button 
              onClick={() => navigate(`/buytickets/${id}`)}
              className="px-8 py-2.5 rounded-lg bg-[#7B1E3D] text-white font-semibold hover:bg-[#5C0F2A] transition-colors"
            >
              Book tickets
            </button>
          </div>
        </div>

        <div className="flex border-b mb-6">
          <button 
            className={`flex-1 py-3 text-center font-medium ${activeTab === 'user' ? 'text-[#7B1E3D] border-b-2 border-[#7B1E3D]' : 'text-gray-500'}`}
            onClick={() => setActiveTab('user')}
          >
            User reviews ({totalReviews})
          </button>
          {/* <button 
            className={`flex-1 py-3 text-center font-medium ${activeTab === 'critic' ? 'text-[#7B1E3D] border-b-2 border-[#7B1E3D]' : 'text-gray-500'}`}
            onClick={() => setActiveTab('critic')}
          >
            Critic reviews (0)
          </button> */}
        </div>

        {activeTab === 'user' && (
          <div>
            {totalReviews > 0 ? (
              <>
                <div className="mb-8">
                  <p className="text-gray-600 mb-4">Summary of {totalReviews} reviews.</p>
                  <div className="flex flex-wrap gap-3">
                    {topHashtags.map(([tag, count]) => (
                      <span key={tag} className="px-4 py-1.5 rounded-full border border-gray-300 text-sm text-gray-700 bg-white shadow-sm flex items-center gap-2">
                        #{tag} <span className="text-gray-400 bg-gray-100 px-1.5 rounded text-xs">{count}</span>
                      </span>
                    ))}
                    {topHashtags.length > 5 && (
                      <button className="w-8 h-8 rounded-full border flex items-center justify-center text-gray-500 hover:bg-gray-100">
                        <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-lg mb-4">Most helpful reviews</h3>
                
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border rounded-lg p-5 bg-white shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{review.user_name || 'Verified User'}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              Booked on <span className="font-semibold text-gray-700">vyhbz</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[#7B1E3D]">
                          <Star fill="currentColor" size={16} />
                          <span className="font-semibold text-sm">{review.rating}/10</span>
                        </div>
                      </div>
                      <div className="mb-4 text-gray-700 text-sm flex gap-2 flex-wrap">
                        {review.hashtags?.map(tag => (
                          <span key={tag} className="text-[#7B1E3D]">#{tag}</span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-gray-500 text-sm pt-4 border-t">
                        {/* <div className="flex items-center gap-4">
                          <button className="flex items-center gap-1 hover:text-gray-800"><ThumbsUp size={16} /> 0</button>
                          <button className="flex items-center gap-1 hover:text-gray-800"><ThumbsDown size={16} /></button>
                        </div> */}
                        <div className="flex items-center gap-4">
                          <span>{new Date(review.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          {/* <button className="hover:text-gray-800"><Share2 size={16} /></button> */}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No reviews yet.</p>
                <p className="text-sm">Be the first to review this movie!</p>
              </div>
            )}
          </div>
        )}
      </div>

      <RatingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        movieId={id!} 
        onSubmitSuccess={() => {
          fetchPageData();
        }}
      />
    </div>
  );
};

export default MovieReviewsPage;