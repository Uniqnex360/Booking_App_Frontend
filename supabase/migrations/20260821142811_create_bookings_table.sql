CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experience_title TEXT NOT NULL,
  venue TEXT NOT NULL,
  location TEXT,
  booking_date DATE NOT NULL,
  guests INTEGER NOT NULL DEFAULT 1,
  total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_bookings" ON public.bookings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_bookings" ON public.bookings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_bookings" ON public.bookings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_bookings" ON public.bookings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
