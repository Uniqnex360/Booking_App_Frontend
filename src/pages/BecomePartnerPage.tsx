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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { getMyPartnerProfile, registerPartner, uploadPartnerDocument } from '@/api/partner.api';
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
  FileUp,
  FileCheck,
  Eye,
  Trash2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { LoadingPage } from './LoadingPage';
import { partnerTypeMeta } from '@/lib/partnerTypeMeta';

const partnerSchema = z.object({
  business_name: z
    .string()
    .min(2, 'Business name must be at least 2 characters'),
  partner_type: z
    .enum(['experience_partner', 'restaurant', 'event_organiser', 'cinema'])
    .default('experience_partner'),
  contact_name: z
    .string()
    .min(2, 'Contact name must be at least 2 characters'),
  contact_phone: z
    .string()
    .min(10, 'Please enter a valid phone number')
    .max(15, 'Phone number is too long'),
  city: z.string().min(2, 'City is required'),
  gst_number: z.string().optional().or(z.literal('')),
  pan_number: z
    .string()
    .min(1, 'PAN Number is required')
    .transform((val) => val.trim().toUpperCase())
    .refine((val) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val), {
      message: 'Valid 10-character PAN is required (e.g. ABCDE1234F)',
    }),
  gst_certificate_url: z.string().optional().or(z.literal('')),
  pan_card_url: z.string().optional().or(z.literal('')),
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

  // Document states & preview
  const [gstDoc, setGstDoc] = useState<{ name: string; url: string; isPdf: boolean } | null>(null);
  const [panDoc, setPanDoc] = useState<{ name: string; url: string; isPdf: boolean } | null>(null);
  const [uploadingGst, setUploadingGst] = useState(false);
  const [uploadingPan, setUploadingPan] = useState(false);
  const [previewModalDoc, setPreviewModalDoc] = useState<{ title: string; url: string; isPdf: boolean } | null>(null);

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
    setValue,
    reset,
    formState: { errors },
  } = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      partner_type: 'experience_partner',
      gst_certificate_url: '',
      pan_card_url: '',
    },
  });

  const handleDocumentUpload = async (file: File, type: 'gst' | 'pan') => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large', { description: 'Maximum file size allowed is 10MB.' });
      return;
    }
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);
    if (!isPdf && !isImage) {
      toast.error('Unsupported file format', { description: 'Please upload a PDF or an Image (PNG, JPG, WEBP).' });
      return;
    }

    if (type === 'gst') {
      setUploadingGst(true);
    } else {
      setUploadingPan(true);
    }

    try {
      const docTypeSlug = type === 'gst' ? 'gst_certificate' : 'pan_card';
      let resolvedUrl = '';

      try {
        const uploadRes = await uploadPartnerDocument(file, docTypeSlug);
        if (uploadRes && uploadRes.url) {
          resolvedUrl = uploadRes.url;
        }
      } catch (err) {
        console.warn('Backend document upload fallback to base64 data URL:', err);
        const reader = new FileReader();
        resolvedUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      if (type === 'gst') {
        setValue('gst_certificate_url', resolvedUrl, { shouldValidate: true });
        setGstDoc({ name: file.name, url: resolvedUrl, isPdf });
        toast.success('GST Certificate attached successfully');
      } else {
        setValue('pan_card_url', resolvedUrl, { shouldValidate: true });
        setPanDoc({ name: file.name, url: resolvedUrl, isPdf });
        toast.success('PAN Card attached successfully');
      }
    } catch (err: any) {
      toast.error('Failed to attach document', { description: err.message || 'Please try again.' });
    } finally {
      if (type === 'gst') {
        setUploadingGst(false);
      } else {
        setUploadingPan(false);
      }
    }
  };

  const handleRemoveDoc = (type: 'gst' | 'pan') => {
    if (type === 'gst') {
      setValue('gst_certificate_url', '', { shouldValidate: true });
      setGstDoc(null);
    } else {
      setValue('pan_card_url', '', { shouldValidate: true });
      setPanDoc(null);
    }
  };
  
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
        pan_number: data.pan_number.toUpperCase().trim(),
        gst_certificate_url: data.gst_certificate_url || undefined,
        pan_card_url: data.pan_card_url || undefined,
      });
      toast.success('Application submitted!', {
        description: 'We will review your documents and get back to you soon.',
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
          gst_certificate_url: partner.gst_certificate_url || '',
          pan_card_url: partner.pan_card_url || '',
        });

        if (partner.gst_certificate_url) {
          const isPdf = partner.gst_certificate_url.toLowerCase().includes('.pdf');
          setGstDoc({ name: 'GST Certificate (Uploaded)', url: partner.gst_certificate_url, isPdf });
        }
        if (partner.pan_card_url) {
          const isPdf = partner.pan_card_url.toLowerCase().includes('.pdf');
          setPanDoc({ name: 'PAN Card (Uploaded)', url: partner.pan_card_url, isPdf });
        }
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
              <Sparkles className="w-4 h-4 text-[#7B1E3D]" />
              Experience & Dining Partner
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
            {/* Partner Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Partner Category</Label>
              <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-[#7B1E3D]/10 text-[#7B1E3D] flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Experience & Dining Partner</p>
                  <p className="text-xs text-slate-500">
                    Host live events, festivals, Sunday brunches, buffets, and dining passes
                  </p>
                </div>
              </div>
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
                <Label htmlFor="pan_number" className="text-sm font-medium flex items-center gap-1">
                  <span>Permanent Account Number (PAN)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </Label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="pan_number"
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    className="h-11 rounded-xl pl-10 uppercase font-mono"
                    {...register('pan_number')}
                  />
                </div>
                {errors.pan_number && (
                  <p className="text-xs text-rose-500 font-medium mt-1">
                    {errors.pan_number.message}
                  </p>
                )}
              </div>
            </div>

            {/* Business & Tax Verification Documents (GST & PAN) */}
            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-[#7B1E3D]" />
                  KYC Verification Documents
                </h4>
                <p className="mt-0.5 text-xs text-slate-500">
                  Upload your business GST Registration Certificate and PAN Card for account verification. (Max 10MB; PDF, JPG, PNG, WEBP)
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* GST Certificate Upload Box */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>GST Registration Certificate</span>
                    {gstDoc && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Attached
                      </span>
                    )}
                  </Label>

                  {gstDoc ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 flex flex-col justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs uppercase overflow-hidden">
                          {gstDoc.isPdf ? (
                            'PDF'
                          ) : (
                            <img
                              src={gstDoc.url}
                              alt="GST Preview"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-800">
                            {gstDoc.name}
                          </p>
                          <p className="text-[11px] text-emerald-700">
                            Ready for verification
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-emerald-100">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setPreviewModalDoc({
                              title: 'GST Registration Certificate',
                              url: gstDoc.url,
                              isPdf: gstDoc.isPdf,
                            })
                          }
                          className="h-7 px-2 text-xs text-slate-700 hover:text-slate-900"
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDoc('gst')}
                          className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        id="gst_file_input"
                        accept=".pdf,image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleDocumentUpload(file, 'gst');
                          e.target.value = '';
                        }}
                        disabled={uploadingGst}
                      />
                      <label
                        htmlFor="gst_file_input"
                        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 text-center cursor-pointer transition-colors hover:border-[#7B1E3D] hover:bg-[#7B1E3D]/5"
                      >
                        {uploadingGst ? (
                          <div className="flex flex-col items-center gap-1.5 py-2">
                            <Loader2 className="h-6 w-6 animate-spin text-[#7B1E3D]" />
                            <span className="text-xs font-medium text-slate-600">Uploading & verifying GST doc...</span>
                          </div>
                        ) : (
                          <>
                            <FileUp className="h-6 w-6 text-slate-400 mb-1" />
                            <span className="text-xs font-semibold text-slate-800">
                              Upload GST Certificate
                            </span>
                            <span className="text-[11px] text-slate-500 mt-0.5">
                              Click or drop PDF / Image
                            </span>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>

                {/* PAN Card Upload Box */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>PAN Card</span>
                    {panDoc && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Attached
                      </span>
                    )}
                  </Label>

                  {panDoc ? (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 flex flex-col justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs uppercase overflow-hidden">
                          {panDoc.isPdf ? (
                            'PDF'
                          ) : (
                            <img
                              src={panDoc.url}
                              alt="PAN Preview"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-800">
                            {panDoc.name}
                          </p>
                          <p className="text-[11px] text-indigo-700">
                            Ready for verification
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-indigo-100">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setPreviewModalDoc({
                              title: 'PAN Card Document',
                              url: panDoc.url,
                              isPdf: panDoc.isPdf,
                            })
                          }
                          className="h-7 px-2 text-xs text-slate-700 hover:text-slate-900"
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDoc('pan')}
                          className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        id="pan_file_input"
                        accept=".pdf,image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleDocumentUpload(file, 'pan');
                          e.target.value = '';
                        }}
                        disabled={uploadingPan}
                      />
                      <label
                        htmlFor="pan_file_input"
                        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 text-center cursor-pointer transition-colors hover:border-[#7B1E3D] hover:bg-[#7B1E3D]/5"
                      >
                        {uploadingPan ? (
                          <div className="flex flex-col items-center gap-1.5 py-2">
                            <Loader2 className="h-6 w-6 animate-spin text-[#7B1E3D]" />
                            <span className="text-xs font-medium text-slate-600">Uploading & verifying PAN doc...</span>
                          </div>
                        ) : (
                          <>
                            <FileUp className="h-6 w-6 text-slate-400 mb-1" />
                            <span className="text-xs font-semibold text-slate-800">
                              Upload PAN Card
                            </span>
                            <span className="text-[11px] text-slate-500 mt-0.5">
                              Click or drop PDF / Image
                            </span>
                          </>
                        )}
                      </label>
                    </div>
                  )}
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

  {/* Lightbox / Preview Modal for applicant */}
  <Dialog
    open={!!previewModalDoc}
    onOpenChange={(open) => !open && setPreviewModalDoc(null)}
  >
    <DialogContent className="max-w-2xl rounded-2xl p-6">
      <DialogHeader>
        <DialogTitle className="font-serif text-lg font-semibold text-slate-900">
          {previewModalDoc?.title}
        </DialogTitle>
        <DialogDescription className="text-xs text-slate-500">
          Verification document preview
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 flex max-h-[70vh] items-center justify-center overflow-auto rounded-xl bg-slate-100 p-2">
        {previewModalDoc?.isPdf ? (
          <iframe
            src={previewModalDoc.url}
            title={previewModalDoc.title}
            className="h-[500px] w-full rounded-lg border border-slate-200"
          />
        ) : (
          <img
            src={previewModalDoc?.url}
            alt={previewModalDoc?.title}
            className="max-h-[500px] w-auto rounded-lg object-contain shadow-sm"
          />
        )}
      </div>
    </DialogContent>
  </Dialog>
</div>
);
}
