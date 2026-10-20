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
import { submitTheatreEnquiry } from '@/api/theatre.api';
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
import { LoadingPage } from './LoadingPage';
import { partnerTypeMeta } from '@/lib/partnerTypeMeta';

const partnerSchema = z.object({
  business_name: z
    .string()
    .min(2, 'Business name must be at least 2 characters'),
  partner_type: z.enum(['restaurant', 'event_organiser'], {
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



export default function BecomePartnerPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
   const [checking, setChecking] = useState(true); 
  const [existingPartner, setExistingPartner] = useState<Partner | null>(null);
  const [partnerMode, setPartnerMode] = useState<'events_dining' | 'theatre'>('events_dining');
  const [submittingTheatre, setSubmittingTheatre] = useState(false);
  const [theatreSubmitted, setTheatreSubmitted] = useState(false);
  const [theatreData, setTheatreData] = useState({
    theatre_name: '',
    contact_name: '',
    email: '',
    phone: '',
    city: '',
    screen_count: 1,
    message: '',
  });

  const handleTheatreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theatreData.theatre_name || !theatreData.contact_name || !theatreData.email || !theatreData.phone || !theatreData.city) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmittingTheatre(true);
    try {
      await submitTheatreEnquiry({
        theatre_name: theatreData.theatre_name,
        contact_name: theatreData.contact_name,
        email: theatreData.email,
        phone: theatreData.phone,
        city: theatreData.city,
        screen_count: Number(theatreData.screen_count) || 1,
        message: theatreData.message || undefined,
      });
      setTheatreSubmitted(true);
      toast.success('Enquiry submitted successfully!', {
        description: 'Our theatre partnerships team will contact you shortly.',
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit enquiry');
    } finally {
      setSubmittingTheatre(false);
    }
  };

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
  return <LoadingPage />;  
}

  if (existingPartner?.status === 'PENDING_APPROVAL') {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="mx-auto max-w-2xl px-4 pt-32 pb-20 text-center">
          <Clock className="mx-auto h-16 w-16 text-[#7B1E3D] mb-4" />
          <h1 className="text-3xl font-serif font-bold">Application Under Review</h1>
          <p className="text-slate-500 mt-2">You have already submitted an application for <strong>{existingPartner.business_name}</strong>.</p>
          <Button asChild className="mt-6 bg-[#7B1E3D]">
            <Link to="/partner/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#5C0F2A] via-[#7B1E3D] to-[#3A0718]">
        <div className="absolute inset-0 " />
        <div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-[#7B1E3D]/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-wine-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl pt-32 px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-4  flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
            <Sparkles className="h-8 w-8 text-slate-900" />
          </div>
          <h1 className="font-serif text-4xl font-semibold text-white-900 sm:text-5xl">
            Become a Partner
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-white-100/70">
            Join Vyhbz App and reach thousands of guests. List your business,
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
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-[#5C0F2A]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setPartnerMode('events_dining')}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                partnerMode === 'events_dining'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="w-4 h-4 text-[#7B1E3D]" />
              Dining & Event Organiser
            </button>
            <button
              type="button"
              onClick={() => setPartnerMode('theatre')}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                partnerMode === 'theatre'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Film className="w-4 h-4 text-[#7B1E3D]" />
              Cinema & Multiplex Operator
            </button>
          </div>

          {partnerMode === 'theatre' ? (
            <div>
              <div className="mb-6">
                <h2 className="font-serif text-2xl font-semibold text-slate-900">
                  Cinema Partner Enquiry
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Are you a theatre chain or independent cinema owner? Send us an enquiry to integrate ticketing, box office, or direct settlement.
                </p>
              </div>

              {theatreSubmitted ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-emerald-950">Enquiry Received!</h3>
                  <p className="text-sm text-emerald-800 mt-1">
                    Thank you, <strong>{theatreData.contact_name}</strong>. Our theatre onboarding team will review your enquiry for <strong>{theatreData.theatre_name}</strong> and reach out to you within 24 hours.
                  </p>
                  <Button
                    onClick={() => {
                      setTheatreSubmitted(false);
                      setTheatreData({
                        theatre_name: '',
                        contact_name: '',
                        email: '',
                        phone: '',
                        city: '',
                        screen_count: 1,
                        message: '',
                      });
                    }}
                    variant="outline"
                    className="mt-4 text-xs font-semibold"
                  >
                    Send Another Enquiry
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleTheatreSubmit} className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Cinema / Multiplex Name *</Label>
                    <Input
                      placeholder="e.g. Cinepolis Grand or Raj Cinema"
                      value={theatreData.theatre_name}
                      onChange={(e) => setTheatreData({ ...theatreData, theatre_name: e.target.value })}
                      className="mt-1 h-10"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Contact Person Name *</Label>
                      <Input
                        placeholder="e.g. Rajesh Kumar"
                        value={theatreData.contact_name}
                        onChange={(e) => setTheatreData({ ...theatreData, contact_name: e.target.value })}
                        className="mt-1 h-10"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">City / Location *</Label>
                      <Input
                        placeholder="e.g. Kochi, Chennai, Bengaluru"
                        value={theatreData.city}
                        onChange={(e) => setTheatreData({ ...theatreData, city: e.target.value })}
                        className="mt-1 h-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Official Email *</Label>
                      <Input
                        type="email"
                        placeholder="manager@theatre.com"
                        value={theatreData.email}
                        onChange={(e) => setTheatreData({ ...theatreData, email: e.target.value })}
                        className="mt-1 h-10"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Phone Number *</Label>
                      <Input
                        placeholder="+91 98765 43210"
                        value={theatreData.phone}
                        onChange={(e) => setTheatreData({ ...theatreData, phone: e.target.value })}
                        className="mt-1 h-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Number of Screens</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={theatreData.screen_count}
                      onChange={(e) => setTheatreData({ ...theatreData, screen_count: parseInt(e.target.value) || 1 })}
                      className="mt-1 h-10"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Ticketing System / Integration Details</Label>
                    <textarea
                      placeholder="e.g., We use Vista ticketing software / Looking for direct gateway settlement / 4 screens in Lulu Mall."
                      value={theatreData.message}
                      onChange={(e) => setTheatreData({ ...theatreData, message: e.target.value })}
                      className="mt-1 w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#7B1E3D]"
                      rows={3}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submittingTheatre}
                    className="w-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-semibold py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    {submittingTheatre ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting Enquiry...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Submit Cinema Partnership Enquiry
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <div>
              <h2 className="font-serif text-2xl font-semibold text-slate-900">
                Partner Application
              </h2>
              <p className="mt-1 text-sm text-slate-500">
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
                      {(Object.keys(partnerTypeMeta) as (keyof typeof partnerTypeMeta)[]).map(
  (key) => {
    const meta = partnerTypeMeta[key];
    if (!meta) return null;
    const Icon = meta.icon;
    return (
      <SelectItem key={key} value={key}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#7B1E3D]" />
          <span>{meta.label}</span>
          <span className="text-xs text-slate-500">
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
                <p className="text-xs text-rose-600">
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
                <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="business_name"
                  placeholder="e.g. The Grand Bistro"
                  className="h-11 rounded-xl pl-10"
                  {...register('business_name')}
                />
              </div>
              {errors.business_name && (
                <p className="text-xs text-rose-600">
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
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="contact_name"
                  placeholder="John Doe"
                  className="h-11 rounded-xl pl-10"
                  {...register('contact_name')}
                />
              </div>
              {errors.contact_name && (
                <p className="text-xs text-rose-600">
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
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="contact_phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    className="h-11 rounded-xl pl-10"
                    {...register('contact_phone')}
                  />
                </div>
                {errors.contact_phone && (
                  <p className="text-xs text-rose-600">
                    {errors.contact_phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium">
                  City *
                </Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="city"
                    placeholder="Mumbai"
                    className="h-11 rounded-xl pl-10"
                    {...register('city')}
                  />
                </div>
                {errors.city && (
                  <p className="text-xs text-rose-600">
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
                  <span className="text-slate-500">(optional)</span>
                </Label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
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
                  <span className="text-slate-500">(optional)</span>
                </Label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
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
              className="h-11 w-full rounded-xl bg-[#7B1E3D] text-sm font-semibold shadow-sm transition-all hover:bg-[#5C0F2A] hover:shadow-md"
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
      )}
    </div>
  </div>
</div>
);
}
