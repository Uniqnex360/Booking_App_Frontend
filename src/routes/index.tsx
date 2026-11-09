import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  PrivateRoute,
  ADMIN_ROLES,
  THEATRE_ROLES,
  PARTNER_ROLES,
} from "@/components/PrivateRoute";
import { PageLoader } from "@/pages/PageLoader";

// Core eager customer routes (instant first load)
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import MoviesPage from "@/pages/MoviesPage";

// Resilient lazy helper with auto-recovery for stale deployment chunks
function lazyRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error: any) {
      console.warn("Failed to load route chunk. Retrying via reload...", error);
      if (typeof window !== "undefined") {
        const key = "chunk_reload_" + window.location.pathname;
        const lastReload = sessionStorage.getItem(key);
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem(key, String(now));
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw error;
    }
  });
}

// On-demand lazy routes (loaded only when visited)
const MovieDetailPage = lazyRetry(() => import("@/pages/MovieDetailPage"));
const SeatMapPage = lazyRetry(() => import("@/pages/SeatMapPage"));
const BuyTicketsPage = lazyRetry(() => import("@/pages/BuyTicketsPage"));
const BookingPage = lazyRetry(() => import("@/pages/BookingPage"));
const BookingDetailPage = lazyRetry(() => import("@/pages/BookingDetailPage"));
const ConfirmationPage = lazyRetry(() => import("@/pages/ConfirmationPage"));
const EventsPage = lazyRetry(() => import("@/pages/EventsPage"));
const DiningListingPage = lazyRetry(() => import("@/pages/DiningListingPage"));
const FoodPage = lazyRetry(() => import("@/pages/FoodPage"));
const VenuesPage = lazyRetry(() => import("@/pages/VenuesPage"));
const ProfilePage = lazyRetry(() => import("@/pages/ProfilePage"));
const EditProfilePage = lazyRetry(() => import("@/pages/EditProfilePage"));
const VerifyOtpPage = lazyRetry(() => import("@/pages/VerifyOtpPage"));
const ForgotPasswordPage = lazyRetry(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazyRetry(() => import("@/pages/ResetPasswordPage"));
const MovieReviewsPage = lazyRetry(() => import("@/pages/MovieReviewsPage"));
const SupportPage = lazyRetry(() => import("@/pages/SupportPage"));
const TermsAndConditionsPage = lazyRetry(() => import("@/components/TermsAndConditionsPage"));
const PrivacyPolicyPage = lazyRetry(() => import("@/pages/PrivacyPolicyPage"));
const DeleteAccountPage = lazyRetry(() => import("@/pages/DeleteAccountPage"));
const BecomePartnerPage = lazyRetry(() => import("@/pages/BecomePartnerPage"));

// Fashion, Retail Showrooms & Coupons Module (Lazy)
const FashionLandingPage = lazyRetry(() => import("@/pages/FashionLandingPage"));
const FashionOfferDetailPage = lazyRetry(() => import("@/pages/FashionOfferDetailPage"));
const FashionBrandDetailPage = lazyRetry(() => import("@/pages/FashionBrandDetailPage"));
const MyCouponsPage = lazyRetry(() => import("@/pages/MyCouponsPage"));
const RetailStaffScannerPage = lazyRetry(() => import("@/pages/retail/RetailStaffScannerPage"));
const RetailPartnerDashboard = lazyRetry(() => import("@/pages/retail/RetailPartnerDashboard"));

// Backoffice: Admin Portal (Lazy)
const AdminDashboardPage = lazyRetry(() => import("@/pages/AdminDashboardPage"));
const AdminEventDetailPage = lazyRetry(() => import("@/pages/admin/AdminEventDetailPage"));
const AdminPartnersPage = lazyRetry(() => import("@/pages/AdminPartnersPage"));
const AdminModerationPage = lazyRetry(() => import("@/pages/AdminModerationPage"));

// Backoffice: Partner Portal (Lazy)
const PartnerDashboard = lazyRetry(() => import("@/pages/PartnerDashboard"));
const PartnerEventCreatePage = lazyRetry(() => import("@/pages/PartnerEventCreatePage"));
const PartnerDiningCreatePage = lazyRetry(() => import("@/pages/PartnerDiningCreatePage"));
const PartnerCouponsPage = lazyRetry(() => import("@/pages/PartnerCouponsPage"));

// Backoffice: Theatre Scoped Portal (Lazy)
import { TheatreLayout } from "@/pages/theatre/TheatreLayout";
const TheatreDashboardPage = lazyRetry(() => import("@/pages/theatre/TheatreDashboardPage"));
const TheatreVenuesPage = lazyRetry(() => import("@/pages/theatre/TheatreVenuesPage"));
const TheatreShowtimesPage = lazyRetry(() => import("@/pages/theatre/TheatreShowtimesPage"));
const TheatreBookingsPage = lazyRetry(() => import("@/pages/theatre/TheatreBookingsPage"));
const TheatreInvoicesPage = lazyRetry(() => import("@/pages/theatre/TheatreInvoicesPage"));
const TheatreExceptionsPage = lazyRetry(() => import("@/pages/theatre/TheatreExceptionsPage"));
const TheatreTicketValidatorPage = lazyRetry(() => import("@/pages/theatre/TheatreTicketValidatorPage"));

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/admin"
        element={
          <PrivateRoute allowedRoles={ADMIN_ROLES}>
            <AdminDashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <PrivateRoute allowedRoles={ADMIN_ROLES}>
            <AdminDashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/movies"
        element={
          <PrivateRoute allowedRoles={ADMIN_ROLES}>
            <AdminDashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/events"
        element={
          <PrivateRoute allowedRoles={ADMIN_ROLES}>
            <AdminDashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/events/:eventId"
        element={
          <PrivateRoute allowedRoles={ADMIN_ROLES}>
            <AdminEventDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <PrivateRoute allowedRoles={ADMIN_ROLES}>
            <AdminDashboardPage />
          </PrivateRoute>
        }
      />

      {/* Theatre Partner Scoped Portal */}
      <Route
        path="/theatre"
        element={
          <PrivateRoute allowedRoles={THEATRE_ROLES}>
            <TheatreLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/theatre/dashboard" replace />} />
        <Route path="dashboard" element={<TheatreDashboardPage />} />
        <Route path="venues" element={<TheatreVenuesPage />} />
        <Route path="showtimes" element={<TheatreShowtimesPage />} />
        <Route path="bookings" element={<TheatreBookingsPage />} />
        <Route path="validate" element={<TheatreTicketValidatorPage />} />
        <Route path="invoices" element={<TheatreInvoicesPage />} />
        <Route path="exceptions" element={<TheatreExceptionsPage />} />
      </Route>
      <Route path="/confirmation" element={<ConfirmationPage />} />
      <Route path="/movies/:id/reviews" element={<MovieReviewsPage />} />
      <Route
        path="/forgot-password"
        element={
          <PrivateRoute guest>
            <ForgotPasswordPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PrivateRoute guest>
            <ResetPasswordPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PrivateRoute guest>
            <LoginPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PrivateRoute guest>
            <RegisterPage />
          </PrivateRoute>
        }
      />
      <Route path="/movies" element={<MoviesPage />} />
      <Route path="/movies/:id" element={<MovieDetailPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/support/*" element={<SupportPage />} />
      <Route path="/support/home" element={<SupportPage />} />
      <Route path="/help" element={<SupportPage />} />
      <Route path="/terms" element={<TermsAndConditionsPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/delete-account" element={<DeleteAccountPage />} />
      <Route path="/account-deletion" element={<DeleteAccountPage />} />
      <Route path="/showtimes/:id/seat-map" element={<SeatMapPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/events/:id" element={<BookingPage />} />
      <Route path="/fashion" element={<FashionLandingPage />} />
      <Route path="/fashion/offers/:id" element={<FashionOfferDetailPage />} />
      <Route path="/fashion/brands/:id" element={<FashionBrandDetailPage />} />
      <Route
        path="/my-coupons"
        element={
          <PrivateRoute>
            <MyCouponsPage />
          </PrivateRoute>
        }
      />
      <Route path="/partner/retail/scanner" element={<RetailStaffScannerPage />} />
      <Route
        path="/partner/retail/dashboard"
        element={
          <PrivateRoute allowedRoles={PARTNER_ROLES}>
            <RetailPartnerDashboard />
          </PrivateRoute>
        }
      />
      <Route path="/dining" element={<DiningListingPage />} />
      <Route path="/restaurants" element={<DiningListingPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/buytickets/:id" element={<BuyTicketsPage />} />
      <Route path="/venues" element={<VenuesPage />} />
      <Route path="/booking/:type/:id" element={<BookingPage />} />
      <Route path="/bookings/:bookingId/food" element={<FoodPage />} />
      <Route
        path="/bookings/:id"
        element={
          <PrivateRoute>
            <BookingDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile/edit"
        element={
          <PrivateRoute>
            <EditProfilePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/partner/become"
        element={<BecomePartnerPage />}
      />
      <Route
        path="/partner/register"
        element={<BecomePartnerPage />}
      />
      <Route
        path="/partner/dashboard"
        element={
          <PrivateRoute allowedRoles={PARTNER_ROLES}>
            <PartnerDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/partner/coupons"
        element={
          <PrivateRoute allowedRoles={PARTNER_ROLES}>
            <PartnerCouponsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/partners"
        element={
          <PrivateRoute allowedRoles={ADMIN_ROLES}>
            <AdminPartnersPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/partner/events/new"
        element={
          <PrivateRoute allowedRoles={PARTNER_ROLES}>
            <PartnerEventCreatePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/partner/dining/new"
        element={
          <PrivateRoute allowedRoles={PARTNER_ROLES}>
            <PartnerDiningCreatePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/moderation"
        element={
          <PrivateRoute allowedRoles={ADMIN_ROLES}>
            <AdminModerationPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
