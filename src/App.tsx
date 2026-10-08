import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppRoutes } from './routes';
import { QuickAuthModal } from '@/components/auth/QuickAuthModal';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

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
    <>
      <Toaster richColors position="top-right" duration={3000} />
      <AppRoutes />
      <QuickAuthModal />
    </>
  );
}
