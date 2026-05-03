
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('customer','staff','admin');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + default customer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'customer'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles policies
CREATE POLICY "Profiles viewable by owner" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles updatable by owner" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Roles policies
CREATE POLICY "Roles viewable by owner" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  size TEXT,
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view products" ON public.products
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff/admin can insert products" ON public.products
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff/admin can update products" ON public.products
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'admin'));

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid', -- paid | verified | expired
  qr_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers see own orders, staff see all" ON public.orders
FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "Customers create own orders" ON public.orders
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Staff/admin verify orders" ON public.orders
FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'admin')
);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  size TEXT
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Items viewable with order access" ON public.order_items
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND
    (o.user_id = auth.uid() OR public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'admin')))
);
CREATE POLICY "Customers add items to own orders" ON public.order_items
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

-- Realtime
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- Seed products
INSERT INTO public.products (barcode, name, price, size, stock) VALUES
('8901030865278','Cotton T-Shirt - Blue',499.00,'M',50),
('8901030865285','Cotton T-Shirt - Black',499.00,'L',40),
('8901058765432','Slim Fit Jeans',1299.00,'32',30),
('8902080112233','Sneakers - White',1799.00,'9',20),
('8901234567890','Hooded Sweatshirt',999.00,'L',25),
('8907654321098','Baseball Cap',299.00,'Free',60),
('8903344556677','Backpack 20L',1499.00,'Std',15),
('8909988776655','Sports Socks (Pack of 3)',249.00,'Free',100);
