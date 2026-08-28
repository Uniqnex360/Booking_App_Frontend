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
import type { EventCategory } from "@/types/event.types";
import { LocationPicker } from "./LocationPicker";

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
  Store,
  Film,
  CalendarDays as CalendarIcon,
  Music,
  Mic,
  Trophy,
  Wrench,
  Drama,
  Palette,
  Sparkles,
  MapPin,
} from "lucide-react";

const categoryMeta: Record<
  EventCategory,
  { label: string; icon: typeof Music }
> = {
  concert: { label: "Concert", icon: CalendarIcon },
  comedy: { label: "Comedy", icon: Mic },
  sports: { label: "Sports", icon: Trophy },
  workshop: { label: "Workshop", icon: Wrench },
  theatre: { label: "Theatre", icon: Drama },
  exhibition: { label: "Exhibition", icon: Palette },
  other: { label: "Other", icon: Sparkles },
};

const ticketSchema = z
  .object({
    name: z.string().min(2, "Tier name is required"),
    price_paise: z.coerce
  .number({ invalid_type_error: "Price must be a number" })
  .positive("Price must be positive")
  .min(1, "Price must be at least ₹1"),
    capacity: z
      .number()
      .int("Capacity must be a whole number")
      .min(1, "Capacity is required"),
    max_per_booking: z
      .number()
      .int("Must be a whole number")
      .min(1, "Required"),
  })
  .refine((data) => data.max_per_booking <= data.capacity, {
    message: "Max per booking cannot exceed total capacity",
    path: ["max_per_booking"],
  })
  .refine((data) => data.max_per_booking < data.capacity, {
    message:
      "Max per booking must be less than capacity so other guests can book",
    path: ["max_per_booking"],
  });

const eventSchema = z
  .object({
    title: z.string().min(2, "Title must be at least 2 characters"),
    category: z.enum([
      "concert",
      "comedy",
      "sports",
      "workshop",
      "theatre",
      "exhibition",
      "other",
    ]),
    venue_name: z.string().min(2, "Venue name is required"),
    city: z.string().min(2, "City is required"),
    venue_address: z.string().min(5, "Full address is required"),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    starts_at: z.string().min(1, "Start date is required"),
    ends_at: z.string().min(1, "End date is required"),
    poster_image_url: z.string().url("Must be a valid URL"),
    description: z.string().optional(),
    ticket_categories: z
      .array(ticketSchema)
      .min(1, "Add at least one ticket tier"),
  })
  .refine((data) => new Date(data.starts_at) > new Date(), {
    message: "Start date must be in the future",
    path: ["starts_at"],
  })
  .refine((data) => new Date(data.ends_at) > new Date(data.starts_at), {
    message: "End date must be after start date",
    path: ["ends_at"],
  });

type EventFormData = z.infer<typeof eventSchema>;

const steps = [
  { id: 1, label: "Event Details", icon: CalendarDays },
  { id: 2, label: "Poster & Description", icon: ImageIcon },
  { id: 3, label: "Ticket Tiers", icon: Ticket },
];

export default function PartnerEventCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const {
  register,
  handleSubmit,
  control,
  trigger,
  watch,
  setValue,
  getValues,
  formState: { errors, touchedFields },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    mode: "onChange",
    defaultValues: {
  ticket_categories: [
       { name: "", price_paise: 0, capacity: 0, max_per_booking: 1 },

  ],
},
  });

  const {
    fields: ticketFields,
    append: appendTicket,
    remove: removeTicket,
  } = useFieldArray({
    control,
    name: "ticket_categories",
  });

 const nextStep = async () => {
  const fieldsByStep: Record<number, (keyof EventFormData)[]> = {
    1: ["title", "category", "venue_name", "city", "venue_address", "starts_at", "ends_at"],
    2: ["poster_image_url"],
    3: ["ticket_categories"],
  };
  
  const valid = await trigger(fieldsByStep[step], { shouldFocus: true });

  if (!valid && step === 3) {
    const tickets = getValues("ticket_categories");
    tickets.forEach((_, i) => {
      setValue(`ticket_categories.${i}.name`, tickets[i].name, { shouldTouch: true });
      setValue(`ticket_categories.${i}.price_paise`, tickets[i].price_paise, { shouldTouch: true });
      setValue(`ticket_categories.${i}.capacity`, tickets[i].capacity, { shouldTouch: true });
      setValue(`ticket_categories.${i}.max_per_booking`, tickets[i].max_per_booking, { shouldTouch: true });
    });
  }

  if (valid) setStep((s) => Math.min(s + 1, 3));
};

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const onSubmit = async (data: EventFormData) => {
    setSubmitting(true);
    try {
      await createEvent({
        title: data.title,
        category: data.category,
        venue_name: data.venue_name,
        city: data.city,
        starts_at: new Date(data.starts_at).toISOString(),
        ends_at: new Date(data.ends_at).toISOString(),
        poster_image_url: data.poster_image_url,
        description: data.description || undefined,
        ticket_categories: data.ticket_categories.map(t => ({
  ...t,
  price_paise: Math.round(t.price_paise * 100)
}))
      });
      toast.success("Event created successfully!", {
        description: "It is now pending admin approval.",
      });
      navigate("/partner/dashboard");
    } catch {
      toast.error("Failed to create event", {
        description: "Please check your details and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };
  const startsAt = watch("starts_at");
  const endsAt = watch("ends_at");

  useEffect(() => {
  if (startsAt || endsAt) {
    trigger(["starts_at", "ends_at"]);
  }
}, [startsAt, endsAt, trigger]);
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="bg-gradient-to-b from-wine-50 to-background pt-28 pb-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Link
            to="/partner/dashboard"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-wine-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <h1 className="font-serif text-4xl font-semibold text-wine-950">
            Create Event
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            List a new event for guests to discover and book.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-between">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-all ${
                      isActive
                        ? "border-wine-700 bg-wine-700 text-white"
                        : isDone
                          ? "border-wine-700 bg-wine-50 text-wine-700"
                          : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isActive ? "text-wine-700" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 rounded-full transition-all ${
                      step > s.id ? "bg-wine-700" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-soft sm:p-8">
            <AnimatePresence mode="wait">
              {/* Step 1: Event Details */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <h2 className="font-serif text-xl font-semibold text-wine-950">
                    Event Details
                  </h2>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Event Title *</Label>
                    <Input
                      placeholder="e.g. Sunset Jazz Festival"
                      className="h-11 rounded-xl"
                      {...register("title")}
                    />
                    {errors.title && (
                      <p className="text-xs text-destructive">
                        {errors.title.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Category *</Label>
                    <Controller
                      control={control}
                      name="category"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(categoryMeta).map(
                              ([value, meta]) => {
                                const Icon = meta.icon;
                                return (
                                  <SelectItem key={value} value={value}>
                                    <span className="flex items-center gap-2">
                                      <Icon className="h-4 w-4 text-wine-600" />
                                      {meta.label}
                                    </span>
                                  </SelectItem>
                                );
                              },
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.category && (
                      <p className="text-xs text-destructive">
                        {errors.category.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Venue Name *
                      </Label>
                      <Input
                        placeholder="e.g. The Grand Hall"
                        className="h-11 rounded-xl"
                        {...register("venue_name")}
                      />
                      {errors.venue_name && (
                        <p className="text-xs text-destructive">
                          {errors.venue_name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">City *</Label>
                      <Input
                        placeholder="e.g. Mumbai"
                        className="h-11 rounded-xl"
                        {...register("city")}
                      />
                      {errors.city && (
                        <p className="text-xs text-destructive">
                          {errors.city.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Venue Address *
                    </Label>
                    <Input
                      placeholder="e.g. 123 Church Street, Next to Metro Station"
                      className="h-11 rounded-xl"
                      {...register("venue_address")}
                    />
                    {errors.venue_address && (
                      <p className="text-xs text-destructive">
                        {errors.venue_address.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Exact Map Location
                    </Label>
                    <Controller
                      control={control}
                      name="latitude" // We use a controller to set lat/lng manually from the map
                      render={({ field: latField }) => (
                        <Controller
                          control={control}
                          name="longitude"
                          render={({ field: lngField }) => (
                            <LocationPicker
                              onLocationSelect={(lat, lng) => {
                                latField.onChange(lat);
                                lngField.onChange(lng);
                              }}
                            />
                          )}
                        />
                      )}
                    />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Start Date & Time *
                      </Label>
                      <Input
                        type="datetime-local"
                        className={`h-11 rounded-xl ${
  errors.ends_at ? "border-destructive focus-visible:ring-destructive" : ""
  }`}
                        min={new Date().toISOString().slice(0, 16)}
                        {...register("starts_at")}
                      />
                      {errors.starts_at && (
                        <p className="text-xs text-destructive">
                          {errors.starts_at.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        End Date & Time *
                      </Label>
                      <Input
                        type="datetime-local"
                        className={`h-11 rounded-xl ${
    errors.starts_at ? "border-destructive focus-visible:ring-destructive" : ""
  }`}
                        min={startsAt || new Date().toISOString().slice(0, 16)}
                        {...register("ends_at")}
                      />
                      {errors.ends_at && (
                        <p className="text-xs text-destructive">
                          {errors.ends_at.message}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <h2 className="font-serif text-xl font-semibold text-wine-950">
                    Poster & Description
                  </h2>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Poster Image URL *
                    </Label>
                    <Input
                      placeholder="https://example.com/poster.jpg"
                      className="h-11 rounded-xl"
                      {...register("poster_image_url")}
                    />
                    {errors.poster_image_url && (
                      <p className="text-xs text-destructive">
                        {errors.poster_image_url.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Description{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      placeholder="Tell guests what makes this event special..."
                      className="min-h-[120px] rounded-xl"
                      {...register("description")}
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 3: Ticket Tiers */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-xl font-semibold text-wine-950">
                      Ticket Tiers
                    </h2>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendTicket({
                          name: "",
                          price_paise: 0,
                          capacity: 0,
                          max_per_booking: 1,
                        })
                      }
                      className="rounded-xl"
                    >
                      <Plus className="h-4 w-4" />
                      Add Tier
                    </Button>
                  </div>

                  {errors.ticket_categories?.root?.message && (
                    <p className="text-xs text-destructive">
                      {errors.ticket_categories.root.message}
                    </p>
                  )}

                  <div className="space-y-4">
                    {ticketFields.map((field, i) => (
                      <div
                        key={field.id}
                        className="rounded-xl border border-border/50 bg-secondary/20 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-semibold text-wine-950">
                            Tier {i + 1}
                          </span>
                          {ticketFields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeTicket(i)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2 sm:col-span-2">
                            <Label className="text-xs font-medium">
                              Tier Name *
                            </Label>
                            <Input
                              placeholder="e.g. VIP, Early Bird"
                              className="h-10 rounded-xl"
                              {...register(
                                `ticket_categories.${i}.name` as const,
                              )}
                            />
{errors.ticket_categories?.[i]?.name && touchedFields.ticket_categories?.[i]?.name && (
                              <p className="text-xs text-destructive">
                                {errors.ticket_categories[i]?.name?.message}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">
                              Price (₹) *
                            </Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="85.00"
                              className="h-10 rounded-xl"
                              {...register(
                                `ticket_categories.${i}.price_paise` as const,
                                { valueAsNumber: true },
                              )}
                            />
{errors.ticket_categories?.[i]?.price_paise && touchedFields.ticket_categories?.[i]?.price_paise && (
                              <p className="text-xs text-destructive">
                                {
                                  errors.ticket_categories[i]?.price_paise
                                    ?.message
                                }
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">
                              Capacity *
                            </Label>
                            <Input
                              type="number"
                              placeholder="100"
                              className="h-10 rounded-xl"
                              {...register(
                                `ticket_categories.${i}.capacity` as const,
                                { valueAsNumber: true },
                              )}
                            />
{errors.ticket_categories?.[i]?.capacity && touchedFields.ticket_categories?.[i]?.capacity && (
                              <p className="text-xs text-destructive">
                                {errors.ticket_categories[i]?.capacity?.message}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">
                              Max Per Booking *
                            </Label>
                            <Input
                              type="number"
                              placeholder="4"
                              className="h-10 rounded-xl"
                              {...register(
                                `ticket_categories.${i}.max_per_booking` as const,
                                { valueAsNumber: true },
                              )}
                            />
{errors.ticket_categories?.[i]?.max_per_booking && touchedFields.ticket_categories?.[i]?.max_per_booking && (
                              <p className="text-xs text-destructive">
                                {
                                  errors.ticket_categories[i]?.max_per_booking
                                    ?.message
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between border-t border-border/50 pt-6">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="rounded-xl"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="rounded-xl bg-wine-700 text-sm font-semibold text-white shadow-wine hover:bg-wine-800"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-wine-700 text-sm font-semibold text-white shadow-wine hover:bg-wine-800"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Create Event
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
