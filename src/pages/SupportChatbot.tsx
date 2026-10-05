import { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Loader2,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  User,
  Bot,
} from "lucide-react";
import { api } from "@/api/client";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
}

interface SupportTopic {
  id: string;
  letter: string;
  color: string;
  title: string;
  subtitle: string;
  initialPrompt: string;
}

// Exactly matches the BookMyShow topics shown in user screenshot
const SUPPORT_TOPICS: SupportTopic[] = [
  {
    id: "stream",
    letter: "B",
    color: "bg-[#7986CB] text-white",
    title: "BookMyShow Stream",
    subtitle: "Can we connect you to an advis...",
    initialPrompt: "I have a question about Stream rental, download, and playback.",
  },
  {
    id: "cancellation",
    letter: "C",
    color: "bg-[#D85A5A] text-white",
    title: "Cancellation/Exchange request",
    subtitle: "Can we connect you to an advis...",
    initialPrompt: "I want to know about cancelling my ticket and the cancellation policy.",
  },
  {
    id: "cinema-feedback",
    letter: "C",
    color: "bg-[#D85A5A] text-white",
    title: "Cinema related feedback",
    subtitle: "Can we connect you to an advis...",
    initialPrompt: "I have feedback about the cinema auditorium, screen, sound, or showtime.",
  },
  {
    id: "confirmation",
    letter: "C",
    color: "bg-[#D85A5A] text-white",
    title: "Confirmation not received?",
    subtitle: "Can we connect you to an advis...",
    initialPrompt: "I have not received my booking confirmation SMS or email.",
  },
  {
    id: "ed-sheeran",
    letter: "E",
    color: "bg-[#66BB6A] text-white",
    title: "Ed Sheeran",
    subtitle: "Can we connect you to an advis...",
    initialPrompt: "I have a query regarding Ed Sheeran concert passes, entry, and schedule.",
  },
  {
    id: "general",
    letter: "G",
    color: "bg-[#E57373] text-white",
    title: "General",
    subtitle: "Can we connect you to an advis...",
    initialPrompt: "Hi, I need assistance with general booking or account queries.",
  },
  {
    id: "lollapalooza",
    letter: "L",
    color: "bg-[#E57373] text-white",
    title: "Lollapalooza",
    subtitle: "Can we connect you to an advis...",
    initialPrompt: "I have a query regarding Lollapalooza wristbands, schedule, and festival entry.",
  },
  {
    id: "offers",
    letter: "O",
    color: "bg-[#7986CB] text-white",
    title: "Offers",
    subtitle: "Can we connect you to an advis...",
    initialPrompt: "How do I apply offers, bank discounts, or promocodes on checkout?",
  },
];

const LOCAL_FALLBACKS: Record<string, string> = {
  cancellation:
    "Here is the ticket cancellation policy:\n\n" +
    "1. Go to **Profile > Purchase History**.\n" +
    "2. Select your booking and click **Cancel Booking**.\n" +
    "3. Review the refundable amount and confirm cancellation.\n\n" +
    "• **Cut-off:** Cancellation is allowed up to 2 hours before showtime.\n" +
    "• **Refunds:** UPI/Wallets in 24-48 hrs; Cards in 5-7 business days.\n" +
    "• Live events and concerts are non-cancellable unless the organizer reschedules.",

  confirmation:
    "Did not receive your confirmation SMS or Email?\n\n" +
    "1. Open **Profile > Purchase History**.\n" +
    "2. Your confirmed ticket with QR code is always saved there — this digital pass is 100% accepted at cinema gates.\n" +
    "3. Click **Resend Confirmation** to trigger fresh SMS and WhatsApp delivery.",

  "cinema-feedback":
    "We appreciate your feedback regarding the cinema.\n\n" +
    "• Please share the cinema name, screen number, and show date/time.\n" +
    "• Our exhibitor relation team will investigate sound, projection, or seating issues directly with theater management.",

  stream:
    "Guidelines for online streaming & rental:\n\n" +
    "• Once rented, you have 30 days to start watching, and 48 hours to finish once playback begins.\n" +
    "• Supported on web browsers, Android TV, Apple TV, and mobile app.",

  offers:
    "Applying offers & promo codes:\n\n" +
    "• Select your movie and seats, then proceed to the Payment screen.\n" +
    "• Under 'Unlock Offers or Apply Promocodes', enter your card or bank details.\n" +
    "• Applicable discount will be deducted automatically from your total amount.",
};

export default function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<SupportTopic | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && currentTopic) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, currentTopic]);

  useEffect(() => {
    if (isOpen && currentTopic) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen, currentTopic]);

  const handleSelectTopic = (topic: SupportTopic) => {
    setCurrentTopic(topic);
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "user",
        content: topic.initialPrompt,
        timestamp: new Date(),
      },
    ]);
    sendQueryToBackend(topic.initialPrompt, topic.title, []);
  };

  const sendQueryToBackend = async (
    text: string,
    categoryName?: string,
    historyOverride?: ChatMessage[]
  ) => {
    setIsLoading(true);

    const historyPayload = (historyOverride || messages).slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await api.post("/support/chat", {
        message: text,
        category: categoryName || currentTopic?.title,
        history: historyPayload,
      });

      const reply = res.data?.reply || "I am here to assist with your booking and support needs.";

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.warn("Backend chat endpoint fallback:", err);
      const fallbackText =
        LOCAL_FALLBACKS[currentTopic?.id || ""] ||
        "I'm here to help with your booking, cancellations, and refunds.\n\n" +
          "• You can view and manage all bookings under **Profile > Purchase History**.\n" +
          "• To request personal assistance, click **+ New support ticket** on the Support page.";

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: fallbackText,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCustomMessage = () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    sendQueryToBackend(text, currentTopic?.title, newHistory);
  };

  const handleResetConversation = () => {
    setCurrentTopic(null);
    setMessages([]);
    setInput("");
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => (
      <span key={i}>
        {line}
        {i < text.split("\n").length - 1 && <br />}
      </span>
    ));
  };

  return (
    <>
      {/* 1. Floating Trigger Button matching image 1 exactly */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group flex items-center justify-center cursor-pointer transition-transform duration-200 active:scale-95 drop-shadow-xl"
          aria-label="Open support chat"
        >
          {/* Custom Asymmetrical Organic Shape matching screenshot 1 */}
          <div className="w-[62px] h-[62px] bg-[#C61D2E] rounded-full rounded-tr-[18px] flex items-center justify-center shadow-lg hover:brightness-105 transition-all">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#1A1A1A]"
            >
              <rect x="2" y="4" width="20" height="15" rx="5" fill="currentColor" />
              <path
                d="M6 9H16M6 13H13"
                stroke="#C61D2E"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </button>
      )}

      {/* 2. Chat Modal Matching User Screenshot 2 Exactly */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
          {/* Circular Close Button positioned directly above the card on the right */}
          <button
            onClick={() => {
              setIsOpen(false);
              setCurrentTopic(null);
            }}
            className="w-8 h-8 rounded-full bg-[#525B62] hover:bg-[#3E454B] text-white flex items-center justify-center mb-2 shadow-md transition cursor-pointer"
            aria-label="Close chat"
          >
            <X size={16} strokeWidth={2.5} />
          </button>

          {/* Main Card Container with Red Top Shape and Dark Body */}
          <div className="w-[340px] max-w-[calc(100vw-2rem)] h-[490px] rounded-xl overflow-hidden shadow-2xl flex flex-col border border-[#2b2b2b] bg-[#141517]">
            {/* Asymmetrical Crimson Red Curved Banner */}
            <div className="relative bg-[#B91C28] px-4 pt-4 pb-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {currentTopic ? (
                  <button
                    onClick={() => setCurrentTopic(null)}
                    className="p-1 rounded-full hover:bg-black/20 text-white transition cursor-pointer mr-1"
                    title="Back to topics"
                  >
                    <ArrowLeft size={18} />
                  </button>
                ) : null}

                {/* Green Rounded App Icon Badge with white chat symbol */}
                <div className="w-7 h-7 rounded-lg bg-[#2E7D32] flex items-center justify-center shadow-inner">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="2" y="5" width="20" height="14" rx="4" fill="white" />
                    <line x1="6" y1="10" x2="16" y2="10" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="6" y1="14" x2="12" y2="14" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>

                {currentTopic && (
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {currentTopic.title}
                    </p>
                  </div>
                )}
              </div>

              {currentTopic && (
                <button
                  onClick={handleResetConversation}
                  className="p-1.5 rounded-full hover:bg-black/20 text-white/80 hover:text-white transition cursor-pointer"
                  title="Reset conversation"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>

            {/* Subheader Title Bar: "Chat with us" */}
            <div className="bg-[#1C1D21] px-4 py-2.5 border-b border-[#2A2B30] flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-white tracking-wide">
                Chat with us
              </span>
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-400" /> Support
              </span>
            </div>

            {/* VIEW 1: Topic Category List matching screenshot 2 */}
            {!currentTopic ? (
              <div className="flex-1 overflow-y-auto divide-y divide-[#26282E] bg-[#141517]">
                {SUPPORT_TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => handleSelectTopic(topic)}
                    className="w-full text-left px-4 py-3 hover:bg-[#1E2024] active:bg-[#25272C] transition flex items-center gap-3 cursor-pointer group"
                  >
                    {/* Circle Avatar with Single Letter */}
                    <div
                      className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs shadow-sm ${topic.color}`}
                    >
                      {topic.letter}
                    </div>

                    {/* Topic Title and Subtitle */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#EEEEEE] group-hover:text-white truncate">
                        {topic.title}
                      </p>
                      <p className="text-[11px] text-[#8E9299] truncate mt-0.5">
                        {topic.subtitle}
                      </p>
                    </div>

                    <ChevronRight className="h-4 w-4 text-[#4E5259] group-hover:text-white transition shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              /* VIEW 2: Active Chat Conversation View */
              <div className="flex-1 flex flex-col overflow-hidden bg-[#141517]">
                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2 ${
                        msg.role === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] font-bold ${
                          msg.role === "assistant" ? "bg-[#B91C28]" : "bg-[#454950]"
                        }`}
                      >
                        {msg.role === "assistant" ? <Bot size={12} /> : <User size={12} />}
                      </div>

                      <div
                        className={`max-w-[82%] flex flex-col gap-0.5 ${
                          msg.role === "user" ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                            msg.role === "user"
                              ? "bg-[#B91C28] text-white"
                              : "bg-[#202227] text-[#E0E0E0] border border-[#2F323A]"
                          }`}
                        >
                          {renderContent(msg.content)}
                        </div>
                        <span className="text-[9px] text-[#70747C] px-1">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isLoading && (
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#B91C28] flex items-center justify-center text-white shrink-0">
                        <Bot size={12} />
                      </div>
                      <div className="bg-[#202227] border border-[#2F323A] rounded-xl px-3 py-2">
                        <div className="flex gap-1.5 items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Box */}
                <div className="px-3 py-2.5 border-t border-[#26282E] bg-[#1A1B1F] flex items-center gap-2 shrink-0">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendCustomMessage();
                      }
                    }}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="flex-1 bg-[#25272D] border border-[#363942] rounded-full px-3.5 py-1.5 text-xs text-white placeholder:text-[#7A7E87] outline-none focus:border-[#B91C28] disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendCustomMessage}
                    disabled={!input.trim() || isLoading}
                    className="w-7 h-7 rounded-full bg-[#B91C28] hover:bg-[#9B1520] text-white flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
