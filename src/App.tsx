import { Toaster } from 'sonner';
import { AppRoutes } from './routes';
import { BookMyShowAuthModal } from '@/components/auth/BookMyShowAuthModal';

export default function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <AppRoutes />
      <BookMyShowAuthModal />
    </>
  )
}
