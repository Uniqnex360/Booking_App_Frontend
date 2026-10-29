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

// On-demand lazy routes (loaded only when visited)
const MovieDetailPage = lazy(() => import("@/pages/MovieDetailPage"));
const SeatMapPage = lazy(() => import("@/pages/SeatMapPage"));
const BuyTicketsPage = lazy(() => import("@/pages/BuyTicketsPage"));
const BookingPage = lazy(() => import("@/pages/BookingPage"));
const BookingDetailPage = lazy(() => import("@/pages/BookingDetailPage"));
const ConfirmationPage = lazy(() => import("@/pages/ConfirmationPage"));
const EventsPage = lazy(() => import("@/pages/EventsPage"));
const DiningListingPage = lazy(() => import("@/pages/DiningListingPage"));
const FoodPage = lazy(() => import("@/pages/FoodPage"));
const VenuesPage = lazy(() => import("@/pages/VenuesPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const EditProfilePage = lazy(() => import("@/pages/EditProfilePage"));
const VerifyOtpPage = lazy(() => import("@/pages/VerifyOtpPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const MovieReviewsPage = lazy(() => import("@/pages/MovieReviewsPage"));
const SupportPage = lazy(() => import("@/pages/SupportPage"));
const TermsAndConditionsPage = lazy(() => import("@/components/TermsAndConditionsPage"));
const PrivacyPolicyPage = lazy(() => import("@/pages/PrivacyPolicyPage"));
const DeleteAccountPage = lazy(() => import("@/pages/DeleteAccountPage"));
const BecomePartnerPage = lazy(() => import("@/pages/BecomePartnerPage"));

// Backoffice: Admin Portal (Lazy)
const AdminDashboardPage = lazy(() => import("@/pages/AdminDashboardPage"));
const AdminEventDetailPage = lazy(() => import("@/pages/admin/AdminEventDetailPage"));
const AdminPartnersPage = lazy(() => import("@/pages/AdminPartnersPage"));
const AdminModerationPage = lazy(() => import("@/pages/AdminModerationPage"));

// Backoffice: Partner Portal (Lazy)
const PartnerDashboard = lazy(() => import("@/pages/PartnerDashboard"));
const PartnerEventCreatePage = lazy(() => import("@/pages/PartnerEventCreatePage"));
const PartnerDiningCreatePage = lazy(() => import("@/pages/PartnerDiningCreatePage"));
const PartnerCouponsPage = lazy(() => import("@/pages/PartnerCouponsPage"));

// Backoffice: Theatre Scoped Portal (Lazy)
import { TheatreLayout } from "@/pages/theatre/TheatreLayout";
const TheatreDashboardPage = lazy(() => import("@/pages/theatre/TheatreDashboardPage"));
const TheatreVenuesPage = lazy(() => import("@/pages/theatre/TheatreVenuesPage"));
const TheatreShowtimesPage = lazy(() => import("@/pages/theatre/TheatreShowtimesPage"));
const TheatreBookingsPage = lazy(() => import("@/pages/theatre/TheatreBookingsPage"));
const TheatreInvoicesPage = lazy(() => import("@/pages/theatre/TheatreInvoicesPage"));
const TheatreExceptionsPage = lazy(() => import("@/pages/theatre/TheatreExceptionsPage"));
const TheatreTicketValidatorPage = lazy(() => import("@/pages/theatre/TheatreTicketValidatorPage"));

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
        element={
          <PrivateRoute>
            <BecomePartnerPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/partner/register"
        element={
          <PrivateRoute>
            <BecomePartnerPage />
          </PrivateRoute>
        }
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
