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
  HelpCircle,
  Headphones,
  Ticket,
  CreditCard,
  RefreshCw,
  User,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  FileText,
  ThumbsUp,
  ThumbsDown,
  X,
  Send,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Article {
  id: string;
  category: string;
  categoryTitle: string;
  title: string;
  summary: string;
  content: string[];
}

const ARTICLES: Article[] = [
  {
    id: 'cancel-ticket',
    category: 'cancellation',
    categoryTitle: 'Cancellation, Refund & Exchange Request',
    title: 'Cancellation of a ticket',
    summary: 'Step-by-step instructions on cancelling your confirmed cinema or event ticket.',
    content: [
      'To cancel your tickets, go to your Profile > Your Orders / Purchase History.',
      'Select the booking you wish to cancel and click on "Cancel Booking".',
      'Review the refund summary and cancellation charges (if applicable).',
      'Confirm the cancellation. The refund will be initiated instantly to your original payment method.',
      'Note: Cancellation eligibility is governed by the cinema or event organizer policy. Live entertainment events that are non-refundable will indicate "Non-Cancellable" on the ticket.',
    ],
  },
  {
    id: 'refund-cancelled',
    category: 'cancellation',
    categoryTitle: 'Cancellation, Refund & Exchange Request',
    title: 'Refund against Cancelled booking',
    summary: 'Refund timelines, modes of refund, and banking turnaround times.',
    content: [
      'Once a booking cancellation is confirmed, refunds are processed through the payment gateway.',
      'Credit/Debit Card & Net Banking refunds typically reflect in 5-7 working days.',
      'UPI payments (Google Pay, PhonePe, Paytm) are usually refunded within 24 to 48 hours.',
      'If you have not received your refund after 7 working days, please contact your bank with the refund RRN reference number displayed under your Order details.',
    ],
  },
  {
    id: 'cinema-cancelled-show',
    category: 'cancellation',
    categoryTitle: 'Cancellation, Refund & Exchange Request',
    title: 'Cinema did not play the movie / Show cancelled by venue',
    summary: 'What happens when a showtime is cancelled by the cinema operator.',
    content: [
      'If a show is cancelled due to technical issues, weather conditions, or operational reasons by the cinema, you are entitled to a 100% refund including internet handling fees.',
      'The refund is triggered automatically by our platform without needing any manual request.',
      'You will receive an SMS and email notification confirming the show cancellation and refund details.',
    ],
  },
  {
    id: 'event-rescheduled',
    category: 'cancellation',
    categoryTitle: 'Cancellation, Refund & Exchange Request',
    title: 'Cancellation or modification of an event / concert',
    summary: 'Policies for postponed, rescheduled, or cancelled live events.',
    content: [
      'If an event is rescheduled to a new date, your existing tickets remain valid for the new date automatically.',
      'If you are unable to attend the rescheduled date, a refund window will be opened by the event organizer.',
      'In case of complete cancellation, 100% refund is initiated back to your source account.',
    ],
  },
  {
    id: 'no-confirmation',
    category: 'confirmation',
    categoryTitle: 'Booking Confirmation & e-Tickets',
    title: 'I have not received a confirmation SMS / Email',
    summary: 'How to recover and view tickets if notification delivery is delayed.',
    content: [
      'Confirmation SMS and emails are dispatched immediately upon successful transaction.',
      'In case of mobile network congestion or spam filters, you can always view your confirmed booking by navigating to Profile > Your Orders.',
      'From Your Orders, you can click "Resend Confirmation" to trigger a fresh SMS and Email with your booking QR code.',
      'Show the digital booking from the Vyhbz app/website directly at the venue entrance.',
    ],
  },
  {
    id: 'lost-ticket',
    category: 'confirmation',
    categoryTitle: 'Booking Confirmation & e-Tickets',
    title: 'Did you lose the confirmation SMS or Email you received?',
    summary: 'Quickly resend or download your valid e-ticket.',
    content: [
      'Do not worry! Your tickets are permanently saved in your Vyhbz account.',
      'Log in with your registered mobile number or email address.',
      'Go to Profile > Your Orders, find your event or movie, and tap "View Ticket".',
      'You can download the ticket PDF or take a screenshot of the QR code.',
    ],
  },
  {
    id: 'share-tickets',
    category: 'confirmation',
    categoryTitle: 'Booking Confirmation & e-Tickets',
    title: 'How to share tickets with friends and family',
    summary: 'Transfer or share digital tickets via WhatsApp or Email.',
    content: [
      'Open your booking from Your Orders.',
      'Tap the "Share" icon at the top right of your ticket card.',
      'You can share the ticket link or PDF directly via WhatsApp, SMS, or Email.',
      'Each person entering the venue can display their individual ticket QR code.',
    ],
  },
  {
    id: 'payment-deducted-failed',
    category: 'payment',
    categoryTitle: 'Payment & Refunds',
    title: 'My amount was charged, but booking failed',
    summary: 'Understanding automatic bank reversals for failed transactions.',
    content: [
      'This happens when there is a network timeout between your bank and our ticketing gateway.',
      'If your account was debited but no booking ID was issued, rest assured that your money is safe.',
      'The amount will be automatically reversed by your bank within 2 to 4 business days.',
      'You do not need to raise a dispute—the banking settlement automatically reconciles failed authorizations.',
    ],
  },
  {
    id: 'payment-not-going-through',
    category: 'payment',
    categoryTitle: 'Payment & Refunds',
    title: 'Why is my payment not going through?',
    summary: 'Troubleshooting card declines, UPI timeouts, and OTP errors.',
    content: [
      'Ensure your card has online domestic transactions enabled in your banking app.',
      'For UPI payments, verify that you approve the payment mandate in your UPI app (GPay/PhonePe) within the 5-minute countdown.',
      'Check if your browser has ad-blockers or pop-up blockers interfering with the payment gateway redirect.',
      'Try an alternative payment method such as Net Banking, UPI QR, or a different card.',
    ],
  },
  {
    id: 'availing-offers',
    category: 'offers',
    categoryTitle: 'Offers, Coupons & Rewards',
    title: 'How to apply coupon codes & bank discount offers',
    summary: 'Steps to redeem discount vouchers and cashback promos at checkout.',
    content: [
      'On the checkout / payment screen, look for the "Apply Promo Code / Offers" section.',
      'Enter your coupon code (e.g. VYHBZ20) and click "Apply".',
      'The discount amount will be deducted from your total payable amount instantly.',
      'Note: Only one promotional offer or coupon code can be applied per booking.',
    ],
  },
  {
    id: 'event-entry-rules',
    category: 'events',
    categoryTitle: 'Live Events & Venues',
    title: 'Event entry rules, age restrictions and gates timing',
    summary: 'Important guidelines for attending concerts, plays, and sports matches.',
    content: [
      'Gates typically open 60 to 90 minutes before the scheduled showtime. Please arrive early to clear security.',
      'Check the age restriction listed on the event page (e.g., 18+, All Ages, Kids Allowed). Valid government photo ID may be required for age-restricted shows.',
      'Outside food, beverages, recording equipment, and hazardous items are strictly prohibited by venue security.',
      'Carry your digital ticket QR code with adequate phone battery brightness at the entrance turnstile.',
    ],
  },
];

export default function SupportPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hello! Welcome to Vyhbz Customer Care. How can I help you today?' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketFormData, setTicketFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'Booking Issue',
    bookingId: '',
    description: '',
  });

  const categories = [
    { id: 'all', title: 'All Topics', icon: HelpCircle },
    { id: 'cancellation', title: 'Cancellation & Refund', icon: RefreshCw },
    { id: 'confirmation', title: 'Confirmation & e-Tickets', icon: Ticket },
    { id: 'payment', title: 'Payment & Pricing', icon: CreditCard },
    { id: 'events', title: 'Live Events & Venues', icon: Sparkles },
    { id: 'offers', title: 'Offers & Coupons', icon: FileText },
  ];

  const filteredArticles = useMemo(() => {
    return ARTICLES.filter((art) => {
      const matchesCat = selectedCategory === 'all' || art.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        art.title.toLowerCase().includes(q) ||
        art.summary.toLowerCase().includes(q) ||
        art.content.some((c) => c.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketFormData.email || !ticketFormData.description) {
      toast.error('Please enter your email and query description');
      return;
    }
    setIsSubmittingTicket(true);
    setTimeout(() => {
      setIsSubmittingTicket(false);
      setTicketModalOpen(false);
      const ticketRef = 'VYH-' + Math.floor(100000 + Math.random() * 900000);
      toast.success('Support Ticket Created!', {
        description: `Your ticket reference is ${ticketRef}. Our team will respond within 4 hours.`,
      });
      setTicketFormData({
        name: '',
        email: '',
        phone: '',
        category: 'Booking Issue',
        bookingId: '',
        description: '',
      });
    }, 1000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `Thanks for reaching out regarding: "${userMsg}". A support executive will join this chat in moments. You can also email us at support@vyhbz.com for immediate escalations.`,
        },
      ]);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#F5F5FA] flex flex-col font-sans">
      <Header />

      <main className="flex-1 pt-24 sm:pt-28 pb-16">
        {/* BookMyShow Style Hero Support Banner */}
        <section className="bg-[#2E3147] text-white py-12 px-4 shadow-md">
          <div className="max-w-[1240px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#F84464] mb-2">
                  <Headphones className="h-4 w-4 text-[#F84464]" />
                  <span>24x7 Customer Care</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  Vyhbz Support Centre
                </h1>
                <p className="text-sm text-gray-300 mt-2 max-w-xl">
                  Get all your ticketing, refund, and live event queries answered instantly.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3 shrink-0">
                <Button
                  onClick={() => setTicketModalOpen(true)}
                  className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition"
                >
                  <FileText className="h-4 w-4 mr-1.5" /> New Support Ticket
                </Button>
                <Button
                  onClick={() => setChatModalOpen(true)}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 font-semibold text-xs px-4 py-2.5 rounded-lg transition"
                >
                  <MessageSquare className="h-4 w-4 mr-1.5" /> Live Chat
                </Button>
              </div>
            </div>

            {/* Big Search Bar (BookMyShow Style) */}
            <div className="relative max-w-2xl">
              <div className="flex items-center bg-white rounded-xl shadow-lg overflow-hidden p-1 border border-white/20">
                <Search className="h-5 w-5 text-gray-400 ml-4 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="How can we help you today? (e.g., cancel ticket, refund, missing SMS)"
                  className="w-full bg-transparent px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-2 text-gray-400 hover:text-gray-600 mr-2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Content Area: Two Columns (Do you know? + Knowledge base) */}
        <div className="max-w-[1240px] mx-auto px-4 mt-8">
          {/* Breadcrumb / Back button */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#7B1E3D] transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
            <span className="text-xs text-gray-500">
              Showing {filteredArticles.length} solutions
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Sidebar: 'Do you know?' (BookMyShow Signature Sidebar) */}
            <aside className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <AlertCircle className="h-5 w-5 text-[#7B1E3D] shrink-0" />
                  <h2 className="text-base font-bold text-gray-900">
                    Do you know?
                  </h2>
                </div>

                <ul className="space-y-3.5 text-xs text-gray-600 leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7B1E3D] mt-1.5 shrink-0" />
                    <span>
                      Most of your booking &amp; refund queries can be tracked by logging into{' '}
                      <strong className="text-gray-900">Profile &gt; Your Orders</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7B1E3D] mt-1.5 shrink-0" />
                    <span>
                      In case money was deducted and booking failed, your refund is automatically returned by your bank in{' '}
                      <strong className="text-gray-900">5-7 working days</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7B1E3D] mt-1.5 shrink-0" />
                    <span>
                      Ticket cancellation is available for most cinemas and events (subject to venue policy). Check your booking receipt for the cancellation cutoff time.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7B1E3D] mt-1.5 shrink-0" />
                    <span>
                      Digital e-tickets on your mobile phone are 100% valid for entry across all cinemas and events. No printout required.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Direct Helpline Card */}
              <div className="bg-gradient-to-br from-[#7B1E3D] to-[#5C0F2A] text-white rounded-2xl p-6 shadow-md space-y-4">
                <div className="flex items-center gap-2.5">
                  <Headphones className="h-5 w-5 text-white/90" />
                  <h3 className="font-bold text-sm tracking-wide">Need Urgent Assistance?</h3>
                </div>
                <p className="text-xs text-white/80 leading-relaxed">
                  Our dedicated customer support agents are ready to assist you round the clock.
                </p>
                <div className="space-y-2 pt-2 border-t border-white/20 text-xs">
                  <a
                    href="mailto:support@vyhbz.com"
                    className="flex items-center gap-2 text-white hover:text-white/80 font-medium transition"
                  >
                    <Mail className="h-4 w-4 shrink-0" /> support@vyhbz.com
                  </a>
                  <a
                    href="tel:1800200929"
                    className="flex items-center gap-2 text-white hover:text-white/80 font-medium transition"
                  >
                    <Phone className="h-4 w-4 shrink-0" /> 1800-200-VYHBZ (Toll-Free)
                  </a>
                </div>
              </div>
            </aside>

            {/* Right Main Content: Knowledge Base & FAQs */}
            <section className="lg:col-span-8 space-y-6">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setSelectedArticle(null);
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                        isSelected
                          ? 'bg-[#7B1E3D] text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{cat.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Solution Articles List */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
                <div className="p-5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Recommended Topics &amp; Solutions
                  </h2>
                  <span className="text-xs text-gray-500 font-medium">
                    {filteredArticles.length} Articles
                  </span>
                </div>

                {filteredArticles.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 space-y-2">
                    <HelpCircle className="h-10 w-10 text-gray-300 mx-auto" />
                    <p className="text-base font-semibold text-gray-800">No matching queries found</p>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      Try searching with different keywords like "refund", "booking", or contact our 24x7 support team.
                    </p>
                    <Button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                      }}
                      variant="outline"
                      className="mt-3 text-xs border-gray-300"
                    >
                      Reset Search
                    </Button>
                  </div>
                ) : (
                  filteredArticles.map((art) => {
                    const isExpanded = selectedArticle?.id === art.id;
                    return (
                      <div key={art.id} className="p-5 hover:bg-gray-50/50 transition">
                        <div
                          onClick={() => setSelectedArticle(isExpanded ? null : art)}
                          className="cursor-pointer flex items-start justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#7B1E3D]">
                              <span>{art.categoryTitle}</span>
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#7B1E3D] transition">
                              {art.title}
                            </h3>
                            <p className="text-xs text-gray-500 leading-relaxed">
                              {art.summary}
                            </p>
                          </div>
                          <ChevronDown
                            className={`h-5 w-5 text-gray-400 shrink-0 transition-transform duration-200 mt-1 ${
                              isExpanded ? 'rotate-180 text-[#7B1E3D]' : ''
                            }`}
                          />
                        </div>

                        {/* Expanded Article Body */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-700 space-y-3 bg-gray-50/60 p-4 rounded-xl animate-in fade-in duration-200">
                            <p className="font-semibold text-gray-900 text-sm">Solution Steps:</p>
                            <ol className="list-decimal pl-4 space-y-2 leading-relaxed">
                              {art.content.map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ol>

                            <div className="pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                              <span>Was this helpful?</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toast.success('Thank you for your feedback!')}
                                  className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition flex items-center gap-1"
                                >
                                  <ThumbsUp className="h-3.5 w-3.5" /> Yes
                                </button>
                                <button
                                  onClick={() => setTicketModalOpen(true)}
                                  className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition flex items-center gap-1"
                                >
                                  <ThumbsDown className="h-3.5 w-3.5" /> Need more help
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* New Support Ticket Modal (Freshdesk/BMS style) */}
      <Dialog open={ticketModalOpen} onOpenChange={setTicketModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white p-6 rounded-2xl shadow-xl">
          <DialogHeader className="border-b border-gray-100 pb-3 text-left">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#7B1E3D] uppercase tracking-wider mb-1">
              <FileText className="h-4 w-4" />
              <span>Customer Helpdesk</span>
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Submit a Support Query
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Provide your details and we will investigate your issue promptly.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTicketSubmit} className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={ticketFormData.name}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, name: e.target.value })}
                  placeholder="Your name"
                  className="w-full p-2.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:border-[#7B1E3D]"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={ticketFormData.email}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full p-2.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:border-[#7B1E3D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={ticketFormData.phone}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full p-2.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:border-[#7B1E3D]"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Booking Ref (Optional)</label>
                <input
                  type="text"
                  value={ticketFormData.bookingId}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, bookingId: e.target.value })}
                  placeholder="e.g. VYH-9812"
                  className="w-full p-2.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:border-[#7B1E3D]"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">Issue Category</label>
              <select
                value={ticketFormData.category}
                onChange={(e) => setTicketFormData({ ...ticketFormData, category: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:border-[#7B1E3D] bg-white"
              >
                <option value="Booking Issue">Booking &amp; Ticket Delivery</option>
                <option value="Cancellation & Refund">Cancellation &amp; Refund</option>
                <option value="Payment Failure">Payment Debited but Failed</option>
                <option value="Event Inquiry">Live Event / Venue Inquiry</option>
                <option value="Other">Other Queries</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">Description of Issue</label>
              <textarea
                rows={4}
                required
                value={ticketFormData.description}
                onChange={(e) => setTicketFormData({ ...ticketFormData, description: e.target.value })}
                placeholder="Please explain your issue in detail so we can resolve it quickly..."
                className="w-full p-2.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:border-[#7B1E3D]"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmittingTicket}
              className="w-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-semibold py-2.5 rounded-xl transition text-sm"
            >
              {isSubmittingTicket ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...
                </>
              ) : (
                'Submit Support Ticket'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Live Chat Modal */}
      <Dialog open={chatModalOpen} onOpenChange={setChatModalOpen}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl shadow-xl flex flex-col h-[520px]">
          <DialogHeader className="border-b border-gray-100 pb-3 text-left shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                <DialogTitle className="text-base font-bold text-gray-900">
                  Vyhbz Live Assistance
                </DialogTitle>
              </div>
              <span className="text-[11px] text-gray-400">Online</span>
            </div>
            <DialogDescription className="text-[11px] text-gray-500">
              Average response time under 1 minute
            </DialogDescription>
          </DialogHeader>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs pr-1">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#7B1E3D] text-white rounded-tr-none'
                      : 'bg-gray-100 text-gray-800 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendChat} className="pt-3 border-t border-gray-100 flex gap-2 shrink-0">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#7B1E3D]"
            />
            <button
              type="submit"
              className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white p-2.5 rounded-xl transition shadow-sm"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
