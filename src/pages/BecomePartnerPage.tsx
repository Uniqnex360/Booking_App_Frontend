import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getMyPartnerProfile, registerPartner } from '@/api/partner.api';
import type { Partner, PartnerType } from '@/types/partner.types';

import {
  ArrowLeft,
  Store,
  Film,
  CalendarDays,
  User,
  Phone,
  MapPin,
  FileText,
  Loader2,
  Check,
  Sparkles,
  Clock,
  AlertCircle,
} from 'lucide-react';

const partnerSchema = z.object({
  business_name: z
    .string()
    .min(2, 'Business name must be at least 2 characters'),
  partner_type: z.enum(['restaurant', 'cinema', 'event_organiser'], {
    errorMap: () => ({ message: 'Please select a partner type' }),
  }),
  contact_name: z
    .string()
    .min(2, 'Contact name must be at least 2 characters'),
  contact_phone: z
    .string()
    .min(10, 'Please enter a valid phone number')
    .max(15, 'Phone number is too long'),
  city: z.string().min(2, 'City is required'),
  gst_number: z.string().optional().or(z.literal('')),
  pan_number: z.string().optional().or(z.literal('')),
});

type PartnerFormData = z.infer<typeof partnerSchema>;

const partnerTypeMeta: Record<
  PartnerType,
  { label: string; icon: typeof Store; desc: string }
> = {
  restaurant: { label: 'Restaurant', icon: Store, desc: 'List your dining venue' },
  cinema: { label: 'Cinema', icon: Film, desc: 'Screen movies & shows' },
  event_organiser: {
    label: 'Event Organizer',
    icon: CalendarDays,
    desc: 'Host live events',
  },
};

export default function BecomePartnerPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
   const [checking, setChecking] = useState(true); 
  const [existingPartner, setExistingPartner] = useState<Partner | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
  });
  
  const onSubmit = async (data: PartnerFormData) => {
    setSubmitting(true);
    try {
      await registerPartner({
        business_name: data.business_name,
        partner_type: data.partner_type,
        contact_name: data.contact_name,
        contact_phone: data.contact_phone,
        city: data.city,
        gst_number: data.gst_number || undefined,
        pan_number: data.pan_number || undefined,
      });
      toast.success('Application submitted!', {
        description: 'We will review your request and get back to you soon.',
      });
      navigate('/partner/dashboard');
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || 'Failed to submit application';
    
    toast.error('Registration Error', {
      description: errorMessage,
    });

    console.error("Partner Registration Error:", error.response?.data);
  } finally {
    setSubmitting(false);
  }
  };
 

  useEffect(() => {
    async function checkStatus() {
      try {
        const partner = await getMyPartnerProfile();
        setExistingPartner(partner);
        
        if (partner.status === 'APPROVED') {
          navigate('/partner/dashboard', { replace: true });
        }
        
        // If they exist (Pending or Rejected), pre-fill the form with their old data
        reset({
          business_name: partner.business_name,
          partner_type: partner.partner_type,
          contact_name: partner.contact_name,
          contact_phone: partner.contact_phone,
          city: partner.city,
          gst_number: partner.gst_number || '',
          pan_number: partner.pan_number || '',
        });
      } catch (err: any) {
        // 404 means no application yet, which is fine!
      } finally {
        setChecking(false);
      }
    }
    checkStatus();
  }, [navigate, reset]);
   if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-wine-700" />
      </div>
    );
  }

  if (existingPartner?.status === 'PENDING_APPROVAL') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <Clock className="mx-auto h-16 w-16 text-amber-500 mb-4" />
          <h1 className="text-3xl font-serif font-bold">Application Under Review</h1>
          <p className="text-muted-foreground mt-2">You have already submitted an application for <strong>{existingPartner.business_name}</strong>.</p>
          <Button asChild className="mt-6 bg-wine-700">
            <Link to="/partner/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <div className="relative overflow-hidden wine-gradient">
        <div className="absolute inset-0 bg-wine-radial" />
        <div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-wine-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-wine-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-serif text-4xl font-semibold text-white sm:text-5xl">
            Become a Partner
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-wine-100/70">
            Join Vignette and reach thousands of guests. List your business,
            manage bookings, and grow with us.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
          {existingPartner?.status === 'REJECTED' && (
    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 flex gap-4 animate-in fade-in slide-in-from-top-4">
      <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
      <div>
        <h3 className="font-semibold text-red-900">Application Needs Revision</h3>
        <p className="text-sm text-red-700 mt-1">
          Reason: <span className="font-medium">{existingPartner.rejection_reason || "Please check your details and try again."}</span>
        </p>
      </div>
    </div>
  )}
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-wine-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-soft sm:p-8">
          <h2 className="font-serif text-2xl font-semibold text-wine-950">
            Partner Application
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill in your business details below. Fields marked with * are
            required.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
            {/* Partner Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Partner Type *
              </Label>
              <Controller
                control={control}
                name="partner_type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select your business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(partnerTypeMeta) as PartnerType[]).map(
                        (key) => {
                          const meta = partnerTypeMeta[key];
                          const Icon = meta.icon;
                          return (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-wine-600" />
                                <span>{meta.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  — {meta.desc}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        }
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.partner_type && (
                <p className="text-xs text-destructive">
                  {errors.partner_type.message}
                </p>
              )}
            </div>

            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="business_name" className="text-sm font-medium">
                Business Name *
              </Label>
              <div className="relative">
                <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="business_name"
                  placeholder="e.g. The Grand Bistro"
                  className="h-11 rounded-xl pl-10"
                  {...register('business_name')}
                />
              </div>
              {errors.business_name && (
                <p className="text-xs text-destructive">
                  {errors.business_name.message}
                </p>
              )}
            </div>

            {/* Contact Name */}
            <div className="space-y-2">
              <Label htmlFor="contact_name" className="text-sm font-medium">
                Contact Person *
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="contact_name"
                  placeholder="John Doe"
                  className="h-11 rounded-xl pl-10"
                  {...register('contact_name')}
                />
              </div>
              {errors.contact_name && (
                <p className="text-xs text-destructive">
                  {errors.contact_name.message}
                </p>
              )}
            </div>

            {/* Contact Phone + City */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_phone" className="text-sm font-medium">
                  Contact Phone *
                </Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="contact_phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    className="h-11 rounded-xl pl-10"
                    {...register('contact_phone')}
                  />
                </div>
                {errors.contact_phone && (
                  <p className="text-xs text-destructive">
                    {errors.contact_phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium">
                  City *
                </Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="city"
                    placeholder="Mumbai"
                    className="h-11 rounded-xl pl-10"
                    {...register('city')}
                  />
                </div>
                {errors.city && (
                  <p className="text-xs text-destructive">
                    {errors.city.message}
                  </p>
                )}
              </div>
            </div>

            {/* GST + PAN */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gst_number" className="text-sm font-medium">
                  GST Number{' '}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="gst_number"
                    placeholder="22AAAAA0000A1Z5"
                    className="h-11 rounded-xl pl-10"
                    {...register('gst_number')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pan_number" className="text-sm font-medium">
                  PAN Number{' '}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="pan_number"
                    placeholder="AAAAA0000A"
                    className="h-11 rounded-xl pl-10"
                    {...register('pan_number')}
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-xl bg-wine-700 text-sm font-semibold shadow-wine transition-all hover:bg-wine-800 hover:shadow-wine-lg"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Submit Application
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
