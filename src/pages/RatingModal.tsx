import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { createMovieReview } from '@/api/movie.api';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieId: string;
  onSubmitSuccess: () => void;
}

const ALLOWED_HASHTAGS = [
  "DirectionWorks", "Entertaining", "Interesting", "NiceStory",
  "Timepass", "CoolMusic", "OneTimeWatch", "Fun", "QuiteNice",
  "OkDirection", "GoodActing", "GoodMusic", "HitMovie", "Enjoyable", 
  "LovelyMusic", "FunWatch", "SuperDirection", "GreatActing", "WowMusic", 
  "AwesomeStory", "Blockbuster", "Rocking", "Inspiring", "Wellmade", "Unbelievable"
];

const RatingModal: React.FC<RatingModalProps> = ({ isOpen, onClose, movieId, onSubmitSuccess }) => {
  const [rating, setRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await createMovieReview(movieId, {
        rating,
        hashtags: selectedTags
      });
      onSubmitSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to submit review:", err);
      setError("Failed to submit review. You may have already reviewed this movie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800 flex-1 text-center">How was the movie?</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 absolute right-4">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-md font-medium text-gray-800 mb-6 text-center">How would you rate the movie?</h3>
          
          <div className="mb-8 px-4">
            <div className="relative w-full h-8 flex items-center">
              <div className="absolute w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#7B1E3D] transition-all duration-150" style={{ width: `${(rating / 10) * 100}%` }} />
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 text-[#7B1E3D] transition-all duration-150 pointer-events-none" style={{ left: `calc(${(rating / 10) * 100}% - 12px)` }}>
                <Star fill="currentColor" size={28} />
              </div>
              <input 
                type="range" min="0" max="10" step="0.5" value={rating} 
                onChange={(e) => setRating(parseFloat(e.target.value))}
                className="absolute w-full h-full opacity-0 cursor-pointer z-10"
              />
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-500 font-medium">
              {rating === 0 ? <span className="mx-auto mt-2 text-gray-400">SLIDE TO RATE ➜</span> : <span />}
              {rating > 0 && <span className="ml-auto font-bold text-gray-800">{rating}/10</span>}
            </div>
          </div>

          {rating > 0 ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h4 className="font-semibold text-gray-800 mb-1">What did you love?</h4>
              <p className="text-sm text-gray-500 mb-4">Express yourself with hashtags!</p>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pb-2 custom-scrollbar">
                {ALLOWED_HASHTAGS.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag} onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        isSelected ? 'bg-red-50 border-[#7B1E3D] text-[#7B1E3D]' : 'bg-white border-gray-300 text-gray-600'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-xl text-gray-400 italic font-serif">Your ratings matter!</p>
              <p className="text-sm text-gray-400 mt-1">They help others decide what to watch next.</p>
            </div>
          )}

          {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <button 
            disabled={rating === 0 || isSubmitting}
            onClick={handleSubmit}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
              rating === 0 || isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#7B1E3D] hover:bg-[#5C0F2A]'
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;