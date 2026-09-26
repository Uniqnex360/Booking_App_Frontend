import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Search,
  BookOpen,
  Plus,
  ArrowLeft,
  X,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  FileText,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface SolutionArticle {
  id: string;
  topicId: string;
  title: string;
  solution: string[];
}

interface TopicFolder {
  id: string;
  title: string;
  count: number;
  articles: SolutionArticle[];
}

const TOPIC_FOLDERS: TopicFolder[] = [
  {
    id: 'cancellation',
    title: 'Cancellation, Refund & Exchange Request',
    count: 4,
    articles: [
      {
        id: 'cancel-ticket',
        topicId: 'cancellation',
        title: 'Cancellation of a ticket',
        solution: [
          'Log in to your account and navigate to Profile > Purchase History / Your Orders.',
          'Select the booking you wish to cancel and click on "Cancel Booking".',
          'Review the cancellation fee and net refundable amount displayed on the screen.',
          'Click "Confirm Cancellation". The refund will be initiated instantly to your original payment mode or Vyhbz Cash.',
          'Note: Cancellation cut-off is typically 2 hours before showtime (subject to cinema/venue policy).',
        ],
      },
      {
        id: 'pvr-cancel',
        topicId: 'cancellation',
        title: 'PVR / Cinema Cancellation policy',
        solution: [
          'PVR and major multiplexes permit cancellation up to 20 minutes to 2 hours prior to the show start time.',
          'A nominal cancellation charge per seat is deducted as specified by the exhibitor.',
          'Food and beverage vouchers booked along with the ticket are 100% refunded.',
        ],
      },
      {
        id: 'refund-cancelled',
        topicId: 'cancellation',
        title: 'Refund against Cancelled booking',
        solution: [
          'Refunds are initiated immediately upon cancellation.',
          'UPI & Wallet payments: Credited within 24 to 48 hours.',
          'Credit & Debit cards: Credited within 5 to 7 working days depending on your issuing bank.',
          'You can track the live refund status and bank RRN number under Profile > Purchase History.',
        ],
      },
      {
        id: 'event-cancellation',
        topicId: 'cancellation',
        title: 'Cancellation/Modification of an event/play/sport/online streaming',
        solution: [
          'As per live entertainment guidelines, tickets for concerts, plays, and sports matches are strictly non-cancellable and non-refundable unless the organizer officially cancels or postpones the show.',
          'If an organizer reschedules or cancels a live event, you will receive a 100% automated refund to your source account.',
        ],
      },
    ],
  },
  {
    id: 'stream',
    title: 'Vyhbz Stream & Live',
    count: 20,
    articles: [
      {
        id: 'stream-grievance',
        topicId: 'stream',
        title: 'How do I report Vyhbz Stream content grievances?',
        solution: [
          'For any content classification, rating, or subtitle grievances, please write to grievance@vyhbz.com.',
          'Include your registered user email and the title of the streamed movie.',
          'Our Grievance Redressal Officer will acknowledge within 24 hours and resolve within 15 days.',
        ],
      },
      {
        id: 'stream-library',
        topicId: 'stream',
        title: 'I am unable to view the movie under Stream Library, Please help!',
        solution: [
          'Ensure you are logged in using the exact same mobile number/email used during rental/purchase.',
          'Refresh your browser or app and check under Profile > Stream Library.',
          'Rented movies are accessible for 30 days, and for 48 hours once playback has commenced.',
        ],
      },
      {
        id: 'stream-discount',
        topicId: 'stream',
        title: "I bought/rented a movie but didn't get the discount. Can I get it now?",
        solution: [
          'Discounts and coupons must be applied on the payment page prior to completing the transaction.',
          'Discounts cannot be applied retroactively after payment is completed.',
        ],
      },
      {
        id: 'stream-firetv',
        topicId: 'stream',
        title: 'How can I stream the movie on Vyhbz Stream App using Fire TV Stick?',
        solution: [
          'Download and open the Vyhbz app from the Amazon Fire TV Appstore.',
          'Go to Settings > Login via Code and pair with your mobile phone.',
          'All your rented or purchased titles will appear ready for HD playback.',
        ],
      },
      {
        id: 'stream-cancel',
        topicId: 'stream',
        title: 'Can I cancel my Vyhbz Stream transaction and get a refund?',
        solution: [
          'Digital stream purchases and rentals are digital consumables and cannot be cancelled or refunded once confirmed.',
        ],
      },
    ],
  },
  {
    id: 'payment',
    title: 'Payment & Refund',
    count: 4,
    articles: [
      {
        id: 'pay-lazypay',
        topicId: 'payment',
        title: 'How does LazyPay / Pay Later work?',
        solution: [
          'Select LazyPay / Pay Later on the payment selection page.',
          'Enter your registered mobile number and authenticate via OTP.',
          'Your tickets will be booked immediately, and you can settle your LazyPay bill on the 3rd or 18th of the month.',
        ],
      },
      {
        id: 'pay-failed',
        topicId: 'payment',
        title: 'Why is my payment not going through?',
        solution: [
          'Check if online transactions and international usage are enabled on your card in your banking app.',
          'Ensure your OTP or UPI PIN is entered correctly within the allocated 5-minute timeout.',
          'If bank servers are experiencing high traffic, try paying via UPI QR code or Net Banking.',
        ],
      },
      {
        id: 'pay-charged-no-ticket',
        topicId: 'payment',
        title: "My amount was charged, but I haven't received the SMS/Email confirmation.",
        solution: [
          'In rare instances of banking network drops, the transaction may be debited without ticket generation.',
          'Your bank will automatically reverse the full amount within 2 to 4 business days.',
          'You can also check Profile > Purchase History to confirm if the booking was generated.',
        ],
      },
      {
        id: 'refund-delay',
        topicId: 'payment',
        title: "It’s more than 5 to 7 days, why haven't I received my refund?",
        solution: [
          'Please verify your bank account statement (not just SMS alerts) from the date of cancellation.',
          'Note down the Bank RRN (Refund Reference Number) from your Purchase History.',
          'Provide the RRN to your bank customer care to locate the credited funds.',
        ],
      },
    ],
  },
  {
    id: 'giftcard',
    title: 'Vyhbz Gift Card',
    count: 7,
    articles: [
      {
        id: 'gc-whatis',
        topicId: 'giftcard',
        title: 'What is a Vyhbz Gift Card?',
        solution: [
          'A Vyhbz Gift Card is a preloaded digital card that can be used to book movie tickets, food & beverages, and live event experiences on Vyhbz.',
          'Gift cards can be shared with friends and family for birthdays, festivals, and corporate gifts.',
        ],
      },
      {
        id: 'gc-balance',
        topicId: 'giftcard',
        title: 'How do I check the validity/balance of my Vyhbz Gift card?',
        solution: [
          'Go to the payment checkout screen and select "Gift Voucher / Card".',
          'Enter the 16-digit card number and 6-digit PIN and click "Check Balance".',
          'The remaining balance and expiration date will be shown instantly.',
        ],
      },
      {
        id: 'gc-delivery',
        topicId: 'giftcard',
        title: 'How are Vyhbz Gift Cards delivered? How long does it take?',
        solution: [
          'Digital Gift Cards are delivered instantly via Email and WhatsApp to the recipient within 5 minutes of purchase.',
        ],
      },
      {
        id: 'gc-multiple',
        topicId: 'giftcard',
        title: 'Can I use multiple Gift Cards in a transaction?',
        solution: [
          'Yes, you can apply up to three Gift Cards in a single transaction on Vyhbz.',
        ],
      },
      {
        id: 'gc-cash',
        topicId: 'giftcard',
        title: 'Can we convert Gift Card amount into cash?',
        solution: [
          'As per RBI prepaid instrument regulations, gift cards cannot be transferred to bank accounts or redeemed for cash.',
        ],
      },
    ],
  },
  {
    id: 'offers',
    title: 'Offers',
    count: 1,
    articles: [
      {
        id: 'offers-avail',
        topicId: 'offers',
        title: 'Availing Offers & Promo Codes',
        solution: [
          'Select your showtime and seats, then proceed to the Payment screen.',
          'Under the "Unlock Offers or Apply Promocodes" section, enter code VYHBZ20 or select your eligible bank card offer.',
          'Click "Apply" to reduce the ticket total instantly.',
        ],
      },
    ],
  },
  {
    id: 'cinema-issues',
    title: "Cinema didn't play the movie",
    count: 2,
    articles: [
      {
        id: 'cinema-canceled-show',
        topicId: 'cinema-issues',
        title: 'My show was canceled! What about the refund?',
        solution: [
          'If a show is cancelled by the cinema due to projector faults, power outages, or other causes, 100% refund is initiated automatically.',
          'Refunds reflect within 5-7 working days. No manual claim is needed.',
        ],
      },
      {
        id: 'cinema-screening-status',
        topicId: 'cinema-issues',
        title: 'I’m not sure if the show that I have booked for is screening or not. Is my show cancelled?',
        solution: [
          'If a show is cancelled, an automated SMS/Email is dispatched to all ticket holders immediately.',
          'You can also check the cinema schedule on the Movies page for that theater.',
        ],
      },
    ],
  },
  {
    id: 'confirmation',
    title: 'Confirmation',
    count: 3,
    articles: [
      {
        id: 'conf-share',
        topicId: 'confirmation',
        title: 'Share Tickets',
        solution: [
          'Go to Profile > Purchase History.',
          'Select your booking and click the "Share" icon.',
          'You can share the booking link, QR code, or PDF directly to WhatsApp, Telegram, or Email.',
        ],
      },
      {
        id: 'conf-not-received',
        topicId: 'confirmation',
        title: 'I have not received a confirmation SMS/WhatsApp/Email. Please help!',
        solution: [
          'Check your spam/junk folder in email or WhatsApp messages.',
          'Your confirmed booking is always present under Profile > Purchase History. Simply show this digital screen at the theater gate.',
        ],
      },
      {
        id: 'conf-lost',
        topicId: 'confirmation',
        title: 'Did you just lose the confirmation SMS/WhatsApp/Email you received?',
        solution: [
          'Log in to Vyhbz and open Profile > Purchase History.',
          'Click "Resend Confirmation" to immediately receive a fresh SMS and Email.',
        ],
      },
    ],
  },
];

export default function SupportPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeArticle, setActiveArticle] = useState<SolutionArticle | null>(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketData, setTicketData] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'Booking & Cancellation',
    description: '',
  });

  const allArticles = useMemo(() => {
    return TOPIC_FOLDERS.flatMap((folder) => folder.articles);
  }, []);

  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return allArticles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.solution.some((s) => s.toLowerCase().includes(q))
    );
  }, [allArticles, searchTerm]);

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketData.email || !ticketData.description) {
      toast.error('Please enter your email and query description');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setTicketModalOpen(false);
      const ref = 'TICK-' + Math.floor(100000 + Math.random() * 900000);
      toast.success('Support Ticket Created!', {
        description: `Your reference ID is ${ref}. We will respond within 4 hours.`,
      });
      setTicketData({
        name: '',
        email: '',
        phone: '',
        category: 'Booking & Cancellation',
        description: '',
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#efefef] text-[#333333] font-sans antialiased">
      {/* Top Main Navigation Header */}
      <Header />

      {/* Main Support Page Content (Exact BMS layout: max-w ~1140px, centered on #efefef) */}
      <div className="pt-24 sm:pt-28 pb-16 px-3 sm:px-4">
        <div className="max-w-[1140px] mx-auto">
          {/* Header Banner (White rounded top with logo + Support Centre) */}
          <div className="bg-white rounded-t-md px-6 py-4 border-b border-gray-200 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <Link to="/">
                <img
                  src="/logo.png"
                  alt="Vyhbz"
                  className="h-9 sm:h-11 w-auto object-contain"
                />
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-[#333333] tracking-tight">
                Vyhbz Support Centre
              </h1>
            </div>
            <Link
              to="/"
              className="text-xs text-[#049cdb] hover:underline font-semibold hidden sm:inline-block"
            >
              &larr; Back to Vyhbz Home
            </Link>
          </div>

          {/* Red/Wine Solutions Ribbon Bar (Matches BMS crimson red/wine) */}
          <nav className="bg-[#7B1E3D] px-6 py-2.5 flex items-center shadow-sm">
            <span className="text-white text-sm font-semibold tracking-wide">
              Solutions
            </span>
          </nav>

          {/* Hero Search Section (White box) */}
          <section className="bg-white rounded-b-md p-6 sm:p-8 shadow-sm mb-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1 max-w-2xl">
                <h2 className="text-xl sm:text-2xl font-bold text-[#049cdb] mb-3">
                  How can we help you today?
                </h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                  }}
                  className="flex items-stretch shadow-sm"
                >
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Enter your search term here..."
                    className="flex-1 border border-[#cccccc] rounded-l px-4 py-2.5 text-sm text-[#333333] placeholder:text-[#999999] focus:outline-none focus:border-[#7B1E3D]"
                  />
                  <button
                    type="submit"
                    className="bg-[#4d4d4d] hover:bg-[#333333] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-r transition"
                  >
                    SEARCH
                  </button>
                </form>
              </div>

              {/* + New support ticket button */}
              <div className="shrink-0 flex items-center md:self-center">
                <button
                  onClick={() => setTicketModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#049cdb] hover:text-[#036690] transition hover:underline"
                >
                  <span className="h-4 w-4 rounded-full bg-[#049cdb] text-white flex items-center justify-center text-xs font-bold leading-none">
                    +
                  </span>
                  <span>New support ticket</span>
                </button>
              </div>
            </div>

            {/* Live Search Results Dropdown */}
            {searchTerm.trim() && (
              <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50 shadow-inner max-h-72 overflow-y-auto space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500 font-semibold mb-2">
                  <span>Search Results ({searchResults.length})</span>
                  <button onClick={() => setSearchTerm('')} className="text-red-500 hover:underline">
                    Clear
                  </button>
                </div>
                {searchResults.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">
                    No articles found matching "{searchTerm}". Try searching for 'refund', 'ticket', or 'payment'.
                  </p>
                ) : (
                  searchResults.map((res) => (
                    <div
                      key={res.id}
                      onClick={() => setActiveArticle(res)}
                      className="cursor-pointer p-2.5 bg-white rounded border border-gray-200 hover:border-[#7B1E3D] transition flex items-center justify-between"
                    >
                      <span className="text-xs font-semibold text-[#049cdb] hover:underline">
                        {res.title}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  ))
                )}
              </div>
            )}
          </section>

          {/* Two-Column Grid: Knowledge Base (Left) + Do you know? (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Card: Knowledge Base (BMS 2-column topic list) */}
            <section className="lg:col-span-8 bg-white rounded-md p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-[#049cdb] leading-tight">
                Knowledge base
              </h2>
              {/* Wine underline */}
              <div className="w-full h-[2px] bg-[#7B1E3D] mt-2 mb-4" />

              <h3 className="text-base font-bold text-[#333333] mb-5">
                Recommended Topics
              </h3>

              {/* 2-Column Topics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-7 text-xs">
                {TOPIC_FOLDERS.map((folder) => (
                  <div key={folder.id} className="space-y-2.5">
                    {/* Folder Title with Item Count */}
                    <div className="font-bold text-sm text-[#333333] flex items-center gap-1.5 pb-1 border-b border-gray-100">
                      <span>{folder.title}</span>
                      <span className="text-[#999999] font-normal">({folder.count})</span>
                    </div>

                    {/* Article Links with Book Icon */}
                    <ul className="space-y-2 pt-1">
                      {folder.articles.slice(0, 5).map((art) => (
                        <li key={art.id} className="flex items-start gap-2 group">
                          <span className="text-gray-400 mt-0.5 shrink-0">
                            📖
                          </span>
                          <button
                            onClick={() => setActiveArticle(art)}
                            className="text-left text-[#049cdb] hover:text-[#036690] hover:underline transition leading-snug font-normal line-clamp-2"
                          >
                            {art.title}
                          </button>
                        </li>
                      ))}
                    </ul>

                    {folder.count > 5 && (
                      <button
                        onClick={() => setActiveArticle(folder.articles[0])}
                        className="text-[11px] font-semibold text-[#049cdb] hover:underline pt-1 inline-block"
                      >
                        &raquo; View all {folder.count}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Right Card: Do you know? (BMS Signature Card) */}
            <aside className="lg:col-span-4 bg-white rounded-md p-6 shadow-sm border border-gray-200 self-start">
              <h2 className="text-xl font-bold text-[#049cdb] leading-tight">
                Do you know?
              </h2>
              {/* Wine underline */}
              <div className="w-full h-[2px] bg-[#7B1E3D] mt-2 mb-4" />

              <ul className="space-y-4 text-xs text-[#333333] leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-[#7B1E3D] font-bold text-sm shrink-0">&bull;</span>
                  <span>
                    Most of your booking &amp; refund related queries can be answered by logging into your{' '}
                    <strong className="text-[#222222]">Profile &gt; Purchase History</strong>. Please register and login before the purchase to avoid many booking related issues.
                  </span>
                </li>

                <li className="flex items-start gap-2">
                  <span className="text-[#7B1E3D] font-bold text-sm shrink-0">&bull;</span>
                  <span>
                    In case money is deducted and booking failed, please be rest assured that you will receive the refund in{' '}
                    <strong className="text-[#222222]">max 5-7 working days</strong>. You can check Refund status in the{' '}
                    <strong className="text-[#222222]">Profile &gt; Purchase History</strong>.
                  </span>
                </li>

                <li className="flex items-start gap-2">
                  <span className="text-[#7B1E3D] font-bold text-sm shrink-0">&bull;</span>
                  <span>
                    Opt refund to <strong className="text-[#222222]">&quot;Vyhbz Cash&quot;</strong> to get{' '}
                    <strong className="text-[#222222]">Instant credit</strong> for future purchases.{' '}
                    <button onClick={() => setActiveArticle(TOPIC_FOLDERS[2].articles[0])} className="text-[#049cdb] hover:underline">
                      Know more &gt;&gt;
                    </button>
                  </span>
                </li>

                <li className="flex items-start gap-2">
                  <span className="text-[#7B1E3D] font-bold text-sm shrink-0">&bull;</span>
                  <span>
                    Ticket cancellation is available for most of the cinemas. However, there are certain exceptions such as offer/loyalty points applied, cut-off time exceeded, monthly cancellation limit (3 times) exhausted, etc. which can prevent you from going ahead with the cancellation. Please note that there is no ticket cancellation applicable for Live Entertainment.
                  </span>
                </li>
              </ul>
            </aside>
          </div>
        </div>
      </div>

      {/* Article Detail Modal (Shows full solution steps just like clicking on BMS) */}
      <Dialog open={!!activeArticle} onOpenChange={(open) => !open && setActiveArticle(null)}>
        <DialogContent className="sm:max-w-lg bg-white p-6 rounded-lg shadow-xl">
          {activeArticle && (
            <>
              <DialogHeader className="border-b border-gray-100 pb-3 text-left">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#7B1E3D] uppercase tracking-wider mb-1">
                  <span>Solution Article</span>
                </div>
                <DialogTitle className="text-lg font-bold text-[#333333] leading-snug">
                  {activeArticle.title}
                </DialogTitle>
              </DialogHeader>

              <div className="py-3 space-y-3 text-xs text-[#444444] leading-relaxed">
                <p className="font-bold text-sm text-[#222222]">Resolution Steps:</p>
                <ol className="list-decimal pl-4 space-y-2">
                  {activeArticle.solution.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>Was this article helpful?</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      toast.success('Thank you for your feedback!');
                      setActiveArticle(null);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded border border-gray-200 hover:bg-gray-100 transition text-[#333333]"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" /> Yes
                  </button>
                  <button
                    onClick={() => {
                      setActiveArticle(null);
                      setTicketModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded border border-gray-200 hover:bg-gray-100 transition text-[#333333]"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" /> No, need help
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Support Ticket Modal (BMS / Freshdesk style) */}
      <Dialog open={ticketModalOpen} onOpenChange={setTicketModalOpen}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-lg shadow-xl">
          <DialogHeader className="border-b border-gray-100 pb-3 text-left">
            <DialogTitle className="text-lg font-bold text-[#333333]">
              Submit a support ticket
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Fill out this form and our support team will get back to you shortly.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTicketSubmit} className="space-y-3.5 py-2 text-xs">
            <div>
              <label className="font-semibold text-gray-700 block mb-1">Requester Name</label>
              <input
                type="text"
                required
                value={ticketData.name}
                onChange={(e) => setTicketData({ ...ticketData, name: e.target.value })}
                placeholder="Your name"
                className="w-full p-2 rounded border border-gray-300 text-xs focus:outline-none focus:border-[#7B1E3D]"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={ticketData.email}
                onChange={(e) => setTicketData({ ...ticketData, email: e.target.value })}
                placeholder="name@example.com"
                className="w-full p-2 rounded border border-gray-300 text-xs focus:outline-none focus:border-[#7B1E3D]"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">Phone Number</label>
              <input
                type="tel"
                value={ticketData.phone}
                onChange={(e) => setTicketData({ ...ticketData, phone: e.target.value })}
                placeholder="+91 9876543210"
                className="w-full p-2 rounded border border-gray-300 text-xs focus:outline-none focus:border-[#7B1E3D]"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">Category</label>
              <select
                value={ticketData.category}
                onChange={(e) => setTicketData({ ...ticketData, category: e.target.value })}
                className="w-full p-2 rounded border border-gray-300 text-xs bg-white focus:outline-none focus:border-[#7B1E3D]"
              >
                <option value="Booking & Cancellation">Booking &amp; Cancellation</option>
                <option value="Payment & Refund">Payment &amp; Refund</option>
                <option value="Live Event & Venue">Live Event &amp; Venue</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">Description</label>
              <textarea
                rows={4}
                required
                value={ticketData.description}
                onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
                placeholder="Please explain your issue in detail..."
                className="w-full p-2 rounded border border-gray-300 text-xs focus:outline-none focus:border-[#7B1E3D]"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold py-2 rounded text-xs transition uppercase tracking-wider"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...
                </>
              ) : (
                'Submit Ticket'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
