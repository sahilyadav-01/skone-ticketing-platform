-- 1. Create public.users table
CREATE TABLE IF NOT EXISTS public.users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Client', 'Support Engineer', 'Admin')) DEFAULT 'Client',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.users;
DROP POLICY IF EXISTS "Allow public lookup of email by username" ON public.users;
DROP POLICY IF EXISTS "Allow write access to Admins" ON public.users;

-- RLS Policies for users
CREATE POLICY "Allow public lookup of email by username"
  ON public.users
  FOR SELECT
  USING (true);

CREATE POLICY "Allow write access to Admins"
  ON public.users
  FOR ALL
  TO authenticated
  USING (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'Admin');

-- 2. Create assets table
CREATE TABLE IF NOT EXISTS public.assets (
  asset_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  deployment_date DATE,
  last_maintenance_date DATE,
  status TEXT NOT NULL CHECK (status IN ('Active', 'In Repair', 'Decommissioned')) DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on assets
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow users to read their own assets" ON public.assets;
DROP POLICY IF EXISTS "Allow Admins to manage assets" ON public.assets;

-- RLS Policies for assets
CREATE POLICY "Allow users to read their own assets"
  ON public.assets
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = client_id 
    OR ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) IN ('Support Engineer', 'Admin')
  );

CREATE POLICY "Allow Admins to manage assets"
  ON public.assets
  FOR ALL
  TO authenticated
  USING (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'Admin');

-- 3. Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  ticket_id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  asset_id INT REFERENCES public.assets(asset_id) ON DELETE SET NULL,
  issue_type TEXT NOT NULL,
  subject TEXT DEFAULT '',
  priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Low',
  error_code TEXT,
  status TEXT NOT NULL CHECK (status IN ('Open', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Waiting for Vendor')) DEFAULT 'Open',
  assigned_tech TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow users to read their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow clients to create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow support and admins to update tickets" ON public.tickets;

-- RLS Policies for tickets
CREATE POLICY "Allow users to read their own tickets"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = client_id 
    OR ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) IN ('Support Engineer', 'Admin')
  );

CREATE POLICY "Allow clients to create tickets"
  ON public.tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = client_id
    AND ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'Client'
  );

CREATE POLICY "Allow support and admins to update tickets"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) IN ('Support Engineer', 'Admin')
  );

-- Triggers for syncing auth.users -> public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, username, email, role, created_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'Client'),
    COALESCE(new.created_at, now())
  )
  ON CONFLICT (user_id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_update_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users SET
    username = COALESCE(new.raw_user_meta_data->>'username', public.users.username),
    role = COALESCE(new.raw_user_meta_data->>'role', public.users.role),
    email = COALESCE(new.email, public.users.email)
  WHERE user_id = new.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_update_user();

-- RPC function for KPI summary
CREATE OR REPLACE FUNCTION public.get_ticket_summary(p_client_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_role TEXT;
  v_open_count INT;
  v_pending_count INT;
  v_resolved_today INT;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Get user role
  SELECT role INTO v_role FROM public.users WHERE user_id = v_user_id;

  -- If client, force filter to user's tickets
  IF v_role = 'Client' THEN
    p_client_id := v_user_id;
  END IF;

  -- Count open tickets
  SELECT COUNT(*) INTO v_open_count
  FROM public.tickets
  WHERE status = 'Open'
    AND (p_client_id IS NULL OR client_id = p_client_id);

  -- Count pending tickets
  SELECT COUNT(*) INTO v_pending_count
  FROM public.tickets
  WHERE status IN ('Assigned', 'In Progress', 'Waiting for Vendor')
    AND (p_client_id IS NULL OR client_id = p_client_id);

  -- Count resolved today
  SELECT COUNT(*) INTO v_resolved_today
  FROM public.tickets
  WHERE status = 'Resolved'
    AND timezone('utc', updated_at)::date = CURRENT_DATE
    AND (p_client_id IS NULL OR client_id = p_client_id);

  RETURN json_build_object(
    'open_count', v_open_count,
    'pending_count', v_pending_count,
    'resolved_today', v_resolved_today
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
