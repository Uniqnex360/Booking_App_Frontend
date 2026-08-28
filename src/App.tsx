import { Toaster } from 'sonner';
import { AppRoutes } from './routes';

export default function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <AppRoutes/>
    </>
  )
}
