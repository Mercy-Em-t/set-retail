-- Run this in your Supabase SQL Editor

-- 1. Create Shops Table (Tenants)
CREATE TABLE public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Users Table (Linked to Auth)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Orders Table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    total_price NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Order Items Table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id TEXT NOT NULL, -- Storing SKU
    quantity INT NOT NULL DEFAULT 1,
    price NUMERIC(10,2) NOT NULL
);

-- 5. Trigger to automatically create Shop and User records on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_shop_id UUID;
BEGIN
  -- Insert a new shop for the user
  INSERT INTO public.shops (company_name)
  VALUES (COALESCE(new.raw_user_meta_data->>'company_name', 'My Company'))
  RETURNING id INTO new_shop_id;

  -- Insert the user record
  INSERT INTO public.users (id, email, shop_id)
  VALUES (new.id, new.email, new_shop_id);

  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable Row Level Security (RLS)
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create Policies to allow users to read/write their own tenant data
CREATE POLICY "Users can access their own shop" ON public.shops
  FOR ALL USING (id IN (SELECT shop_id FROM public.users WHERE users.id = auth.uid()));

CREATE POLICY "Users can access their own user record" ON public.users
  FOR ALL USING (id = auth.uid());

CREATE POLICY "Users can access their own orders" ON public.orders
  FOR ALL USING (shop_id IN (SELECT shop_id FROM public.users WHERE users.id = auth.uid()));

CREATE POLICY "Users can access their own order items" ON public.order_items
  FOR ALL USING (order_id IN (SELECT id FROM public.orders WHERE shop_id IN (SELECT shop_id FROM public.users WHERE users.id = auth.uid())));
