import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader } from "@/components/common/Loader";
import { useAuth } from "@/hooks/useAuth";
import {
  getExtendedProfile,
  updateProfile,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from "@/api/profile.api";
import type { ExtendedProfile, Address, Gender } from "@/types/profile.types";

import {
  ArrowLeft,
  User,
  Mail,
  MapPin,
  Plus,
  Trash2,
  Edit3,
  Check,
  Loader2,
  Star,
  Save,
  Home,
  Building2,
  CheckCircle2,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingPage } from "./LoadingPage";

const profileSchema = z.object({
  bio: z
    .string()
    .max(500, "Bio must be under 500 characters")
    .optional()
    .or(z.literal("")),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]).optional(),
  date_of_birth: z.string().optional(),
  preferred_language: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const addressSchema = z.object({
  label: z.string().min(1, "Label is required"),
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional().or(z.literal("")),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(1, "Pincode is required"),
  is_default: z.boolean().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

export default function EditProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const {
    register: registerProfile,
    control: profileControl,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    watch: watchProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const {
    register: registerAddress,
    control: addressControl,
    handleSubmit: handleAddressSubmit,
    reset: resetAddress,
    watch: watchAddress,
    formState: { errors: addressErrors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
  });
  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    toast.info("Detecting location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          );
          const data = await response.json();
          const addr = data.address;

          // 3. Use resetAddress to fill the form fields
          resetAddress({
            ...watchAddress(), // Keep existing data (like the Label)
            line1: addr.road || addr.suburb || addr.neighbourhood || "",
            city: addr.city || addr.town || addr.village || "",
            state: addr.state || "", // Match your schema field name
            pincode: addr.postcode || "",
            // latitude and longitude are optional in your schema
          });

          toast.success("Location detected!");
        } catch (error) {
          toast.error("Failed to resolve address details");
        }
      },
      (error) => {
        toast.error("Location access denied");
      },
    );
  };
  const bioValue = watchProfile("bio") || "";
  const bioCount = bioValue.length;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, addressData] = await Promise.allSettled([
        getExtendedProfile(),
        getAddresses(),
      ]);

      if (profileData.status === "fulfilled") {
        setProfile(profileData.value);
        resetProfile({
          bio: profileData.value.bio || "",
          gender: profileData.value.gender || undefined,
          date_of_birth: profileData.value.date_of_birth || "",
          preferred_language: profileData.value.preferred_language || "en",
        });
      }

      if (addressData.status === "fulfilled") {
        setAddresses(addressData.value);
      }
    } catch {
      setError("Failed to load profile data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [resetProfile]);

  useEffect(() => {
    if (!authLoading) fetchAll();
  }, [authLoading, fetchAll]);

  // --- Profile save ---

  const onProfileSubmit = async (data: ProfileFormData) => {
    setSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const updated = await updateProfile({
        bio: data.bio || undefined,
        gender: data.gender,
        date_of_birth: data.date_of_birth || undefined,
        preferred_language: data.preferred_language,
      });
      setProfile(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // --- Address handlers ---

  const openAddAddress = () => {
    setEditingAddress(null);
    resetAddress({
      label: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
      is_default: false,
    });
    setAddressError(null);
    setAddressDialogOpen(true);
  };

  const openEditAddress = (addr: Address) => {
    setEditingAddress(addr);
    resetAddress({
      label: addr.label,
      line1: addr.line1,
      line2: addr.line2 || "",
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      is_default: addr.is_default,
    });
    setAddressError(null);
    setAddressDialogOpen(true);
  };

  const onAddressSubmit = async (data: AddressFormData) => {
    setAddressSaving(true);
    setAddressError(null);
    try {
      if (editingAddress) {
        const updated = await updateAddress(editingAddress.id, {
          label: data.label,
          line1: data.line1,
          line2: data.line2 || undefined,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          is_default: data.is_default,
        });
        setAddresses((prev) =>
          prev.map((a) => {
            if (a.id === updated.id) return updated;
            if (data.is_default) return { ...a, is_default: false };
            return a;
          }),
        );
      } else {
        const created = await createAddress({
          label: data.label,
          line1: data.line1,
          line2: data.line2 || undefined,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          is_default: data.is_default,
        });
        setAddresses((prev) => {
          if (data.is_default) {
            return prev
              .map((a) => ({ ...a, is_default: false }))
              .concat(created);
          }
          return [...prev, created];
        });
      }
      setAddressDialogOpen(false);
    } catch {
      setAddressError("Failed to save address. Please try again.");
    } finally {
      setAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError("Failed to delete address.");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const updated = await updateAddress(id, { is_default: true });
      setAddresses((prev) =>
        prev.map((a) => {
          if (a.id === updated.id) return updated;
          return { ...a, is_default: false };
        }),
      );
    } catch {
      setError("Failed to set default address.");
    }
  };

  // --- Render ---

  if (authLoading || loading) {
    return <LoadingPage showFooter={false} />;
  }

  const initials = (user?.full_name || user?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      {/* Banner */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[#5C0F2A] via-[#7B1E3D] to-[#3A0718] lg:h-56">
        <div className="absolute inset-0 " />
        <div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-[#7B1E3D]/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-wine-400/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <div className="-mt-16 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <Avatar className="h-24 w-24 border-4 border-background shadow-md">
              <AvatarFallback className="bg-[#7B1E3D] font-serif text-2xl font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="pb-2">
             
              <h1 className="font-serif text-3xl font-semibold text-slate-900">
                 <Link to="/profile/edit">
                <Settings className="mr-2 h-4 w-4" />
              </Link>
                Edit Profile
              </h1>
              <p className="text-sm text-slate-500">
                Manage your personal info and saved addresses
              </p>
            </div>
          </div>
          <Link
            to="/profile"
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#7B1E3D] transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to profile
          </Link>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mt-6 animate-slide-down rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="personal" className="mt-8">
          <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl bg-slate-50 p-1">
            <TabsTrigger
              value="personal"
              className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-soft"
            >
              <User className="mr-2 h-4 w-4" />
              Personal Info
            </TabsTrigger>
            <TabsTrigger
              value="addresses"
              className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-soft"
            >
              <MapPin className="mr-2 h-4 w-4" />
              Saved Addresses
            </TabsTrigger>
          </TabsList>

          {/* --- Personal Info Tab --- */}
          <TabsContent value="personal" className="mt-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
              {/* Identity header (read-only) */}
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7B1E3D]/5 ring-1 ring-wine-100">
                    <User className="h-7 w-7 text-[#7B1E3D]" />
                  </div>
                  <div>
                    <p className="font-serif text-xl font-semibold text-slate-900">
                      {user?.full_name || "Member"}
                    </p>
                    <p className="flex items-center gap-1 text-sm text-slate-500">
                      <Mail className="h-3.5 w-3.5" />
                      {user?.email}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="w-fit border-[#7B1E3D]/30 bg-[#7B1E3D]/5 text-[#7B1E3D]"
                >
                  {user?.role || "USER"}
                </Badge>
              </div>

              {/* Editable form */}
              <form
                onSubmit={handleProfileSubmit(onProfileSubmit)}
                className="mt-6 space-y-6"
              >
                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm font-medium">
                    Bio
                  </Label>
                  <Textarea
                    id="bio"
                    {...registerProfile("bio")}
                    placeholder="Tell us a little about yourself..."
                    className="min-h-[100px] rounded-xl"
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between">
                    {profileErrors.bio ? (
                      <p className="text-xs text-rose-600">
                        {profileErrors.bio.message}
                      </p>
                    ) : (
                      <span />
                    )}
                    <p className="text-xs text-slate-500">
                      {bioCount}/500
                    </p>
                  </div>
                </div>

                {/* Gender + DOB */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Gender</Label>
                    <Controller
                      control={profileControl}
                      name="gender"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                            <SelectItem value="Prefer not to say">
                              Prefer not to say
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="date_of_birth"
                      className="text-sm font-medium"
                    >
                      Date of Birth
                    </Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      {...registerProfile("date_of_birth")}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Preferred Language
                  </Label>
                  <Controller
                    control={profileControl}
                    name="preferred_language"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="hi">Hindi</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="ja">Japanese</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Save button */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="h-11 rounded-xl bg-[#7B1E3D] px-6 text-sm font-semibold shadow-sm transition-all hover:bg-[#5C0F2A] hover:shadow-md"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : saveSuccess ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save changes
                      </>
                    )}
                  </Button>
                  {saveSuccess && (
                    <span className="animate-fade-in text-sm text-emerald-600">
                      Your profile has been updated.
                    </span>
                  )}
                </div>
              </form>
            </div>
          </TabsContent>

          {/* --- Addresses Tab --- */}
          <TabsContent value="addresses" className="mt-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-slate-900">
                    Saved Addresses
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage your delivery and booking locations
                  </p>
                </div>
                <Button
                  onClick={openAddAddress}
                  className="rounded-full bg-[#7B1E3D] px-5 text-sm font-semibold shadow-sm transition-all hover:bg-[#5C0F2A] hover:shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  Add New
                </Button>
              </div>

              {/* Address list */}
              <div className="mt-6 space-y-4">
                {addresses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7B1E3D]/5">
                      <MapPin className="h-7 w-7 text-[#7B1E3D]" />
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-slate-900">
                      No saved addresses
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                      Add an address to speed up your booking process.
                    </p>
                  </div>
                ) : (
                  addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-all hover:border-[#7B1E3D]/30 hover:shadow-soft sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#7B1E3D]/5">
                          {addr.label.toLowerCase().includes("office") ? (
                            <Building2 className="h-5 w-5 text-[#7B1E3D]" />
                          ) : (
                            <Home className="h-5 w-5 text-[#7B1E3D]" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-serif text-lg font-semibold text-slate-900">
                              {addr.label}
                            </p>
                            {addr.is_default && (
                              <Badge className="rounded-full bg-[#7B1E3D] text-xs font-semibold text-white">
                                <Star className="mr-1 h-3 w-3 fill-white" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            {addr.line1}
                            {addr.line2 ? `, ${addr.line2}` : ""}
                          </p>
                          <p className="text-sm text-slate-600">
                            {addr.city}, {addr.state} — {addr.pincode}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                        {!addr.is_default && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(addr.id)}
                            className="rounded-full border-[#7B1E3D]/30 text-xs font-medium text-[#7B1E3D] hover:bg-[#7B1E3D]/5"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditAddress(addr)}
                          className="rounded-full border-slate-200 text-xs font-medium hover:bg-slate-50"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="rounded-full border-rose-200 text-xs font-medium text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="h-20" />

      {/* --- Address Dialog --- */}
      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200/60 shadow-soft-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-semibold text-slate-900">
              {editingAddress ? "Edit Address" : "Add New Address"}
            </DialogTitle>
            <DialogDescription>
              {editingAddress
                ? "Update the details for this address."
                : "Enter the details for your new address."}
            </DialogDescription>
          </DialogHeader>

          {addressError && (
            <div className="animate-slide-down rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
              {addressError}
            </div>
          )}

          <form
            onSubmit={handleAddressSubmit(onAddressSubmit)}
            className="space-y-4"
          >
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed border-wine-300 text-[#7B1E3D] hover:bg-[#7B1E3D]/5 hover:border-wine-500 transition-all"
              onClick={detectLocation}
            >
              <MapPin className="mr-2 h-4 w-4" />
              Auto-detect current location
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-50 px-2 text-slate-500 font-medium">
                  Or enter manually
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="addr-label" className="text-sm font-medium">
                Label
              </Label>
              <Input
                id="addr-label"
                placeholder="e.g. Home, Office"
                {...registerAddress("label")}
                className="h-11 rounded-xl"
              />
              {addressErrors.label && (
                <p className="text-xs text-rose-600">
                  {addressErrors.label.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="addr-line1" className="text-sm font-medium">
                Address Line 1
              </Label>
              <Input
                id="addr-line1"
                placeholder="House no, Building, Street"
                {...registerAddress("line1")}
                className="h-11 rounded-xl"
              />
              {addressErrors.line1 && (
                <p className="text-xs text-rose-600">
                  {addressErrors.line1.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="addr-line2" className="text-sm font-medium">
                Address Line 2{" "}
                <span className="text-slate-500">(optional)</span>
              </Label>
              <Input
                id="addr-line2"
                placeholder="Area, Landmark"
                {...registerAddress("line2")}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addr-city" className="text-sm font-medium">
                  City
                </Label>
                <Input
                  id="addr-city"
                  placeholder="City"
                  {...registerAddress("city")}
                  className="h-11 rounded-xl"
                />
                {addressErrors.city && (
                  <p className="text-xs text-rose-600">
                    {addressErrors.city.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="addr-state" className="text-sm font-medium">
                  State
                </Label>
                <Input
                  id="addr-state"
                  placeholder="State"
                  {...registerAddress("state")}
                  className="h-11 rounded-xl"
                />
                {addressErrors.state && (
                  <p className="text-xs text-rose-600">
                    {addressErrors.state.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addr-pincode" className="text-sm font-medium">
                Pincode
              </Label>
              <Input
                id="addr-pincode"
                placeholder="Postal code"
                {...registerAddress("pincode")}
                className="h-11 rounded-xl"
              />
              {addressErrors.pincode && (
                <p className="text-xs text-rose-600">
                  {addressErrors.pincode.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/30 p-3">
              <Controller
                control={addressControl}
                name="is_default"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    id="addr-default"
                    checked={field.value || false}
                    onChange={field.onChange}
                    className="h-4 w-4 rounded border-slate-200 accent-wine-700"
                  />
                )}
              />
              <Label
                htmlFor="addr-default"
                className="cursor-pointer text-sm font-medium"
              >
                Set as default address
              </Label>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddressDialogOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addressSaving}
                className="rounded-xl bg-[#7B1E3D] text-sm font-semibold shadow-sm hover:bg-[#5C0F2A]"
              >
                {addressSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingAddress ? (
                  "Save changes"
                ) : (
                  "Add address"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
