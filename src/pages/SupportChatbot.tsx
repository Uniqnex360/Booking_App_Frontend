import { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  User,
  RefreshCw,
  ChevronDown,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
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

const SUPPORT_TOPICS: SupportTopic[] = [
  {
    id: "cancellation",
    letter: "C",
    color: "bg-[#e11d48] text-white",
    title: "Cancellation/Exchange request",
    subtitle: "Can we connect you to an advisor or help cancel?",
    initialPrompt: "I want to know about cancelling my ticket and the cancellation policy.",
  },
  {
    id: "confirmation",
    letter: "C",
    color: "bg-[#ea580c] text-white",
    title: "Confirmation not received?",
    subtitle: "Can we connect you to an advisor or resend SMS/Email?",
    initialPrompt: "I have not received my booking confirmation SMS or email.",
  },
  {
    id: "payment",
    letter: "P",
    color: "bg-[#059669] text-white",
    title: "Payment & Refund status",
    subtitle: "Can we connect you to an advisor regarding refund timelines?",
    initialPrompt: "Where is my refund, or my payment was deducted without tickets.",
  },
  {
    id: "cinema-feedback",
    letter: "C",
    color: "bg-[#d97706] text-white",
    title: "Cinema & screen feedback",
    subtitle: "Can we connect you to an advisor for auditorium issues?",
    initialPrompt: "I have feedback about the cinema screen, sound, or showtime.",
  },
  {
    id: "booking-queries",
    letter: "T",
    color: "bg-[#2563eb] text-white",
    title: "Ticket booking queries",
    subtitle: "Can we connect you to an advisor for seat selection?",
    initialPrompt: "I have questions about booking seats, couple recliners, or showtimes.",
  },
  {
    id: "offers",
    letter: "O",
    color: "bg-[#7c3aed] text-white",
    title: "Offers & Promocodes",
    subtitle: "Can we connect you to an advisor about discount codes?",
    initialPrompt: "How do I apply offers or bank promo codes on checkout?",
  },
  {
    id: "stream",
    letter: "S",
    color: "bg-[#4f46e5] text-white",
    title: "Vyhbz Stream & Online",
    subtitle: "Can we connect you to an advisor for streaming content?",
    initialPrompt: "I have a question about Vyhbz Stream movie rental and playback.",
  },
  {
    id: "general",
    letter: "G",
    color: "bg-[#4b5563] text-white",
    title: "General queries",
    subtitle: "Can we connect you to an advisor for anything else?",
    initialPrompt: "Hi, I need assistance with my account and general queries.",
  },
];

const LOCAL_FALLBACKS: Record<string, string> = {
  cancellation:
    "Here is the ticket cancellation policy for Vyhbz:\n\n" +
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

  payment:
    "Payment and refund guidelines:\n\n" +
    "• **UPI / Wallets:** Credited in 24 to 48 hours.\n" +
    "• **Credit & Debit Cards:** Credited in 5 to 7 working days.\n" +
    "• **Money debited without ticket?** Banking network drops reverse automatically within 2-4 business days.\n" +
    "• Check **Profile > Purchase History** for your Bank RRN tracking number.",
};

export default function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<SupportTopic | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && currentTopic && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, currentTopic, isMinimized]);

  useEffect(() => {
    if (isOpen && currentTopic && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen, currentTopic, isMinimized]);

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
      // Secure backend call (OpenAI key stays completely secret on server)
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
      // Instant client-side intelligent fallback so user never gets stuck
      let fallbackText =
        LOCAL_FALLBACKS[currentTopic?.id || ""] ||
        "I'm here to help with your Vyhbz booking, cancellations, and refunds.\n\n" +
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
      {/* Floating Trigger Button in bottom right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2.5">
        {!isOpen && (
          <div
            onClick={() => setIsOpen(true)}
            className="bg-white border border-gray-200 rounded-2xl rounded-br-none shadow-xl px-4 py-2 text-xs text-gray-800 font-semibold cursor-pointer hover:shadow-2xl transition-all flex items-center gap-2 group animate-in slide-in-from-bottom-2 duration-300"
          >
            <span className="w-2 h-2 rounded-full bg-[#7B1E3D] animate-ping" />
            <span>Chat with us</span>
          </div>
        )}

        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setIsMinimized(false);
          }}
          className="w-14 h-14 rounded-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white shadow-2xl flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer ring-4 ring-white/50"
          aria-label="Open support chat"
        >
          {isOpen ? <X size={22} /> : <MessageCircle size={24} />}
        </button>
      </div>

      {/* Main Drawer (Signature BookMyShow Red & White styling) */}
      {isOpen && (
        <div
          className={`fixed bottom-24 right-4 sm:right-6 z-50 w-[380px] max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-300 ${
            isMinimized ? "h-14" : "h-[540px]"
          }`}
        >
          {/* Header Bar */}
          <div className="bg-[#7B1E3D] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              {currentTopic && !isMinimized ? (
                <button
                  onClick={() => setCurrentTopic(null)}
                  className="p-1 rounded-full hover:bg-white/15 text-white transition cursor-pointer"
                  title="Back to topics"
                >
                  <ArrowLeft size={18} />
                </button>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold truncate leading-tight">
                  {currentTopic && !isMinimized ? currentTopic.title : "Chat with us"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-white/80 font-medium">
                    Vyhbz Support Assistant
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {currentTopic && !isMinimized && (
                <button
                  onClick={handleResetConversation}
                  className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition cursor-pointer"
                  title="Reset conversation"
                >
                  <RefreshCw size={14} />
                </button>
              )}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition cursor-pointer"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${
                    isMinimized ? "rotate-180" : ""
                  }`}
                />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* VIEW 1: Topic Category Selection (BookMyShow Signature List) */}
              {!currentTopic ? (
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Select a topic to chat
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" /> Verified Support
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                    {SUPPORT_TOPICS.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => handleSelectTopic(topic)}
                        className="w-full text-left px-4 py-3 hover:bg-rose-50/40 active:bg-rose-50 transition flex items-center justify-between gap-3 group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center font-bold text-sm shadow-xs ${topic.color}`}
                          >
                            {topic.letter}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 group-hover:text-[#7B1E3D] transition truncate">
                              {topic.title}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                              {topic.subtitle}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#7B1E3D] group-hover:translate-x-0.5 transition shrink-0" />
                      </button>
                    ))}
                  </div>

                  {/* Bottom quick tip banner */}
                  <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                    <p className="text-[11px] text-gray-500">
                      Looking for instant ticket actions?{" "}
                      <a href="/profile" className="text-[#7B1E3D] font-bold hover:underline">
                        Go to Purchase History &rarr;
                      </a>
                    </p>
                  </div>
                </div>
              ) : (
                /* VIEW 2: Active Chat Thread */
                <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2.5 ${
                          msg.role === "user" ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-xs ${
                            msg.role === "assistant" ? "bg-[#7B1E3D]" : "bg-gray-700"
                          }`}
                        >
                          {msg.role === "assistant" ? <Bot size={13} /> : <User size={13} />}
                        </div>

                        <div
                          className={`max-w-[82%] flex flex-col gap-0.5 ${
                            msg.role === "user" ? "items-end" : "items-start"
                          }`}
                        >
                          <div
                            className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                              msg.role === "user"
                                ? "bg-[#7B1E3D] text-white rounded-tr-xs"
                                : "bg-white text-gray-800 border border-gray-200 rounded-tl-xs"
                            }`}
                          >
                            {renderContent(msg.content)}
                          </div>
                          <span className="text-[9px] text-gray-400 px-1">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Typing Animation */}
                    {isLoading && (
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#7B1E3D] flex items-center justify-center text-white shrink-0 shadow-xs">
                          <Bot size={13} />
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-xs px-4 py-2.5 shadow-2xs">
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

                  {/* Input Box */}
                  <div className="px-3 py-2.5 border-t border-gray-200 bg-white flex items-center gap-2 shrink-0">
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
                      placeholder="Type your question..."
                      disabled={isLoading}
                      className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#7B1E3D]/30 disabled:opacity-50"
                    />
                    <button
                      onClick={handleSendCustomMessage}
                      disabled={!input.trim() || isLoading}
                      className="w-8 h-8 rounded-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-xs"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
