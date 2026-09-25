import SeatMapPage from "@/pages/SeatMapPage";
import { Routes, Route } from 'react-router-dom';
import { PrivateRoute } from '@/components/PrivateRoute';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import MoviesPage from '@/pages/MoviesPage';
import MovieDetailPage from '@/pages/MovieDetailPage';
import EventsPage from '@/pages/EventsPage';
import RestaurantsPage from '@/pages/RestaurantsPage';
import BookingPage from '@/pages/BookingPage';
import ProfilePage from '@/pages/ProfilePage';
import EditProfilePage from '@/pages/EditProfilePage';
import BecomePartnerPage from '@/pages/BecomePartnerPage';
import PartnerDashboard from '@/pages/PartnerDashboard';
import AdminPartnersPage from '@/pages/AdminPartnersPage';
import PartnerEventCreatePage from '@/pages/PartnerEventCreatePage';
import AdminModerationPage from '@/pages/AdminModerationPage';
import BookingDetailPage from "@/pages/BookingDetailPage";
import VerifyOtpPage from "@/pages/VerifyOtpPage";
import BuyTicketsPage from "@/pages/BuyTicketsPage";
import TermsAndConditionsPage from "@/components/TermsAndConditionsPage";
import ConfirmationPage from "@/pages/ConfirmationPage";
import MovieReviewsPage from "@/pages/MovieReviewsPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import VenuesPage from "@/pages/VenuesPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/confirmation" element={<ConfirmationPage />} />
      <Route path="/movies/:id/reviews" element={<MovieReviewsPage />} />
      <Route path="/forgot-password" element={<PrivateRoute guest><ForgotPasswordPage /></PrivateRoute>} />
      <Route path="/reset-password" element={<PrivateRoute guest><ResetPasswordPage /></PrivateRoute>} />
      <Route path="/login" element={<PrivateRoute guest><LoginPage /></PrivateRoute>} />
      <Route path="/register" element={<PrivateRoute guest><RegisterPage /></PrivateRoute>} />
      <Route path="/movies" element={<MoviesPage />} />
      <Route path="/movies/:id" element={<MovieDetailPage />} />
      <Route path="/terms" element={<TermsAndConditionsPage />} />
      <Route path="/showtimes/:id/seat-map" element={<SeatMapPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/events/:id" element={<BookingPage />} />
      <Route path="/restaurants" element={<RestaurantsPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/buytickets/:id" element={<BuyTicketsPage />} />
    <Route path="/venues" element={<VenuesPage />} />
      <Route path="/booking/:type/:id" element={<BookingPage />} />
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
        path="/partner/dashboard"
        element={
          <PrivateRoute>
            <PartnerDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/partners"
        element={
          <PrivateRoute>
            <AdminPartnersPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/partner/events/new"
        element={
          <PrivateRoute>
            <PartnerEventCreatePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/moderation"
        element={
          <PrivateRoute>
            <AdminModerationPage />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
