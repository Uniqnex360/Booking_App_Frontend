import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createEvent } from "@/api/event.api";
import { getMyPartnerProfile } from "@/api/partner.api";
import { DINING_TAGS } from "@/types/event.types";
import { fileToDataUrl } from "@/utils/fileToDataUrl";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Loader2,
  CalendarDays,
  Ticket,
  Image as ImageIcon,
  Utensils,
  MapPin,
  Sparkles,
  Wine,
  Waves,
  Sun,
  Music,
  Smile,
  DollarSign,
  Flame,
} from "lucide-react";

const WINE_COLOR = "#7B1E3D";
const WINE_HOVER = "#5C0F2A";

const CUISINE_OPTIONS = [
  "Kerala",
  "South Indian",
  "North Indian",
  "Italian",
  "Continental",
  "Pan-Asian",
  "Chinese",
  "Seafood",
  "Mughlai",
  "Barbecue & Grills",
  "Mediterranean",
  "Mexican",
  "Japanese & Sushi",
  "Bakery & Desserts",
];

const TAG_LABELS: Record<string, string> = {
  FINE_DINING: "Fine Dining",
  SUNDAY_BRUNCH: "Sunday Brunch",
  STREET_FOOD: "Street Food",
  BUFFET: "Buffet Spread",
  POOLSIDE: "Pool Access",
  ROOFTOP: "Rooftop Dining",
  OUTDOOR_SEATING: "Outdoor Seating",
  LIVE_MUSIC: "Live Music",
  KIDS_ALLOWED: "Kids Friendly",
};

const diningTicketSchema = z.object({
  name: z.string().min(2, "Package name is required"),
  price_rupees: z.coerce
    .number({ invalid_type_error: "Price must be a number" })
    .positive("Price must be positive")
    .min(1, "Price must be at least ₹1"),
  capacity: z
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Available covers / seats required"),
  max_per_booking: z
    .number()
    .int("Must be a whole number")
    .min(1, "Required"),
});

const diningFormSchema = z
  .object({
    title: z.string().min(2, "Title must be at least 2 characters"),
    venue_name: z.string().min(2, "Restaurant / Venue name is required"),
    venue_address: z.string().min(3, "Restaurant address is required"),
    city: z.string().min(2, "City is required"),
    starts_at: z.string().min(1, "Start date and time is required"),
    ends_at: z.string().min(1, "End date and time is required"),
    description: z.string().min(10, "Please provide a detailed description (at least 10 chars)"),
    what_included: z.string().min(5, "Please describe what is included in this dining experience"),
    price_range: z.coerce.number().min(1).max(4).default(2),
    cuisine: z.array(z.string()).min(1, "Select at least one cuisine"),
    tags: z.array(z.string()).default([]),
    poster_image_url: z.string().min(1, "Cover image is required"),
    ticket_categories: z
      .array(diningTicketSchema)
      .min(1, "Add at least one dining package or ticket tier"),
  })
  .refine(
    (data) => {
      const start = new Date(data.starts_at);
      const end = new Date(data.ends_at);
      return end > start;
    },
    {
      message: "End time must be after start time",
      path: ["ends_at"],
    }
  );

type DiningFormData = z.infer<typeof diningFormSchema>;

export default function PartnerDiningCreatePage() {
  const navigate = useNavigate();
  const [partnerLoading, setPartnerLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "schedule" | "pricing" | "media">("details");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DiningFormData>({
    resolver: zodResolver(diningFormSchema),
    defaultValues: {
      title: "",
      venue_name: "",
      venue_address: "",
      city: "",
      starts_at: "",
      ends_at: "",
      description: "",
      what_included: "",
      price_range: 2,
      cuisine: [],
      tags: ["FINE_DINING"],
      poster_image_url: "",
      ticket_categories: [
        {
          name: "Standard Dining Pass",
          price_rupees: 999,
          capacity: 40,
          max_per_booking: 6,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "ticket_categories",
  });

  const watchedCuisines = watch("cuisine") || [];
  const watchedTags = watch("tags") || [];
  const watchedPriceRange = watch("price_range") || 2;
  const watchedPoster = watch("poster_image_url");

  // Prefill restaurant name and city from approved partner profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const partner = await getMyPartnerProfile();
        if (partner) {
          if (partner.business_name) {
            setValue("venue_name", partner.business_name);
          }
          if (partner.city) {
            setValue("city", partner.city);
          }
        }
      } catch {
        // Ignored if non-partner or profile failed
      } finally {
        setPartnerLoading(false);
      }
    };
    fetchProfile();
  }, [setValue]);

  const toggleCuisine = (c: string) => {
    const current = [...watchedCuisines];
    const idx = current.indexOf(c);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(c);
    }
    setValue("cuisine", current, { shouldValidate: true });
  };

  const toggleTag = (t: string) => {
    const current = [...watchedTags];
    const idx = current.indexOf(t);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(t);
    }
    setValue("tags", current, { shouldValidate: true });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setValue("poster_image_url", dataUrl, { shouldValidate: true });
      toast.success("Cover image loaded successfully");
    } catch {
      toast.error("Failed to process image file");
    }
  };

  const onSubmit = async (data: DiningFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        title: data.title.trim(),
        category: "dining",
        venue_name: data.venue_name.trim(),
        venue_address: data.venue_address.trim(),
        city: data.city.trim(),
        starts_at: new Date(data.starts_at).toISOString(),
        ends_at: new Date(data.ends_at).toISOString(),
        description: data.description.trim(),
        what_included: data.what_included.trim(),
        price_range: data.price_range,
        cuisine: data.cuisine,
        tags: data.tags,
        poster_image_url: data.poster_image_url,
        ticket_categories: data.ticket_categories.map((tc) => ({
          name: tc.name.trim(),
          price_paise: Math.round(tc.price_rupees * 100),
          capacity: tc.capacity,
          max_per_booking: tc.max_per_booking,
        })),
      };

      await createEvent(payload);
      toast.success("Dining experience submitted for moderation! An admin will review it shortly.");
      navigate("/partner/dashboard");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to create dining experience";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />

      <main className="max-w-4xl mx-auto w-full px-4 pt-28 pb-16 flex-1">
        {/* Back link */}
        <div className="mb-6">
          <Link
            to="/partner/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#7B1E3D] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Partner Dashboard
          </Link>
        </div>

        {/* Header Title Box */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-xs mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 rounded-xl bg-amber-50 text-[#7B1E3D] border border-amber-200">
              <Utensils className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                Host a Dining Experience
              </h1>
              <p className="text-sm text-gray-500">
                List brunches, fine dining degustations, chef tasting menus, and buffet packages.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
          {[
            { id: "details", label: "1. Restaurant & Cuisines" },
            { id: "schedule", label: "2. Schedule & Timing" },
            { id: "pricing", label: "3. Dining Packages" },
            { id: "media", label: "4. Poster & Photos" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "border-[#7B1E3D] text-[#7B1E3D]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* TAB 1: DETAILS */}
          {activeTab === "details" && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-3">
                Experience & Restaurant Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Experience Title *
                  </Label>
                  <Input
                    {...register("title")}
                    placeholder="e.g. Royal Sunday Champagne Brunch with Live Jazz"
                    className="mt-1.5"
                  />
                  {errors.title && (
                    <p className="text-xs text-rose-600 mt-1">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Restaurant / Venue Name *
                  </Label>
                  <Input
                    {...register("venue_name")}
                    placeholder="e.g. Malabar Coast Seafood Grill"
                    className="mt-1.5"
                  />
                  {errors.venue_name && (
                    <p className="text-xs text-rose-600 mt-1">{errors.venue_name.message}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    City *
                  </Label>
                  <Input
                    {...register("city")}
                    placeholder="e.g. Kochi, Chennai, Bangalore"
                    className="mt-1.5"
                  />
                  {errors.city && (
                    <p className="text-xs text-rose-600 mt-1">{errors.city.message}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Venue Address *
                  </Label>
                  <Input
                    {...register("venue_address")}
                    placeholder="e.g. Marine Drive Promenade, Ernakulam"
                    className="mt-1.5"
                  />
                  {errors.venue_address && (
                    <p className="text-xs text-rose-600 mt-1">{errors.venue_address.message}</p>
                  )}
                </div>

                {/* Price Range Tier */}
                <div className="sm:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-2">
                    Cost Tier (₹ Band)
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { val: 1, symbol: "₹", label: "Budget Friendly" },
                      { val: 2, symbol: "₹₹", label: "Pocket Friendly" },
                      { val: 3, symbol: "₹₹₹", label: "Upscale Dining" },
                      { val: 4, symbol: "₹₹₹₹", label: "Fine Dining Luxury" },
                    ].map((tier) => (
                      <button
                        key={tier.val}
                        type="button"
                        onClick={() => setValue("price_range", tier.val)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          watchedPriceRange === tier.val
                            ? "border-[#7B1E3D] bg-rose-50/50 ring-2 ring-[#7B1E3D]/20 text-[#7B1E3D]"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <span className="font-extrabold text-base block">{tier.symbol}</span>
                        <span className="text-xs text-gray-600 block mt-0.5">{tier.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cuisines Multi-Select */}
                <div className="sm:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-2">
                    Cuisines Served *
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {CUISINE_OPTIONS.map((c) => {
                      const isSelected = watchedCuisines.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCuisine(c)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                            isSelected
                              ? "bg-[#7B1E3D] text-white border-[#7B1E3D]"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                  {errors.cuisine && (
                    <p className="text-xs text-rose-600 mt-1">{errors.cuisine.message}</p>
                  )}
                </div>

                {/* Dining Features & Tags */}
                <div className="sm:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-2">
                    Experience Highlights & Amenities
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {DINING_TAGS.map((t) => {
                      const isSelected = watchedTags.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTag(t)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                            isSelected
                              ? "bg-amber-100 text-amber-900 border-amber-300 font-bold"
                              : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {TAG_LABELS[t] || t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* What's Included */}
                <div className="sm:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    What's Included in the Experience *
                  </Label>
                  <Textarea
                    {...register("what_included")}
                    rows={3}
                    placeholder="e.g. Unlimited starters & main course buffet, welcome sparkling mocktail, access to infinity pool, complimentary chef's dessert."
                    className="mt-1.5 text-sm"
                  />
                  {errors.what_included && (
                    <p className="text-xs text-rose-600 mt-1">{errors.what_included.message}</p>
                  )}
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Detailed Experience Description *
                  </Label>
                  <Textarea
                    {...register("description")}
                    rows={4}
                    placeholder="Tell guests about the ambiance, seating arrangement, live music, dress code, and culinary craftsmanship."
                    className="mt-1.5 text-sm"
                  />
                  {errors.description && (
                    <p className="text-xs text-rose-600 mt-1">{errors.description.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  type="button"
                  onClick={() => setActiveTab("schedule")}
                  className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white"
                >
                  Next: Schedule & Timing <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: SCHEDULE */}
          {activeTab === "schedule" && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-3">
                Timing & Event Dates
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Experience Starts At *
                  </Label>
                  <Input
                    type="datetime-local"
                    {...register("starts_at")}
                    className="mt-1.5"
                  />
                  {errors.starts_at && (
                    <p className="text-xs text-rose-600 mt-1">{errors.starts_at.message}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Experience Ends At *
                  </Label>
                  <Input
                    type="datetime-local"
                    {...register("ends_at")}
                    className="mt-1.5"
                  />
                  {errors.ends_at && (
                    <p className="text-xs text-rose-600 mt-1">{errors.ends_at.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("details")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveTab("pricing")}
                  className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white"
                >
                  Next: Dining Packages <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: PRICING & TIERS */}
          {activeTab === "pricing" && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Dining Packages & Price per Person
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Define seating passes, packages, or buffet covers for this experience.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      name: "VIP Dining Pass",
                      price_rupees: 1499,
                      capacity: 20,
                      max_per_booking: 6,
                    })
                  }
                  className="text-xs text-[#7B1E3D] border-[#7B1E3D]"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Package Tier
                </Button>
              </div>

              <div className="space-y-4">
                {fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Package #{idx + 1}
                      </span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="text-gray-400 hover:text-rose-600 transition-colors p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <Label className="text-xs text-gray-600">Tier / Package Name *</Label>
                        <Input
                          {...register(`ticket_categories.${idx}.name`)}
                          placeholder="e.g. Unlimited Brunch Buffet"
                          className="mt-1 bg-white"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-gray-600">Price per Person (₹) *</Label>
                        <Input
                          type="number"
                          {...register(`ticket_categories.${idx}.price_rupees`)}
                          placeholder="999"
                          className="mt-1 bg-white"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-gray-600">Total Capacity (Covers) *</Label>
                        <Input
                          type="number"
                          {...register(`ticket_categories.${idx}.capacity`, {
                            valueAsNumber: true,
                          })}
                          placeholder="30"
                          className="mt-1 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("schedule")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveTab("media")}
                  className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white"
                >
                  Next: Cover Photo <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* TAB 4: MEDIA & SUBMIT */}
          {activeTab === "media" && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-3">
                Experience Photo & Publishing
              </h2>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-1.5">
                    Cover Image URL or File Upload *
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <Input
                      {...register("poster_image_url")}
                      placeholder="https://images.unsplash.com/... or paste image URL"
                      className="flex-1"
                    />
                    <label className="cursor-pointer px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 shrink-0">
                      Upload from Device
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {errors.poster_image_url && (
                    <p className="text-xs text-rose-600 mt-1">{errors.poster_image_url.message}</p>
                  )}
                </div>

                {watchedPoster && (
                  <div className="h-56 w-full rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
                    <img
                      src={watchedPoster}
                      alt="Cover Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("pricing")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white px-8 font-bold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                    </>
                  ) : (
                    "Publish Dining Experience"
                  )}
                </Button>
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}

