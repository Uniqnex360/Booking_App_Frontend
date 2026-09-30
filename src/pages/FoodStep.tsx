import { useMemo, useState } from "react";
import { ChevronLeft, Minus, Plus, Search } from "lucide-react";
import { formatRupees } from "@/utils/currencyFormatter";

export interface FnbItem {
  id: string;
  name: string;
  description?: string;
  price_paise: number;
  image_url?: string | null;
  is_veg?: boolean;
  category: string; // Popcorn | Beverages | Snacks | Combos | Desserts
}

const EMOJI: Record<string, string> = {
  Popcorn: "🍿",
  Beverages: "🥤",
  Snacks: "🍟",
  Combos: "🍿",
  Desserts: "🍨",
};

interface FoodStepProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  ticketPaise: number;
  menu: FnbItem[];
  cart: Record<string, number>;
  setCart: (c: Record<string, number>) => void;
  onBack: () => void;
  onProceed: () => void; // used for both Skip and Proceed
}

export function FoodStep({
  isOpen,
  title,
  subtitle,
  ticketPaise,
  menu,
  cart,
  setCart,
  onBack,
  onProceed,
}: FoodStepProps) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const cats = useMemo(
    () => ["All", ...Array.from(new Set(menu.map((m) => m.category)))],
    [menu],
  );

  const shown = menu.filter(
    (m) =>
      (cat === "All" || m.category === cat) &&
      m.name.toLowerCase().includes(q.toLowerCase()),
  );

  const cartItems = menu.filter((m) => (cart[m.id] || 0) > 0);
  const fnbTotal = cartItems.reduce(
    (a, m) => a + m.price_paise * cart[m.id],
    0,
  );

  const setQty = (id: string, n: number) => {
    const next = { ...cart };
    if (n <= 0) delete next[id];
    else next[id] = Math.min(n, 10);
    setCart(next);
  };

  if (!isOpen) return null;

  const renderStepper = (id: string) =>
    (cart[id] || 0) === 0 ? (
      <button
        onClick={() => setQty(id, 1)}
        className="border border-[#7B1E3D] text-[#7B1E3D] rounded px-5 py-1 text-xs font-semibold hover:bg-[#7B1E3D]/5 cursor-pointer"
      >
        Add
      </button>
    ) : (
      <div className="flex items-center gap-2 border border-[#7B1E3D] rounded px-1 py-0.5">
        <button
          onClick={() => setQty(id, cart[id] - 1)}
          className="p-1 text-[#7B1E3D] cursor-pointer"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="text-xs font-bold w-4 text-center">{cart[id]}</span>
        <button
          onClick={() => setQty(id, cart[id] + 1)}
          className="p-1 text-[#7B1E3D] cursor-pointer"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    );

  return (
    <div className="fixed inset-0 z-[140] bg-[#F5F5FA] overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1000px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{title}</p>
              <p className="text-[11px] text-gray-500 truncate">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onProceed}
            className="bg-[#7B1E3D] text-white text-xs font-semibold px-4 py-2 rounded-md cursor-pointer shrink-0"
          >
          {cartItems.length ? "Pay" : "Skip"}   
          </button>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 py-4 grid gap-4 lg:grid-cols-[1fr_320px] pb-28">
        {/* Menu */}
        <div className="space-y-3">
          <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between gap-3">
            <span className="text-sm font-bold">Grab a Bite!</span>
            <div className="flex items-center gap-2 border border-gray-300 rounded px-2 py-1.5 flex-1 max-w-[320px]">
              <Search className="h-3.5 w-3.5 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search for F&B items"
                className="text-xs outline-none w-full"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 flex overflow-x-auto">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-4 py-3 text-xs whitespace-nowrap cursor-pointer border-b-2 ${
                  cat === c
                    ? "border-[#7B1E3D] text-[#7B1E3D] font-semibold"
                    : "border-transparent text-gray-500"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {shown.map((m) => (
              <div
                key={m.id}
                className="bg-white rounded-lg border border-gray-200 p-3 flex gap-3"
              >
                <div className="w-20 h-20 shrink-0 rounded bg-gray-50 flex items-center justify-center overflow-hidden text-3xl">
                  {m.image_url ? (
                    <img
                      src={m.image_url}
                      alt={m.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    EMOJI[m.category] || "🍽️"
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-start gap-1.5">
                    <span
                      className={`mt-0.5 w-3 h-3 border shrink-0 flex items-center justify-center ${
                        m.is_veg === false
                          ? "border-red-600"
                          : "border-green-600"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          m.is_veg === false ? "bg-red-600" : "bg-green-600"
                        }`}
                      />
                    </span>
                    <p className="text-xs font-semibold leading-tight">
                      {m.name}
                    </p>
                  </div>
                  {m.description && (
                    <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">
                      {m.description}
                    </p>
                  )}
                  <div className="mt-auto pt-2 flex items-center justify-between">
                    <span className="text-xs font-bold">
                      {formatRupees(m.price_paise)}
                    </span>
                    {renderStepper(m.id)}
                  </div>
                </div>
              </div>
            ))}
            {shown.length === 0 && (
              <p className="text-xs text-gray-400 col-span-full text-center py-10">
                No items found.
              </p>
            )}
          </div>
        </div>

        {/* Cart */}
        <div className="bg-white rounded-lg border border-gray-200 h-fit lg:sticky lg:top-20">
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 text-xs">
            <span className="text-gray-600">Ticket(s) price</span>
            <span className="font-bold text-sm">
              {formatRupees(ticketPaise)}
            </span>
          </div>
          <div className="px-4 py-3 text-sm font-bold border-b border-gray-100">
            Your Cart
          </div>
          {cartItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-gray-500">
              <div className="text-4xl mb-2">🍿</div>
              Fill this cart with your favorite food combos!
            </div>
          ) : (
            <div className="px-4 py-3 space-y-3">
              {cartItems.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{m.name}</p>
                    <p className="text-[11px] text-gray-500">
                      {formatRupees(m.price_paise * cart[m.id])}
                    </p>
                  </div>
                  {renderStepper(m.id)}
                </div>
              ))}
              <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between text-xs">
                <span>Food &amp; Beverage</span>
                <span className="font-bold">{formatRupees(fnbTotal)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex justify-center shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <button
          onClick={onProceed}
          className="w-full max-w-md bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold py-3 rounded-lg text-sm cursor-pointer"
        >
         {cartItems.length
  ? `Pay • ${formatRupees(ticketPaise + fnbTotal)}`
  : `Pay ${formatRupees(ticketPaise)}`}
        </button>
      </div>
    </div>
  );
}