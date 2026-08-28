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

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/movies" element={<MoviesPage />} />
      <Route path="/movies/:id" element={<MovieDetailPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/restaurants" element={<RestaurantsPage />} />
      <Route
        path="/booking/:type/:id"
        element={
          <PrivateRoute>
            <BookingPage />
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
