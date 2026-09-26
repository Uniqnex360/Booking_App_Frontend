import { Toaster } from 'sonner';
import { AppRoutes } from './routes';
import { QuickAuthModal } from '@/components/auth/QuickAuthModal';

export default function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <AppRoutes />
      <QuickAuthModal />
    </>
  )
}
