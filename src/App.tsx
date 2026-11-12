import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppRoutes } from './routes';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { QuickAuthModal } from '@/components/auth/QuickAuthModal';
import { WelcomeFirstOpenModal } from '@/components/auth/WelcomeFirstOpenModal';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { useAuth } from '@/hooks/useAuth';
import { linkGuestBookings } from '@/api/booking.api';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const FIRST_OPEN_DISMISSED_KEY = 'vyhbz_first_open_dismissed';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    // Check if user has already seen or dismissed the first-open prompt, or is already logged in
    if (loading) return;
    if (user) return;

    try {
      const dismissed = localStorage.getItem(FIRST_OPEN_DISMISSED_KEY);
      if (!dismissed) {
        // Show after a subtle delay (700ms) for smooth page render
        const timer = setTimeout(() => {
          setShowWelcomeModal(true);
        }, 700);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore localStorage errors
    }
  }, [user, loading]);

  const handleCloseWelcomeModal = () => {
    setShowWelcomeModal(false);
    try {
      localStorage.setItem(FIRST_OPEN_DISMISSED_KEY, 'true');
    } catch {}
  };

  useEffect(() => {
    if (user) {
      linkGuestBookings().catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle: any = null;

    const setupListener = async () => {
      listenerHandle = await CapApp.addListener('backButton', ({ canGoBack }) => {
        // If user is on a subroute, navigate back within React Router
        if (location.pathname !== '/' && location.pathname !== '/home') {
          navigate(-1);
        } else if (canGoBack) {
          window.history.back();
        } else {
          // At root home screen: exit app
          CapApp.exitApp();
        }
      });
    };

    setupListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [location.pathname, navigate]);

  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Toaster richColors position="top-right" duration={3000} />
      <AppRoutes />
      <MobileBottomNav />
      <QuickAuthModal />
      <WelcomeFirstOpenModal
        isOpen={showWelcomeModal}
        onClose={handleCloseWelcomeModal}
      />
    </ErrorBoundary>
  );
}
