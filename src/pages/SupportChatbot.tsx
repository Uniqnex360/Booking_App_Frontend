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
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
}

const SYSTEM_PROMPT = `You are Vyhbz Support Assistant — a friendly, knowledgeable AI support agent for Vyhbz, a premier entertainment booking platform (like BookMyShow) based in India. You help users with:
- Movie ticket booking, cancellations, and refunds
- Live event, concert, and sports ticket queries
- Payment issues (failed payments, refund status, LazyPay, UPI)
- Seat selection, showtime changes, and booking modifications
- Gift cards, promo codes, and offers
- Vyhbz Cash and wallet-related queries
- Confirmation SMS/email issues
- Cinema-related problems (show cancelled, sound issues, etc.)
- Account, profile, and OTP issues

Key policies:
- Refunds for cancellations: UPI/Wallet within 24-48 hours, Credit/Debit cards within 5-7 working days
- Cancellation cutoff: Generally 2 hours before showtime (varies by cinema)
- Live events: Non-cancellable unless organizer cancels
- Cancellation limit: 3 per month per account
- Digital streams: Non-refundable once accessed

Tone: Warm, concise, professional. Use bullet points for steps. Limit replies to 3-4 short paragraphs or 5-6 bullet points. Always end with "Is there anything else I can help you with? 😊" if the query seems resolved.

If you cannot resolve the issue, suggest the user submit a support ticket using the form on this page.`;

const QUICK_REPLIES = [
  "How do I cancel my ticket?",
  "Where is my refund?",
  "I didn't get my booking confirmation",
  "My payment failed but amount was deducted",
  "How to use a promo code?",
];

export default function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi there! 👋 I'm the Vyhbz Support Assistant. I can help you with bookings, cancellations, refunds, payments, and more.\n\nWhat can I help you with today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OpenAI API key not configured");
      }

      const history = messages
        .filter((m) => m.id !== "welcome")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...history,
            { role: "user", content: text.trim() },
          ],
          max_tokens: 500,
          temperature: 0.6,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't process that. Please try again.";

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            err.message?.includes("API key")
              ? "⚠️ Chat is not configured yet. Please add your OpenAI API key in the .env file as VITE_OPENAI_API_KEY."
              : "I'm having trouble connecting right now. Please try again in a moment, or submit a support ticket using the form above.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hi there! 👋 I'm the Vyhbz Support Assistant. I can help you with bookings, cancellations, refunds, payments, and more.\n\nWhat can I help you with today?",
        timestamp: new Date(),
      },
    ]);
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
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Chat notification badge when closed */}
        {!isOpen && (
          <div className="bg-white border border-gray-200 rounded-2xl rounded-br-none shadow-lg px-4 py-2.5 max-w-[220px] text-xs text-gray-700 font-medium animate-in slide-in-from-bottom-2 duration-300">
            💬 Chat with AI Support
          </div>
        )}

        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setIsMinimized(false);
          }}
          className="w-14 h-14 rounded-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white shadow-2xl flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer"
          aria-label="Open chat"
        >
          {isOpen ? <X size={22} /> : <MessageCircle size={24} />}
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-300 ${
            isMinimized ? "h-14" : "h-[520px]"
          }`}
        >
          {/* Header */}
          <div className="bg-[#7B1E3D] px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-bold leading-tight">
                  Vyhbz Support
                </p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  <span className="text-white/70 text-[10px]">AI Assistant • Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
                title="Reset conversation"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform ${isMinimized ? "rotate-180" : ""}`}
                />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold ${
                        msg.role === "assistant"
                          ? "bg-[#7B1E3D]"
                          : "bg-gray-600"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <Bot size={13} />
                      ) : (
                        <User size={13} />
                      )}
                    </div>

                    <div
                      className={`max-w-[80%] ${
                        msg.role === "user" ? "items-end" : "items-start"
                      } flex flex-col gap-0.5`}
                    >
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          msg.role === "user"
                            ? "bg-[#7B1E3D] text-white rounded-tr-sm"
                            : "bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm"
                        }`}
                      >
                        {renderContent(msg.content)}
                      </div>
                      <span className="text-[10px] text-gray-400 px-1">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#7B1E3D] flex items-center justify-center text-white shrink-0">
                      <Bot size={13} />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]"></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies (shown on first message only) */}
              {messages.length <= 1 && (
                <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex gap-2 overflow-x-auto no-scrollbar">
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="shrink-0 px-3 py-1.5 bg-white border border-[#7B1E3D]/30 text-[#7B1E3D] text-[10px] font-semibold rounded-full hover:bg-[#7B1E3D] hover:text-white transition cursor-pointer whitespace-nowrap shadow-sm"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="px-3 py-3 border-t border-gray-200 bg-white flex items-center gap-2 shrink-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  placeholder="Type your question..."
                  disabled={isLoading}
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#7B1E3D]/30 disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className="w-8 h-8 rounded-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* Footer */}
              <div className="px-4 py-1.5 bg-white border-t border-gray-100 text-center">
                <p className="text-[9px] text-gray-400">
                  Powered by OpenAI • Vyhbz AI Support
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
