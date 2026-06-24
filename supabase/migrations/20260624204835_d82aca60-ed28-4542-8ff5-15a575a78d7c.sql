ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'digital',
  ADD COLUMN IF NOT EXISTS counter_no integer;